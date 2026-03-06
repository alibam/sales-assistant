/**
 * 测试 3：高相关汽车知识可增强，但不得改写客户类型
 *
 * 测试目标：
 * - Given: 客户画像是"家庭购车"，知识库包含相关的汽车销售话术
 * - When: 通过 UI 生成策略
 * - Then: 策略可以引用知识库内容，但客户类型必须保持"家庭购车"
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

test.describe('知识增强不得改写客户类型', () => {
  test('家庭购车客户类型在知识增强后应保持不变', async ({ page }) => {
    await openCustomerDemo(page);

    // Given: 填写家庭购车客户画像
    const followUpInput = page
      .locator('[data-testid="followup-input"], textarea[placeholder*="跟进"]')
      .first();

    await followUpInput.fill(
      '客户李先生说家里有两个孩子，需要空间大的SUV，预算30-40万，主要用于接送孩子上学和周末家庭出游，安全配置是最重要的。'
    );

    // When: 点击生成策略按钮
    const generateButton = page.getByRole('button', { name: /生成\s*AI\s*策略/i });
    await generateButton.click();

    // 等待策略生成完成
    const streamRegion = page
      .locator('[data-testid="strategy-stream-region"], [aria-live="polite"]')
      .first();

    await expect(streamRegion).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(8000);

    // Then: 验证客户类型仍然是"家庭购车"
    const strategyContent = await streamRegion.textContent();
    expect(strategyContent).toBeTruthy();

    const strategyText = strategyContent!.toLowerCase();

    // 1. 应该包含家庭相关关键词
    const familyKeywords = ['家庭', '孩子', '空间', '安全'];
    const foundFamilyKeywords = familyKeywords.filter((keyword) =>
      strategyText.includes(keyword)
    );
    expect(foundFamilyKeywords.length).toBeGreaterThan(0);

    // 2. 不应该改写为其他客户类型
    const otherCustomerTypes = [
      '企业客户',
      '商务客户',
      '公司采购',
      '对公客户',
    ];
    const foundOtherTypes = otherCustomerTypes.filter((type) =>
      strategyText.includes(type)
    );
    expect(foundOtherTypes).toEqual([]);

    console.log('✅ 客户类型保持不变：家庭购车');
  });

  test('知识库内容应该增强策略，而非替换画像', async ({ page }) => {
    await openCustomerDemo(page);

    // Given: 一个有明确特征的客户画像
    const followUpInput = page
      .locator('[data-testid="followup-input"], textarea[placeholder*="跟进"]')
      .first();

    await followUpInput.fill(
      '客户赵先生在对比宝马X3和奔驰GLC，家里有两个孩子，觉得价格有点高，预算30-40万。'
    );

    // When: 点击生成策略按钮
    const generateButton = page.getByRole('button', { name: /生成\s*AI\s*策略/i });
    await generateButton.click();

    // 等待策略生成完成
    const streamRegion = page
      .locator('[data-testid="strategy-stream-region"], [aria-live="polite"]')
      .first();

    await expect(streamRegion).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(8000);

    // Then: 验证画像的关键信息仍然存在
    const strategyContent = await streamRegion.textContent();
    expect(strategyContent).toBeTruthy();

    const strategyText = strategyContent!.toLowerCase();

    // 1. 客户类型：家庭用车
    expect(
      strategyText.includes('家庭') || strategyText.includes('孩子')
    ).toBe(true);

    // 2. 意向车型：宝马X3
    expect(
      strategyText.includes('宝马') || strategyText.includes('x3')
    ).toBe(true);

    // 3. 主要卡点：价格
    expect(strategyText.includes('价格')).toBe(true);

    console.log('✅ 画像关键信息保持完整，知识库内容仅作增强');
  });
});
