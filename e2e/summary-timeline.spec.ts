/** Browser acceptance for Task 7 read views at the 1280×720 target viewport. */
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('forcetrack:tasks:v2');
    localStorage.removeItem('forcetrack:tasks:v1');
    localStorage.setItem(
      'forcetrack:preferences:v1',
      JSON.stringify({ locale: 'en-US', theme: 'dark' }),
    );
  });
});

test('keeps Summary and Timeline read/edit only', async ({ page }) => {
  await page.goto('/summary');
  await expect(page.getByRole('button', { name: 'New task' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Timeline', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New task' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Backlog', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New task' })).toBeVisible();
});

test('filters every Summary module and opens a task in the shared dialog', async ({
  page,
}) => {
  await page.goto('/summary');
  await expect(
    page.getByRole('heading', { name: 'Summary', level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Types of work' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Work progress' }),
  ).toBeVisible();
  await expect(page.locator('.summary-status-pie')).toBeVisible();

  await page.getByRole('checkbox', { name: 'Bug' }).click();
  await page.getByRole('checkbox', { name: 'Low priority' }).click();
  await expect(page.getByText('2 active dimensions')).toBeVisible();
  await expect(page.getByText('No recent activity yet.')).toBeVisible();

  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page
    .getByRole('heading', { name: 'Recent activity' })
    .locator('..')
    .getByRole('button')
    .first()
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Task details' }),
  ).toBeVisible();
});

test('keeps Summary filter labels on the shared spacing rhythm', async ({
  page,
}) => {
  await page.goto('/summary');

  const filterGroups = page.locator('.summary-filter-grid fieldset');
  await expect(filterGroups).toHaveCount(6);

  for (const filterGroup of await filterGroups.all()) {
    const legendBox = await filterGroup.locator('legend').boundingBox();
    const contentBox = await filterGroup
      .locator('.summary-filter-field-body')
      .boundingBox();

    expect(legendBox).not.toBeNull();
    expect(contentBox).not.toBeNull();
    expect(Math.round(contentBox!.y - (legendBox!.y + legendBox!.height))).toBe(
      12,
    );
  }
});

test('centers Today and exposes unscheduled Timeline work', async ({
  page,
}) => {
  await page.goto('/timeline');
  await expect(
    page.getByRole('heading', { name: 'Timeline', level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Unscheduled work' }),
  ).toBeVisible();

  const clippedTimelineBar = page
    .locator('.timeline-bar')
    .filter({ hasText: 'Prepare usability test script' });
  await clippedTimelineBar.hover();
  await expect(page.getByRole('tooltip')).toHaveText(
    'Prepare usability test script',
  );

  await page.getByRole('button', { name: 'Today' }).click();
  await page.getByRole('button', { name: /Map timeline edge cases/ }).click();
  await expect(
    page.getByRole('dialog', { name: 'Task details' }),
  ).toBeVisible();
});
