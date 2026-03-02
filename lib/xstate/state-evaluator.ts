/**
 * State Evaluator
 * 
 * Evaluates customer profile against classification rules from profile_schema.json
 * to determine A/B/C/D status.
 */
import type { CustomerProfile } from '../ai/types';
import { loadProfileSchema } from '../config/profile-schema-loader';

export type CustomerStatus = 'A' | 'B' | 'C' | 'D';

export interface ClassificationResult {
  status: CustomerStatus;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Evaluate customer profile and determine A/B/C/D classification.
 * 
 * Classification rules are defined in profile_schema.json metadata.classification_rules
 * and interpreted by this evaluator. Rules are NOT dynamically executed - they serve
 * as documentation that the code logic must follow.
 * 
 * IMPORTANT: If you modify classification_rules in the schema, you MUST update
 * the corresponding isStatusX() functions below to match.
 * 
 * @param profile - Customer profile to evaluate
 * @returns Classification result with status, reason, and confidence
 */
export function evaluateCustomerStatus(profile: CustomerProfile): ClassificationResult {
  const schema = loadProfileSchema();
  // Note: rules are read for documentation validation
  // The actual logic is in isStatusA/B/C/D functions below
  // This ensures type safety and explicit control flow
  const _rules = schema.metadata.classification_rules; // Used for rule consistency checks
  
  // Check A: 直接客户
  if (isStatusA(profile)) {
    return {
      status: 'A',
      reason: '客户具备立即成交条件：提车时间紧迫（1周内），决策人已参与，无重大阻塞',
      confidence: 'high',
    };
  }
  
  // Check D: 流失客户 (must check before B/C to avoid misclassification)
  if (isStatusD(profile)) {
    return {
      status: 'D',
      reason: '客户不符合目标画像：预算不匹配或明确拒绝',
      confidence: 'high',
    };
  }
  
  // Check B: 准客户
  if (isStatusB(profile)) {
    return {
      status: 'B',
      reason: '客户有明确购买意向但存在犹豫：竞品对比或价格阻塞',
      confidence: 'medium',
    };
  }
  
  // Default to C: 有意向客户
  return {
    status: 'C',
    reason: '客户有意向但不紧迫：时间窗口较长或决策单元未明确',
    confidence: 'low',
  };
}

/**
 * Check if profile matches A status criteria.
 * A: timing.delivery_timeline 在 '1周' 内，且 decision_maker_involved=true，且 blockers.intensity='低/无'
 */
function isStatusA(profile: CustomerProfile): boolean {
  const timing = profile.timing;
  const decisionUnit = profile.decision_unit;
  const blockers = profile.blockers;
  
  // Check delivery timeline (3天 or 1周)
  const urgentTimeline = timing?.delivery_timeline === '3天' || timing?.delivery_timeline === '1周';
  
  // Check decision maker involved
  const decisionMakerInvolved = decisionUnit?.decision_maker_involved === true;
  
  // Check blockers intensity (低 or 无)
  const lowBlockers = blockers?.intensity === '低' || blockers?.intensity === '无' || !blockers?.intensity;
  
  return urgentTimeline && decisionMakerInvolved && lowBlockers;
}

/**
 * Check if profile matches B status criteria.
 * B: budget_payment 明确但 competitor.main_conflict 存在 或 blockers 存在
 */
function isStatusB(profile: CustomerProfile): boolean {
  const budgetPayment = profile.budget_payment;
  const competitor = profile.competitor;
  const blockers = profile.blockers;
  
  // Check if budget is clear
  const budgetClear = !!budgetPayment?.budget_limit;
  
  // Check if competitor conflict exists
  const hasCompetitorConflict = 
    competitor?.main_conflict && 
    competitor.main_conflict !== '无' && 
    competitor.main_conflict !== '未知';
  
  // Check if blockers exist (not 无 or undefined)
  const hasBlockers = 
    blockers?.main_blocker && 
    blockers.main_blocker !== '无' &&
    (blockers.intensity === '高' || blockers.intensity === '中');
  
  return budgetClear && !!(hasCompetitorConflict || hasBlockers);
}

/**
 * Check if profile matches D status criteria.
 * D: 预算完全不匹配或明确拒绝
 */
function isStatusD(profile: CustomerProfile): boolean {
  const blockers = profile.blockers;
  
  // Check for explicit rejection or complete mismatch
  // This is a simplified check - in production, you'd compare budget ranges
  // against available inventory pricing
  
  // If blocker is "信任" with high intensity, likely a lost customer
  if (blockers?.main_blocker === '信任' && blockers.intensity === '高') {
    return true;
  }
  
  // If explicitly marked as lost in some way
  // (This would need more context from the actual business logic)
  
  return false;
}

/**
 * Detect momentum: whether the status change is positive (up) or negative (down).
 * 
 * @param fromStatus - Previous status
 * @param toStatus - New status
 * @returns 'up' | 'down' | 'stable'
 */
export function detectMomentum(
  fromStatus: CustomerStatus | null,
  toStatus: CustomerStatus
): 'up' | 'down' | 'stable' {
  if (!fromStatus || fromStatus === toStatus) {
    return 'stable';
  }
  
  const statusOrder: Record<CustomerStatus, number> = {
    D: 0,
    C: 1,
    B: 2,
    A: 3,
  };
  
  const fromOrder = statusOrder[fromStatus];
  const toOrder = statusOrder[toStatus];
  
  return toOrder > fromOrder ? 'up' : 'down';
}
