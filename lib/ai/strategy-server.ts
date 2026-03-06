/**
 * Strategy Server Action
 * 
 * 使用 RSC 模式：Server 端使用 createStreamableValue + streamObject
 * Client 端使用 useStreamableValue 消费流
 * 
 * 这是 AI SDK v3.4.33 推荐的 RSC 最佳实践
 */
'use server';

import { createStreamableValue } from 'ai/rsc';
import { streamText } from 'ai';
import { z } from 'zod';
import { getAIModel } from './provider';
import { customerProfileSchema, mergeProfiles } from './gap-analysis';
import type { CustomerProfile } from './types';
import type { ClassificationResult } from '../xstate/state-evaluator';
import { requireAuth } from '../auth/session';
import { createSalesMachine } from '../xstate/sales-machine';
import { createActor, waitFor } from 'xstate';
import { TEST_TENANT_IDS } from '../db/fixtures';
import { searchRelevantKnowledge } from './retrieval';
import {
  detectCustomerDomain,
  filterCrossDomainKnowledge,
  validateStrategyDomain,
  type CustomerDomain,
} from './domain-guard';

// ── Zod Schema for Strategy Output ──

const talkTrackSchema = z.object({
  objective: z.string().describe('话术目标'),
  script: z.string().describe('话术脚本'),
  whenToUse: z.string().describe('何时使用'),
  tone: z.enum(['坚定', '顾问式', '共情式']).describe('语气风格'),
});

const actionPlanSchema = z.object({
  step: z.string().describe('步骤描述'),
  owner: z.enum(['销售顾问', '销售经理', '金融专员']).describe('负责人'),
  dueWindow: z.string().describe('时间窗口'),
  expectedSignal: z.string().describe('预期信号'),
});

const strategySchema = z.object({
  title: z.string().describe('策略标题'),
  summary: z.string().describe('策略摘要'),
  priority: z.enum(['高', '中', '低']).describe('优先级'),
  talkTracks: z.array(talkTrackSchema).describe('话术建议'),
  actionPlan: z.array(actionPlanSchema).describe('行动计划'),
  nextFollowUp: z.string().describe('下次跟进建议'),
});

export type Strategy = z.infer<typeof strategySchema>;

// ── Request Schema for Validation ──

