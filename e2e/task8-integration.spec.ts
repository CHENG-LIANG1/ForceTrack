/** Browser acceptance for Task 8 member integration, recovery, and the 768 px access path. */
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('forcetrack:task8-initialized')) {
      localStorage.removeItem('forcetrack:tasks:v2');
      localStorage.removeItem('forcetrack:tasks:v1');
      localStorage.removeItem('forcetrack:recovery:last-invalid');
      localStorage.setItem(
        'forcetrack:preferences:v1',
        JSON.stringify({ locale: 'en-US', theme: 'light' }),
      );
      sessionStorage.setItem('forcetrack:task8-initialized', 'true');
    }
  });
});

test('persists a local member and synchronizes assignment across all four tabs', async ({
  page,
}) => {
  await page.goto('/backlog');
  await page.getByRole('button', { name: 'Add member' }).click();
  let memberDialog = page.getByRole('dialog', { name: 'Add member' });
  await expect(
    memberDialog.getByRole('heading', { name: 'Project members' }),
  ).toBeVisible();
  await memberDialog.getByRole('textbox', { name: /Name/ }).fill('Grace Kim');
  await memberDialog
    .getByRole('textbox', { name: /Email/ })
    .fill('grace@example.com');
  await memberDialog.getByRole('button', { name: 'Add member' }).click();
  await expect(memberDialog).toBeHidden();

  await page.reload();
  await page.getByRole('button', { name: 'Add member' }).click();
  memberDialog = page.getByRole('dialog', { name: 'Add member' });
  await expect(memberDialog.getByText('Grace Kim')).toBeVisible();
  await expect(memberDialog.getByText('grace@example.com')).toBeVisible();
  await memberDialog
    .getByRole('button', { name: 'Close member dialog' })
    .click();

  await page.getByRole('link', { name: 'Board', exact: true }).click();
  await page.getByRole('button', { name: 'New task' }).first().click();
  const taskDialog = page.getByRole('dialog', { name: 'Create task' });
  await taskDialog
    .getByRole('textbox', { name: /Summary/ })
    .fill('Local member integration');
  await taskDialog.getByRole('combobox', { name: 'Assignee' }).click();
  await page.getByRole('option', { name: 'Grace Kim' }).click();
  await taskDialog.getByRole('combobox', { name: 'Reporter' }).click();
  await page.getByRole('option', { name: 'Grace Kim' }).click();
  await taskDialog.getByRole('button', { name: 'Create' }).click();

  const boardTask = page.getByRole('button', {
    name: /Edit FT-7: Local member integration/,
  });
  await expect(boardTask).toBeVisible();
  await expect(boardTask.getByLabel('Grace Kim')).toBeVisible();

  await page.getByRole('link', { name: 'Backlog' }).click();
  const backlogTask = page
    .getByTestId('backlog-section:sprint-1')
    .getByTestId('backlog-item-FT-7');
  await expect(backlogTask).toBeVisible();
  await expect(backlogTask.locator('[title="Grace Kim"]')).toBeVisible();

  await page.getByRole('link', { name: 'Summary' }).click();
  await expect(page.getByRole('checkbox', { name: 'Grace Kim' })).toBeVisible();
  await expect(
    page
      .getByRole('heading', { name: 'Team workload' })
      .locator('..')
      .getByText('Grace Kim'),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Timeline' }).click();
  await expect(
    page.getByRole('button', { name: /FT-7.*Local member integration/ }),
  ).toBeVisible();

  const storedAssignment = await page.evaluate(() => {
    const snapshot = JSON.parse(
      localStorage.getItem('forcetrack:tasks:v2') ?? '{}',
    ) as {
      members?: Array<{ id: string; email: string }>;
      tasks?: Array<{
        title: string;
        assigneeId: string | null;
        reporterId: string | null;
      }>;
    };
    const member = snapshot.members?.find(
      (candidate) => candidate.email === 'grace@example.com',
    );
    const task = snapshot.tasks?.find(
      (candidate) => candidate.title === 'Local member integration',
    );
    return {
      memberId: member?.id,
      assigneeId: task?.assigneeId,
      reporterId: task?.reporterId,
    };
  });
  expect(storedAssignment.assigneeId).toBe(storedAssignment.memberId);
  expect(storedAssignment.reporterId).toBe(storedAssignment.memberId);
});

test('recovers malformed storage without blocking routes and dismisses the warning', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('forcetrack:tasks:v2', '{invalid-json');
  });
  await page.goto('/summary');

  await expect(page.getByText(/restored the demo tasks/)).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Summary', level: 1 }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem('forcetrack:recovery:last-invalid'),
    ),
  ).toBe('{invalid-json');

  await page.getByRole('button', { name: 'Dismiss recovery message' }).click();
  await page.getByRole('link', { name: 'Timeline' }).click();
  await expect(page.getByText(/restored the demo tasks/)).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Timeline', level: 1 }),
  ).toBeVisible();
});

test('keeps navigation and primary planning actions accessible at 768 px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 720 });
  await page.goto('/backlog');

  for (const name of ['Summary', 'Backlog', 'Board', 'Timeline']) {
    await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add member' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Create sprint' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'New task' })).toBeVisible();

  const documentWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(documentWidth).toBeLessThanOrEqual(768);
});
