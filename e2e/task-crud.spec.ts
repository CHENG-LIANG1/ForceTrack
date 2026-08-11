import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('forcetrack:crud-test-initialized')) {
      localStorage.removeItem('forcetrack:tasks:v2');
      localStorage.setItem(
        'forcetrack:preferences:v1',
        JSON.stringify({ locale: 'en-US', theme: 'light' }),
      );
      sessionStorage.setItem('forcetrack:crud-test-initialized', 'true');
    }
  });
});

test('creates, edits, persists, and deletes a task', async ({ page }) => {
  await page.goto('/board');

  await page.getByRole('button', { name: 'New task' }).first().click();
  const createDialog = page.getByRole('dialog', { name: 'Create task' });
  await createDialog.getByRole('textbox', { name: /Summary/ }).fill('E2E task');
  await createDialog.getByRole('combobox', { name: 'Status' }).click();
  await page.getByRole('option', { name: 'In Progress' }).click();
  await createDialog.getByRole('button', { name: 'Create' }).click();

  const taskButton = page.getByRole('button', { name: /Edit FT-7: E2E task/ });
  await expect(taskButton).toBeVisible();
  await page.reload();
  await expect(taskButton).toBeVisible();

  await taskButton.click();
  const editDialog = page.getByRole('dialog', { name: 'Task details' });
  await editDialog
    .getByRole('textbox', { name: /Summary/ })
    .fill('E2E task updated');
  await editDialog.getByRole('combobox', { name: 'Status' }).click();
  await page.getByRole('option', { name: 'Done' }).click();
  await editDialog.getByRole('button', { name: 'Save task' }).click();

  const updatedTask = page.getByRole('button', {
    name: /Edit FT-7: E2E task updated/,
  });
  await expect(updatedTask).toBeVisible();
  await page.reload();
  await expect(updatedTask).toBeVisible();

  await updatedTask.click();
  await page.getByRole('button', { name: 'Delete task' }).click();
  const confirmation = page.getByRole('alertdialog', {
    name: 'Delete this task?',
  });
  await confirmation
    .getByRole('button', { name: 'Delete permanently' })
    .click();

  await expect(updatedTask).toHaveCount(0);
  const storedTaskTitles = await page.evaluate(() => {
    const raw = localStorage.getItem('forcetrack:tasks:v2');
    if (!raw) return [];
    return (JSON.parse(raw) as { tasks: { title: string }[] }).tasks.map(
      (task) => task.title,
    );
  });
  expect(storedTaskTitles).not.toContain('E2E task updated');
});
