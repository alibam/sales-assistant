/**
 * M4.5 Dual-Track Profile Collection Engine
 *
 * Supports two modes:
 * 1. Copilot Mode: AI guides sales to ask customers (generates customer-facing scripts)
 * 2. Post-Call Mode: AI asks sales to complete profile (generates sales-facing questions)
 */

import { generateText } from 'ai';
import { getAIModel } from './provider';
import { runGapAnalysis } from './gap-analysis';
import type { CustomerProfile, ProfileGap } from './types';

/** Conversation message for history tracking */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Input for dual-track processing */
export interface DualTrackInput {
  mode: 'copilot' | 'postCall';
  customerProfile: Partial<CustomerProfile>;
  userInput: string;
  conversationHistory?: ConversationMessage[];
}

/** Output from dual-track processing */
export interface DualTrackOutput {
  mode: 'copilot' | 'postCall';
  aiResponse: string;
  extractedInfo?: Partial<CustomerProfile>;
  updatedProfile: Partial<CustomerProfile>;
  completionRate: number;
  shouldContinue: boolean;
  nextQuestion?: string;
  missingFields: ProfileGap[];
  nextSteps: string[];
}

/** Completion threshold for profile (80%) */
const COMPLETION_THRESHOLD = 80;

/**
 * Main entry point for dual-track processing.
 * Routes to appropriate mode handler.
 */
export async function processDualTrack(input: DualTrackInput): Promise<DualTrackOutput> {
  if (input.mode === 'copilot') {
    return processCopilotMode(input);
  } else {
    return processPostCallMode(input);
  }
}

/**
 * Copilot Mode: AI guides sales to ask customers.
 * Generates customer-facing scripts.
 */
async function processCopilotMode(input: DualTrackInput): Promise<DualTrackOutput> {
  // Run gap analysis to extract info and identify gaps
  const gapResult = await runGapAnalysis(input.userInput, input.customerProfile);

  const completionRate = gapResult.completeness;
  const shouldContinue = completionRate < COMPLETION_THRESHOLD;

  let aiResponse = '';
  let nextQuestion: string | undefined;

  if (shouldContinue && gapResult.gaps.length > 0) {
    // Generate customer-facing question
    nextQuestion = await generateCustomerQuestion(
      gapResult.gaps,
      gapResult.mergedProfile,
      input.conversationHistory,
    );
    aiResponse = `💬 您可以这样问客户：\n\n"${nextQuestion}"`;
  } else {
    aiResponse = '✅ 客户画像已基本完整（完成度 ≥ 80%），可以进入策略生成阶段。';
  }

  return {
    mode: 'copilot',
    aiResponse,
    extractedInfo: gapResult.extractedProfile,
    updatedProfile: gapResult.mergedProfile,
    completionRate,
    shouldContinue,
    nextQuestion,
    missingFields: gapResult.gaps,
    nextSteps: gapResult.nextSteps,
  };
}

/**
 * Post-Call Mode: AI asks sales to complete profile.
 * Generates sales-facing questions based on call recording summary.
 */
async function processPostCallMode(input: DualTrackInput): Promise<DualTrackOutput> {
  // Run gap analysis to extract info and identify gaps
  const gapResult = await runGapAnalysis(input.userInput, input.customerProfile);

  const completionRate = gapResult.completeness;
  const shouldContinue = completionRate < COMPLETION_THRESHOLD;

  let aiResponse = '';
  let nextQuestion: string | undefined;

  if (shouldContinue && gapResult.gaps.length > 0) {
    // Generate sales-facing question
    nextQuestion = await generateSalesQuestion(
      gapResult.gaps,
      gapResult.mergedProfile,
      input.conversationHistory,
    );
    aiResponse = `🔍 ${nextQuestion}`;
  } else {
    aiResponse = '✅ 客户画像已基本完整（完成度 ≥ 80%），可以进入策略生成阶段。';
  }

  return {
    mode: 'postCall',
    aiResponse,
    extractedInfo: gapResult.extractedProfile,
    updatedProfile: gapResult.mergedProfile,
    completionRate,
    shouldContinue,
    nextQuestion,
    missingFields: gapResult.gaps,
    nextSteps: gapResult.nextSteps,
  };
}

/**
 * Generate customer-facing question for Copilot mode.
 * Creates natural, professional scripts for sales to use with customers.
 */
async function generateCustomerQuestion(
  gaps: ProfileGap[],
  currentProfile: CustomerProfile,
  conversationHistory?: ConversationMessage[],
): Promise<string> {
  const topGap = gaps[0];
  const historyContext = conversationHistory && conversationHistory.length > 0
    ? `\n\n对话历史（最近3轮）：\n${conversationHistory.slice(-3).map(m => `${m.role === 'user' ? '销售员输入' : 'AI建议'}: ${m.content}`).join('\n')}`
    : '';

  const prompt = `你是一个高情商的金牌销售教练，正在实时指导销售员与客户对话。

【当前情况】
销售员刚刚输入了客户的最新动态或回应。

【你的任务】
你必须首先针对当前情况给出 1-2 句应对建议或肯定，然后再自然地、顺水推舟地引出对缺失字段的探需话术。

【当前需要补充的信息】
- 字段：${topGap.description}
- 优先级：${topGap.priority}

【当前客户画像】
${JSON.stringify(currentProfile, null, 2)}
${historyContext}

【极其重要的要求】
1. 绝对不允许生硬地直接抛出问题！必须先给出针对当前情况的应对建议
2. 话术必须贴近真实销售场景，像人类销冠一样有同理心
3. 不要生硬地问"您的预算是多少"，而是用更委婉、更自然的方式
4. 问题要简短，一次只问一个核心点
5. 避免重复之前已经问过的问题
6. 只返回话术本身，不要加任何前缀或解释

【输出格式示例】
"不错！客户对这个配置很感兴趣。您可以顺势问：'您这边大概准备投入多少预算呢？我帮您看看有哪些合适的方案。'"

请生成话术：`;

  const { text } = await generateText({
    model: getAIModel(),
    prompt,
  });

  return text.trim();
}

/**
 * Generate sales-facing question for Post-Call mode.
 * Creates questions to help sales recall details from customer conversations.
 */
async function generateSalesQuestion(
  gaps: ProfileGap[],
  currentProfile: CustomerProfile,
  conversationHistory?: ConversationMessage[],
): Promise<string> {
  const topGap = gaps[0];
  const historyContext = conversationHistory && conversationHistory.length > 0
    ? `\n\n对话历史（避免重复提问）：\n${conversationHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}`
    : '';

  const prompt = `你是一个汽车4S店的AI销售助手。销售顾问刚结束与客户的通话，你需要帮助他补全客户画像。

当前需要补充的信息：
- 字段：${topGap.description}
- 优先级：${topGap.priority}

当前客户画像：
${JSON.stringify(currentProfile, null, 2)}
${historyContext}

要求：
1. 用"请回忆"或"录音中是否提到"等引导语
2. 问题要具体，帮助销售回忆细节
3. 一次只问一个核心点
4. 避免重复之前已经问过的问题
5. 只返回问题本身，不要加任何前缀

请生成问题：`;

  const { text } = await generateText({
    model: getAIModel(),
    prompt,
  });

  return text.trim();
}
