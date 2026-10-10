import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Every test starts from a first launch: nothing stored.
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test('first launch shows an empty Board with three Columns and the hint', async ({ page }) => {
  const columns = page.getByRole('region');
  await expect(columns).toHaveCount(3);
  await expect(columns.nth(0)).toHaveAttribute('aria-label', 'To Do');
  await expect(columns.nth(1)).toHaveAttribute('aria-label', 'In Progress');
  await expect(columns.nth(2)).toHaveAttribute('aria-label', 'Done');

  for (const name of ['To Do', 'In Progress', 'Done']) {
    await expect(page.getByRole('region', { name }).getByLabel('Task count')).toHaveText('0');
  }
  await expect(page.getByRole('region', { name: 'To Do' }).getByText(/no tasks yet/i)).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(0);
});

test('the theme follows the color-scheme preference', async ({ page }) => {
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  await page.emulateMedia({ colorScheme: 'light' });
  const light = await background();
  await page.emulateMedia({ colorScheme: 'dark' });
  const dark = await background();

  expect(light).toBe('rgb(244, 245, 247)');
  expect(dark).toBe('rgb(29, 33, 37)');
});

test('on a narrow viewport the Columns scroll sideways instead of squashing', async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 800 });

  const board = page.getByRole('main');
  const { scrollWidth, clientWidth } = await board.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(scrollWidth).toBeGreaterThan(clientWidth);

  const doneColumn = page.getByRole('region', { name: 'Done' });
  const box = await doneColumn.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(280);

  await board.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  await expect(doneColumn).toBeInViewport();
});
