/** Release-gate browser coverage for the Task 9 P0 filter and cross-view synchronization paths. */
import { expect, test, type Locator, type Page } from '@playwright/test';

function localDateOffset(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function chooseDate(
  page: Page,
  dialog: Locator,
  field: 'Start date' | 'Due date',
  value: string,
): Promise<void> {
  await dialog.getByLabel(field).click();
  await page.locator(`[data-day="${value}"]`).click();
}

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

test('combines search, priority, assignee, type, and status filters with clear recovery', async ({
  page,
}) => {
  await page.goto('/backlog');

  const sprint = page.getByTestId('backlog-section:sprint-1');
  const matchingTask = sprint.getByTestId('backlog-item-FT-1');
  await page.getByPlaceholder('Search summary or key').fill('acceptance');
  await page.getByRole('combobox', { name: 'Assignee' }).click();
  await page.getByRole('option', { name: 'Lin Chen' }).click();
  await page.getByRole('combobox', { name: 'Work type' }).click();
  await page.getByRole('option', { name: 'Story' }).click();
  await page.getByRole('combobox', { name: 'Status' }).click();
  await page.getByRole('option', { name: 'To Do' }).click();
  await page.getByRole('combobox', { name: 'Priority' }).click();
  await page.getByRole('option', { name: 'High priority' }).click();

  await expect(matchingTask).toBeVisible();
  await expect(page.locator('[data-testid^="backlog-item-"]')).toHaveCount(1);

  await page.getByRole('combobox', { name: 'Assignee' }).click();
  await page.getByRole('option', { name: 'Maya Patel' }).click();
  await expect(
    page.getByText('No work items match the current search and filters.'),
  ).toBeVisible();

  await page.getByPlaceholder('Search summary or key').fill('');
  for (const [label, option] of [
    ['Assignee', 'All assignees'],
    ['Work type', 'All work types'],
    ['Status', 'All statuses'],
    ['Priority', 'All priorities'],
  ] as const) {
    await page.getByRole('combobox', { name: label }).click();
    await page.getByRole('option', { name: option }).click();
  }
  await expect(page.getByTestId('backlog-item-FT-1')).toBeVisible();
  await expect(page.getByTestId('backlog-item-FT-6')).toBeVisible();
});

test('synchronizes created dates and completion across Board, Timeline, and Summary', async ({
  page,
}) => {
  const startDate = localDateOffset(1);
  const dueDate = localDateOffset(3);
  const updatedDueDate = localDateOffset(4);

  await page.goto('/board');
  await page.getByRole('button', { name: 'New task' }).first().click();
  const createDialog = page.getByRole('dialog', { name: 'Create task' });
  await createDialog
    .getByRole('textbox', { name: /Summary/ })
    .fill('Task 9 synchronized work');
  await createDialog.getByRole('combobox', { name: 'Work type' }).click();
  await page.getByRole('option', { name: 'Bug' }).click();
  await createDialog.getByRole('combobox', { name: 'Status' }).click();
  await page.getByRole('option', { name: 'In Progress' }).click();
  await createDialog.getByRole('combobox', { name: 'Assignee' }).click();
  await page.getByRole('option', { name: 'Lin Chen' }).click();
  await chooseDate(page, createDialog, 'Start date', startDate);
  await chooseDate(page, createDialog, 'Due date', dueDate);
  await createDialog.getByRole('button', { name: 'Create' }).click();

  const boardTask = page.getByRole('button', {
    name: /Edit FT-7: Task 9 synchronized work/,
  });
  await expect(boardTask).toBeVisible();

  await page.getByRole('link', { name: 'Timeline' }).click();
  const timelineTask = page.getByRole('button', {
    name: 'FT-7: Task 9 synchronized work',
    exact: true,
  });
  await expect(timelineTask).toBeVisible();
  await timelineTask.click();
  const editDialog = page.getByRole('dialog', { name: 'Task details' });
  await editDialog.getByRole('combobox', { name: 'Status' }).click();
  await page.getByRole('option', { name: 'Done' }).click();
  await chooseDate(page, editDialog, 'Due date', updatedDueDate);
  await editDialog.getByRole('button', { name: 'Save task' }).click();

  await page.getByRole('link', { name: 'Summary' }).click();
  const recentActivity = page
    .getByRole('heading', { name: 'Recent activity' })
    .locator('..');
  await expect(
    recentActivity.getByRole('button', {
      name: /FT-7.*Task 9 synchronized work.*Done/,
    }),
  ).toBeVisible();
  await page.getByRole('checkbox', { name: 'Bug' }).click();
  await page.getByRole('checkbox', { name: 'Done' }).click();
  await expect(page.getByText('2 active dimensions')).toBeVisible();
  await expect(
    recentActivity.getByText('Task 9 synchronized work'),
  ).toBeVisible();

  const persisted = await page.evaluate(() => {
    const snapshot = JSON.parse(
      localStorage.getItem('forcetrack:tasks:v2') ?? '{}',
    ) as {
      tasks?: Array<{
        title: string;
        status: string;
        startDate: string | null;
        dueDate: string | null;
      }>;
    };
    return snapshot.tasks?.find(
      (task) => task.title === 'Task 9 synchronized work',
    );
  });
  expect(persisted).toMatchObject({
    status: 'done',
    startDate,
    dueDate: updatedDueDate,
  });
});
