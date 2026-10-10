import { expect, test, type Locator, type Page } from '@playwright/test';
import { column } from './support';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

function tasks(page: Page, columnName: string) {
  return column(page, columnName).getByRole('listitem');
}

function task(page: Page, title: string) {
  return page.getByRole('listitem').filter({ hasText: new RegExp(`^${title}$`) });
}

async function addTasks(page: Page, columnName: string, ...titles: string[]) {
  const input = column(page, columnName).getByRole('textbox', { name: /add task/i });
  for (const title of titles) {
    await input.fill(title);
    await input.press('Enter');
    await expect(input).toHaveValue('');
  }
}

/**
 * Drags `source` with the mouse and drops it with the pointer at `fraction` of
 * the way down `target` (0 = top edge, 1 = bottom edge).
 */
async function drag(page: Page, source: Locator, target: Locator, fraction = 0.5) {
  const from = (await source.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // Move a little first so the drag starts, then glide to the drop point.
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 10, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height * fraction, { steps: 20 });
  await page.mouse.up();
}

test('dragging a Task to another Column changes its Status and lands where it is dropped', async ({ page }) => {
  await addTasks(page, 'To Do', 'A', 'B');
  await addTasks(page, 'In Progress', 'X', 'Y');

  await drag(page, task(page, 'A'), task(page, 'Y'), 0.25);

  await expect(tasks(page, 'To Do')).toHaveText(['B']);
  await expect(page.getByRole('dialog')).toHaveCount(0); // a drag is not a click
  await expect(tasks(page, 'In Progress')).toHaveText(['X', 'A', 'Y']);
  await expect(column(page, 'To Do').getByLabel('Task count')).toHaveText('1');
  await expect(column(page, 'In Progress').getByLabel('Task count')).toHaveText('3');

  await page.reload();
  await expect(tasks(page, 'To Do')).toHaveText(['B']);
  await expect(tasks(page, 'In Progress')).toHaveText(['X', 'A', 'Y']);
});

test('dragging a Task into an empty Column', async ({ page }) => {
  await addTasks(page, 'To Do', 'A');

  await drag(page, task(page, 'A'), column(page, 'Done'));

  await expect(tasks(page, 'To Do')).toHaveCount(0);
  await expect(tasks(page, 'Done')).toHaveText(['A']);
});

test('dragging a Task up and down within its Column reorders it', async ({ page }) => {
  await addTasks(page, 'To Do', 'A', 'B', 'C', 'D');

  await drag(page, task(page, 'A'), task(page, 'C'));
  await expect(tasks(page, 'To Do')).toHaveText(['B', 'C', 'A', 'D']);

  await drag(page, task(page, 'D'), task(page, 'B'));
  await expect(tasks(page, 'To Do')).toHaveText(['D', 'B', 'C', 'A']);

  await page.reload();
  await expect(tasks(page, 'To Do')).toHaveText(['D', 'B', 'C', 'A']);
});

/**
 * Moves a Task with the keyboard alone: Space picks it up, the arrows move it,
 * Space drops it. After each key we wait for the screen-reader announcement of
 * where the Task now is, as Playwright types faster than any person.
 */
async function keyboardMove(page: Page, title: string, expectedPlaces: string[], arrows: string[]) {
  const announcement = page.getByRole('status');
  await task(page, title).focus();
  await page.keyboard.press('Space');
  await expect(announcement).toHaveText(expectedPlaces[0]);
  // dnd-kit starts listening for the arrow keys in a setTimeout(0) after the
  // pick-up; let that timer run before pressing any.
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
  for (const [i, arrow] of arrows.entries()) {
    await page.keyboard.press(arrow);
    await expect(announcement).toHaveText(expectedPlaces[i + 1]);
  }
  await page.keyboard.press('Space');
  await expect(announcement).toHaveText(`Dropped ${title}.`);
}

test('the keyboard alone can move a Task within and across Columns', async ({ page }) => {
  await addTasks(page, 'To Do', 'A', 'B');
  await addTasks(page, 'Done', 'X');

  await keyboardMove(page, 'A', ['A is in To Do, position 1 of 2.', 'A is in To Do, position 2 of 2.'], ['ArrowDown']);
  await expect(tasks(page, 'To Do')).toHaveText(['B', 'A']);

  await keyboardMove(
    page,
    'B',
    [
      'B is in To Do, position 1 of 2.',
      'B is in In Progress, position 1 of 1.',
      'B is in Done, position 1 of 2.',
      'B is in Done, position 2 of 2.',
    ],
    ['ArrowRight', 'ArrowRight', 'ArrowDown'],
  );
  await expect(tasks(page, 'To Do')).toHaveText(['A']);
  await expect(tasks(page, 'Done')).toHaveText(['X', 'B']);

  await page.reload();
  await expect(tasks(page, 'Done')).toHaveText(['X', 'B']);
});
