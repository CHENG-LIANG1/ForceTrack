import { expect, test } from '@playwright/test';

test('shows the ForceTrack foundation without page overflow', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /move work forward/i }),
  ).toBeVisible();
  await expect(page.getByText('Foundation ready')).toBeVisible();
  await expect(page.getByText('shadcn/ui')).toBeVisible();

  const viewport = page.viewportSize();
  const pageSize = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));

  expect(pageSize.width).toBeLessThanOrEqual(viewport?.width ?? pageSize.width);
  expect(pageSize.height).toBeLessThanOrEqual(
    viewport?.height ?? pageSize.height,
  );
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
