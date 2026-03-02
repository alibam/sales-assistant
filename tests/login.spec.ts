import { test, expect } from '@playwright/test';

/**
 * Login E2E Test
 * 
 * 测试流程：
 * 1. 访问 /login 页面
 * 2. 点击 "Demo Sales Rep" 按钮
 * 3. 验证登录成功（跳转或显示欢迎信息）
 * 4. 确保没有 "Forbidden" 错误
 */

test.describe('Login Flow', () => {
  test('should login successfully with Demo Sales Rep', async ({ page }) => {
    // 1. 访问登录页面
    await page.goto('/login');
    
    // 2. 验证页面加载成功（等待按钮出现）
    const demoButton = page.getByRole('button', { name: /Demo Sales Rep/i });
    await expect(demoButton).toBeVisible({ timeout: 10000 });
    
    // 3. 点击登录按钮
    await demoButton.click();
    
    // 4. 等待响应（登录成功应该跳转或显示成功信息）
    await page.waitForTimeout(2000);
    
    // 5. 验证没有 "Forbidden" 错误
    const forbiddenError = page.getByText(/Forbidden/i);
    await expect(forbiddenError).not.toBeVisible();
    
    // 6. 验证登录成功（检查 session cookie）
    const hasSessionCookie = await page.context().cookies().then(cookies => 
      cookies.some(c => c.name === 'session_token')
    );
    expect(hasSessionCookie).toBeTruthy();
  });
  
  test('should login successfully with Demo Manager', async ({ page }) => {
    await page.goto('/login');
    
    const managerButton = page.getByRole('button', { name: /Demo Manager/i });
    await expect(managerButton).toBeVisible();
    await managerButton.click();
    
    // 验证没有 Forbidden 错误
    const forbiddenError = page.getByText(/Forbidden/i);
    await expect(forbiddenError).not.toBeVisible();
    
    // 验证登录成功
    await page.waitForTimeout(2000);
    const hasSessionCookie = await page.context().cookies().then(cookies => 
      cookies.some(c => c.name === 'session_token')
    );
    expect(hasSessionCookie).toBeTruthy();
  });
  
  test('should login successfully with Demo Admin', async ({ page }) => {
    await page.goto('/login');
    
    const adminButton = page.getByRole('button', { name: /Demo Admin/i });
    await expect(adminButton).toBeVisible();
    await adminButton.click();
    
    // 验证没有 Forbidden 错误
    const forbiddenError = page.getByText(/Forbidden/i);
    await expect(forbiddenError).not.toBeVisible();
    
    // 验证登录成功
    await page.waitForTimeout(2000);
    const hasSessionCookie = await page.context().cookies().then(cookies => 
      cookies.some(c => c.name === 'session_token')
    );
    expect(hasSessionCookie).toBeTruthy();
  });
});
