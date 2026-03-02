/**
 * Strategy Generator - AI 策略生成引擎
 * 
 * 基于客户画像和 A/B/C/D 状态生成销售策略。
 * 生成两样东西：
 * 1. Talk-tracks (话术建议): 针对当前最大 Blocker 的话术
 * 2. Action Plan (行动计划): 指导销售下一步该做什么
 */
import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModel } from './provider';
import type { CustomerProfile } from './types';
import type { ClassificationResult } from '../xstate/state-evaluator';

// ── Zod Schema for Strategy Output ──

const talkTrackSchema = z.object({
  objective: z.string().describe('话术目标'),
  script: z.string().describe('具体话术脚本'),
  whenToUse: z.string().describe('使用时机'),
  tone: z.enum(['坚定', '顾问式', '共情式']).describe('语气风格'),
});

const actionStepSchema = z.object({
  step: z.string().describe('行动步骤描述'),
  owner: z.enum(['销售顾问', '销售经理', '金融专员']).describe('负责人'),
  dueWindow: z.string().describe('时限（如：24小时内、本周内）'),
  expectedSignal: z.string().describe('成功信号'),
});

const strategySchema = z.object({
  title: z.string().describe('策略标题'),
  summary: z.string().describe('策略摘要'),
  primaryBlocker: z.enum(['价格', '竞品', '决策人', '金融', '置换', '现车', '信任', '时间', '无', '未知']).describe('主要阻碍'),
  blockerReason: z.string().describe('阻碍原因分析'),
  talkTracks: z.array(talkTrackSchema).min(1).max(3).describe('话术建议（1-3条）'),
  actionPlan: z.array(actionStepSchema).min(2).max(5).describe('行动计划（2-5步）'),
});

export type Strategy = z.infer<typeof strategySchema>;

/**
 * 生成销售策略
 * 
 * @param profileData - 客户画像数据
 * @param currentState - 当前 A/B/C/D 状态
 * @param classification - 分类结果（包含原因和置信度）
 * @returns 结构化的销售策略
 */
export async function generateStrategy(
  profileData: CustomerProfile,
  currentState: 'A' | 'B' | 'C' | 'D',
  classification: ClassificationResult
): Promise<Strategy> {
  const model = getAIModel();
  
  // 构建上下文信息
  const contextInfo = buildContext(profileData, currentState, classification);
  
  const result = await generateObject({
    model,
    schema: strategySchema,
    prompt: `你是一位资深的汽车销售教练。基于以下客户信息，生成针对性的销售策略。

## 客户状态: ${currentState}

## 客户画像:
${contextInfo}

## 分类原因:
${classification.reason}

## 置信度:
${classification.confidence}

请生成：
1. 针对当前最大阻碍的话术建议（Talk-tracks）
2. 明确的行动计划（Action Plan）

要求：
- 话术要具体、可执行
- 行动计划要有时限和负责人
- 语气要专业、有同理心
- 关注客户的核心需求`,
  });
  
  return result.object;
}

/**
 * 构建上下文信息
 */
function buildContext(
  profile: CustomerProfile,
  state: string,
  classification: ClassificationResult
): string {
  const parts: string[] = [];
  
  // 需求场景
  if (profile.scene) {
    parts.push(`**需求场景**:`);
    if (profile.scene.usage_scenario) parts.push(`  用车场景: ${profile.scene.usage_scenario}`);
    if (profile.scene.key_motives?.length) parts.push(`  核心动机: ${profile.scene.key_motives.join(', ')}`);
    if (profile.scene.must_haves?.length) parts.push(`  必须有: ${profile.scene.must_haves.join(', ')}`);
  }
  
  // 车型偏好
  if (profile.preference) {
    parts.push(`**车型偏好**:`);
    if (profile.preference.intent_model) parts.push(`  意向车型: ${profile.preference.intent_model}`);
    if (profile.preference.config_preference?.length) {
      parts.push(`  配置偏好: ${profile.preference.config_preference.join(', ')}`);
    }
  }
  
  // 预算与支付
  if (profile.budget_payment) {
    parts.push(`**预算与支付**:`);
    if (profile.budget_payment.budget_limit) parts.push(`  预算范围: ${profile.budget_payment.budget_limit}`);
    if (profile.budget_payment.payment_method) parts.push(`  支付方式: ${profile.budget_payment.payment_method}`);
    if (profile.budget_payment.price_sensitivity) {
      parts.push(`  价格敏感度: ${profile.budget_payment.price_sensitivity}`);
    }
  }
  
  // 时间因素
  if (profile.timing) {
    parts.push(`**时间因素**:`);
    if (profile.timing.delivery_timeline) parts.push(`  提车时间: ${profile.timing.delivery_timeline}`);
    if (profile.timing.trigger_event) parts.push(`  触发事件: ${profile.timing.trigger_event}`);
  }
  
  // 决策单元
  if (profile.decision_unit) {
    parts.push(`**决策单元**:`);
    if (profile.decision_unit.decision_maker_involved !== undefined) {
      parts.push(`  决策人在场: ${profile.decision_unit.decision_maker_involved ? '是' : '否'}`);
    }
    if (profile.decision_unit.payer) parts.push(`  付款人: ${profile.decision_unit.payer}`);
  }
  
  // 竞品情况
  if (profile.competitor) {
    parts.push(`**竞品情况**:`);
    if (profile.competitor.competing_models?.length) {
      parts.push(`  竞品车型: ${profile.competitor.competing_models.join(', ')}`);
    }
    if (profile.competitor.main_conflict) parts.push(`  主要冲突: ${profile.competitor.main_conflict}`);
  }
  
  // 阻碍因素
  if (profile.blockers) {
    parts.push(`**阻碍因素**:`);
    if (profile.blockers.main_blocker) parts.push(`  主要阻碍: ${profile.blockers.main_blocker}`);
    if (profile.blockers.intensity) parts.push(`  阻碍强度: ${profile.blockers.intensity}`);
  }
  
  return parts.join('\n');
}
