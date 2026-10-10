import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

function column(page: Page, name: string) {
  return page.getByRole('region', { name });
}

function modal(page: Page) {
  return page.getByRole('dialog', { name: /task details/i });
}

async function addTask(page: Page, columnName: string, title: string) {
  const input = column(page, columnName).getByRole('textbox', { name: /add task/i });
  await input.fill(title);
  await input.press('Enter');
  await expect(input).toHaveValue('');
}

async function openTask(page: Page, title: string) {
  await page.getByRole('listitem').filter({ hasText: title }).click();
  await expect(modal(page)).toBeVisible();
  return modal(page);
}

test('edits made in the modal save as they happen and survive a reload', async ({ page }) => {
  await addTask(page, 'To Do', 'Draft');

  let dialog = await openTask(page, 'Draft');
  await expect(dialog.getByLabel('Title')).toBeFocused();
  await dialog.getByLabel('Title').fill('Write the release notes');
  await dialog.getByLabel('Description').fill('Cover the new modal\nand the delete flow');
  await dialog.getByLabel('Priority').selectOption('High');
  await dialog.getByLabel('Due date').fill('2026-11-03');
  await expect(column(page, 'To Do').getByRole('listitem')).toContainText(['Write the release notes']);

  // A cleared title comes back when the field loses focus.
  await dialog.getByLabel('Title').fill('');
  await dialog.getByLabel('Description').focus();
  await expect(dialog.getByLabel('Title')).toHaveValue('Write the release notes');

  await page.keyboard.press('Escape');
  await expect(modal(page)).toHaveCount(0);

  await page.reload();

  dialog = await openTask(page, 'Write the release notes');
  await expect(dialog.getByLabel('Description')).toHaveValue('Cover the new modal\nand the delete flow');
  await expect(dialog.getByLabel('Priority')).toHaveValue('high');
  await expect(dialog.getByLabel('Due date')).toHaveValue('2026-11-03');

  await dialog.getByRole('button', { name: /clear due date/i }).click();
  await dialog.getByRole('button', { name: /close/i }).click();
  await page.reload();
  dialog = await openTask(page, 'Write the release notes');
  await expect(dialog.getByLabel('Due date')).toHaveValue('');
});

test('deleting a Task asks first, then removes it for good', async ({ page }) => {
  await addTask(page, 'In Progress', 'Keep');
  await addTask(page, 'In Progress', 'Remove');
  const count = column(page, 'In Progress').getByLabel('Task count');
  await expect(count).toHaveText('2');

  let dialog = await openTask(page, 'Remove');
  await dialog.getByRole('button', { name: /delete task/i }).click();
  const confirmation = page.getByRole('alertdialog', { name: /delete this task/i });
  await confirmation.getByRole('button', { name: /cancel/i }).click();
  await expect(confirmation).toHaveCount(0);
  await expect(modal(page)).toBeVisible();
  await expect(count).toHaveText('2');

  await dialog.getByRole('button', { name: /delete task/i }).click();
  await confirmation.getByRole('button', { name: /^delete$/i }).click();
  await expect(modal(page)).toHaveCount(0);
  await expect(column(page, 'In Progress').getByRole('listitem')).toHaveText(['Keep']);
  await expect(count).toHaveText('1');

  await page.reload();
  await expect(column(page, 'In Progress').getByRole('listitem')).toHaveText(['Keep']);
  await expect(count).toHaveText('1');
});
