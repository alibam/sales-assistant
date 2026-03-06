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
  const gapResult = await runGapAnalysis(input.userInput, input.customerProfile, input.conversationHistory);

  const completionRate = gapResult.completeness;
  const shouldContinue = completionRate < COMPLETION_THRESHOLD;

  let aiResponse = '';
  let nextQuestion: string | undefined;

  // 拆除硬阻断：即使完成度达标，也继续生成 AI 话术
  if (gapResult.gaps.length > 0) {
    // Generate customer-facing question
    nextQuestion = await generateCustomerQuestion(
      input.userInput,
      gapResult.gaps,
      gapResult.mergedProfile,
      input.conversationHistory,
    );
    aiResponse = `💬 您可以这样问客户：\n\n"${nextQuestion}"`;
    
    // 如果完成度达标，追加提示
    if (!shouldContinue) {
      aiResponse += '\n\n*(💡 画像完成度达标，您可以随时点击生成策略，或继续提问)*';
    }
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
  const gapResult = await runGapAnalysis(input.userInput, input.customerProfile, input.conversationHistory);

  const completionRate = gapResult.completeness;
  const shouldContinue = completionRate < COMPLETION_THRESHOLD;

  let aiResponse = '';
  let nextQuestion: string | undefined;

  // 拆除硬阻断：即使完成度达标，也继续生成 AI 话术
  if (gapResult.gaps.length > 0) {
    // Generate sales-facing question
    nextQuestion = await generateSalesQuestion(
      gapResult.gaps,
      gapResult.mergedProfile,
      input.conversationHistory,
    );
    aiResponse = `🔍 ${nextQuestion}`;
    
    // 如果完成度达标，追加提示
    if (!shouldContinue) {
      aiResponse += '\n\n*(💡 画像完成度达标，您可以随时点击生成策略，或继续提问)*';
    }
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
  userInput: string,
  gaps: ProfileGap[],
  currentProfile: CustomerProfile,
  conversationHistory?: ConversationMessage[],
): Promise<string> {
  // 提取前 3 个高优先级 Gap 作为候选池
  const availableGaps = gaps.slice(0, 3).map(g => `- ${g.description} (优先级: ${g.priority})`).join('\n');

  // 提取并格式化更长的历史记录（保留最近 8 条）
  const historyContext = conversationHistory && conversationHistory.length > 0
    ? conversationHistory.slice(-8).map(m => `${m.role === 'user' ? '销售' : 'AI教练'}: ${m.content}`).join('\n')
    : '无';

  const prompt = `你是一个年薪百万的奔驰4S店金牌内训师（Copilot）。销售员正在向你实时汇报客户的最新动态。

【近期对话历史（用于查重，绝对禁止重复提问）】：
${historyContext}

销售员刚刚的汇报：
"${userInput}"

【待补全画像候选清单】：
${availableGaps}

你的任务是教销售员怎么接话。

【金牌销售法则（必须严格遵守）】
🚨 绝对红线（情绪感知 - 最高优先级）：仔细评估销售员输入的客户情绪。如果客户表现出不耐烦、拒绝回答、或者说"别问了"、"不用你管"、"直接算价格"、"烦死了"、"够了"，你【绝对不允许】再去追问候选清单里的任何 Gap！此时你的唯一任务是教销售员【立刻道歉、安抚、并顺着客户的意思直接抛出利益点或报价】，彻底放弃探需！

示例：
- 客户说"别问了，直接报价吧" → 你的话术："好的好的，不好意思问得有点多。咱们这边 GLC 目前有现车优惠，落地价大概在 XX 万左右，您看这个价位能接受吗？"
- 客户说"不用你管，我自己看" → 你的话术："好的，您先随便看看，有任何问题随时叫我。对了，咱们这边现在有个限时活动，您可以了解一下..."

1. 接化发：你必须先教销售员如何接住客户刚才的话！如果客户提到了竞品（如理想L8）或抛出了痛点/底牌，你的话术必须先针对性地回应这个点，化解抗拒。

2. 顺水推舟（动态探需）：仔细分析客户刚才的话题。从上面的【待补全画像候选清单】中，挑选 1 个【最顺应当前聊天上下文】的字段进行自然发问。
   🚨 极其重要：如果客户还在看空间、聊配置，绝对不允许跨越阶段去问"预算"或"付款方式"！只有客户主动提及竞品或价格，或者其他话题已聊透时，才能切入资金话题。

3. 防复读机制（极其重要）：发问前，必须仔细检查上面的【近期对话历史】。如果某个话题（如"平时谁开"、"预算多少"、"看重什么配置"）AI教练之前已经教销售问过了，即使该字段目前还在候选清单里，你也【绝对不允许】换个说法再次提问！你必须绕开已问过的话题，切入候选清单里的其他陌生维度。

绝对不要用"不错！"、"太棒了！"这种假大空的机器人赞美。
话术必须像真人说话一样口语化、接地气。

【输出格式】
只需要输出教给销售员的话术原句（放在双引号内），不要任何解释。

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
