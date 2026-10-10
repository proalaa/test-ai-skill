import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/** A Column, by its Status name ("To Do", "In Progress", "Done"). */
export function column(name: string) {
  return screen.getByRole('region', { name });
}

export function addTaskInput(columnName: string) {
  return within(column(columnName)).getByRole('textbox', { name: /add task/i });
}

/** The title of a Task's `<li>`, without its details or Label chips. */
export function titleOf(item: HTMLElement) {
  return item.querySelector('.task-title')?.textContent ?? item.textContent;
}

/** The titles of the Tasks in a Column, top to bottom. */
export function taskTitles(columnName: string) {
  return within(column(columnName)).queryAllByRole('listitem').map(titleOf);
}

export function taskCount(columnName: string) {
  return within(column(columnName)).getByLabelText('Task count').textContent;
}

/** The Task in the Board whose title is exactly `title`. */
export function taskItem(title: string): HTMLElement {
  const item = screen.getAllByRole('listitem').find((li) => titleOf(li) === title);
  if (!item) throw new Error(`No Task titled "${title}" on the Board`);
  return item;
}

/** The open task modal. */
export function taskModal() {
  return screen.getByRole('dialog', { name: /task details/i });
}

/** Opens a Task's modal by clicking its title on the Board. */
export async function openTask(user: UserEvent, title: string) {
  await user.click(screen.getByText(title));
  return taskModal();
}

/** Adds Tasks to a Column through its quick-add input. */
export async function addTasks(user: UserEvent, columnName: string, ...titles: string[]) {
  for (const title of titles) {
    await user.type(addTaskInput(columnName), `${title}{Enter}`);
  }
}

/**
 * Moves a Task with the keyboard alone: focus it, Space to pick it up, the
 * given arrow keys (e.g. `'{ArrowDown}{ArrowRight}'`), then Space to drop.
 */
export async function keyboardMove(user: UserEvent, title: string, arrows: string) {
  taskItem(title).focus();
  await user.keyboard(' ');
  await user.keyboard(arrows);
  await user.keyboard(' ');
}
