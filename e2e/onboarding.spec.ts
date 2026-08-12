/** Browser acceptance for compact tour controls and background scroll locking. */
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('forcetrack:onboarding:v1', 'complete');
    localStorage.setItem(
      'forcetrack:preferences:v1',
      JSON.stringify({ locale: 'en-US', theme: 'dark' }),
    );
  });
});

test('keeps help and tour buttons compact while the overlay locks scrolling', async ({
  page,
}) => {
  await page.goto('/timeline');
  await page.evaluate(() => window.scrollTo(0, 280));
  const initialScroll = await page.evaluate(() => window.scrollY);

  await page.getByRole('button', { name: 'Help and shortcuts' }).click();
  const replayButton = page.getByRole('button', { name: 'Replay onboarding' });
  await expect(replayButton).toHaveCSS('font-size', '12px');
  await expect(replayButton).toHaveCSS('min-height', '36px');
  await replayButton.click();

  await expect(page.locator('html')).toHaveClass(/onboarding-active/);
  await expect(page.locator('body')).toHaveClass(/onboarding-active/);
  const tourButtons = page.locator('.onboarding-actions button');
  for (const button of await tourButtons.all()) {
    await expect(button).toHaveCSS('font-size', '12px');
    expect((await button.boundingBox())?.height).toBeLessThanOrEqual(36);
  }

  await page.mouse.wheel(0, 1_000);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll);
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll);

  await page.getByRole('button', { name: 'Next' }).click();
  expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll);
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.locator('html')).not.toHaveClass(/onboarding-active/);
  await expect(page.locator('body')).not.toHaveClass(/onboarding-active/);
});
