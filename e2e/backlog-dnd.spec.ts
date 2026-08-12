import { expect, test, type Locator, type Page } from '@playwright/test';

async function dragWorkItem(
  page: Page,
  item: Locator,
  target: Locator,
  edge: 'before' | 'after' | 'center' = 'center',
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
  await expect(page.locator('.backlog-item-overlay').last()).toBeVisible();
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    edge === 'before'
      ? targetBox.y + 4
      : edge === 'after'
        ? targetBox.y + targetBox.height - 4
        : targetBox.y + targetBox.height / 2,
    { steps: 12 },
  );
  if (edge !== 'center') {
    await expect(target.locator('..')).toHaveClass(
      new RegExp(`backlog-row-drop-${edge}`),
    );
  }
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('forcetrack:backlog-dnd-initialized')) {
      localStorage.removeItem('forcetrack:tasks:v2');
      localStorage.removeItem('forcetrack:workspace:v3');
      localStorage.setItem(
        'forcetrack:preferences:v1',
        JSON.stringify({ locale: 'en-US', theme: 'light' }),
      );
      sessionStorage.setItem('forcetrack:backlog-dnd-initialized', 'true');
    }
  });
});

test('drags work between a sprint and backlog without row arrow actions', async ({
  page,
}) => {
  await page.goto('/backlog');

  const sprint = page.getByTestId('backlog-section:sprint-1');
  const backlog = page.getByTestId('backlog-section:__backlog__');
  const backlogItem = backlog.getByTestId('backlog-item-FT-2');
  const secondBacklogItem = backlog.getByTestId('backlog-item-FT-6');
  await expect(backlogItem).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Move to sprint/i }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /Move to backlog/i }),
  ).toHaveCount(0);

  await dragWorkItem(page, backlogItem, secondBacklogItem, 'after');
  await expect
    .poll(() =>
      backlog
        .locator('[data-testid^="backlog-item-"]')
        .evaluateAll((items) => items.map((item) => item.textContent)),
    )
    .toEqual([
      expect.stringContaining('Map timeline edge cases'),
      expect.stringContaining('Prepare usability test script'),
    ]);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('forcetrack:workspace:v3');
        if (!raw) return null;
        const tasks = (
          JSON.parse(raw) as {
            projects: Array<{
              tasks: Array<{
                key: string;
                rank: number;
                status: string;
              }>;
            }>;
          }
        ).projects[0].tasks;
        return tasks
          .filter((task) => task.key === 'FT-2' || task.key === 'FT-6')
          .sort((left, right) => left.rank - right.rank)
          .map(({ key, status }) => ({ key, status }));
      }),
    )
    .toEqual([
      { key: 'FT-6', status: 'done' },
      { key: 'FT-2', status: 'todo' },
    ]);

  await dragWorkItem(page, backlogItem, sprint);
  await expect(sprint.getByTestId('backlog-item-FT-2')).toBeVisible();
  await expect(backlog.getByTestId('backlog-item-FT-2')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('forcetrack:workspace:v3');
        if (!raw) return undefined;
        return (
          JSON.parse(raw) as {
            projects: Array<{
              tasks: Array<{ key: string; sprintId: string | null }>;
            }>;
          }
        ).projects[0].tasks.find((task) => task.key === 'FT-2')?.sprintId;
      }),
    )
    .toBe('sprint-1');

  await page.reload();
  const persistedSprint = page.getByTestId('backlog-section:sprint-1');
  const persistedBacklog = page.getByTestId('backlog-section:__backlog__');
  const sprintItem = persistedSprint.getByTestId('backlog-item-FT-2');
  await expect(sprintItem).toBeVisible();

  await dragWorkItem(page, sprintItem, persistedBacklog);
  await expect(persistedBacklog.getByTestId('backlog-item-FT-2')).toBeVisible();
  await expect(persistedSprint.getByTestId('backlog-item-FT-2')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('forcetrack:workspace:v3');
        if (!raw) return undefined;
        return (
          JSON.parse(raw) as {
            projects: Array<{
              tasks: Array<{ key: string; sprintId: string | null }>;
            }>;
          }
        ).projects[0].tasks.find((task) => task.key === 'FT-2')?.sprintId;
      }),
    )
    .toBeNull();
});

test('updates status, due date, and priority directly in a backlog row', async ({
  page,
}) => {
  await page.goto('/backlog');

  const quickFields = page.getByTestId('backlog-quick-fields-FT-2');
  await quickFields
    .getByRole('combobox', { name: 'Set status for FT-2' })
    .click();
  await page.getByRole('option', { name: 'Done' }).click();

  await quickFields
    .getByRole('combobox', { name: 'Set priority for FT-2' })
    .click();
  await page.getByRole('option', { name: 'High priority' }).click();

  await quickFields
    .getByRole('button', { name: 'Set due date for FT-2' })
    .click();
  await page.locator('.rdp-day_button').filter({ hasText: /^20$/ }).click();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('forcetrack:workspace:v3');
        if (!raw) return null;
        return (
          JSON.parse(raw) as {
            projects: Array<{
              tasks: Array<{
                key: string;
                status: string;
                priority: string;
                dueDate: string | null;
              }>;
            }>;
          }
        ).projects[0].tasks.find((task) => task.key === 'FT-2');
      }),
    )
    .toMatchObject({
      status: 'done',
      priority: 'high',
      dueDate: '2026-08-20',
    });
});

test('supports moving a focused backlog item into a sprint with the keyboard', async ({
  page,
}) => {
  await page.goto('/backlog');

  const item = page.getByTestId('backlog-item-FT-2');
  await item.focus();
  await page.keyboard.press('Space');
  await expect(item).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('[id^="DndLiveRegion-"]')).toContainText(
    'ForceTrack Sprint 1',
  );
  await page.keyboard.press('Space');

  await expect(
    page
      .getByTestId('backlog-section:sprint-1')
      .getByTestId('backlog-item-FT-2'),
  ).toBeVisible();
});
