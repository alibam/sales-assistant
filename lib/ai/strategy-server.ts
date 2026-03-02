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
import { streamObject } from 'ai';
import { z } from 'zod';
import { getAIModel } from './provider';
import { customerProfileSchema } from './gap-analysis';
import type { CustomerProfile } from './types';
import type { ClassificationResult } from '../xstate/state-evaluator';
import { requireAuth } from '../auth/session';

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
});

/**
 * Server Action: 流式生成销售策略
 * 
 * 使用 RSC 模式：
 * 1. createStreamableValue 创建流式值
 * 2. streamObject 生成流式对象
 * 3. 返回 streamable value 给客户端
 */
export async function generateStrategyStream(
  profileData: Partial<CustomerProfile> | undefined,
  status: 'A' | 'B' | 'C' | 'D',
  classification: ClassificationResult,
  customerId?: string
): Promise<ReturnType<typeof createStreamableValue<Strategy>>['value']> {
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
  
  // 创建流式值
  const streamable = createStreamableValue<Strategy>();
  
  // 启动流式生成（异步执行）
  (async () => {
    try {
      const result = await streamObject({
        model: getAIModel(),
        schema: strategySchema,
        prompt: `你是一位资深的汽车销售顾问。基于以下客户画像和分类信息，生成个性化的销售策略。

客户画像：
${buildContext(safeProfileData, finalStatus, classification)}

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
- 针对客户分类特点优化策略`,
      });
      
      // 流式更新
      for await (const partial of result.partialObjectStream) {
        streamable.update(partial as Strategy);
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
