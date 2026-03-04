import { test, expect } from '@playwright/test';

/**
 * Login E2E Test
 * 
 * 测试流程：
 * 1. 访问 /login 页面
 * 2. 点击 "Demo Sales Rep" 按钮
 * 3. 验证登录成功（必须跳转到 /dashboard）
 * 4. 确保没有 "Forbidden" 错误
 * 5. 验证 session cookie 存在
 */

test.describe('Login Flow', () => {
  test('should login successfully with Demo Sales Rep and redirect to dashboard', async ({ page }) => {
    // 1. 访问登录页面
    await page.goto('/login');

    // 2. 验证页面加载成功（等待按钮出现）
    const demoButton = page.getByRole('button', { name: /Demo Sales Rep/i });
    await expect(demoButton).toBeVisible({ timeout: 10000 });

    // 3. 点击登录按钮
    await demoButton.click();

    // 4. 验证没有 "Forbidden" 错误
    const forbiddenError = page.getByText(/Forbidden/i);
    await expect(forbiddenError).not.toBeVisible();

    // 5. 验证 URL 跳转到 /dashboard（这是关键！）
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 6. 验证 session cookie 存在
    const cookies = await page.context().cookies();
    const hasSessionCookie = cookies.some(c => c.name === 'session_token');
    expect(hasSessionCookie).toBeTruthy();
  });

  test('should login successfully with Demo Manager and redirect to dashboard', async ({ page }) => {
    await page.goto('/login');

    const managerButton = page.getByRole('button', { name: /Demo Manager/i });
    await expect(managerButton).toBeVisible();
    await managerButton.click();

    // 验证没有 Forbidden 错误
    const forbiddenError = page.getByText(/Forbidden/i);
    await expect(forbiddenError).not.toBeVisible();

    // 验证 URL 跳转到 /dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 验证登录成功
    const cookies = await page.context().cookies();
    const hasSessionCookie = cookies.some(c => c.name === 'session_token');
    expect(hasSessionCookie).toBeTruthy();
  });

  test('should login successfully with Demo Admin and redirect to dashboard', async ({ page }) => {
    await page.goto('/login');

    const adminButton = page.getByRole('button', { name: /Demo Admin/i });
    await expect(adminButton).toBeVisible();
    await adminButton.click();

    // 验证没有 Forbidden 错误
    const forbiddenError = page.getByText(/Forbidden/i);
    await expect(forbiddenError).not.toBeVisible();

    // 验证 URL 跳转到 /dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // 验证登录成功
    const cookies = await page.context().cookies();
    const hasSessionCookie = cookies.some(c => c.name === 'session_token');
    expect(hasSessionCookie).toBeTruthy();
  });
});
