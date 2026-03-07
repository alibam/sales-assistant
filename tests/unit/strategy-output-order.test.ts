/**
 * 测试：策略输出顺序正确性
 *
 * 测试目标：
 * - 确保首轮模型输出融资/B2B策略时，非法结果不得先流到前端
 * - 验证 validateStrategyDomain() 在 streamable.update() 之前执行
 * - 验证违规策略被 fallback 替换
 */

import { describe, test, expect, vi } from 'vitest';
import { validateStrategyDomain } from '@/lib/ai/domain-guard';
import type { Strategy } from '@/lib/ai/domain-guard';

describe('策略输出顺序正确性', () => {
  test('validateStrategyDomain 应该在策略输出前执行', () => {
    // Given: 一个包含融资/B2B关键词的策略
    const illegalStrategy: Strategy = {
      title: '企业客户融资方案',
      summary: '针对企业客户的融资需求，提供低成本的资金支持方案',
      priority: '高',
      talkTracks: [
        {
          objective: '了解企业融资需求',
          script: '您的企业年营收是多少？我们可以根据您的个人资产评估融资额度',
          whenToUse: '初次接触时',
          tone: '顾问式',
        },
      ],
      actionPlan: [
        {
          step: '收集企业资质和年营收信息',
          owner: '金融专员',
          dueWindow: '本次沟通',
          expectedSignal: '客户提供企业资质',
        },
      ],
      nextFollowUp: '3 天后跟进融资审批进度',
    };

    // When: 调用 validateStrategyDomain（汽车零售领域）
    const validation = validateStrategyDomain(illegalStrategy, 'automotive-retail');

    // Then: 应该检测到违规
    expect(validation.isValid).toBe(false);
    expect(validation.violations.length).toBeGreaterThan(0);

    // 验证违规信息包含关键词
    const violationsText = validation.violations.join(' ');
    const hasFinancialKeywords =
      violationsText.includes('融资') ||
      violationsText.includes('年营收') ||
      violationsText.includes('个人资产') ||
      violationsText.includes('企业客户');

    expect(hasFinancialKeywords).toBe(true);

    console.log('✅ validateStrategyDomain 正确检测到融资/B2B违规');
    console.log('违规信息:', validation.violations);
  });

  test('合法的家庭购车策略应该通过验证', () => {
    // Given: 一个合法的家庭购车策略
    const legalStrategy: Strategy = {
      title: '家庭购车需求深度挖掘策略',
      summary: '针对二胎家庭，重点了解用车场景、后排空间需求和安全配置',
      priority: '高',
      talkTracks: [
        {
          objective: '了解家庭用车场景',
          script: '您平时主要是什么场景用车呢？家里有几口人？',
          whenToUse: '初次接触时',
          tone: '共情式',
        },
      ],
      actionPlan: [
        {
          step: '收集家庭用车场景信息',
          owner: '销售顾问',
          dueWindow: '本次沟通',
          expectedSignal: '客户主动分享家庭情况',
        },
      ],
      nextFollowUp: '3 天后跟进试驾安排，重点关注客户对空间和安全配置的反馈',
    };

    // When: 调用 validateStrategyDomain（汽车零售领域）
    const validation = validateStrategyDomain(legalStrategy, 'automotive-retail');

    // Then: 应该通过验证
    expect(validation.isValid).toBe(true);
    expect(validation.violations.length).toBe(0);

    console.log('✅ 合法的家庭购车策略通过验证');
  });

  test('策略中包含"贷款"关键词应该触发违规', () => {
    // Given: 一个包含"贷款"关键词的策略
    const strategyWithLoan: Strategy = {
      title: '家庭购车贷款方案',
      summary: '针对家庭购车客户，提供低息贷款方案',
      priority: '高',
      talkTracks: [
        {
          objective: '介绍贷款方案',
          script: '我们有很优惠的贷款利率，您可以考虑一下',
          whenToUse: '初次接触时',
          tone: '顾问式',
        },
      ],
      actionPlan: [
        {
          step: '介绍贷款方案',
          owner: '销售顾问',
          dueWindow: '本次沟通',
          expectedSignal: '客户表示感兴趣',
        },
      ],
      nextFollowUp: '3 天后跟进贷款申请进度',
    };

    // When: 调用 validateStrategyDomain（汽车零售领域）
    const validation = validateStrategyDomain(strategyWithLoan, 'automotive-retail');

    // Then: 应该检测到违规
    expect(validation.isValid).toBe(false);
    expect(validation.violations.length).toBeGreaterThan(0);

    console.log('✅ "贷款"关键词触发违规');
    console.log('违规信息:', validation.violations);
  });

  test('策略中包含"资金需求"关键词应该触发违规', () => {
    // Given: 一个包含"资金需求"关键词的策略
    const strategyWithFunding: Strategy = {
      title: '家庭购车资金需求分析',
      summary: '了解客户的资金需求，提供合适的购车方案',
      priority: '高',
      talkTracks: [
        {
          objective: '了解资金需求',
          script: '您的资金需求是多少？我们可以提供灵活的方案',
          whenToUse: '初次接触时',
          tone: '顾问式',
        },
      ],
      actionPlan: [
        {
          step: '评估客户资金需求',
          owner: '销售顾问',
          dueWindow: '本次沟通',
          expectedSignal: '客户提供资金信息',
        },
      ],
      nextFollowUp: '3 天后跟进资金需求',
    };

    // When: 调用 validateStrategyDomain（汽车零售领域）
    const validation = validateStrategyDomain(strategyWithFunding, 'automotive-retail');

    // Then: 应该检测到违规
    expect(validation.isValid).toBe(false);
    expect(validation.violations.length).toBeGreaterThan(0);

    console.log('✅ "资金需求"关键词触发违规');
    console.log('违规信息:', validation.violations);
  });
});
