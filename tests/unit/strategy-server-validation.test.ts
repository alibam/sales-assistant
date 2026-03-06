/**
 * 测试 5：坏输入必须被 safeParse 拦截
 *
 * 测试目标：
 * - Given: profileData 包含非法字段或类型错误
 * - When: 使用 Zod schema 验证
 * - Then: 应该抛出错误，不执行后续逻辑
 */

import { test, expect } from '@playwright/test';
import { customerProfileSchema } from '@/lib/ai/gap-analysis';

test.describe('策略服务输入验证', () => {
  test('customerProfileSchema 应该正确验证合法输入', () => {
    // Given: 合法的 profileData
    const validProfile = {
      scene: {
        usage_scenario: '家庭用车',
        key_motives: ['二胎', '安全'],
        must_haves: ['空间大'],
      },
      preference: {
        intent_model: 'SUV',
      },
      budget_payment: {
        budget_limit: '30-40万',
        payment_method: '贷款' as const,
        price_sensitivity: '中' as const,
      },
    };

    // When: 使用 Zod schema 验证
    const result = customerProfileSchema.partial().safeParse(validProfile);

    // Then: 应该验证成功
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validProfile);
    }

    console.log('✅ 合法输入验证成功');
  });

  test('customerProfileSchema 应该拒绝类型错误的输入', () => {
    // Given: 类型错误的 profileData
    const invalidProfile = {
      scene: {
        usage_scenario: 123, // 应该是 string
        key_motives: '二胎', // 应该是 string[]
      },
      budget_payment: {
        budget_limit: 30, // 应该是 string
      },
    };

    // When: 使用 Zod schema 验证
    const result = customerProfileSchema.partial().safeParse(invalidProfile);

    // Then: 应该验证失败
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
      console.log('验证错误:', result.error.issues);
    }

    console.log('✅ 类型错误被正确拦截');
  });

  test('customerProfileSchema 应该拒绝枚举值错误的输入', () => {
    // Given: 枚举值错误的 profileData
    const invalidProfile = {
      budget_payment: {
        payment_method: 'invalid_payment_method', // 不在枚举值中
        price_sensitivity: 'super_high', // 不在枚举值中
      },
      timing: {
        delivery_timeline: '明年', // 不在枚举值中
      },
      competitor: {
        main_conflict: 'invalid_conflict', // 不在枚举值中
      },
    };

    // When: 使用 Zod schema 验证
    const result = customerProfileSchema.partial().safeParse(invalidProfile);

    // Then: 应该验证失败
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
      console.log('枚举值错误:', result.error.issues);
    }

    console.log('✅ 枚举值错误被正确拦截');
  });

  test('空的 profileData 应该被接受', () => {
    // Given: 空的 profileData
    const emptyProfile = {};

    // When: 使用 Zod schema 验证
    const result = customerProfileSchema.partial().safeParse(emptyProfile);

    // Then: 应该验证成功
    expect(result.success).toBe(true);

    console.log('✅ 空 profileData 被正确处理');
  });

  test('数组字段应该拒绝非数组值', () => {
    // Given: 数组字段包含非数组值
    const invalidProfile = {
      scene: {
        key_motives: '二胎', // 应该是 string[]
        must_haves: '空间大', // 应该是 string[]
      },
      preference: {
        config_preference: '天窗', // 应该是 string[]
      },
      competitor: {
        competing_models: '宝马X3', // 应该是 string[]
      },
    };

    // When: 使用 Zod schema 验证
    const result = customerProfileSchema.partial().safeParse(invalidProfile);

    // Then: 应该验证失败
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }

    console.log('✅ 数组字段类型错误被正确拦截');
  });

  test('布尔字段应该拒绝非布尔值', () => {
    // Given: 布尔字段包含非布尔值
    const invalidProfile = {
      decision_unit: {
        decision_maker_involved: 'yes', // 应该是 boolean
        family_visit_required: 1, // 应该是 boolean
      },
      competitor: {
        has_quote: 'true', // 应该是 boolean
      },
      blockers: {
        needs_manager: 'false', // 应该是 boolean
      },
    };

    // When: 使用 Zod schema 验证
    const result = customerProfileSchema.partial().safeParse(invalidProfile);

    // Then: 应该验证失败
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }

    console.log('✅ 布尔字段类型错误被正确拦截');
  });

  test('嵌套对象应该被正确验证', () => {
    // Given: 嵌套对象包含错误
    const invalidProfile = {
      scene: {
        usage_scenario: 123, // 类型错误
        invalid_field: 'should not exist', // 非法字段
      },
    };

    // When: 使用 Zod schema 验证
    const result = customerProfileSchema.partial().safeParse(invalidProfile);

    // Then: 应该验证失败
    expect(result.success).toBe(false);

    console.log('✅ 嵌套对象验证正确');
  });

  test('部分有效的 profileData 应该被接受（使用 partial）', () => {
    // Given: 只包含部分字段的 profileData
    const partialProfile = {
      scene: {
        usage_scenario: '家庭用车',
      },
      budget_payment: {
        budget_limit: '30-40万',
      },
    };

    // When: 使用 Zod schema 验证
    const result = customerProfileSchema.partial().safeParse(partialProfile);

    // Then: 应该验证成功
    expect(result.success).toBe(true);

    console.log('✅ 部分有效的 profileData 被正确接受');
  });
});