const strategyRequestSchema = z.object({
  // ✅ 使用 customerProfileSchema.partial() 进行严格类型校验
  profileData: customerProfileSchema.partial().optional(),
  status: z.enum(['A', 'B', 'C', 'D']),
  classification: z.object({
    status: z.enum(['A', 'B', 'C', 'D']),
    reason: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  customerId: z.string().optional(),
  existingProfile: customerProfileSchema.partial().optional(),
});

/**
 * Server Action: 流式生成销售策略
 *
 * 使用 RSC 模式：
 * 1. createStreamableValue 创建流式值
 * 2. streamObject 生成流式对象
 * 3. 返回 streamable value 给客户端
 *
 * M3 增强：
 * - 接收 existingProfile 参数
 * - 调用 mergeProfiles 合并画像
 * - 使用 XState 状态机评估客户等级
 * - 状态变更时调用 saveStateTransitionWithTransaction 写入数据库
 */
export async function generateStrategyStream(
  profileData: Partial<CustomerProfile> | undefined,
  status: 'A' | 'B' | 'C' | 'D',
  classification: ClassificationResult,
  customerId?: string,
  existingProfile?: Partial<CustomerProfile>,
  customerName?: string,
  followUpInput?: string  // 新增：销售员当前的跟进原话
): Promise<ReturnType<typeof createStreamableValue<Strategy>>['value']> {
  // ✅ 运行时验证：使用 safeParse 验证所有输入参数
  const validationResult = strategyRequestSchema.safeParse({
    profileData,
    status,
    classification,
    customerId,
    existingProfile,
  });

  if (!validationResult.success) {
    const errorMessage = validationResult.error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('; ');
    throw new Error(`输入参数验证失败: ${errorMessage}`);
  }

  // ✅ 认证检查（Server Action 也需要鉴权）
  await requireAuth();

  // ✅ 状态一致性校验：以 classification.status 为准
  if (status !== classification.status) {
    console.warn('[Strategy Server] Status mismatch:', {
      requestStatus: status,
      classificationStatus: classification.status,
      customerId,
    });
  }

  const finalStatus = classification.status;

  // ✅ 卫语句：profileData 可能为 undefined，提供默认空对象
  const safeProfileData = profileData || {};

  // ✅ M3: 合并画像（如果提供了 existingProfile）
  const mergedProfile = existingProfile
    ? mergeProfiles(existingProfile, safeProfileData as CustomerProfile)
    : safeProfileData;

  // ✅ M3: 使用 XState 状态机评估客户等级并写入数据库
  if (customerId) {
    try {
      const tenantId = TEST_TENANT_IDS.AUTOMAX; // Use Type-Safe fixture
      const machine = createSalesMachine(tenantId, customerId, mergedProfile as CustomerProfile);
      const actor = createActor(machine);
      actor.start();
      actor.send({ type: 'EVALUATE_PROFILE', profile: mergedProfile as CustomerProfile });

      // 等待状态机完成
      await waitFor(
        actor,
        (s) => s.status === 'done' || s.matches('error'),
        { timeout: 30000 }
      );

      actor.stop();
    } catch (error) {
      console.error('[Strategy Server] State machine error:', error);
      // 不阻塞流式生成，继续执行
    }
  }
  
  // 创建流式值
  const streamable = createStreamableValue<Strategy>();

  // 启动流式生成（异步执行）
  (async () => {
    try {
      // ── 步骤 1：检测客户领域 ──
      const customerDomain = detectCustomerDomain(
        followUpInput || '',
        mergedProfile
      );

      console.log('[Domain Guard] 检测到客户领域:', customerDomain);

      // 构建客户基础信息注入
      const customerInfo = buildCustomerInfo(mergedProfile as Partial<CustomerProfile>, customerName);

      // 构建阶段约束指令
      const stageConstraints = buildStageConstraints(finalStatus);

      // ── M4: 向量检索与知识库注入 ──

      // 1. 构造查询词：followUpInput（原汁原味的语料）+ 画像标签
      const queryParts: string[] = [];

      // 意向车型
      if (mergedProfile.preference?.intent_model) {
        queryParts.push(mergedProfile.preference.intent_model);
      }

      // 竞品信息
      if (mergedProfile.competitor?.competing_models?.length) {
        queryParts.push(`竞品: ${mergedProfile.competitor.competing_models.join(', ')}`);
      }

      // 最大卡点
      if (mergedProfile.blockers?.main_blocker) {
        queryParts.push(`卡点: ${mergedProfile.blockers.main_blocker}`);
      }

      // 客户状态
      queryParts.push(`客户状态: ${finalStatus}`);

      // 核心修复：followUpInput（原汁原味的语料）放在最前面
      const knowledgeQuery = followUpInput?.trim()
        ? `${followUpInput} ${queryParts.join(' ')}`
        : queryParts.join(' ');

      // 2. 执行检索
      let knowledgeContext = '';
      let relevantDocs: Array<{ content: string; similarity: number }> = [];

      if (knowledgeQuery.trim()) {
        try {
          const session = await requireAuth();
          const rawDocs = await searchRelevantKnowledge(
            knowledgeQuery,
            session.tenantId,
            5, // 检索 Top 5，然后过滤
            0.7 // 相似度阈值
          );

          // ── 步骤 2：过滤跨域知识片段 ──
          relevantDocs = filterCrossDomainKnowledge(
            rawDocs,
            customerDomain,
            0.7
          );

          // 增加日志
          console.log('[RAG Query]:', knowledgeQuery);
          console.log('[RAG Raw Hits]:', rawDocs.length);
          console.log('[RAG Filtered Hits]:', relevantDocs.length);
          if (relevantDocs.length > 0) {
            console.log('[RAG Content Preview]:', relevantDocs[0].content.substring(0, 100) + '...');
          }

          if (relevantDocs.length > 0) {
            knowledgeContext = relevantDocs
              .map((doc, idx) => `[知识片段 ${idx + 1}]\n${doc.content}`)
              .join('\n\n');
          }
        } catch (error) {
          console.error('[Knowledge Retrieval] Error:', error);
          // 检索失败不影响主流程，继续生成策略
        }
      }

      // ── 步骤 3：生成策略（带领域约束） ──
      const domainConstraint = buildDomainConstraint(customerDomain);

      // 🚨 排雷 2：使用 streamText 替代 streamObject，手动过滤 <think> 标签
      const result = await streamText({
        model: getAIModel(),
        prompt: `你是一位资深的汽车销售顾问。基于以下客户画像和分类信息，生成个性化的销售策略。

${customerInfo}

${stageConstraints}

${domainConstraint}

${knowledgeContext ? `
【企业内部知识库参考（你的策略必须优先且严格基于以下绝密资料生成）】

${knowledgeContext}

以上是企业内部的绝密销售资料，包含产品优势、竞品对比、话术技巧等核心知识。
你的策略建议必须优先基于这些资料，确保专业性和准确性。

⚠️ 重要指令：
在策略摘要的开头，你必须用中括号标明 [RAG 诊断：成功命中 ${relevantDocs.length} 条内部知识片段]，
并严格使用检索到的知识（如：底盘质保、星愿基金等）来生成策略。
如果检索到的知识中包含具体的产品特性、优惠政策、话术技巧，你必须在策略中明确引用。
` : `
[RAG 诊断：未检索到相关知识片段，使用通用销售策略]
`}

客户画像：
${buildContext(mergedProfile as Partial<CustomerProfile>, finalStatus, classification)}

客户分类：${finalStatus} 类
分类原因：${classification.reason}
置信度：${classification.confidence}

请生成：
1. 策略标题和摘要
2. 2-3 个针对性的话术建议（针对当前最大 Blocker）
3. 3-5 步具体的行动计划
4. 下次跟进建议

要求：
- 话术要具体、可执行
- 行动计划要有明确的负责人和时间窗口
- 针对客户分类特点优化策略

💡 鼓励思考：你可以先在 <think>...</think> 标签内进行充分的逻辑推理。思考结束后，你【必须】将最终的结构化结果放在一个 \`\`\`json 和 \`\`\` 包裹的代码块中返回！

【JSON Schema 参考】：
${JSON.stringify({
  title: 'string',
  summary: 'string',
  priority: '"高" | "中" | "低"',
  talkTracks: [{
    objective: 'string',
    script: 'string',
    whenToUse: 'string',
    tone: '"坚定" | "顾问式" | "共情式"'
  }],
  actionPlan: [{
    step: 'string',
    owner: '"销售顾问" | "销售经理" | "金融专员"',
    dueWindow: 'string',
    expectedSignal: 'string'
  }],
  nextFollowUp: 'string'
}, null, 2)}

请按照以下格式输出：
<think>
你的思考过程...
</think>

\`\`\`json
{
  "title": "...",
  "summary": "...",
  ...
}
\`\`\``,
      });

      // 手动过滤 <think> 标签并累加 JSON
      let accumulatedText = '';
      let isAfterThinkTag = false;

      for await (const chunk of result.textStream) {
        accumulatedText += chunk;

        // 检测是否已经过了 </think> 标签
        if (!isAfterThinkTag && accumulatedText.includes('</think>')) {
          isAfterThinkTag = true;
          // 截取 </think> 之后的内容
          const thinkEndIndex = accumulatedText.indexOf('</think>') + '</think>'.length;
          accumulatedText = accumulatedText.substring(thinkEndIndex);
        }

        // 只有在 </think> 之后才开始解析 JSON
        if (isAfterThinkTag) {
          // 尝试提取并解析 JSON
          const jsonBlockMatch = accumulatedText.match(/```json\s*\n([\s\S]*?)\n```/);
          if (jsonBlockMatch) {
            try {
              const jsonString = jsonBlockMatch[1].trim();
              // 🚨 排雷：清洗换行符
              const safeJson = jsonString.replace(/\n/g, ' ').replace(/\r/g, '');
              const parsedStrategy = JSON.parse(safeJson);

              // 验证 schema
              const validatedStrategy = strategySchema.parse(parsedStrategy);
              streamable.update(validatedStrategy);
            } catch (error) {
              // JSON 尚未完整，继续累加
              console.log('[Strategy Server] Partial JSON, continuing...');
            }
          }
        }
      }

      // ── 步骤 4：最终解析并验证领域一致性 ──
      try {
        const jsonBlockMatch = accumulatedText.match(/```json\s*\n([\s\S]*?)\n```/);
        if (jsonBlockMatch) {
          const jsonString = jsonBlockMatch[1].trim();
          const safeJson = jsonString.replace(/\n/g, ' ').replace(/\r/g, '');
          const parsedStrategy = JSON.parse(safeJson);
          const validatedStrategy = strategySchema.parse(parsedStrategy);

          // ── 步骤 5：验证策略领域一致性 ──
          const domainValidation = validateStrategyDomain(
            validatedStrategy,
            customerDomain
          );

          if (!domainValidation.isValid) {
            console.error('[Domain Guard] 策略违反领域一致性:', domainValidation.violations);

            // ── 步骤 6：触发 Fallback ──
            // 如果策略违规，使用 fallback 策略
            const fallbackStrategy = generateFallbackStrategy(
              mergedProfile as Partial<CustomerProfile>,
              finalStatus,
              classification,
              customerDomain
            );

            streamable.update(fallbackStrategy);
          } else {
            console.log('[Domain Guard] 策略通过领域一致性验证');
            streamable.update(validatedStrategy);
          }
        } else {
          throw new Error('无法从模型输出中提取 JSON');
        }
      } catch (error) {
        console.error('[Strategy Server] Final JSON parse error:', error);
        console.error('[Strategy Server] Accumulated text:', accumulatedText);
        throw error;
      }

      // 完成
      streamable.done();

    } catch (error) {
      console.error('[Strategy Server] Stream error:', error);
      streamable.error(error instanceof Error ? error.message : 'Stream failed');
    }
  })();
  
  // 返回流式值的 .value 属性（这是 StreamableValue 类型）
  return streamable.value;
}

/**
 * 构建上下文字符串
 */
function buildContext(
  profileData: Partial<CustomerProfile>,
  status: 'A' | 'B' | 'C' | 'D',
  classification: ClassificationResult
): string {
  const parts: string[] = [];
  
  // 场景
  if (profileData.scene) {
    parts.push(`【需求场景】`);
    if (profileData.scene.usage_scenario) parts.push(`- 用车场景: ${profileData.scene.usage_scenario}`);
    if (profileData.scene.key_motives?.length) parts.push(`- 关键动机: ${profileData.scene.key_motives.join(', ')}`);
    if (profileData.scene.must_haves?.length) parts.push(`- 必须项: ${profileData.scene.must_haves.join(', ')}`);
  }
  
  // 偏好
  if (profileData.preference) {
    parts.push(`【车型偏好】`);
    if (profileData.preference.intent_model) parts.push(`- 意向车型: ${profileData.preference.intent_model}`);
    if (profileData.preference.config_preference?.length) parts.push(`- 配置偏好: ${profileData.preference.config_preference.join(', ')}`);
  }
  
  // 预算
  if (profileData.budget_payment) {
    parts.push(`【预算与付款】`);
    if (profileData.budget_payment.budget_limit) parts.push(`- 预算: ${profileData.budget_payment.budget_limit}`);
    if (profileData.budget_payment.payment_method) parts.push(`- 付款方式: ${profileData.budget_payment.payment_method}`);
    if (profileData.budget_payment.price_sensitivity) parts.push(`- 价格敏感度: ${profileData.budget_payment.price_sensitivity}`);
  }
  
  // 时间
  if (profileData.timing) {
    parts.push(`【购车时机】`);
    if (profileData.timing.delivery_timeline) parts.push(`- 提车时间: ${profileData.timing.delivery_timeline}`);
    if (profileData.timing.trigger_event) parts.push(`- 触发事件: ${profileData.timing.trigger_event}`);
  }
  
  // 决策单元
  if (profileData.decision_unit) {
    parts.push(`【决策单元】`);
    if (profileData.decision_unit.decision_maker_involved !== undefined) parts.push(`- 决策人参与: ${profileData.decision_unit.decision_maker_involved ? '是' : '否'}`);
    if (profileData.decision_unit.payer) parts.push(`- 付款人: ${profileData.decision_unit.payer}`);
  }
  
  // 竞品
  if (profileData.competitor) {
    parts.push(`【竞品对比】`);
    if (profileData.competitor.competing_models?.length) parts.push(`- 竞品: ${profileData.competitor.competing_models.join(', ')}`);
    if (profileData.competitor.has_quote !== undefined) parts.push(`- 已有报价: ${profileData.competitor.has_quote ? '是' : '否'}`);
    if (profileData.competitor.main_conflict) parts.push(`- 主要纠结: ${profileData.competitor.main_conflict}`);
  }
  
  // 卡点
  if (profileData.blockers) {
    parts.push(`【当前卡点】`);
    if (profileData.blockers.main_blocker) parts.push(`- 最大卡点: ${profileData.blockers.main_blocker}`);
    if (profileData.blockers.intensity) parts.push(`- 卡点强度: ${profileData.blockers.intensity}`);
    if (profileData.blockers.needs_manager !== undefined) parts.push(`- 需要经理: ${profileData.blockers.needs_manager ? '是' : '否'}`);
  }

  return parts.length > 0 ? parts.join('\n') : '暂无完整信息';
}

/**
 * 构建客户基础信息注入
 *
 * Task 2: 强注入客户基础信息，防止大模型幻觉
 */
function buildCustomerInfo(profileData: Partial<CustomerProfile>, customerName?: string): string {
  const parts: string[] = [];

  parts.push('⚠️ 客户基础信息（严格遵守）：');

  // 客户姓名
  if (customerName) {
    const surname = customerName.charAt(0);
    parts.push(`- 客户姓名: ${customerName}`);
    parts.push(`- 称呼规则: 必须使用"${surname}先生"或"${surname}哥"，绝对不允许凭空捏造其他姓氏或称呼`);
  } else {
    parts.push(`- 客户姓名: 未知`);
    parts.push(`- 称呼规则: 必须使用"该客户"、"这位客户"、"先生"、"女士"等中性称呼，绝对不允许凭空捏造姓氏（如"张伟"、"王总"等）`);
  }

  // 意向车型
  if (profileData.preference?.intent_model) {
    parts.push(`- 意向车型: ${profileData.preference.intent_model}`);
  }

  parts.push('');
  parts.push('🚨 严格警告：');
  parts.push('- 绝对不允许凭空捏造客户姓氏或称呼');
  if (customerName) {
    const surname = customerName.charAt(0);
    parts.push(`- 如果客户姓名是"${customerName}"，必须称呼"${surname}先生"或"${surname}哥"，绝不能叫"王总"或其他名字`);
  } else {
    parts.push(`- 如果客户姓名未知，必须使用"该客户"、"这位客户"、"先生"、"女士"等中性称呼`);
    parts.push(`- 绝对禁止使用"张伟"、"张哥"、"王总"等具体姓氏，这些都是测试数据！`);
  }
  parts.push('- 所有信息必须基于已知的客户画像，不得编造');
  parts.push('');

  return parts.join('\n');
}

/**
 * 从客户画像中提取客户姓名
 *
 * 注意：这是一个简化实现，实际应该从数据库的 Customer.name 字段获取
 */
function extractCustomerName(profileData: Partial<CustomerProfile>): string | null {
  // TODO: 从实际的客户数据中获取姓名
  // 这里暂时返回 null，需要在调用 generateStrategyStream 时传入客户姓名
  return null;
}

/**
 * 构建阶段约束指令
 *
 * Task 3: 按 A/B/C/D 状态分发不同的分析策略 (SOP 强控)
 */
function buildStageConstraints(status: 'A' | 'B' | 'C' | 'D'): string {
  const parts: string[] = [];

  parts.push('📋 阶段约束指令（必须严格遵守）：');
  parts.push('');

  if (status === 'D' || status === 'C') {
    // D 级/C 级客户：信息收集阶段
    parts.push('【D 级/C 级客户 - 信息收集阶段】');
    parts.push('');
    parts.push('✅ 必须做的：');
    parts.push('- 策略必须 90% 聚焦于提问与信息收集');
    parts.push('- 话术必须是探寻式的：询问购车动机、家庭结构、预算范围');
    parts.push('- 重点了解客户需求、使用场景、决策单元');
    parts.push('');
    parts.push('❌ 绝对禁止：');
    parts.push('- 逼单话术（如"今天下单有优惠"）');
    parts.push('- 具体报价和优惠方案');
    parts.push('- 送礼品、试驾安排等成交动作');
    parts.push('- 任何带有压迫感的成交话术');
    parts.push('');
    parts.push('💡 话术示例：');
    parts.push('- "您平时主要是什么场景用车呢？"');
    parts.push('- "家里有几口人？平时谁开车比较多？"');
    parts.push('- "您对预算有什么考虑吗？"');
    parts.push('- "您比较看重车的哪些方面？"');
  } else {
    // B 级/A 级客户：价值塑造与成交阶段
    parts.push('【B 级/A 级客户 - 价值塑造与成交阶段】');
    parts.push('');
    parts.push('✅ 可以输出：');
    parts.push('- 价值塑造：强调产品卖点和差异化优势');
    parts.push('- 竞品对比：针对性分析竞品劣势');
    parts.push('- 金融方案：提供具体的付款方案和优惠');
    parts.push('- 逼单策略：使用限时优惠、稀缺性等成交技巧');
    parts.push('- 具体行动：安排试驾、邀约到店、推动签约');
    parts.push('');
    parts.push('💡 话术示例：');
    parts.push('- "这款车在同级别中的空间是最大的，非常适合您的家庭需求"');
    parts.push('- "本月底前下单可以享受额外的金融贴息"');
    parts.push('- "这个配置的现车不多了，建议您尽快安排试驾"');
    parts.push('- "我们可以为您申请一个特别的置换补贴"');
  }

  parts.push('');

  return parts.join('\n');
}

/**
 * 构建领域约束指令
 *
 * 根据客户领域，添加领域一致性约束
 */
function buildDomainConstraint(domain: CustomerDomain): string {
  const parts: string[] = [];

  parts.push('🚨 领域一致性约束（绝对红线）：');
  parts.push('');

  if (domain === 'automotive-retail') {
    parts.push('【汽车零售领域】');
    parts.push('');
    parts.push('✅ 必须聚焦：');
    parts.push('- 家庭购车场景（如：二胎、空间需求、安全座椅）');
    parts.push('- 个人消费者需求（如：试驾、到店看车、预算考虑）');
    parts.push('- 汽车产品特性（如：宝马X3、后排空间、安全配置）');
    parts.push('');
    parts.push('❌ 绝对禁止：');
    parts.push('- 企业客户、公司采购、对公账户');
    parts.push('- 额度审批、三方会议、产品经理、技术团队');
    parts.push('- 招标、合同审批、商务车辆');
    parts.push('- 任何 B2B 相关的词汇和场景');
    parts.push('');
    parts.push('⚠️ 警告：如果你的策略中出现任何上述禁止词汇，将被视为严重违规！');
  } else if (domain === 'enterprise-b2b') {
    parts.push('【企业/B2B领域】');
    parts.push('');
    parts.push('✅ 必须聚焦：');
    parts.push('- 企业采购流程（如：审批、对公账户、合同）');
    parts.push('- 商务需求（如：品牌形象、维护成本）');
    parts.push('');
    parts.push('❌ 绝对禁止：');
    parts.push('- 家庭购车、个人消费者场景');
  } else {
    parts.push('【未知领域】');
    parts.push('- 请根据客户画像谨慎生成策略');
  }

  parts.push('');

  return parts.join('\n');
}

/**
 * 生成 Fallback 策略
 *
 * 当 AI 生成的策略违反领域一致性时，使用 deterministic 的 fallback 策略
 */
function generateFallbackStrategy(
  profileData: Partial<CustomerProfile>,
  status: 'A' | 'B' | 'C' | 'D',
  classification: ClassificationResult,
  domain: CustomerDomain
): Strategy {
  console.log('[Fallback] 使用 Fallback 策略，领域:', domain);

  // 根据领域生成不同的 fallback 策略
  if (domain === 'automotive-retail') {
    return {
      title: '家庭购车需求深度挖掘策略',
      summary: '[Fallback 策略] 针对家庭购车客户，重点了解用车场景、家庭结构和安全需求，避免过早推销。',
      priority: '高',
      talkTracks: [
        {
          objective: '了解家庭用车场景',
          script: '您平时主要是什么场景用车呢？家里有几口人？',
          whenToUse: '初次接触时',
          tone: '共情式',
        },
        {
          objective: '探寻安全需求',
          script: '您对车辆的安全配置有什么特别的要求吗？比如儿童安全座椅接口？',
          whenToUse: '了解需求时',
          tone: '顾问式',
        },
      ],
      actionPlan: [
        {
          step: '收集家庭用车场景信息',
          owner: '销售顾问',
          dueWindow: '本次沟通',
          expectedSignal: '客户主动分享家庭情况',
        },
        {
          step: '安排试驾体验',
          owner: '销售顾问',
          dueWindow: '3 天内',
          expectedSignal: '客户同意试驾',
        },
      ],
      nextFollowUp: '3 天后跟进试驾安排，重点关注客户对空间和安全配置的反馈。',
    };
  } else {
    // 通用 fallback 策略
    return {
      title: '客户需求深度挖掘策略',
      summary: '[Fallback 策略] 重点了解客户需求和购车动机，建立信任关系。',
      priority: '中',
      talkTracks: [
        {
          objective: '了解购车动机',
          script: '您这次购车主要是出于什么考虑呢？',
          whenToUse: '初次接触时',
          tone: '共情式',
        },
      ],
      actionPlan: [
        {
          step: '收集客户需求信息',
          owner: '销售顾问',
          dueWindow: '本次沟通',
          expectedSignal: '客户主动分享需求',
        },
      ],
      nextFollowUp: '3 天后跟进，了解客户的最新想法。',
    };
  }
}
