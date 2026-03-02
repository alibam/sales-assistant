/**
 * Strategy Streaming API Route
 * 
 * POST /api/strategy
 * 使用 Vercel AI SDK streamObject 实现真正的流式策略生成。
 * 
 * 安全性：
 * - 继承 M5 的 requireAuth 中间件
 * - tenantId 从 session 动态获取
 */
import { NextRequest } from 'next/server';
import { streamObject } from 'ai';
import { z } from 'zod';
import { requireAuth, AuthError } from '@/lib/auth/session';
import { getAIModel } from '@/lib/ai/provider';
import type { CustomerProfile } from '@/lib/ai/types';
import type { ClassificationResult } from '@/lib/xstate/state-evaluator';

// ── Zod Schema for Strategy Output ──

const talkTrackSchema = z.object({
  objective: z.string().describe('话术目标'),
  script: z.string().describe('具体话术脚本'),
  whenToUse: z.string().describe('使用时机'),
  tone: z.enum(['坚定', '顾问式', '共情式']).describe('话术风格'),
});

const actionStepSchema = z.object({
  step: z.string().describe('行动步骤描述'),
  owner: z.enum(['销售顾问', '销售经理', '金融专员']).describe('负责人'),
  dueWindow: z.string().describe('建议完成时间窗口'),
  expectedSignal: z.string().describe('期望的正向信号'),
});

const strategySchema = z.object({
  title: z.string().describe('策略标题'),
  summary: z.string().describe('策略摘要'),
  priority: z.enum(['高', '中', '低']).describe('优先级'),
  talkTracks: z.array(talkTrackSchema).describe('话术建议列表'),
  actionPlan: z.array(actionStepSchema).describe('行动计划列表'),
  nextFollowUp: z.string().describe('下次跟进建议'),
});

// ── Request Schema for Validation ──

const strategyRequestSchema = z.object({
  profileData: z.record(z.any()).optional(),
  status: z.enum(['A', 'B', 'C', 'D']),
  classification: z.object({
    status: z.enum(['A', 'B', 'C', 'D']),
    reason: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  customerId: z.string().optional(),
});

/**
 * POST /api/strategy
 * 
 * 流式生成销售策略
 * 
 * Request Body (validated by Zod):
 * {
 *   profileData: CustomerProfile,
 *   status: 'A' | 'B' | 'C' | 'D',
 *   classification: ClassificationResult,
 *   customerId?: string
 * }
 * 
 * Response: Streaming JSON
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ 继承 M5 的认证中间件
    const session = await requireAuth();
    const tenantId = session.tenantId;
    
    // 解析请求体
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON', message: 'Request body must be valid JSON' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // ✅ Zod 请求校验
    const validation = strategyRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request', 
          details: validation.error.errors 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { profileData, status, classification, customerId } = validation.data;
    
    // 构建上下文
    const context = buildContext(profileData, status, classification);
    
    // 使用 streamObject 实现流式生成
    const result = streamObject({
      model: getAIModel(),
      schema: strategySchema,
      prompt: `你是一位资深的汽车销售顾问。基于以下客户画像和分类信息，生成个性化的销售策略。

客户画像：
${context}

客户分类：${status} 类
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
    
    return result.toTextStreamResponse();
    
  } catch (error) {
    // 认证异常返回 401
    if (error instanceof AuthError) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.error('[Strategy API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * 构建上下文字符串
 */
function buildContext(
  profileData: CustomerProfile,
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
    parts.push(`【购车时间】`);
    if (profileData.timing.delivery_timeline) parts.push(`- 提车时间: ${profileData.timing.delivery_timeline}`);
    if (profileData.timing.trigger_event) parts.push(`- 触发事件: ${profileData.timing.trigger_event}`);
  }
  
  // 决策单元
  if (profileData.decision_unit) {
    parts.push(`【决策单元】`);
    if (profileData.decision_unit.decision_maker_involved !== undefined) {
      parts.push(`- 决策人参与: ${profileData.decision_unit.decision_maker_involved ? '是' : '否'}`);
    }
    if (profileData.decision_unit.payer) parts.push(`- 实际出资人: ${profileData.decision_unit.payer}`);
  }
  
  // 竞品
  if (profileData.competitor) {
    parts.push(`【竞品对比】`);
    if (profileData.competitor.competing_models?.length) parts.push(`- 对比车型: ${profileData.competitor.competing_models.join(', ')}`);
    if (profileData.competitor.main_conflict) parts.push(`- 主要纠结点: ${profileData.competitor.main_conflict}`);
  }
  
  // 卡点
  if (profileData.blockers) {
    parts.push(`【当前卡点】`);
    if (profileData.blockers.main_blocker) parts.push(`- 最大卡点: ${profileData.blockers.main_blocker}`);
    if (profileData.blockers.intensity) parts.push(`- 卡点强度: ${profileData.blockers.intensity}`);
  }
  
  return parts.join('\n');
}
