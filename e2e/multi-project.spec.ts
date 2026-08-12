import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('forcetrack:workspace:v3');
    localStorage.removeItem('forcetrack:tasks:v2');
    localStorage.removeItem('forcetrack:tasks:v1');
    localStorage.removeItem('forcetrack:preferences:v2');
    localStorage.setItem(
      'forcetrack:preferences:v1',
      JSON.stringify({ locale: 'en-US', theme: 'light' }),
    );
  });
});

test('creates an isolated project and preserves page context through switching and history', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Switch project/ }).click();
  await page.getByRole('button', { name: 'Project management' }).click();
  await page
    .getByRole('dialog', { name: 'Project management' })
    .getByRole('button', { name: 'Create project' })
    .click();
  const projectDialog = page.getByRole('dialog', { name: 'Create project' });
  await projectDialog.getByLabel('Project name').fill('Game Platform');
  await expect(projectDialog.getByLabel(/^Project key/)).toHaveCount(0);
  await projectDialog.getByLabel(/Description/).fill('Release planning');
  await projectDialog.getByRole('button', { name: 'Create project' }).click();

  await expect(page).toHaveURL(/\/projects\/[^/]+\/summary$/);
  await page.getByRole('button', { name: 'Close project management' }).click();
  await page.getByRole('link', { name: 'Backlog', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /currently Game Platform/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'New task' }).click();
  const taskSheet = page.getByRole('dialog', { name: 'Create task' });
  await expect(
    taskSheet.getByRole('combobox', { name: 'Project' }),
  ).toContainText(/Game Platform \(P[A-Z0-9]+\)/);
  await taskSheet.getByLabel('Summary').fill('Ship first milestone');
  await taskSheet.getByRole('button', { name: 'Create' }).click();

  const workspace = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('forcetrack:workspace:v3') ?? '{}'),
  );
  expect(workspace.projects).toHaveLength(2);
  expect(workspace.projects[0].tasks).toHaveLength(6);
  expect(workspace.projects[1]).toMatchObject({
    id: expect.stringMatching(/^project-\d+$/),
    key: expect.stringMatching(/^P[A-Z0-9]{1,9}$/),
  });
  expect(workspace.projects[1].tasks).toEqual([
    expect.objectContaining({
      key: `${workspace.projects[1].key}-1`,
      title: 'Ship first milestone',
    }),
  ]);

  await page.getByRole('link', { name: 'Timeline' }).click();
  await page.getByRole('button', { name: /Switch project/ }).click();
  await page.getByRole('option', { name: /ForceTrack.*FT/ }).click();
  await expect(page).toHaveURL(/\/projects\/project-forcetrack\/timeline$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/timeline$/);
  await expect(
    page.getByRole('button', { name: /currently Game Platform/ }),
  ).toBeVisible();
});

test('edits and deletes projects from project management', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Switch project/ }).click();
  await page.getByRole('button', { name: 'Project management' }).click();
  let managementDialog = page.getByRole('dialog', {
    name: 'Project management',
  });
  await managementDialog
    .getByRole('button', { name: 'Create project' })
    .click();
  let projectForm = page.getByRole('dialog', { name: 'Create project' });
  await projectForm.getByLabel('Project name').fill('Game Platform');
  await expect(projectForm.getByLabel(/^Project key/)).toHaveCount(0);
  await projectForm.getByRole('button', { name: 'Create project' }).click();

  managementDialog = page.getByRole('dialog', { name: 'Project management' });
  await managementDialog
    .getByRole('button', { name: 'Edit project Game Platform' })
    .click();
  projectForm = page.getByRole('dialog', { name: 'Edit project' });
  await expect(projectForm.getByLabel(/^Project key/)).toHaveCount(0);
  await projectForm.getByLabel('Project name').fill('Game Delivery');
  await projectForm
    .getByLabel(/Description/)
    .fill('Launch planning and delivery');
  await projectForm.getByRole('button', { name: 'Save project' }).click();

  managementDialog = page.getByRole('dialog', { name: 'Project management' });
  await expect(managementDialog).toContainText('Game Delivery');
  await managementDialog
    .getByRole('button', { name: 'Delete project Game Delivery' })
    .click();
  const confirmation = page.getByRole('alertdialog', {
    name: 'Delete project?',
  });
  await expect(confirmation).toContainText('0 tasks');
  const confirmationName = confirmation.getByLabel(
    'Type Game Delivery to confirm',
  );
  await expect(
    confirmation.getByRole('button', { name: 'Delete permanently' }),
  ).toBeDisabled();
  await confirmationName.fill('Game Delivery');
  await confirmation
    .getByRole('button', { name: 'Delete permanently' })
    .click();

  await expect(page).toHaveURL('/projects/project-forcetrack/summary');
  await expect(managementDialog).not.toContainText('Game Delivery');
  await expect(
    managementDialog.getByRole('button', {
      name: 'Delete project ForceTrack',
    }),
  ).toBeEnabled();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('forcetrack:workspace:v3') ?? '{}'),
    ),
  ).toMatchObject({
    projects: [expect.objectContaining({ id: 'project-forcetrack' })],
  });
});

