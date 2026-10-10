// Queries and actions shared by the end-to-end specs.
import { expect, type Page } from '@playwright/test';

/** A Column, by its Status name ("To Do", "In Progress", "Done"). */
export function column(page: Page, name: string) {
  return page.getByRole('region', { name });
}

/** A Task in its Column, by its title heading. */
export function taskItem(page: Page, title: string) {
  return page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
}

export function taskModal(page: Page) {
  return page.getByRole('dialog', { name: /task details/i });
}

/** Quick-adds a Task to the bottom of a Column. */
export async function addTask(page: Page, columnName: string, title: string) {
  const input = column(page, columnName).getByRole('textbox', { name: /add task/i });
  await input.fill(title);
  await input.press('Enter');
  await expect(input).toHaveValue('');
}

/** Opens a Task's modal by clicking it on the Board. */
export async function openTask(page: Page, title: string) {
  await taskItem(page, title).click();
  await expect(taskModal(page)).toBeVisible();
  return taskModal(page);
}
