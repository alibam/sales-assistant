/**
 * Customer Demo Page - 客户演示页面
 * 
 * 展示种子用户（张伟/李娜）的 A/B/C/D 画像信息
 * 支持跟进记录输入和 AI 策略流式生成
 * 
 * BDD 测试驱动开发：
 * - tests/customer-demo.spec.ts
 */
import { requireAuth } from '@/lib/auth/session';
import { CustomerDemoClient } from './client';
import type { CustomerProfile } from '@/lib/ai/types';

// 种子用户数据
const SEED_CUSTOMER = {
  name: '张伟',
  profile: {
    scene: {
      usage_scenario: '家庭用车',
      key_motives: ['安全性', '空间大'],
      must_haves: ['自动驾驶', '大空间'],
      compromisable: ['品牌'],
    },
    preference: {
      intent_model: 'SUV',
      config_preference: ['智能驾驶', '全景天窗'],
      color_and_inventory: '白色优先',
    },
    budget_payment: {
      budget_limit: '30万',
      payment_method: '全款' as const,
    },
    timing: {
      delivery_timeline: '本月' as const,
    },
    decision_unit: {
      decision_maker_involved: true,
    },
    blockers: {
      main_blocker: '价格' as const,
    },
  } as CustomerProfile,
  classification: {
    status: 'B' as const,
    reason: '预算充足，需求明确，但还在对比阶段',
    confidence: 'high' as const,
  },
};

export default async function CustomerDemoPage() {
  // 验证登录状态
  await requireAuth();
  
  return <CustomerDemoClient customer={SEED_CUSTOMER} />;
}
