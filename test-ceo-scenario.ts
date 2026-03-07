/**
 * CEO 场景复盘测试
 * 
 * 测试输入：家庭购车 + 二胎 + 后排空间 + 宝马X3
 * 预期输出：家庭购车策略，不包含融资/B2B关键词
 */

import { generateStrategyStream } from './lib/ai/strategy-server';
import type { CustomerProfile } from './lib/ai/types';
import type { ClassificationResult } from './lib/xstate/state-evaluator';

async function testCEOScenario() {
  console.log('='.repeat(80));
  console.log('CEO 场景复盘测试');
  console.log('='.repeat(80));
  console.log();

  // 输入：CEO 提供的真实场景
  const followUpInput = `今天接了一个懂车帝留资的电话。客户姓李，是个做建材生意的小老板。他说最近刚生了二胎，原来那辆本田雅阁实在没法塞下两个安全座椅了，想换个大点的豪华品牌 SUV。他周末刚去看了宝马 X3，但觉得 X3 后排空间太憋屈了。他说这周末有空的话，想带老婆来店里看看咱们的现车。`;

  console.log('📝 输入场景：');
  console.log(followUpInput);
  console.log();

  // 构造客户画像（从输入中提取的关键信息）
  const profileData: Partial<CustomerProfile> = {
    scene: {
      usage_scenario: '家庭用车',
      key_motives: ['二胎', '后排空间', '安全座椅'],
      pain_points: ['本田雅阁空间不够', '两个安全座椅塞不下'],
    },
    preference: {
      intent_model: '豪华品牌 SUV',
      must_have_features: ['后排空间大', '安全配置高'],
      nice_to_have_features: ['豪华品牌'],
    },
    competitor: {
      competing_models: ['宝马X3'],
      competitor_advantages: [],
      our_advantages: [],
    },
    timeline: {
      urgency_level: '中',
      decision_window: '本周末',
      key_milestones: ['到店看现车'],
    },
  };

  // 分类结果
  const classification: ClassificationResult = {
    status: 'B',
    reason: '客户有明确购车意向，已看过竞品，计划本周末到店',
    confidence: 'high',
  };

  console.log('🎯 客户分类：B 类（有意向，已看竞品）');
  console.log();

  try {
    console.log('⏳ 正在生成策略...');
    console.log();

    // 调用策略生成函数
    const streamableValue = await generateStrategyStream(
      profileData,
      'B',
      classification,
      undefined, // customerId
      undefined, // existingProfile
      '李先生',
      followUpInput
    );

    // 注意：generateStrategyStream 返回的是 StreamableValue
    // 在测试环境中，我们需要等待流式值完成
    // 但由于这是 Server Action，我们无法直接在 Node.js 中消费流
    
    console.log('✅ 策略生成函数调用成功');
    console.log();
    console.log('⚠️  注意：由于 generateStrategyStream 是 RSC Server Action，');
    console.log('   返回的是 StreamableValue，无法在 Node.js 环境中直接消费。');
    console.log();
    console.log('📋 建议：');
    console.log('   1. 在浏览器中访问 customer-demo 页面');
    console.log('   2. 登录后输入上述场景文字');
    console.log('   3. 点击"提交跟进"按钮');
    console.log('   4. 观察生成的策略是否包含融资/B2B关键词');
    console.log();
    console.log('🔍 预期结果：');
    console.log('   ✅ 策略应该聚焦家庭购车场景');
    console.log('   ✅ 应该提到：二胎、后排空间、安全座椅、家庭用车');
    console.log('   ❌ 不应包含：融资、年营收、个人资产、企业扩张、资金需求');
    console.log();

  } catch (error) {
    console.error('❌ 测试失败：', error);
    throw error;
  }
}

// 运行测试
testCEOScenario().catch(console.error);
