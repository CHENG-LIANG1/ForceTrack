/** Browser acceptance for Task 2 routing and preference persistence at the 1280×720 target viewport. */
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Clear once per isolated browser context while preserving data across the reload under test.
    if (!sessionStorage.getItem('forcetrack:test-initialized')) {
      localStorage.removeItem('forcetrack:preferences:v1');
      sessionStorage.setItem('forcetrack:test-initialized', 'true');
    }
  });
});

test('navigates both routes, redirects fallbacks, and avoids horizontal overflow', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page).toHaveURL(/\/board$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    /Board|看板/,
  );

  await page.getByRole('link', { name: /Timeline|时间线/ }).click();
  await expect(page).toHaveURL(/\/timeline$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    /Timeline|时间线/,
  );

  await page.goto('/does-not-exist');
  await expect(page).toHaveURL(/\/board$/);

  const pageWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(pageWidth).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? pageWidth,
  );
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('defaults to Vercel Dark and persists settings across reloads', async ({
  page,
}) => {
  await page.goto('/board');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: /Settings|设置/ }).click();
  await expect(page.locator('.theme-preview')).toHaveCount(2);
  await expect(
    page.getByRole('button', { name: 'Vercel Dark' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'English' }).click();
  await page.getByRole('button', { name: 'Vercel Light' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(
    page.getByRole('button', { name: 'Vercel Light' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /System/ })).toHaveCount(0);
});
