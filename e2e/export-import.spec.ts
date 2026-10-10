import { readFile } from 'node:fs/promises';
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

test('exporting the Board and importing the file restores it exactly', async ({ page }) => {
  await addTask(page, 'To Do', 'Write spec');
  await addTask(page, 'To Do', 'Plan tickets');
  await addTask(page, 'Done', 'Set up repo');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^task-board-\d{4}-\d{2}-\d{2}\.json$/);
  const exportPath = await download.path();
  const exported = await readFile(exportPath, 'utf8');
  const data = JSON.parse(exported);
  expect(data.version).toBe(1);
  expect(data.board.tasks.map((t: { title: string }) => t.title).sort()).toEqual([
    'Plan tickets',
    'Set up repo',
    'Write spec',
  ]);
  expect(data.board.labels).toEqual([]);

  // Change the Board after exporting.
  await addTask(page, 'In Progress', 'Added after export');
  await expect(column(page, 'In Progress').getByRole('listitem')).toHaveText(['Added after export']);

  await page.getByLabel('Import').setInputFiles(exportPath);
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText(/replace/i);
  await dialog.getByRole('button', { name: 'Replace board' }).click();
  await expect(dialog).toHaveCount(0);

  await expect(column(page, 'To Do').getByRole('listitem')).toHaveText(['Write spec', 'Plan tickets']);
  await expect(column(page, 'In Progress').getByRole('listitem')).toHaveCount(0);
  await expect(column(page, 'Done').getByRole('listitem')).toHaveText(['Set up repo']);
  expect(await page.evaluate(() => window.localStorage.getItem('task-board'))).toBe(exported);

  await page.reload();
  await expect(column(page, 'To Do').getByRole('listitem')).toHaveText(['Write spec', 'Plan tickets']);
  await expect(column(page, 'In Progress').getByRole('listitem')).toHaveCount(0);
});

test('importing a file that is not an export shows an error and keeps the Board', async ({ page }) => {
  await addTask(page, 'To Do', 'Keep me');

  await page.getByLabel('Import').setInputFiles({
    name: 'notes.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello": "world"}'),
  });

  await expect(page.getByRole('alert')).toContainText('notes.json');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(column(page, 'To Do').getByRole('listitem')).toHaveText(['Keep me']);
});
