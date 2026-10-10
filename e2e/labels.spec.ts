import { expect, test, type Page } from '@playwright/test';
import { addTask, column, openTask, taskModal } from './support';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

async function attachLabel(page: Page, name: string) {
  const input = taskModal(page).getByLabel('Add label');
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
  await taskModal(page).getByRole('button', { name: /close/i }).click();

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
  await taskModal(page).getByRole('button', { name: /remove label ui/i }).click();
  await expect(login.getByText('UI', { exact: true })).toHaveCount(0);
  await attachLabel(page, 'ui');
  await expect(login.getByText('UI', { exact: true })).toHaveCSS('background-color', 'rgb(31, 132, 90)');
  const labels = await page.evaluate(() => JSON.parse(window.localStorage.getItem('task-board') ?? '{}').board.labels);
  expect(labels.map((label: { name: string }) => label.name)).toEqual(['Bug', 'UI']);
});

test('removing a Label chip keeps focus in the task modal, so Tab and Escape still work', async ({ page }) => {
  await addTask(page, 'To Do', 'Fix login');
  await openTask(page, 'Fix login');
  await attachLabel(page, 'Bug');

  await taskModal(page).getByRole('button', { name: /remove label bug/i }).click();

  await expect(taskModal(page).getByLabel('Add label')).toBeFocused();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    expect(await taskModal(page).evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(taskModal(page)).toHaveCount(0);
});
