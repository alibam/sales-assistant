/**
 * Gap Analysis Completion Tests
 * Tests weighted completeness calculation and priority sorting
 */

import { test, expect } from '@playwright/test';
import { calculateCompleteness, findProfileGaps, FIELD_WEIGHTS } from '@/lib/ai/gap-analysis';
import { loadProfileSchema } from '@/lib/config/profile-schema-loader';
import type { CustomerProfile } from '@/lib/ai/types';

test.describe('Gap Analysis - Weighted Completeness', () => {
  test('should calculate 0% for empty profile', async () => {
    const schema = loadProfileSchema();
    const profile: Partial<CustomerProfile> = {};

    const completeness = calculateCompleteness(profile as CustomerProfile, schema);

    expect(completeness).toBe(0);
  });

  test('should calculate higher percentage for critical fields', async () => {
    const schema = loadProfileSchema();

    // Profile with only low-priority fields
    const profileLowPriority: Partial<CustomerProfile> = {
      scene: { key_motives: ['家用'] },
      preference: { config_preference: ['天窗'] },
    };

    // Profile with critical fields
    const profileHighPriority: Partial<CustomerProfile> = {
      budget_payment: { budget_limit: '20-30万' },
      preference: { intent_model: 'SUV' },
    };

    const completenessLow = calculateCompleteness(profileLowPriority as CustomerProfile, schema);
    const completenessHigh = calculateCompleteness(profileHighPriority as CustomerProfile, schema);

    // Critical fields should contribute more to completeness
    expect(completenessHigh).toBeGreaterThan(completenessLow);
  });

  test('should calculate 100% for fully filled profile', async () => {
    const schema = loadProfileSchema();

    // Create a fully filled profile
    const profile: CustomerProfile = {
      scene: {
        usage_scenario: '家用',
        key_motives: ['二胎', '安全'],
        must_haves: ['空间大'],
        compromisable: ['动力'],
      },
      preference: {
        intent_model: 'SUV',
        config_preference: ['天窗', '座椅加热'],
        color_and_inventory: '白色优先',
      },
      budget_payment: {
        budget_limit: '20-30万',
        payment_method: '贷款',
        price_sensitivity: '中',
      },
      timing: {
        delivery_timeline: '本月',
        trigger_event: '二胎出生',
      },
      decision_unit: {
        decision_maker_involved: true,
        payer: '本人',
        family_visit_required: false,
        objection_source: '无',
      },
      competitor: {
        competing_models: ['汉兰达', 'CR-V'],
        has_quote: true,
        main_conflict: '价格',
      },
      deal_factors: {
        trade_in_info: '有旧车置换',
        finance_info: '可接受3年贷款',
        delivery_acceptance: '可等1周',
      },
      blockers: {
        main_blocker: '价格',
        intensity: '中',
        needs_manager: false,
      },
    };

    const completeness = calculateCompleteness(profile, schema);

    expect(completeness).toBe(100);
  });

  test('should prioritize critical fields in gap list', async () => {
    const schema = loadProfileSchema();
    const profile: Partial<CustomerProfile> = {};

    const gaps = findProfileGaps(profile as CustomerProfile, schema);

    // First gap should be critical priority
    expect(gaps[0].priority).toBe('critical');

    // Critical fields should appear first
    const criticalGaps = gaps.filter((g) => g.priority === 'critical');
    expect(criticalGaps.length).toBeGreaterThan(0);
  });

  test('should sort gaps by priority (critical > high > normal)', async () => {
    const schema = loadProfileSchema();
    const profile: Partial<CustomerProfile> = {};

    const gaps = findProfileGaps(profile as CustomerProfile, schema);

    // Verify sorting order
    let lastPriority = 0; // critical = 0, high = 1, normal = 2
    const priorityOrder = { critical: 0, high: 1, normal: 2 };

    for (const gap of gaps) {
      const currentPriority = priorityOrder[gap.priority];
      expect(currentPriority).toBeGreaterThanOrEqual(lastPriority);
      lastPriority = currentPriority;
    }
  });

  test('should track completeness increase as fields are filled', async () => {
    const schema = loadProfileSchema();

    // Start with empty profile
    let profile: Partial<CustomerProfile> = {};
    let completeness1 = calculateCompleteness(profile as CustomerProfile, schema);
    expect(completeness1).toBe(0);

    // Add budget (critical field, weight 3)
    profile = { budget_payment: { budget_limit: '20-30万' } };
    let completeness2 = calculateCompleteness(profile as CustomerProfile, schema);
    expect(completeness2).toBeGreaterThan(completeness1);

    // Add usage scenario (medium priority, weight 2)
    profile = {
      budget_payment: { budget_limit: '20-30万' },
      scene: { usage_scenario: '家用' },
    };
    let completeness3 = calculateCompleteness(profile as CustomerProfile, schema);
    expect(completeness3).toBeGreaterThan(completeness2);

    // Add more fields
    profile = {
      budget_payment: { budget_limit: '20-30万' },
      scene: { usage_scenario: '家用' },
      preference: { intent_model: 'SUV' },
      timing: { delivery_timeline: '本月' },
    };
    let completeness4 = calculateCompleteness(profile as CustomerProfile, schema);
    expect(completeness4).toBeGreaterThan(completeness3);
  });
});
