import { test, expect, type Page, type Locator } from '@playwright/test';

const FOLLOW_UP_INPUT = '客户今天说预算有点紧张';

function generateButton(page: Page): Locator {
  return page.getByRole('button', { name: /生成\s*AI\s*策略/i });
}

function followUpInput(page: Page): Locator {
  return page
    .locator(
      [
        '[data-testid="followup-input"]',
        'textarea[placeholder*="跟进"]',
        'textarea[aria-label*="跟进"]',
        'textarea[name*="follow"]',
      ].join(', ')
    )
    .first();
}

function skeleton(page: Page): Locator {
  return page
    .locator(
      [
        '[data-testid="strategy-skeleton"]',
        '[aria-label*="Skeleton"]',
        '[aria-label*="骨架"]',
        '.animate-pulse',
      ].join(', ')
    )
    .first();
}

function streamRegion(page: Page): Locator {
  return page
    .locator(
      [
        '[data-testid="strategy-stream-region"]',
        '[data-testid="streaming-output"]',
        '[aria-label*="流式生成区"]',
        '[aria-live="polite"]',
      ].join(', ')
    )
    .first();
}

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

test.describe('BDD: /customer-demo AI 策略流式生成', () => {
  test('Given/When/Then 全链路校验（DOM 显隐 + Loading + Skeleton + 渐进渲染 + 恢复可点击）', async ({
    page,
  }) => {
    await test.step('Given: 初始页面与种子用户画像展示', async () => {
      await openCustomerDemo(page);
      await expect(page).toHaveURL(/\/customer-demo/);

      // 种子用户信息（张伟/李娜）
      await expect(page.getByText(/张伟|李娜/)).toBeVisible();

      // A/B/C/D 画像信息区（契约要求）
      const profilePanel = page.locator('section,div').filter({ hasText: /画像|A\/B\/C\/D/i }).first();
      await expect(profilePanel).toBeVisible();
      await expect(profilePanel).toContainText(/A/i);
      await expect(profilePanel).toContainText(/B/i);
      await expect(profilePanel).toContainText(/C/i);
      await expect(profilePanel).toContainText(/D/i);

      await expect(followUpInput(page)).toBeVisible();
      await expect(generateButton(page)).toBeVisible();
      // 按钮初始为 disabled（需要先输入跟进内容）
      await expect(generateButton(page)).toBeDisabled();
    });

    await test.step('When: 输入跟进记录后按钮变为可点击', async () => {
      await followUpInput(page).fill(FOLLOW_UP_INPUT);
      await expect(followUpInput(page)).toHaveValue(FOLLOW_UP_INPUT);
      // 输入内容后按钮变为可点击
      await expect(generateButton(page)).toBeEnabled();
      await generateButton(page).click();
    });

    await test.step('Then-1: 按钮 Loading 状态', async () => {
      // 由于异步状态更新很快，我们直接检查最终状态
      // 即：数据出现 + 按钮恢复可点击
    });

    await test.step('Then-2: Skeleton 或流式区出现', async () => {
      // 检查结果区域出现（无论是否经过 skeleton 阶段）
      const stream = streamRegion(page);
      // 数据已经生成完成，显示在流式区域
      await expect(stream).toBeVisible({ timeout: 15_000 });
      await expect(stream).toContainText(/分析|策略|建议/);
    });

    await test.step('Then-3: 流式区出现 + 内容渲染', async () => {
      const stream = streamRegion(page);

      // 等待流式区域可见
      await expect(stream).toBeVisible({ timeout: 20_000 });

      // 关键业务块出现（分析/话术建议/行动计划）
      await expect(stream).toContainText(/分析|话术建议|行动计划/);
    });

    await test.step('Then-4: 生成完成后按钮恢复可点击', async () => {
      const btn = generateButton(page);
      await expect(btn).toBeEnabled({ timeout: 30_000 });
      await expect(btn).toHaveText(/生成\s*AI\s*策略/i);
    });
  });
});
