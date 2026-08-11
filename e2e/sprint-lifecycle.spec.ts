import { expect, test, type Locator, type Page } from '@playwright/test';

async function chooseDay(page: Page, trigger: Locator, day: number) {
  await trigger.click();
  await page
    .locator('.ui-date-popover .rdp-day:not(.rdp-outside) .rdp-day_button')
    .filter({ hasText: new RegExp(`^${day}$`) })
    .click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('forcetrack:sprint-lifecycle-initialized')) {
      localStorage.removeItem('forcetrack:tasks:v2');
      localStorage.setItem(
        'forcetrack:preferences:v1',
        JSON.stringify({ locale: 'en-US', theme: 'light' }),
      );
      sessionStorage.setItem('forcetrack:sprint-lifecycle-initialized', 'true');
    }
  });
});

test('creates without dates, requires dates to start, and completes the active sprint', async ({
  page,
}) => {
  await page.goto('/backlog');

  await page.getByRole('button', { name: 'Complete sprint' }).click();
  const completeDialog = page.getByRole('alertdialog', {
    name: 'Complete sprint',
  });
  await expect(completeDialog).toContainText(
    '3 incomplete work items will return to the Backlog',
  );
  await completeDialog.getByRole('button', { name: 'Complete' }).click();
  await expect(
    page.getByRole('heading', { name: 'ForceTrack Sprint 1' }),
  ).toHaveCount(0);
  await expect(
    page
      .getByTestId('backlog-section:__backlog__')
      .getByTestId('backlog-item-FT-1'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Create sprint' }).click();
  const createDialog = page.getByRole('dialog', { name: 'Create sprint' });
  await createDialog.getByLabel(/Sprint name/).fill('Sprint 2');
  await createDialog.getByRole('button', { name: 'Create sprint' }).click();

  const sprintSection = page.getByTestId(/backlog-section:(?!__backlog__)/);
  await expect(
    sprintSection.getByRole('heading', { name: 'Sprint 2' }),
  ).toBeVisible();
  await sprintSection.getByRole('button', { name: 'Add work item' }).click();
  const taskDialog = page.getByRole('dialog', { name: 'Create task' });
  await taskDialog.getByLabel('Summary').fill('Sprint 2 work item');
  await taskDialog.getByRole('button', { name: 'Create' }).click();
  await expect(sprintSection.getByText('Sprint 2 work item')).toBeVisible();
  await sprintSection.getByRole('button', { name: 'Start sprint' }).click();

  const startDialog = page.getByRole('dialog', { name: 'Start sprint' });
  await startDialog.getByRole('button', { name: 'Start sprint' }).click();
  await expect(startDialog.getByRole('alert')).toHaveText(
    'Choose both a start date and an end date before starting the sprint.',
  );

  await chooseDay(page, startDialog.getByLabel(/Start date/), 12);
  await chooseDay(page, startDialog.getByLabel(/End date/), 25);
  await startDialog.getByRole('button', { name: 'Start sprint' }).click();

  await expect(
    sprintSection.getByRole('button', { name: 'Complete sprint' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('forcetrack:tasks:v2');
        if (!raw) return null;
        return (
          JSON.parse(raw) as {
            sprints: Array<{
              name: string;
              status: string;
              startDate: string | null;
              endDate: string | null;
            }>;
          }
        ).sprints.find((sprint) => sprint.name === 'Sprint 2');
      }),
    )
    .toMatchObject({
      status: 'active',
      startDate: '2026-08-12',
      endDate: '2026-08-25',
    });

  await page.reload();
  await expect(
    page
      .getByRole('heading', { name: 'Sprint 2' })
      .locator('..')
      .locator('..')
      .getByRole('button', { name: 'Complete sprint' }),
  ).toBeVisible();
});