test('deletes the final current project by name and guides project creation', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Switch project/ }).click();
  await page.getByRole('button', { name: 'Project management' }).click();
  const managementDialog = page.getByRole('dialog', {
    name: 'Project management',
  });
  await managementDialog
    .getByRole('button', { name: 'Delete project ForceTrack' })
    .click();

  const confirmation = page.getByRole('alertdialog', {
    name: 'Delete project?',
  });
  const deleteButton = confirmation.getByRole('button', {
    name: 'Delete permanently',
  });
  const confirmationName = confirmation.getByLabel(
    'Type ForceTrack to confirm',
  );
  await expect(deleteButton).toBeDisabled();
  await confirmationName.fill('ForceTrac');
  await expect(deleteButton).toBeDisabled();
  await confirmationName.fill('ForceTrack');
  await expect(deleteButton).toBeEnabled();
  await deleteButton.click();

  await expect(page).toHaveURL('/');
  await expect(
    page.getByRole('heading', { name: 'Create your first project', level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Summary' })).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('forcetrack:workspace:v3') ?? '{}'),
    ),
  ).toMatchObject({ projects: [] });

  await page.getByRole('button', { name: 'Create project' }).click();
  const createDialog = page.getByRole('dialog', { name: 'Create project' });
  await createDialog.getByLabel('Project name').fill('Next Project');
  await createDialog.getByRole('button', { name: 'Create project' }).click();
  await expect(page).toHaveURL(/\/projects\/project-\d+\/summary$/);
  await expect(
    page.getByRole('button', { name: /currently Next Project/ }),
  ).toBeVisible();
});

test('keeps project, navigation, user controls, and the task sheet usable at 390 px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/summary');
  await expect(
    page.getByRole('button', { name: /Switch project/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Open user menu' }),
  ).toBeVisible();
  for (const name of ['Summary', 'Backlog', 'Board', 'Timeline']) {
    await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: /Switch project/ }).click();
  await page.getByRole('button', { name: 'Project management' }).click();
  const managementDialog = page.getByRole('dialog', {
    name: 'Project management',
  });
  await expect
    .poll(async () => {
      const box = await managementDialog.boundingBox();
      return box
        ? {
            x: Math.round(box.x),
            width: Math.round(box.width),
            overflow: await page.evaluate(
              () => document.documentElement.scrollWidth - window.innerWidth,
            ),
          }
        : null;
    })
    .toEqual({ x: 16, width: 358, overflow: 0 });
  await expect(
    managementDialog.getByRole('button', { name: 'Create project' }),
  ).toHaveCSS('min-height', '44px');
  await managementDialog
    .getByRole('button', { name: 'Close project management' })
    .click();
  await page.getByRole('link', { name: 'Backlog', exact: true }).click();
  await page.getByRole('button', { name: 'New task' }).click();
  const sheet = page.getByRole('dialog', { name: 'Create task' });
  await expect(sheet).toBeVisible();
  await expect
    .poll(async () => {
      const box = await sheet.boundingBox();
      return box
        ? { x: Math.round(box.x), width: Math.round(box.width) }
        : null;
    })
    .toEqual({ x: 0, width: 390 });
  await sheet.getByRole('button', { name: 'Close task editor' }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test('keeps shared menus aligned and inside the mobile viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/summary');

  const projectTrigger = page.getByRole('button', {
    name: /Switch project/,
  });
  await projectTrigger.click();
  const projectMenu = page.locator('.project-switcher-menu');
  const projectMenuBox = await projectMenu.boundingBox();
  expect(projectMenuBox).not.toBeNull();
  expect(projectMenuBox!.x).toBeGreaterThanOrEqual(12);
  expect(projectMenuBox!.x + projectMenuBox!.width).toBeLessThanOrEqual(378);

  const projectAction = page
    .locator('.project-menu-actions .ui-menu-item')
    .first();
  await expect(projectAction).toHaveCSS('display', 'grid');
  await expect(projectAction).toHaveCSS(
    'grid-template-columns',
    /20px .* 20px/,
  );
  const leadingBox = await projectAction
    .locator('.ui-menu-item-leading')
    .boundingBox();
  const contentBox = await projectAction
    .locator('.ui-menu-item-content')
    .boundingBox();
  expect(leadingBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(contentBox!.x).toBeGreaterThanOrEqual(
    leadingBox!.x + leadingBox!.width,
  );
  expect((await projectAction.boundingBox())!.height).toBeGreaterThanOrEqual(
    44,
  );

  await projectTrigger.click();
  await page.getByRole('button', { name: 'Open user menu' }).click();
  const userMenu = page.locator('.user-menu-popover');
  const userMenuBox = await userMenu.boundingBox();
  expect(userMenuBox).not.toBeNull();
  expect(userMenuBox!.x).toBeGreaterThanOrEqual(12);
  expect(userMenuBox!.x + userMenuBox!.width).toBeLessThanOrEqual(378);

  const userMenuItems = userMenu.locator('.ui-menu-item');
  await expect(userMenuItems).toHaveCount(5);
  for (let index = 0; index < (await userMenuItems.count()); index += 1) {
    expect(
      (await userMenuItems.nth(index).boundingBox())!.height,
    ).toBeGreaterThanOrEqual(44);
  }
  await expect(userMenuItems.first()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(userMenuItems.nth(1)).toBeFocused();
  expect(
    await userMenuItems
      .nth(1)
      .evaluate((element) => getComputedStyle(element).boxShadow),
  ).not.toBe('none');

  await page.setViewportSize({ width: 320, height: 700 });
  await page.reload();
  await page.getByRole('button', { name: 'Open user menu' }).click();
  const narrowMenuBox = await page.locator('.user-menu-popover').boundingBox();
  expect(narrowMenuBox).not.toBeNull();
  expect(narrowMenuBox!.x).toBeGreaterThanOrEqual(12);
  expect(narrowMenuBox!.x + narrowMenuBox!.width).toBeLessThanOrEqual(308);
});

test('prevents document-level overflow across every core page', async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 700 },
    { width: 390, height: 844 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of ['summary', 'backlog', 'board', 'timeline']) {
      await page.goto(`/projects/project-forcetrack/${route}`);
      await expect(page.locator('main')).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${route} should not overflow at ${viewport.width}px`,
      ).toBe(true);
    }
  }
});
