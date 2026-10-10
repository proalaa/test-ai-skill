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
  await page.getByRole('listitem').filter({ hasText: title }).first().click();
  await expect(modal(page)).toBeVisible();
  return modal(page);
}

async function attachLabel(page: Page, name: string) {
  const input = modal(page).getByLabel('Add label');
  await input.fill(name);
  await input.press('Enter');
  await expect(input).toHaveValue('');
}

test('Labels attach by name, reuse ignoring case, show as chips and survive a reload', async ({ page }) => {
  await addTask(page, 'To Do', 'Fix login');
  await addTask(page, 'To Do', 'Fix logout');

  await openTask(page, 'Fix login');
  await attachLabel(page, 'Bug');
  await attachLabel(page, 'UI');
  await page.keyboard.press('Escape');

  await openTask(page, 'Fix logout');
  await attachLabel(page, 'bug');
  await modal(page).getByRole('button', { name: /close/i }).click();

  const login = column(page, 'To Do').getByRole('listitem').filter({ hasText: 'Fix login' });
  const logout = column(page, 'To Do').getByRole('listitem').filter({ hasText: 'Fix logout' });
  await expect(login.getByText('Bug', { exact: true })).toHaveCSS('background-color', 'rgb(12, 102, 228)');
  await expect(login.getByText('UI', { exact: true })).toHaveCSS('background-color', 'rgb(31, 132, 90)');
  await expect(logout.getByText('Bug', { exact: true })).toHaveCSS('background-color', 'rgb(12, 102, 228)');

  await page.reload();
  await expect(login.getByText('Bug', { exact: true })).toBeVisible();
  await expect(login.getByText('UI', { exact: true })).toBeVisible();
  await expect(logout.getByText('Bug', { exact: true })).toBeVisible();

  // Removing a Label from its last Task keeps it on the Board for reuse.
  await openTask(page, 'Fix login');
  await modal(page).getByRole('button', { name: /remove label ui/i }).click();
  await expect(login.getByText('UI', { exact: true })).toHaveCount(0);
  await attachLabel(page, 'ui');
  await expect(login.getByText('UI', { exact: true })).toHaveCSS('background-color', 'rgb(31, 132, 90)');
  const labels = await page.evaluate(() => JSON.parse(window.localStorage.getItem('task-board') ?? '{}').board.labels);
  expect(labels.map((label: { name: string }) => label.name)).toEqual(['Bug', 'UI']);
});
