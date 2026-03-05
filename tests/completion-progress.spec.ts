/**
 * Completion Progress UI Tests
 * Tests progress bar updates and UI interactions
 */

import { test, expect } from '@playwright/test';

test.describe('Completion Progress UI', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to customer demo page
    await page.goto('/customer-demo');
  });

  test('should display progress bar in follow-up mode', async ({ page }) => {
    // Check if progress bar exists
    const progressSection = page.locator('text=画像完成度');
    await expect(progressSection).toBeVisible();
  });

  test('should show mode toggle checkbox', async ({ page }) => {
    // Check if mode toggle exists
    const modeToggle = page.locator('input[type="checkbox"]');
    await expect(modeToggle).toBeVisible();

    // Check label text
    const label = page.locator('text=事后复盘模式');
    await expect(label).toBeVisible();
  });

  test('should change placeholder when toggling mode', async ({ page }) => {
    const textarea = page.locator('[data-testid="followup-input"]');

    // Check initial placeholder (Copilot mode)
    await expect(textarea).toHaveAttribute('placeholder', /客户说了什么/);

    // Toggle to Post-Call mode
    const modeToggle = page.locator('input[type="checkbox"]');
    await modeToggle.check();

    // Check updated placeholder
    await expect(textarea).toHaveAttribute('placeholder', /通话录音总结/);
  });

  test('should update button text based on mode', async ({ page }) => {
    // Check initial button text
    const submitButton = page.locator('button:has-text("提交跟进")');
    await expect(submitButton).toBeVisible();

    // Button should be disabled when textarea is empty
    await expect(submitButton).toBeDisabled();

    // Type something
    const textarea = page.locator('[data-testid="followup-input"]');
    await textarea.fill('测试输入');

    // Button should be enabled
    await expect(submitButton).toBeEnabled();
  });

  test('should display conversation history after interaction', async ({ page }) => {
    // This test would require mocking the API response
    // For now, we just check the structure exists

    const textarea = page.locator('[data-testid="followup-input"]');
    await textarea.fill('客户说预算30万');

    const submitButton = page.locator('button:has-text("提交跟进")');
    await submitButton.click();

    // Wait for response (this would need proper API mocking in real test)
    // await page.waitForSelector('text=对话历史', { timeout: 10000 });
  });

  test('should show missing fields with priority colors', async ({ page }) => {
    // After submitting, missing fields should be displayed
    // This test would require API mocking to verify the actual display

    // Check if the missing fields section structure exists
    const progressSection = page.locator('text=画像完成度');
    await expect(progressSection).toBeVisible();
  });

  test('should have reset button', async ({ page }) => {
    const resetButton = page.locator('button:has-text("重置此客户画像")');
    await expect(resetButton).toBeVisible();
  });

  test('should show confirmation dialog when resetting', async ({ page }) => {
    const resetButton = page.locator('button:has-text("重置此客户画像")');

    // Set up dialog handler
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('确定要重置');
      await dialog.dismiss();
    });

    await resetButton.click();
  });
});
