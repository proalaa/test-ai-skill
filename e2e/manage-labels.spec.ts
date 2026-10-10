import { expect, test, type Page } from '@playwright/test';
import { addTask, shownTask, taskModal } from './support';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

function manageLabels(page: Page) {
  return page.getByRole('dialog', { name: /manage labels/i });
}

function labelRow(page: Page, name: string) {
  return manageLabels(page).getByRole('listitem', { name, exact: true });
}

/** The Label chips a Task shows in its Column. */
function labelChips(page: Page, title: string) {
  return shownTask(page, title).getByRole('group', { name: 'Labels' });
}

async function attachLabels(page: Page, title: string, ...names: string[]) {
  await shownTask(page, title).click();
  const input = taskModal(page).getByLabel('Add label');
  for (const name of names) {
    await input.fill(name);
    await input.press('Enter');
    await expect(input).toHaveValue('');
  }
  await page.keyboard.press('Escape');
  await expect(taskModal(page)).toHaveCount(0);
}

test('Labels are renamed, recolored and deleted from the Manage labels screen, everywhere at once', async ({ page }) => {
  await addTask(page, 'To Do', 'Fix login');
  await addTask(page, 'To Do', 'Fix logout');
  await attachLabels(page, 'Fix login', 'Bug', 'UI', 'Docs');
  await attachLabels(page, 'Fix logout', 'Bug');
  // Docs stays on the Board unused.
  await shownTask(page, 'Fix login').click();
  await taskModal(page).getByRole('button', { name: /remove label docs/i }).click();
  await taskModal(page).getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: /manage labels/i }).click();
  await expect(manageLabels(page).getByRole('listitem')).toHaveCount(3);
  await expect(labelRow(page, 'Bug')).toContainText('Used by 2 tasks');
  await expect(labelRow(page, 'Docs')).toContainText('Not used');

  // A clashing rename is rejected with a message.
  const bugName = labelRow(page, 'Bug').getByLabel('Name');
  await bugName.fill('ui');
  await bugName.press('Enter');
  await expect(labelRow(page, 'Bug').getByRole('alert')).toHaveText('There is already a Label named “UI”.');

  // A good rename and a recolor show on every Task.
  await bugName.fill('Defect');
  await bugName.press('Enter');
  await labelRow(page, 'Defect').getByRole('radio', { name: 'Red' }).check();
  await page.keyboard.press('Escape');
  await expect(manageLabels(page)).toHaveCount(0);

  for (const title of ['Fix login', 'Fix logout']) {
    await expect(labelChips(page, title).getByText('Defect', { exact: true })).toHaveCSS(
      'background-color',
      'rgb(201, 55, 44)',
    );
  }

  // Deleting a Label in use asks how many Tasks it comes off, and removes it everywhere.
  await page.getByRole('button', { name: /manage labels/i }).click();
  await labelRow(page, 'Defect').getByRole('button', { name: 'Delete' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Remove from 2 tasks?' });
  await confirm.getByRole('button', { name: 'Delete label' }).click();
  await expect(labelRow(page, 'Defect')).toHaveCount(0);

  // An unused Label goes after a simple confirmation.
  await labelRow(page, 'Docs').getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog', { name: 'Delete the Label “Docs”?' }).getByRole('button', { name: 'Delete label' }).click();
  await expect(manageLabels(page).getByRole('listitem')).toHaveCount(1);
  await manageLabels(page).getByRole('button', { name: 'Close' }).click();

  await page.reload();
  await expect(labelChips(page, 'Fix login')).toHaveText('UI');
  await expect(labelChips(page, 'Fix logout')).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem('task-board') ?? '{}').board);
  expect(saved.labels.map((label: { name: string }) => label.name)).toEqual(['UI']);
  expect(saved.tasks.flatMap((task: { labelIds: string[] }) => task.labelIds)).toHaveLength(1);
});
