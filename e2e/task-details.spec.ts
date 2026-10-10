import { expect, test, type Page } from '@playwright/test';
import { column, shownTask } from './support';

test.use({ colorScheme: 'light' });

test.beforeEach(async ({ page }) => {
  // 09:00 local time on 10 October 2026, so "today" is 2026-10-10.
  await page.clock.setFixedTime(new Date(2026, 9, 10, 9, 0));
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

const OVERDUE_RED = 'rgb(201, 55, 44)';

/** Quick-adds a Task, then sets details in its modal and closes it. */
async function addTaskWith(
  page: Page,
  columnName: string,
  title: string,
  details: { dueDate?: string; priority?: string; description?: string },
) {
  const input = column(page, columnName).getByRole('textbox', { name: /add task/i });
  await input.fill(title);
  await input.press('Enter');
  await expect(input).toHaveValue('');

  await shownTask(page, title).click();
  const dialog = page.getByRole('dialog', { name: /task details/i });
  if (details.description !== undefined) await dialog.getByLabel('Description').fill(details.description);
  if (details.priority !== undefined) await dialog.getByLabel('Priority').selectOption(details.priority);
  if (details.dueDate !== undefined) await dialog.getByLabel('Due date').fill(details.dueDate);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
}

test('a Task shows its Priority, Due date and description icon in its Column', async ({ page }) => {
  await addTaskWith(page, 'To Do', 'Late report', { priority: 'Urgent', dueDate: '2026-10-01', description: 'Ask finance' });
  await addTaskWith(page, 'To Do', 'Plain task', {});

  const late = shownTask(page, 'Late report');
  await expect(late).toContainText('Urgent');
  await expect(late.getByRole('time')).toHaveAttribute('datetime', '2026-10-01');
  await expect(late.getByRole('img', { name: /has a description/i })).toBeVisible();

  const plain = shownTask(page, 'Plain task');
  await expect(plain).toHaveText('Plain task');
  await expect(plain.getByRole('img')).toHaveCount(0);
});

test('only Overdue Due dates are red: not due today, and never in Done', async ({ page }) => {
  await addTaskWith(page, 'To Do', 'Was due last week', { dueDate: '2026-10-03' });
  await addTaskWith(page, 'In Progress', 'Due today', { dueDate: '2026-10-10' });
  await addTaskWith(page, 'Done', 'Finished late', { dueDate: '2026-10-01' });

  const overdue = shownTask(page, 'Was due last week');
  await expect(overdue.getByRole('time')).toHaveCSS('color', OVERDUE_RED);
  await expect(overdue).toContainText(/overdue/i);

  for (const title of ['Due today', 'Finished late']) {
    const dueDate = shownTask(page, title).getByRole('time');
    await expect(dueDate).toBeVisible();
    await expect(dueDate).not.toHaveCSS('color', OVERDUE_RED);
    await expect(shownTask(page, title)).not.toContainText(/overdue/i);
  }

  // Still the same after a reload.
  await page.reload();
  await expect(shownTask(page, 'Was due last week').getByRole('time')).toHaveCSS('color', OVERDUE_RED);
  await expect(shownTask(page, 'Finished late').getByRole('time')).not.toHaveCSS('color', OVERDUE_RED);
});
