/**
 * Gap Analysis Engine — THE CORE MODULE
 *
 * Uses Vercel AI SDK generateObject to extract structured customer profile
 * data from unstructured sales rep input, identify missing fields (gaps),
 * and generate follow-up prompts.
 */
import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModel } from './provider';
import type {
  CustomerProfile,
  ProfileGap,
  GapAnalysisResult,
  ProfileSchema,
} from './types';
import { loadProfileSchema, getAllFields } from '../config/profile-schema-loader';

// ── Zod schema for generateObject extraction ──

const sceneSchema = z.object({
  usage_scenario: z.string().optional().describe('用车场景（通勤/家庭/二胎/长途/商务等）'),
  key_motives: z.array(z.string()).optional().describe('关键购车动机'),
  must_haves: z.array(z.string()).optional().describe('客户的必须项'),
  compromisable: z.array(z.string()).optional().describe('客户的可妥协项'),
});

const preferenceSchema = z.object({
  intent_model: z.string().optional().describe('意向车型/级别/能源类型'),
  config_preference: z.array(z.string()).optional().describe('配置偏好'),
  color_and_inventory: z.string().optional().describe('颜色偏好与现车偏好'),
});

const budgetPaymentSchema = z.object({
  budget_limit: z.string().optional().describe('预算口径（落地价上限/月供上限/首付上限）'),
  payment_method: z.enum(['全款', '贷款', '分期', '融资租赁', '未知']).optional().describe('付款方式倾向'),
  price_sensitivity: z.enum(['高', '中', '低', '未知']).optional().describe('价格敏感度'),
});

const timingSchema = z.object({
  delivery_timeline: z.enum(['3天', '1周', '本月', '不急', '未知']).optional().describe('计划提车时间'),
  trigger_event: z.string().optional().describe('触发购车的事件'),
});

const decisionUnitSchema = z.object({
  decision_maker_involved: z.boolean().optional().describe('最终拍板人是否已参与沟通'),
  payer: z.string().optional().describe('实际出钱人'),
  family_visit_required: z.boolean().optional().describe('是否需要家人后续到店'),
  objection_source: z.string().optional().describe('反对点来自谁'),
});

const competitorSchema = z.object({
  competing_models: z.array(z.string()).optional().describe('对比的竞品车型'),
  has_quote: z.boolean().optional().describe('是否已在竞品处拿到报价'),
  main_conflict: z.enum(['价格', '配置', '品牌', '保值', '续航', '空间', '无', '未知']).optional().describe('最纠结的对比点'),
});

const dealFactorsSchema = z.object({
  trade_in_info: z.string().optional().describe('置换情况'),
  finance_info: z.string().optional().describe('金融情况'),
  delivery_acceptance: z.string().optional().describe('对现车或排产等待期的接受度'),
});

const blockersSchema = z.object({
  main_blocker: z.enum(['价格', '竞品', '决策人', '金融', '置换', '现车', '信任', '时间', '无']).optional().describe('当前促单最大卡点'),
  intensity: z.enum(['高', '中', '低', '无']).optional().describe('卡点强度'),
  needs_manager: z.boolean().optional().describe('是否需要经理介入'),
});

/** Complete customer profile zod schema for generateObject */
const customerProfileSchema = z.object({
  scene: sceneSchema.optional(),
  preference: preferenceSchema.optional(),
  budget_payment: budgetPaymentSchema.optional(),
  timing: timingSchema.optional(),
  decision_unit: decisionUnitSchema.optional(),
  competitor: competitorSchema.optional(),
  deal_factors: dealFactorsSchema.optional(),
  blockers: blockersSchema.optional(),
});

/** Fields considered critical for A/B/C/D classification */
const CRITICAL_FIELDS = new Set([
  'budget_payment.budget_limit',
  'decision_unit.decision_maker_involved',
  'decision_unit.payer',
  'timing.delivery_timeline',
  'preference.intent_model',
]);

/**
 * Extract structured customer profile data from unstructured sales rep input.
 * Uses Vercel AI SDK generateObject with Claude for structured extraction.
 *
 * @param input - Raw natural language input from the sales rep
 * @param existingProfile - Optional existing profile to provide context
 * @returns Extracted customer profile fields
 */
export async function analyzeCustomerInput(
  input: string,
  existingProfile?: Partial<CustomerProfile>,
): Promise<CustomerProfile> {
  const existingContext = existingProfile
    ? `\n\n已有客户画像数据（仅供参考，请基于新输入提取增量信息）：\n${JSON.stringify(existingProfile, null, 2)}`
    : '';

  const { object } = await generateObject({
    model: getAIModel(),
    schema: customerProfileSchema,
    prompt: `你是一个汽车4S店的AI销售助手。请从以下销售顾问的输入中，提取客户画像信息。

规则：
- 只提取输入中明确提到或可以合理推断的信息
- 如果某个字段在输入中没有提及，不要填写（留空/省略）
- 对于枚举字段，如果无法确定，使用"未知"
- 保持提取的信息忠实于原始输入，不要编造
${existingContext}

销售顾问输入：
${input}`,
  });

  return object as CustomerProfile;
}

