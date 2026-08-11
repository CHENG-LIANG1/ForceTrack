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

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('forcetrack:dnd-test-initialized')) {
      localStorage.removeItem('forcetrack:tasks:v1');
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
  await expect(doneColumn.getByLabel('Done, 2 tasks')).toBeVisible();

  await dragCardToColumn(page, card, doneColumn);

  await expect(
    doneColumn.getByRole('button', { name: /Edit FT-1:/ }),
  ).toBeVisible();
  await expect(doneColumn.getByLabel('Done, 3 tasks')).toBeVisible();

  const storedBeforeReload = await page.evaluate(() => {
    const raw = localStorage.getItem('forcetrack:tasks:v1');
    if (!raw) return null;
    return (
      JSON.parse(raw) as {
        tasks: Array<{ key: string; status: string; position: number }>;
      }
    ).tasks.find((task) => task.key === 'FT-1');
  });
  expect(storedBeforeReload).toMatchObject({ status: 'done' });

  await page.reload();
  await expect(
    page
      .getByTestId('board-column-done')
      .getByRole('button', { name: /Edit FT-1:/ }),
  ).toBeVisible();

  const storedTask = await page.evaluate(() => {
    const raw = localStorage.getItem('forcetrack:tasks:v1');
    if (!raw) return null;
    return (
      JSON.parse(raw) as {
        tasks: Array<{ key: string; status: string; position: number }>;
      }
    ).tasks.find((task) => task.key === 'FT-1');
  });
  expect(storedTask).toEqual(storedBeforeReload);
});

test('supports moving a focused task with the keyboard sensor', async ({
  page,
}) => {
  await page.goto('/board');

  const card = page.getByRole('button', {
    name: /Edit FT-2: Prepare usability test script/,
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
      .getByRole('button', { name: /Edit FT-2:/ }),
  ).toBeVisible();
});
