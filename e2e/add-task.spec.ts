import { expect, test } from '@playwright/test';
import { addTask, column } from './support';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

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
