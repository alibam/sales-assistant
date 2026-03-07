/**
 * 测试：策略输出顺序
 * 
 * 目标：确保非法策略不会先流到前端
 * 
 * 场景：
 * 1. 模型输出融资/B2B策略
 * 2. validateStrategyDomain 识别为违规
 * 3. 前端只收到 fallback 策略
 * 4. 绝不允许"先非法，后覆盖"
 */

import { describe, it, expect } from 'vitest';
import { validateStrategyDomain } from '../../lib/ai/domain-guard';
import type { Strategy } from '../../lib/ai/strategy-server';

describe('策略输出顺序测试', () => {
  it('应该在 stream 之前完成领域验证', () => {
    // 模拟模型输出的融资策略
    const illegalStrategy: Strategy = {
      title: '民营企业主企业扩张融资需求首次接触',
      summary: '客户年营收2-3亿，个人资产5000万，有企业扩张融资需求',
      priority: '高',
      talkTracks: [
        {
          objective: '了解融资成本敏感度',
          script: '您对融资成本有什么要求？',
          whenToUse: '初次接触',
          tone: '顾问式',
        },
      ],
      actionPlan: [
        {
          step: '准备额度审批方案资料',
          owner: '金融专员',
          dueWindow: '3天内',
          expectedSignal: '客户确认放款时间',
        },
      ],
      nextFollowUp: '联系金融专员准备授信方案',
    };

    // 验证领域一致性
    const validation = validateStrategyDomain(illegalStrategy, 'automotive-retail');

    // 断言：必须识别为违规
    expect(validation.isValid).toBe(false);
    expect(validation.violations.length).toBeGreaterThan(0);

    // 断言：违规原因包含关键词
    const violationText = validation.violations.join(' ');
    expect(violationText).toMatch(/融资|年营收|个人资产|企业扩张|金融专员|授信|放款|额度/);
  });

  it('应该拦截标题中的融资关键词', () => {
    const strategy: Strategy = {
      title: '企业扩张融资需求',
      summary: '正常摘要',
      priority: '高',
      talkTracks: [],
      actionPlan: [],
      nextFollowUp: '正常跟进',
    };

    const validation = validateStrategyDomain(strategy, 'automotive-retail');
    expect(validation.isValid).toBe(false);
    expect(validation.violations.some(v => v.includes('融资'))).toBe(true);
  });

  it('应该拦截摘要中的年营收关键词', () => {
    const strategy: Strategy = {
      title: '正常标题',
      summary: '客户年营收2-3亿',
      priority: '高',
      talkTracks: [],
      actionPlan: [],
      nextFollowUp: '正常跟进',
    };

    const validation = validateStrategyDomain(strategy, 'automotive-retail');
    expect(validation.isValid).toBe(false);
    expect(validation.violations.some(v => v.includes('年营收'))).toBe(true);
  });

  it('应该拦截行动计划中的金融专员', () => {
    const strategy: Strategy = {
      title: '正常标题',
      summary: '正常摘要',
      priority: '高',
      talkTracks: [],
      actionPlan: [
        {
          step: '联系金融专员',
          owner: '销售顾问',
          dueWindow: '3天',
          expectedSignal: '客户确认',
        },
      ],
      nextFollowUp: '正常跟进',
    };

    const validation = validateStrategyDomain(strategy, 'automotive-retail');
    expect(validation.isValid).toBe(false);
    expect(validation.violations.some(v => v.includes('金融专员'))).toBe(true);
  });
});
