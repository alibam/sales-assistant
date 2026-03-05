/**
 * Dual-Track Engine Tests
 * Tests Copilot and Post-Call mode routing and question generation
 */

import { test, expect } from '@playwright/test';
import { processDualTrack } from '@/lib/ai/dual-track-engine';
import type { CustomerProfile } from '@/lib/ai/types';

test.describe('Dual-Track Engine', () => {
  test('Copilot mode should generate customer-facing script', async () => {
    const result = await processDualTrack({
      mode: 'copilot',
      customerProfile: { budget_payment: { budget_limit: '20-30万' } },
      userInput: '客户说家里有两个孩子，需要空间大的车',
      conversationHistory: [],
    });

    expect(result.mode).toBe('copilot');
    expect(result.aiResponse).toContain('您可以这样问客户');
    expect(result.completionRate).toBeGreaterThan(0);
    expect(result.completionRate).toBeLessThan(100);
  });

  test('Post-Call mode should generate sales-facing question', async () => {
    const result = await processDualTrack({
      mode: 'postCall',
      customerProfile: {},
      userInput: '客户说想买一辆 SUV，预算不是问题，主要用来接送孩子上学',
      conversationHistory: [],
    });

    expect(result.mode).toBe('postCall');
    expect(result.aiResponse).toContain('🔍');
    expect(result.completionRate).toBeGreaterThan(0);
  });

  test('should extract profile information from user input', async () => {
    const result = await processDualTrack({
      mode: 'copilot',
      customerProfile: {},
      userInput: '客户说预算30万，想买SUV，下个月提车',
      conversationHistory: [],
    });

    expect(result.extractedInfo).toBeDefined();
    expect(result.updatedProfile).toBeDefined();
    expect(result.updatedProfile.budget_payment?.budget_limit).toBeDefined();
    expect(result.updatedProfile.preference?.intent_model).toBeDefined();
  });

  test('should stop asking when completion >= 80%', async () => {
    // Create a nearly complete profile
    const nearlyCompleteProfile: Partial<CustomerProfile> = {
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
      },
      competitor: {
        competing_models: ['汉兰达'],
        has_quote: true,
      },
    };

    const result = await processDualTrack({
      mode: 'copilot',
      customerProfile: nearlyCompleteProfile,
      userInput: '客户确认了颜色偏好',
      conversationHistory: [],
    });

    expect(result.completionRate).toBeGreaterThanOrEqual(80);
    expect(result.shouldContinue).toBe(false);
    expect(result.aiResponse).toContain('完整');
  });

  test('should identify missing critical fields', async () => {
    const result = await processDualTrack({
      mode: 'postCall',
      customerProfile: {
        scene: { usage_scenario: '家用' },
      },
      userInput: '客户说想买车',
      conversationHistory: [],
    });

    expect(result.missingFields.length).toBeGreaterThan(0);

    // Should have critical fields in missing list
    const hasCriticalField = result.missingFields.some((f) => f.priority === 'critical');
    expect(hasCriticalField).toBe(true);
  });

  test('should provide actionable next steps', async () => {
    const result = await processDualTrack({
      mode: 'copilot',
      customerProfile: {},
      userInput: '客户刚进店',
      conversationHistory: [],
    });

    expect(result.nextSteps).toBeDefined();
    expect(result.nextSteps.length).toBeGreaterThan(0);
    expect(result.nextSteps.length).toBeLessThanOrEqual(3);
  });

  test('Copilot mode should generate different questions for different gaps', async () => {
    // Test with missing budget
    const result1 = await processDualTrack({
      mode: 'copilot',
      customerProfile: {
        preference: { intent_model: 'SUV' },
      },
      userInput: '客户说想看SUV',
      conversationHistory: [],
    });

    // Test with missing intent model
    const result2 = await processDualTrack({
      mode: 'copilot',
      customerProfile: {
        budget_payment: { budget_limit: '30万' },
      },
      userInput: '客户说预算30万',
      conversationHistory: [],
    });

    // Questions should be different
    expect(result1.nextQuestion).toBeDefined();
    expect(result2.nextQuestion).toBeDefined();
    expect(result1.nextQuestion).not.toBe(result2.nextQuestion);
  });

  test('Post-Call mode should use conversation history to avoid repetition', async () => {
    const conversationHistory = [
      { role: 'user' as const, content: '客户说预算30万' },
      { role: 'assistant' as const, content: '请回忆客户是否提到意向车型？' },
    ];

    const result = await processDualTrack({
      mode: 'postCall',
      customerProfile: {
        budget_payment: { budget_limit: '30万' },
      },
      userInput: '客户说想买SUV',
      conversationHistory,
    });

    // Should not ask about budget or intent model again
    expect(result.nextQuestion).toBeDefined();
    if (result.nextQuestion) {
      expect(result.nextQuestion.toLowerCase()).not.toContain('预算');
      expect(result.nextQuestion.toLowerCase()).not.toContain('车型');
    }
  });
});