/**
 * Compare extracted profile against required fields in profile_schema.json.
 * Identifies missing required fields (the "gaps").
 *
 * @param profile - The current (merged) customer profile
 * @param schema - The profile schema configuration
 * @returns List of missing fields with metadata
 */
export function findProfileGaps(
  profile: CustomerProfile,
  schema: ProfileSchema,
): ProfileGap[] {
  const gaps: ProfileGap[] = [];
  const allFields = getAllFields(schema);
  const rootRequired = new Set(schema.required);

  for (const { section, sectionTitle, field, fieldDef, isRequired } of allFields) {
    const sectionData = profile[section as keyof CustomerProfile] as Record<string, unknown> | undefined;
    const value = sectionData?.[field];

    // Check if the field is missing or empty
    const isMissing =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0);

    if (!isMissing) continue;

    const fieldPath = `${section}.${field}`;
    const isCritical = CRITICAL_FIELDS.has(fieldPath);
    const isRootRequired = rootRequired.has(section) && isRequired;

    let priority: ProfileGap['priority'] = 'normal';
    if (isCritical) priority = 'critical';
    else if (isRootRequired) priority = 'high';

    // Only report required fields and critical fields as gaps
    if (isRequired || isCritical) {
      gaps.push({
        section,
        sectionTitle,
        field,
        description: fieldDef.description,
        isRequired: isRootRequired,
        priority,
      });
    }
  }

  // Sort: critical first, then high, then normal
  const priorityOrder = { critical: 0, high: 1, normal: 2 };
  gaps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return gaps;
}

/**
 * Merge extracted profile into existing profile (shallow merge per section).
 *
 * @param existing - The existing customer profile
 * @param extracted - Newly extracted profile data
 * @returns Merged profile
 */
export function mergeProfiles(
  existing: Partial<CustomerProfile>,
  extracted: CustomerProfile,
): CustomerProfile {
  const merged: Record<string, unknown> = { ...existing };

  for (const [key, value] of Object.entries(extracted)) {
    if (value === undefined || value === null) continue;

    const existingSection = (existing as Record<string, unknown>)[key];
    if (existingSection && typeof existingSection === 'object' && typeof value === 'object') {
      merged[key] = { ...existingSection, ...value };
    } else {
      merged[key] = value;
    }
  }

  return merged as CustomerProfile;
}

/**
 * Generate a friendly, natural language follow-up question for the sales rep.
 * Prioritizes critical fields (budget, decision_maker, timeframe).
 *
 * @param gaps - List of identified profile gaps
 * @returns Conversational prompt asking for missing info
 */
export function generateFollowUpPrompt(gaps: ProfileGap[]): string {
  if (gaps.length === 0) {
    return '客户画像已经很完整了！可以进入意向度评估和策略生成阶段。';
  }

  const topGaps = gaps.slice(0, 3);

  const gapDescriptions = topGaps.map((gap) => {
    return `- ${gap.sectionTitle} → ${gap.description}`;
  });

  const urgencyNote =
    topGaps.some((g) => g.priority === 'critical')
      ? '（以下信息对判断客户意向度至关重要）'
      : '';

  return `还需要补充以下关键信息${urgencyNote}：\n${gapDescriptions.join('\n')}\n\n请在下次跟进时留意收集这些信息。`;
}

/**
 * Calculate profile completeness as a percentage.
 *
 * @param profile - Current customer profile
 * @param schema - Profile schema
 * @returns Completeness percentage (0-100)
 */
export function calculateCompleteness(
  profile: CustomerProfile,
  schema: ProfileSchema,
): number {
  const allFields = getAllFields(schema);
  let filled = 0;

  for (const { section, field } of allFields) {
    const sectionData = profile[section as keyof CustomerProfile] as Record<string, unknown> | undefined;
    const value = sectionData?.[field];
    const isFilled =
      value !== undefined &&
      value !== null &&
      value !== '' &&
      !(Array.isArray(value) && value.length === 0);
    if (isFilled) filled++;
  }

  return Math.round((filled / allFields.length) * 100);
}

/**
 * Run the full gap analysis pipeline.
 * This is the main entry point for the Gap Analysis Engine.
 *
 * @param input - Raw natural language input from sales rep
 * @param existingProfile - Optional existing customer profile
 * @returns Complete gap analysis result
 */
export async function runGapAnalysis(
  input: string,
  existingProfile?: Partial<CustomerProfile>,
): Promise<GapAnalysisResult> {
  const schema = loadProfileSchema();

  // Step 1: Extract structured data from input
  const extractedProfile = await analyzeCustomerInput(input, existingProfile);

  // Step 2: Merge with existing profile
  const mergedProfile = mergeProfiles(existingProfile ?? {}, extractedProfile);

  // Step 3: Find gaps
  const gaps = findProfileGaps(mergedProfile, schema);

  // Step 4: Generate follow-up prompt
  const followUpPrompt = generateFollowUpPrompt(gaps);

  // Step 5: Calculate completeness
  const completeness = calculateCompleteness(mergedProfile, schema);

  return {
    extractedProfile,
    mergedProfile,
    gaps,
    followUpPrompt,
    completeness,
  };
}
