import { expect, test, type Locator, type Page } from '@playwright/test';

async function dragCardToColumn(
  page: Page,
  card: Locator,
  column: Locator,
): Promise<void> {
  const cardBox = await card.boundingBox();
  const columnBox = await column.boundingBox();
  if (!cardBox || !columnBox) throw new Error('Drag targets are not visible');

  await page.mouse.move(
    cardBox.x + cardBox.width / 2,
    cardBox.y + cardBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    cardBox.x + cardBox.width / 2 + 12,
    cardBox.y + cardBox.height / 2 + 2,
    { steps: 3 },
  );
  await page.mouse.move(
    columnBox.x + columnBox.width / 2,
    columnBox.y + columnBox.height - 32,
    { steps: 12 },
  );
  await page.mouse.up();
}

async function dragCardOverCard(
  page: Page,
  card: Locator,
  targetCard: Locator,
): Promise<void> {
  const cardBox = await card.boundingBox();
  if (!cardBox) throw new Error('Dragged card is not visible');

  await page.mouse.move(
    cardBox.x + cardBox.width / 2,
    cardBox.y + cardBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    cardBox.x + cardBox.width / 2 + 12,
    cardBox.y + cardBox.height / 2 + 2,
    { steps: 3 },
  );
  await moveHeldCardOverCard(page, targetCard, 0.25);
}

async function moveHeldCardOverCard(
  page: Page,
  targetCard: Locator,
  verticalRatio: number,
): Promise<void> {
  const targetBox = await targetCard.boundingBox();
  if (!targetBox) throw new Error('Target card is not visible');

  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height * verticalRatio,
    { steps: 12 },
  );
}

async function visualCardOrder(column: Locator): Promise<string[]> {
  return column
    .locator('.task-card-slot, .board-task-drop-placeholder')
    .evaluateAll((items) =>
      items.map((item) =>
        item.classList.contains('board-task-drop-placeholder')
          ? 'placeholder'
          : (item.querySelector('.task-card-key')?.textContent ?? ''),
      ),
    );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('forcetrack:dnd-test-initialized')) {
      localStorage.removeItem('forcetrack:tasks:v2');
      localStorage.removeItem('forcetrack:workspace:v3');
      localStorage.setItem(
        'forcetrack:preferences:v1',
        JSON.stringify({ locale: 'en-US', theme: 'light' }),
      );
      sessionStorage.setItem('forcetrack:dnd-test-initialized', 'true');
    }
  });
});

test('moves a task across columns and preserves its status after reload', async ({
  page,
}) => {
  await page.goto('/board');

  const card = page.getByRole('button', {
    name: /Edit FT-1: Define MVP acceptance criteria/,
  });
  const doneColumn = page.getByTestId('board-column-done');
  await expect(card).toBeVisible();
  await expect(card.getByTestId('task-card-work-type')).toHaveText('Story');
  await expect(doneColumn.getByLabel('Done, 1 tasks')).toBeVisible();

  await dragCardToColumn(page, card, doneColumn);

  await expect(
    doneColumn.getByRole('button', { name: /Edit FT-1:/ }),
  ).toBeVisible();
  await expect(doneColumn.getByLabel('Done, 2 tasks')).toBeVisible();

  const storedBeforeReload = await page.evaluate(() => {
    const raw = localStorage.getItem('forcetrack:workspace:v3');
    if (!raw) return null;
    return (
      JSON.parse(raw) as {
        projects: Array<{
          tasks: Array<{ key: string; status: string; position: number }>;
        }>;
      }
    ).projects[0].tasks.find((task) => task.key === 'FT-1');
  });
  expect(storedBeforeReload).toMatchObject({ status: 'done' });

  await page.reload();
  await expect(
    page
      .getByTestId('board-column-done')
      .getByRole('button', { name: /Edit FT-1:/ }),
  ).toBeVisible();

  const storedTask = await page.evaluate(() => {
    const raw = localStorage.getItem('forcetrack:workspace:v3');
    if (!raw) return null;
    return (
      JSON.parse(raw) as {
        projects: Array<{
          tasks: Array<{ key: string; status: string; position: number }>;
        }>;
      }
    ).projects[0].tasks.find((task) => task.key === 'FT-1');
  });
  expect(storedTask).toEqual(storedBeforeReload);
});

test('pushes a single target card aside while previewing its insertion point', async ({
  page,
}) => {
  await page.goto('/board');

  const movingCard = page.getByRole('button', {
    name: /Edit FT-1: Define MVP acceptance criteria/,
  });
  const doneColumn = page.getByTestId('board-column-done');
  const targetCard = doneColumn.getByRole('button', {
    name: /Edit FT-5: Set up quality gates/,
  });
  const initialTargetBox = await targetCard.boundingBox();
  expect(initialTargetBox).not.toBeNull();

  await dragCardOverCard(page, movingCard, targetCard);

  const placeholder = doneColumn.getByTestId('board-task-drop-placeholder');
  await expect(placeholder).toBeVisible();
  await expect
    .poll(async () => (await targetCard.boundingBox())?.y ?? 0)
    .toBeGreaterThan(initialTargetBox!.y + initialTargetBox!.height / 2);

  await page.mouse.up();
  await expect(doneColumn.getByLabel('Done, 2 tasks')).toBeVisible();
  await expect(doneColumn.locator('.task-card-key')).toHaveText([
    'FT-1',
    'FT-5',
  ]);
});

test('moves a middle insertion preview upward without a placeholder dead zone', async ({
  page,
}) => {
  await page.goto('/board');

  const progressColumn = page.getByTestId('board-column-in_progress');
  const firstCard = page.getByRole('button', {
    name: /Edit FT-1: Define MVP acceptance criteria/,
  });
  await dragCardToColumn(page, firstCard, progressColumn);
  await expect(progressColumn.getByLabel('In Progress, 2 tasks')).toBeVisible();

  const movingCard = page.getByRole('button', {
    name: /Edit FT-4: Review board interactions/,
  });
  const lowerCard = progressColumn.getByRole('button', {
    name: /Edit FT-1: Define MVP acceptance criteria/,
  });
  await dragCardOverCard(page, movingCard, lowerCard);
  await expect
    .poll(() => visualCardOrder(progressColumn))
    .toEqual(['FT-3', 'placeholder', 'FT-1']);

  const upperCard = progressColumn.getByRole('button', {
    name: /Edit FT-3: Build task editor flow/,
  });
  await moveHeldCardOverCard(page, upperCard, 0.2);
  await expect
    .poll(() => visualCardOrder(progressColumn))
    .toEqual(['placeholder', 'FT-3', 'FT-1']);

  await page.mouse.up();
  await expect(progressColumn.locator('.task-card-key')).toHaveText([
    'FT-4',
    'FT-3',
    'FT-1',
  ]);
});

test('supports moving a focused task with the keyboard sensor', async ({
  page,
}) => {
  await page.goto('/board');

  const card = page.getByRole('button', {
    name: /Edit FT-1: Define MVP acceptance criteria/,
  });
  await card.focus();
  await page.keyboard.press('Space');
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[id^="DndLiveRegion-"]')).toContainText(
    'In Progress',
  );
  await page.keyboard.press('Space');

  await expect(
    page
      .getByTestId('board-column-in_progress')
      .getByRole('button', { name: /Edit FT-1:/ }),
  ).toBeVisible();
});
