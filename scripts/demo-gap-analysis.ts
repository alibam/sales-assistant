/**
 * Demo script to validate the Gap Analysis pipeline.
 * Run with: npx tsx scripts/demo-gap-analysis.ts
 */
import { runGapAnalysis } from '../lib/ai/gap-analysis';

async function main() {
  console.log('=== Gap Analysis Engine Demo ===\n');

  const salesInput =
    '张先生今天来看了宝马X5，预算大概40万左右，想年前提车。他说主要是家庭用，二胎了需要大空间。目前在对比奔驰GLC和奥迪Q5L。';

  console.log('📝 销售顾问输入：');
  console.log(salesInput);
  console.log('\n--- Processing... ---\n');

  const result = await runGapAnalysis(salesInput);

  console.log('✅ 提取的客户画像：');
  console.log(JSON.stringify(result.extractedProfile, null, 2));

  console.log('\n📊 合并后完整画像：');
  console.log(JSON.stringify(result.mergedProfile, null, 2));

  console.log(`\n📈 画像完整度：${result.completeness}%`);

  console.log('\n🔍 识别的缺口：');
  for (const gap of result.gaps) {
    const priorityTag =
      gap.priority === 'critical' ? '🔴' : gap.priority === 'high' ? '🟡' : '⚪';
    console.log(`  ${priorityTag} [${gap.sectionTitle}] ${gap.field}: ${gap.description}`);
  }

  console.log('\n💬 追问建议：');
  console.log(result.followUpPrompt);

  // Second round: simulate follow-up input
  console.log('\n\n=== 第二轮：补充信息 ===\n');
  const followUpInput = '张先生自己出钱买，老婆也同意了，就是觉得价格还想再谈谈。打算贷款买。';

  console.log('📝 销售顾问补充：');
  console.log(followUpInput);
  console.log('\n--- Processing... ---\n');

  const result2 = await runGapAnalysis(followUpInput, result.mergedProfile);

  console.log('✅ 新提取的信息：');
  console.log(JSON.stringify(result2.extractedProfile, null, 2));

  console.log('\n📊 更新后完整画像：');
  console.log(JSON.stringify(result2.mergedProfile, null, 2));

  console.log(`\n📈 画像完整度：${result2.completeness}%`);

  console.log('\n🔍 剩余缺口：');
  for (const gap of result2.gaps) {
    const priorityTag =
      gap.priority === 'critical' ? '🔴' : gap.priority === 'high' ? '🟡' : '⚪';
    console.log(`  ${priorityTag} [${gap.sectionTitle}] ${gap.field}: ${gap.description}`);
  }

  console.log('\n💬 追问建议：');
  console.log(result2.followUpPrompt);
}

main().catch(console.error);
