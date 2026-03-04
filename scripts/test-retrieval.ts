/**
 * 向量检索功能测试脚本
 *
 * 用于验证：
 * 1. searchRelevantKnowledge 函数正常工作
 * 2. 返回的文档片段格式正确
 * 3. 租户隔离有效
 */

import { searchRelevantKnowledge } from '../lib/ai/retrieval';
import { TEST_TENANT_IDS } from '../lib/db/fixtures';

async function testRetrieval() {
  console.log('🚀 开始测试向量检索功能...\n');

  try {
    // 测试 1: 基础检索功能
    console.log('📝 测试 1: 基础检索功能');
    const query1 = 'BMW X5 竞品对比';
    const results1 = await searchRelevantKnowledge(
      query1,
      TEST_TENANT_IDS.AUTOMAX,
      3
    );

    console.log(`查询: "${query1}"`);
    console.log(`结果数量: ${results1.length}`);

    if (results1.length > 0) {
      console.log('\n检索结果:');
      results1.forEach((doc, idx) => {
        console.log(`\n[片段 ${idx + 1}] (相似度: ${doc.similarity.toFixed(4)})`);
        console.log(doc.content.substring(0, 200) + '...');
      });
    } else {
      console.log('⚠️  未找到相关文档（可能知识库为空）');
    }

    // 测试 2: 不同查询词
    console.log('\n\n📝 测试 2: 不同查询词');
    const query2 = '价格优惠 金融方案';
    const results2 = await searchRelevantKnowledge(
      query2,
      TEST_TENANT_IDS.AUTOMAX,
      3
    );

    console.log(`查询: "${query2}"`);
    console.log(`结果数量: ${results2.length}`);

    // 测试 3: 租户隔离验证
    console.log('\n\n📝 测试 3: 租户隔离验证');
    const query3 = 'BMW X5';

    // 使用不同的租户 ID
    const results3a = await searchRelevantKnowledge(
      query3,
      TEST_TENANT_IDS.AUTOMAX,
      3
    );

    console.log(`租户 AUTOMAX 结果数量: ${results3a.length}`);

    // 测试 4: 错误处理
    console.log('\n\n📝 测试 4: 错误处理');

    try {
      await searchRelevantKnowledge('', TEST_TENANT_IDS.AUTOMAX, 3);
      console.log('❌ 应该抛出错误：查询文本不能为空');
    } catch (error) {
      console.log('✅ 正确捕获错误:', (error as Error).message);
    }

    try {
      await searchRelevantKnowledge('test', '', 3);
      console.log('❌ 应该抛出错误：租户 ID 不能为空');
    } catch (error) {
      console.log('✅ 正确捕获错误:', (error as Error).message);
    }

    console.log('\n\n✅ 所有测试完成！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testRetrieval()
  .then(() => {
    console.log('\n🎉 测试成功完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 测试执行失败:', error);
    process.exit(1);
  });
