/**
 * 测试 1：家庭购车画像不得生成企业/B2B策略
 *
 * 缺陷描述：事后复盘模式下，家庭购车客户的画像被 AI 生成了企业/B2B 策略
 *
 * 测试目标：
 * - Given: 客户画像包含"家庭用车"、"二胎"、"空间需求"、"豪华SUV"、"竞品宝马X3"
 * - When: 通过 UI 生成策略
 * - Then: 策略标题、摘要、话术不得包含"企业"、"额度"、"审批"、"三方会议"、"产品经理"、"技术团队"等B2B关键词
 */

import { test, expect, type Page } from '@playwright/test';

async function openCustomerDemo(page: Page) {
  await page.goto('/customer-demo');

  if (/\/login/.test(page.url())) {
    const demoLogin = page.getByRole('button', { name: /Demo Sales Rep/i });
    await expect(demoLogin).toBeVisible({ timeout: 10_000 });
    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/login') &&
        response.request().method() === 'POST',
      { timeout: 15_000 }
    );
    await demoLogin.click();

    const loginResponse = await loginResponsePromise;
    expect(loginResponse.ok()).toBeTruthy();

    await expect
      .poll(async () => {
        const cookies = await page.context().cookies();
        return cookies.some((cookie) => cookie.name === 'session_token');
      }, { timeout: 10_000 })
      .toBeTruthy();

    await expect
      .poll(() => page.url(), { timeout: 15_000 })
      .not.toMatch(/\/login(?:\?|$)/);

    await page.waitForTimeout(300);

    if (!/\/customer-demo(?:\?|$)/.test(page.url())) {
      await page.goto('/customer-demo', { waitUntil: 'domcontentloaded' });
    }
  }

  await page.waitForLoadState('networkidle');
}

test.describe('策略域一致性：家庭购车场景', () => {
  test('家庭购车画像不得生成企业/B2B策略', async ({ page }) => {
    await openCustomerDemo(page);

    // Given: 填写典型的家庭购车客户画像
    const followUpInput = page
      .locator('[data-testid="followup-input"], textarea[placeholder*="跟进"]')
      .first();

    await followUpInput.fill(
      '客户张先生说家里有两个孩子，需要空间大的豪华SUV，预算40-50万，正在对比宝马X3和奔驰GLC，主要卡点是价格有点高。客户说二胎刚出生，本月就要提车，安全配置和舒适性是最重要的。'
    );

    // When: 点击生成策略按钮
    const generateButton = page.getByRole('button', { name: /生成\s*AI\s*策略/i });
    await generateButton.click();

    // 等待策略生成完成
    const streamRegion = page
      .locator('[data-testid="strategy-stream-region"], [aria-live="polite"]')
      .first();

    await expect(streamRegion).toBeVisible({ timeout: 30000 });

    // 等待流式生成完成
    await page.waitForTimeout(8000);

    // Then: 验证策略内容
    const strategyContent = await streamRegion.textContent();
    expect(strategyContent).toBeTruthy();

    const strategyText = strategyContent!.toLowerCase();

    // 验证不包含 B2B 关键词
    const b2bKeywords = [
      '企业客户',
      '公司采购',
      '额度审批',
      '三方会议',
      '产品经理',
      '技术团队',
      '对公账户',
      '招标',
      '合同审批',
    ];

    const foundB2BKeywords = b2bKeywords.filter((keyword) =>
      strategyText.includes(keyword.toLowerCase())
    );

    // 断言：不应该包含任何 B2B 关键词
    expect(foundB2BKeywords).toEqual([]);

    // 额外验证：策略应该包含家庭相关的关键词
    const familyKeywords = ['家庭', '孩子', '空间', '安全'];
    const foundFamilyKeywords = familyKeywords.filter((keyword) =>
      strategyText.includes(keyword)
    );

    // 至少应该包含一个家庭相关关键词
    expect(foundFamilyKeywords.length).toBeGreaterThan(0);

    console.log('✅ 测试通过：策略未包含 B2B 关键词');
    console.log('策略内容预览:', strategyContent!.substring(0, 200));
  });

  test('真实 followUp 回归测试：家庭购车不得生成企业/B2B策略', async ({ page }) => {
    await openCustomerDemo(page);

    // Given: 输入真实的 followUp 文本（包含家庭购车画像关键词）
    const followUpInput = page
      .locator('[data-testid="followup-input"], textarea[placeholder*="跟进"]')
      .first();

    await followUpInput.fill(
      '客户李先生今天到店看车，说家里老婆怀了二胎，现在的轿车后排空间太小，两个安全座椅放不下。他看中了宝马X3，觉得空间够大，但是预算有点紧张。他说下周想带老婆一起来试驾，看看后排空间是否满意。'
    );

    // When: 点击生成策略按钮
    const generateButton = page.getByRole('button', { name: /生成\s*AI\s*策略/i });
    await generateButton.click();

    // 等待策略生成完成
    const streamRegion = page
      .locator('[data-testid="strategy-stream-region"], [aria-live="polite"]')
      .first();

    await expect(streamRegion).toBeVisible({ timeout: 30000 });

    // 等待流式生成完成（给足够时间让 AI 完成生成）
    await page.waitForTimeout(10000);

    // Then: 验证策略内容
    const strategyContent = await streamRegion.textContent();
    expect(strategyContent).toBeTruthy();

    const strategyText = strategyContent!.toLowerCase();

    // 断言 1：不包含企业/B2B词汇
    const b2bKeywords = [
      '企业',
      'b2b',
      '审批',
      '额度',
      '三方会议',
      '产品经理',
      '技术团队',
      '对公',
      '招标',
      '合同',
    ];

    const foundB2BKeywords = b2bKeywords.filter((keyword) =>
      strategyText.includes(keyword)
    );

    expect(foundB2BKeywords).toEqual([]);

    // 断言 2：包含至少 2 个画像相关语义
    const profileKeywords = [
      '后排空间',
      '宝马x3',
      '安全座椅',
      '带老婆',
      '到店',
      '试驾',
      '二胎',
      '家庭',
    ];

    const foundProfileKeywords = profileKeywords.filter((keyword) =>
      strategyText.includes(keyword)
    );

    expect(foundProfileKeywords.length).toBeGreaterThanOrEqual(2);

    console.log('✅ 真实 followUp 回归测试通过');
    console.log('未包含 B2B 关键词:', foundB2BKeywords.length === 0);
    console.log('包含画像关键词:', foundProfileKeywords);
    console.log('策略内容预览:', strategyContent!.substring(0, 300));
  });
});
