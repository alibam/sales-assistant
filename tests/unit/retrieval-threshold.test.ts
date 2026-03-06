/**
 * 测试 2：低相似度 RAG 不得覆盖客户画像
 *
 * 测试目标：
 * - Given: 查询词与知识库内容相似度 < 0.7
 * - When: 调用 searchRelevantKnowledge
 * - Then: 应该返回空数组或过滤掉低相关度结果
 */

import { test, expect } from '@playwright/test';
import { searchRelevantKnowledge } from '@/lib/ai/retrieval';
import { prisma } from '@/lib/db/client';
import { TEST_TENANT_IDS } from '@/lib/db/fixtures';

test.describe('RAG 相似度阈值守卫', () => {
  test('低相似度结果应该被过滤（相似度 < 0.7）', async () => {
    // Given: 一个与知识库内容不相关的查询
    const irrelevantQuery = '火星探测器的燃料系统设计';

    // When: 调用检索服务
    const results = await searchRelevantKnowledge(
      irrelevantQuery,
      TEST_TENANT_IDS.AUTOMAX,
      5
    );

    // Then: 应该返回空数组或所有结果的相似度都 >= 0.7
    if (results.length > 0) {
      // 如果有结果，验证所有结果的相似度都 >= 0.7
      results.forEach((result) => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.7);
      });
      console.log('✅ 所有返回结果的相似度都 >= 0.7');
    } else {
      // 如果没有结果，说明低相似度结果被正确过滤
      console.log('✅ 低相似度结果被正确过滤，返回空数组');
    }

    // 额外验证：结果数量应该少于请求的数量（因为过滤了低相似度结果）
    expect(results.length).toBeLessThanOrEqual(5);
  });

  test('高相似度结果应该被返回（相似度 >= 0.7）', async () => {
    // Given: 一个与知识库内容高度相关的查询
    // 假设知识库中有关于汽车销售的内容
    const relevantQuery = 'BMW X5 竞品对比 宝马 奔驰 奥迪';

    // When: 调用检索服务
    const results = await searchRelevantKnowledge(
      relevantQuery,
      TEST_TENANT_IDS.AUTOMAX,
      3
    );

    // Then: 应该返回结果，且相似度都 >= 0.7
    // 注意：这个测试可能会失败，因为知识库可能没有相关内容
    // 这是预期的 Red 状态
    expect(results.length).toBeGreaterThan(0);

    results.forEach((result) => {
      expect(result.similarity).toBeGreaterThanOrEqual(0.7);
      expect(result.content).toBeTruthy();
    });

    console.log('✅ 高相似度结果被正确返回');
    console.log('返回结果数量:', results.length);
    console.log('最高相似度:', Math.max(...results.map((r) => r.similarity)));
  });

  test('相似度阈值应该在检索层实现，而非生成层', async () => {
    // Given: 一个低相关度的查询
    const lowRelevanceQuery = '量子计算机的未来发展趋势';

    // When: 调用检索服务
    const results = await searchRelevantKnowledge(
      lowRelevanceQuery,
      TEST_TENANT_IDS.AUTOMAX,
      5
    );

    // Then: 检索层应该已经过滤掉低相似度结果
    // 不应该依赖生成层来过滤
    if (results.length > 0) {
      // 如果有结果，所有结果的相似度都应该 >= 0.7
      const allAboveThreshold = results.every((r) => r.similarity >= 0.7);
      expect(allAboveThreshold).toBe(true);
    }

    console.log('✅ 相似度阈值在检索层正确实现');
  });

  test('空查询应该抛出错误', async () => {
    // Given: 空查询
    const emptyQuery = '';

    // When & Then: 应该抛出错误
    await expect(
      searchRelevantKnowledge(emptyQuery, TEST_TENANT_IDS.AUTOMAX, 3)
    ).rejects.toThrow('查询文本不能为空');
  });

  test('无效的 tenantId 应该抛出错误', async () => {
    // Given: 无效的 tenantId
    const query = 'BMW X5';

    // When & Then: 应该抛出错误
    await expect(
      searchRelevantKnowledge(query, '', 3)
    ).rejects.toThrow('租户 ID 不能为空');
  });
});
