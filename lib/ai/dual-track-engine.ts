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
    ? `\n\n对话历史（避免重复提问）：\n${conversationHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}`
    : '';

  const prompt = `你是一个汽车4S店的AI销售助手。请生成一个自然、专业的问题，让销售顾问用来询问客户。

当前需要补充的信息：
- 字段：${topGap.description}
- 优先级：${topGap.priority}

当前客户画像：
${JSON.stringify(currentProfile, null, 2)}
${historyContext}

要求：
1. 问题要自然、口语化，符合销售场景
2. 不要生硬地问"您的预算是多少"，而是用更委婉的方式
3. 问题要简短，一次只问一个核心点
4. 避免重复之前已经问过的问题
5. 只返回问题本身，不要加任何前缀或解释

请生成问题：`;

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
