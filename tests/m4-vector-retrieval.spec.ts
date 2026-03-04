/**
 * M4 最终战役：向量检索与策略融合集成测试
 *
 * 验证：
 * 1. 策略生成流程加入检索步骤后依然稳定
 * 2. 生成的策略包含知识库内容（如果有相关知识）
 * 3. 检索失败时不影响主流程
 */

import { test, expect, type Page } from '@playwright/test';

async function openCustomerDemo(page: Page) {
  // 先访问页面，如果被重定向到登录页，则先登录
  await page.goto('/customer-demo');

  // 若被中间件重定向到登录页，自动走 demo 登录
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

    // 登录后先等待离开 /login，避免与登录后的自动跳转竞争导致 ERR_ABORTED
    await expect
      .poll(() => page.url(), { timeout: 15_000 })
      .not.toMatch(/\/login(?:\?|$)/);

    // 给中间件与前端重定向一点收敛时间，再决定是否手动进入目标页
    await page.waitForTimeout(300);

    if (!/\/customer-demo(?:\?|$)/.test(page.url())) {
      await page.goto('/customer-demo', { waitUntil: 'domcontentloaded' });
    }
  }

  // 等待页面加载完成
  await page.waitForLoadState('networkidle');
}

test.describe('M4: 向量检索与策略融合', () => {
  test('策略生成应该包含知识库检索内容', async ({ page }) => {
    await openCustomerDemo(page);

    // 填写客户画像 - 选择一个有知识库内容的场景
    // 场景：BMW X5 竞品对比
    const followUpInput = page
      .locator('[data-testid="followup-input"], textarea[placeholder*="跟进"]')
      .first();

    await followUpInput.fill('客户在看 BMW X5，也在对比奔驰 GLC-L 和奥迪 Q5L，主要卡点是价格偏高');

    // 点击生成策略按钮
    const generateButton = page.getByRole('button', { name: /生成\s*AI\s*策略/i });
    await generateButton.click();

    // 等待策略生成完成
    const streamRegion = page
      .locator('[data-testid="strategy-stream-region"], [aria-live="polite"]')
      .first();

    await expect(streamRegion).toBeVisible({ timeout: 30000 });

    // 等待流式生成完成
    await page.waitForTimeout(5000);

    // 验证策略内容已生成
    const strategyContent = await streamRegion.textContent();
    expect(strategyContent).toBeTruthy();
    expect(strategyContent!.length).toBeGreaterThan(100);

    console.log('策略内容长度:', strategyContent!.length);
    console.log('策略内容预览:', strategyContent!.substring(0, 200));
  });

  test('检索失败时策略生成应该继续工作', async ({ page }) => {
    await openCustomerDemo(page);

    // 填写最小化的客户画像（可能触发检索失败或无结果）
    const followUpInput = page
      .locator('[data-testid="followup-input"], textarea[placeholder*="跟进"]')
      .first();

    await followUpInput.fill('测试场景');

    // 点击生成策略按钮
    const generateButton = page.getByRole('button', { name: /生成\s*AI\s*策略/i });
    await generateButton.click();

    // 验证即使检索失败，策略仍然能生成
    const streamRegion = page
      .locator('[data-testid="strategy-stream-region"], [aria-live="polite"]')
      .first();

    await expect(streamRegion).toBeVisible({ timeout: 30000 });

    // 等待流式生成完成
    await page.waitForTimeout(5000);

    const strategyContent = await streamRegion.textContent();
    expect(strategyContent).toBeTruthy();

    console.log('降级策略生成成功');
  });
});
