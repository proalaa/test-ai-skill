import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

function column(page: Page, name: string) {
  return page.getByRole('region', { name });
}

async function addTask(page: Page, columnName: string, title: string) {
  const input = column(page, columnName).getByRole('textbox', { name: /add task/i });
  await input.fill(title);
  await input.press('Enter');
  await expect(input).toHaveValue('');
}

test('added Tasks are still in the same Columns and order after a reload', async ({ page }) => {
  await addTask(page, 'To Do', 'Write spec');
  await addTask(page, 'In Progress', 'Build board');
  await addTask(page, 'To Do', 'Plan tickets');
  await addTask(page, 'Done', 'Set up repo');

  await expect(column(page, 'To Do').getByRole('listitem')).toHaveText(['Write spec', 'Plan tickets']);
  await expect(page.getByText(/no tasks yet/i)).toHaveCount(0);

  await page.reload();

  await expect(column(page, 'To Do').getByRole('listitem')).toHaveText(['Write spec', 'Plan tickets']);
  await expect(column(page, 'In Progress').getByRole('listitem')).toHaveText(['Build board']);
  await expect(column(page, 'Done').getByRole('listitem')).toHaveText(['Set up repo']);
  await expect(column(page, 'To Do').getByLabel('Task count')).toHaveText('2');
});
