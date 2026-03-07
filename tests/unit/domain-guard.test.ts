/**
 * 测试 4：场景一致性守卫触发 retry 或 fallback
 *
 * 测试目标：
 * - Given: 检索到的知识片段包含跨域关键词（如"企业客户"、"额度审批"）
 * - When: 调用 filterCrossDomainKnowledge（这个函数应该在 lib/ai/retrieval.ts 中实现）
 * - Then: 应该过滤掉跨域知识片段
 *
 * 注意：这个测试会失败，因为 filterCrossDomainKnowledge 函数在实际代码中不存在
 */

import { describe, test, expect } from 'vitest';
import { filterCrossDomainKnowledge } from '@/lib/ai/domain-guard';
import { searchRelevantKnowledge } from '@/lib/ai/retrieval';
import { TEST_TENANT_IDS } from '@/lib/db/fixtures';

describe('场景一致性守卫', () => {
  test('filterCrossDomainKnowledge 函数应该存在', () => {
    // Then: 函数应该存在
    expect(filterCrossDomainKnowledge).toBeDefined();
    expect(typeof filterCrossDomainKnowledge).toBe('function');

    console.log('✅ filterCrossDomainKnowledge 函数存在');
  });

  test('应该过滤掉包含企业/B2B关键词的知识片段（家庭购车客户）', () => {
    // Given: 检索到的知识片段包含跨域关键词（企业/B2B）
    const knowledgeChunks = [
      {
        content: '家庭购车客户通常关注空间和安全性，建议推荐SUV车型',
        similarity: 0.85,
      },
      {
        content: '企业客户采购需要走审批流程，建议提供对公账户和发票',
        similarity: 0.75,
      },
      {
        content: '针对二胎家庭，可以强调第三排座椅和儿童安全座椅接口',
        similarity: 0.80,
      },
      {
        content: '公司采购车辆需要考虑维护成本和品牌形象',
        similarity: 0.70,
      },
    ];

    // When: 调用场景一致性守卫（汽车零售领域）
    const filtered = filterCrossDomainKnowledge(knowledgeChunks, 'automotive-retail');

    // Then: 应该过滤掉包含企业/B2B关键词的片段，保留家庭购车相关片段
    expect(filtered.length).toBe(2);

    // 验证保留的片段不包含企业/B2B关键词
    filtered.forEach((chunk: any) => {
      const content = chunk.content.toLowerCase();
      expect(content).not.toContain('企业');
      expect(content).not.toContain('公司');
      expect(content).not.toContain('采购');
      expect(content).not.toContain('对公');
      expect(content).not.toContain('审批');
    });

    // 验证保留的片段包含家庭购车相关语义
    const allContent = filtered.map((c: any) => c.content).join(' ');
    const hasFamilyKeywords =
      allContent.includes('家庭') ||
      allContent.includes('二胎') ||
      allContent.includes('空间') ||
      allContent.includes('安全座椅');
    expect(hasFamilyKeywords).toBe(true);

    console.log('✅ 成功过滤掉企业/B2B跨域知识片段，保留家庭购车相关片段');
  });

  test('应该过滤掉包含企业/B2B关键词的知识片段（汽车零售客户）', () => {
    // Given: 检索到的知识片段包含跨域关键词（企业/B2B）
    const knowledgeChunks = [
      {
        content: '企业客户采购需要提供对公账户和增值税发票',
        similarity: 0.85,
      },
      {
        content: '家庭购车客户关注孩子的安全，建议推荐安全配置高的车型',
        similarity: 0.75,
      },
      {
        content: '商务车辆采购需要考虑品牌形象和维护成本',
        similarity: 0.80,
      },
      {
        content: '针对二胎家庭，可以强调宝马X3的后排空间和两个安全座椅接口',
        similarity: 0.82,
      },
    ];

    // When: 调用场景一致性守卫（汽车零售领域）
    const filtered = filterCrossDomainKnowledge(knowledgeChunks, 'automotive-retail');

    // Then: 应该过滤掉包含企业/B2B关键词的片段，保留家庭购车相关片段
    expect(filtered.length).toBe(2);

    // 验证保留的片段不包含企业/B2B关键词
    filtered.forEach((chunk: any) => {
      const content = chunk.content.toLowerCase();
      expect(content).not.toContain('企业客户');
      expect(content).not.toContain('对公账户');
      expect(content).not.toContain('商务车辆');
      expect(content).not.toContain('采购');
    });

    // 验证保留的片段包含家庭购车相关语义
    const allContent = filtered.map((c: any) => c.content).join(' ');
    const hasFamilyKeywords =
      allContent.includes('家庭') ||
      allContent.includes('孩子') ||
      allContent.includes('二胎') ||
      allContent.includes('安全座椅');
    expect(hasFamilyKeywords).toBe(true);

    console.log('✅ 成功过滤掉企业/B2B跨域知识片段，保留汽车零售相关片段');
  });

  test('searchRelevantKnowledge 应该集成场景一致性守卫', async () => {
    // 这个测试验证 searchRelevantKnowledge 是否使用了 filterCrossDomainKnowledge
    // 由于当前实现没有这个功能，测试会失败

    // Given: 一个家庭购车的查询
    const query = '家庭购车 二胎 空间需求';

    // When: 调用检索服务
    const results = await searchRelevantKnowledge(
      query,
      TEST_TENANT_IDS.AUTOMAX,
      5
    );

    // Then: 返回的结果不应该包含企业相关的内容
    // 注意：这个测试可能会失败，因为当前实现没有过滤跨域知识
    results.forEach((result: any) => {
      const content = result.content.toLowerCase();
      const hasEnterpriseKeywords =
        content.includes('企业客户') ||
        content.includes('公司采购') ||
        content.includes('对公账户');

      // 断言：不应该包含企业关键词
      expect(hasEnterpriseKeywords).toBe(false);
    });

    console.log('✅ searchRelevantKnowledge 正确过滤了跨域知识');
  });

  test('应该检测金融/B2B污染词：融资、年营收、个人资产', () => {
    // Given: 包含金融/B2B污染词的知识片段
    const knowledgeChunks = [
      {
        content: '企业主融资需求可以通过我们的金融方案解决',
        similarity: 0.85,
      },
      {
        content: '客户年营收达到500万，可以申请更高额度',
        similarity: 0.80,
      },
      {
        content: '个人资产评估是融资审批的重要环节',
        similarity: 0.75,
      },
      {
        content: '家庭购车客户关注孩子的安全，建议推荐安全配置高的车型',
        similarity: 0.82,
      },
    ];

    // When: 调用场景一致性守卫（汽车零售领域）
    const filtered = filterCrossDomainKnowledge(knowledgeChunks, 'automotive-retail');

    // Then: 应该过滤掉包含金融/B2B污染词的片段
    expect(filtered.length).toBe(1);

    // 验证保留的片段不包含金融/B2B污染词
    filtered.forEach((chunk: any) => {
      const content = chunk.content.toLowerCase();
      expect(content).not.toContain('融资');
      expect(content).not.toContain('年营收');
      expect(content).not.toContain('个人资产');
      expect(content).not.toContain('企业主');
      expect(content).not.toContain('金融方案');
      expect(content).not.toContain('额度');
    });

    console.log('✅ 成功过滤掉金融/B2B污染词');
  });

  test('应该检测更多金融/B2B污染词：企业扩张、资金需求、融资成本、放款、授信', () => {
    // Given: 包含更多金融/B2B污染词的知识片段
    const knowledgeChunks = [
      {
        content: '企业扩张需要资金需求支持，我们提供低融资成本方案',
        similarity: 0.85,
      },
      {
        content: '放款速度快，授信额度高，适合企业客户',
        similarity: 0.80,
      },
      {
        content: '家庭购车客户关注二胎需求，建议推荐宝马X3的后排空间',
        similarity: 0.82,
      },
    ];

    // When: 调用场景一致性守卫（汽车零售领域）
    const filtered = filterCrossDomainKnowledge(knowledgeChunks, 'automotive-retail');

    // Then: 应该过滤掉包含金融/B2B污染词的片段
    expect(filtered.length).toBe(1);

    // 验证保留的片段不包含金融/B2B污染词
    filtered.forEach((chunk: any) => {
      const content = chunk.content.toLowerCase();
      expect(content).not.toContain('企业扩张');
      expect(content).not.toContain('资金需求');
      expect(content).not.toContain('融资成本');
      expect(content).not.toContain('放款');
      expect(content).not.toContain('授信');
    });

    console.log('✅ 成功过滤掉更多金融/B2B污染词');
  });
});
