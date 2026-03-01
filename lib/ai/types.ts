/**
 * Core type definitions for the Gap Analysis Engine.
 * All types are derived from profile_schema.json structure.
 */

// ── Profile Schema Types (mirrors profile_schema.json structure) ──

/** ① 需求与场景 */
export interface SceneProfile {
  usage_scenario?: string;
  key_motives?: string[];
  must_haves?: string[];
  compromisable?: string[];
}

/** ② 车型与偏好 */
export interface PreferenceProfile {
  intent_model?: string;
  config_preference?: string[];
  color_and_inventory?: string;
}

/** ③ 预算与付款 */
export interface BudgetPaymentProfile {
  budget_limit?: string;
  payment_method?: '全款' | '贷款' | '分期' | '融资租赁' | '未知';
  price_sensitivity?: '高' | '中' | '低' | '未知';
}

/** ④ 时间窗口 */
export interface TimingProfile {
  delivery_timeline?: '3天' | '1周' | '本月' | '不急' | '未知';
  trigger_event?: string;
}

/** ⑤ 决策单元 */
export interface DecisionUnitProfile {
  decision_maker_involved?: boolean;
  payer?: string;
  family_visit_required?: boolean;
  objection_source?: string;
}

/** ⑥ 竞品与对比 */
export interface CompetitorProfile {
  competing_models?: string[];
  has_quote?: boolean;
  main_conflict?: '价格' | '配置' | '品牌' | '保值' | '续航' | '空间' | '无' | '未知';
}

/** ⑦ 交易要素 */
export interface DealFactorsProfile {
  trade_in_info?: string;
  finance_info?: string;
  delivery_acceptance?: string;
}

/** ⑧ 风险与阻塞 */
export interface BlockersProfile {
  main_blocker?: '价格' | '竞品' | '决策人' | '金融' | '置换' | '现车' | '信任' | '时间' | '无';
  intensity?: '高' | '中' | '低' | '无';
  needs_manager?: boolean;
}

/** Complete customer profile combining all sections */
export interface CustomerProfile {
  scene?: SceneProfile;
  preference?: PreferenceProfile;
  budget_payment?: BudgetPaymentProfile;
  timing?: TimingProfile;
  decision_unit?: DecisionUnitProfile;
  competitor?: CompetitorProfile;
  deal_factors?: DealFactorsProfile;
  blockers?: BlockersProfile;
}

/** A single field definition from the profile schema */
export interface SchemaFieldDef {
  type: string;
  description: string;
  enum?: string[];
  items?: { type: string };
}

/** A section of the profile schema (e.g., "preference", "budget_payment") */
export interface SchemaSectionDef {
  type: 'object';
  title: string;
  properties: Record<string, SchemaFieldDef>;
  required?: string[];
}

/** Parsed profile schema structure */
export interface ProfileSchema {
  title: string;
  description: string;
  properties: Record<string, SchemaSectionDef>;
  required: string[];
  metadata: {
    version: string;
    industry: string;
    locale: string;
    classification_rules: Record<string, string>;
  };
}

/** A single identified gap in the customer profile */
export interface ProfileGap {
  /** Section key, e.g. "budget_payment" */
  section: string;
  /** Section display title, e.g. "③ 预算与付款" */
  sectionTitle: string;
  /** Field key, e.g. "budget_limit" */
  field: string;
  /** Field description from schema */
  description: string;
  /** Whether this field is required at the section or root level */
  isRequired: boolean;
  /** Priority: critical fields (budget, decision_maker, timeframe) rank higher */
  priority: 'critical' | 'high' | 'normal';
}

/** Result of the full gap analysis pipeline */
export interface GapAnalysisResult {
  /** Structured profile data extracted from input */
  extractedProfile: CustomerProfile;
  /** Merged profile (existing + extracted) */
  mergedProfile: CustomerProfile;
  /** List of identified gaps */
  gaps: ProfileGap[];
  /** Generated follow-up prompt for the sales rep */
  followUpPrompt: string;
  /** Profile completeness percentage */
  completeness: number;
}
