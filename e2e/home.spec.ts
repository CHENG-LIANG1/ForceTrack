/** Browser acceptance for Task 2 routing and preference persistence at the 1280×720 target viewport. */
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Clear once per isolated browser context while preserving data across the reload under test.
    if (!sessionStorage.getItem('forcetrack:test-initialized')) {
      localStorage.removeItem('forcetrack:preferences:v1');
      localStorage.removeItem('forcetrack:preferences:v2');
      localStorage.removeItem('forcetrack:workspace:v3');
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
  await expect(page).toHaveURL(/\/projects\/project-forcetrack\/summary$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    /Summary|概览/,
  );

  await page.getByRole('link', { name: /Timeline|时间线/ }).click();
  await expect(page).toHaveURL(/\/projects\/project-forcetrack\/timeline$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    /Timeline|时间线/,
  );

  await page.goto('/does-not-exist');
  await expect(page).toHaveURL(/\/projects\/project-forcetrack\/summary$/);

  const pageWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(pageWidth).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? pageWidth,
  );
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test('resolves the legacy system theme and exposes only Light and Dark', async ({
  page,
}) => {
  await page.goto('/board');
  const systemTheme = await page.evaluate(() =>
    matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );
  await expect(page.locator('html')).toHaveAttribute('data-theme', systemTheme);
  await page.getByRole('button', { name: 'Open user menu' }).click();
  await expect(page.getByRole('button', { name: 'System' })).toHaveCount(0);
  await expect(
    page.getByRole('button', {
      name: systemTheme === 'dark' ? 'Dark' : 'Light',
    }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('forcetrack:preferences:v2');
        return raw ? (JSON.parse(raw) as { theme?: string }).theme : null;
      }),
    )
    .toBe(systemTheme);
  await page.getByRole('button', { name: 'English' }).click();
  await page.getByRole('button', { name: 'Light' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Open user menu' }).click();
  await expect(page.getByRole('button', { name: 'Light' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'System' })).toHaveCount(0);
});
