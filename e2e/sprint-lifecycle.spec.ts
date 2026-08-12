import { expect, test, type Locator, type Page } from '@playwright/test';

async function dragWorkItem(
  page: Page,
  item: Locator,
  target: Locator,
): Promise<void> {
  await item.scrollIntoViewIfNeeded();
  const itemBox = await item.boundingBox();
  const targetBox = await target.boundingBox();
  if (!itemBox || !targetBox) throw new Error('Drag targets are not visible');

  await page.mouse.move(
    itemBox.x + itemBox.width / 2,
    itemBox.y + itemBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    itemBox.x + itemBox.width / 2 + 12,
    itemBox.y + itemBox.height / 2 + 2,
    { steps: 3 },
  );
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('forcetrack:sprint-lifecycle-initialized')) {
      localStorage.removeItem('forcetrack:tasks:v2');
      localStorage.removeItem('forcetrack:workspace:v3');
      localStorage.setItem(
        'forcetrack:preferences:v1',
        JSON.stringify({ locale: 'en-US', theme: 'light' }),
      );
      sessionStorage.setItem('forcetrack:sprint-lifecycle-initialized', 'true');
    }
  });
});

test('plans, starts, executes, and completes a sprint across Backlog and Board', async ({
  page,
}) => {
  await page.goto('/backlog');

  await page.getByRole('button', { name: 'Complete sprint' }).click();
  const completeDialog = page.getByRole('alertdialog', {
    name: 'Complete sprint',
  });
  await expect(completeDialog).toContainText('3 incomplete work items');
  await expect(
    completeDialog.getByRole('button', { name: 'Complete' }),
  ).toBeDisabled();
  await completeDialog.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Backlog' }).click();
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
  const backlogWorkItem = page
    .getByTestId('backlog-section:__backlog__')
    .getByTestId('backlog-item-FT-1');
  await dragWorkItem(page, backlogWorkItem, sprintSection);
  await expect(sprintSection.getByTestId('backlog-item-FT-1')).toBeVisible();
  await sprintSection.getByRole('button', { name: 'Add work item' }).click();
  const taskDialog = page.getByRole('dialog', { name: 'Create task' });
  await taskDialog.getByLabel('Summary').fill('Sprint 2 work item');
  await taskDialog.getByRole('button', { name: 'Create' }).click();
  await expect(sprintSection.getByText('Sprint 2 work item')).toBeVisible();
  await sprintSection.getByRole('button', { name: 'Start sprint' }).click();

  const startDialog = page.getByRole('dialog', { name: 'Start sprint' });
  await startDialog.getByLabel(/Sprint name/).fill('Sprint 2 delivery');
  await startDialog.getByLabel('Sprint goal').fill('Finish the lifecycle');
  await startDialog.getByRole('button', { name: 'Start sprint' }).click();

  await expect(page).toHaveURL(/\/board$/);
  await expect(page.getByText('Sprint 2 delivery')).toBeVisible();
  await expect(page.getByText('Finish the lifecycle')).toBeVisible();
  await expect(page.getByText('Sprint 2 work item')).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: /Edit FT-1: Define MVP acceptance criteria/,
    }),
  ).toBeVisible();
  await expect(page.getByText('Prepare usability test script')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('forcetrack:workspace:v3');
        if (!raw) return null;
        return (
          JSON.parse(raw) as {
            projects: Array<{
              sprints: Array<{
                name: string;
                status: string;
                goal: string;
              }>;
            }>;
          }
        ).projects[0].sprints.find(
          (sprint) => sprint.name === 'Sprint 2 delivery',
        );
      }),
    )
    .toMatchObject({
      status: 'active',
      goal: 'Finish the lifecycle',
    });

  await page.getByRole('button', { name: 'Complete sprint' }).click();
  const boardCompleteDialog = page.getByRole('alertdialog', {
    name: 'Complete sprint',
  });
  await boardCompleteDialog.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Backlog' }).click();
  await boardCompleteDialog.getByRole('button', { name: 'Complete' }).click();
  await expect(
    page.getByRole('heading', { name: 'No active sprint' }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'No active sprint' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Open Backlog' }).click();
  await expect(page.getByText('Sprint 2 work item')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Sprint 2 delivery' }),
  ).toHaveCount(0);
});

test('edits and deletes a planned sprint without losing its work', async ({
  page,
}) => {
  await page.goto('/backlog');
  await page.getByRole('button', { name: 'Create sprint' }).click();
  const createDialog = page.getByRole('dialog', { name: 'Create sprint' });
  await createDialog.getByLabel(/Sprint name/).fill('Disposable sprint');
  await createDialog.getByRole('button', { name: 'Create sprint' }).click();

  const section = page
    .locator('section[data-testid^="backlog-section:"]')
    .filter({
      has: page.getByRole('heading', { name: 'Disposable sprint' }),
    });
  await section.getByRole('button', { name: 'Add work item' }).click();
  const taskDialog = page.getByRole('dialog', { name: 'Create task' });
  await taskDialog.getByLabel('Summary').fill('Keep this work item');
  await taskDialog.getByRole('button', { name: 'Create' }).click();

  await section.getByRole('button', { name: 'Edit Disposable sprint' }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit sprint' });
  await editDialog.getByLabel(/Sprint name/).fill('Renamed planned sprint');
  await editDialog.getByRole('button', { name: 'Save sprint' }).click();
  await expect(
    page.getByRole('heading', { name: 'Renamed planned sprint' }),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Edit Renamed planned sprint' })
    .click();
  await page
    .getByRole('dialog', { name: 'Edit sprint' })
    .getByRole('button', { name: 'Delete sprint' })
    .click();
  const deleteDialog = page.getByRole('alertdialog', { name: 'Delete sprint' });
  await expect(deleteDialog).toContainText('move to Backlog');
  await deleteDialog.getByRole('button', { name: 'Delete sprint' }).click();

  await expect(
    page.getByRole('heading', { name: 'Renamed planned sprint' }),
  ).toHaveCount(0);
  await expect(
    page
      .getByTestId('backlog-section:__backlog__')
      .getByText('Keep this work item'),
  ).toBeVisible();
});
