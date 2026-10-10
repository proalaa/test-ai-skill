import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/** A Column, by its Status name ("To Do", "In Progress", "Done"). */
export function column(name: string) {
  return screen.getByRole('region', { name });
}

export function addTaskInput(columnName: string) {
  return within(column(columnName)).getByRole('textbox', { name: /add task/i });
}

/** The Tasks shown in a Column (its list items), top to bottom. */
function tasksInColumn(columnName: string) {
  return within(column(columnName)).queryAllByRole('listitem');
}

/** The title of a Task in its Column (its heading), without its details or Label chips. */
export function titleOf(item: HTMLElement) {
  return within(item).getByRole('heading').textContent;
}

/** The titles of the Tasks in a Column, top to bottom. */
export function taskTitles(columnName: string) {
  return tasksInColumn(columnName).map(titleOf);
}

export function taskCount(columnName: string) {
  return within(column(columnName)).getByLabelText('Task count').textContent;
}

/** The Task on the Board (or in the named Column) whose title is exactly `title`. */
export function taskItem(title: string, columnName?: string): HTMLElement {
  const items = columnName ? tasksInColumn(columnName) : screen.getAllByRole('listitem');
  const item = items.find((li) => within(li).queryByRole('heading', { name: title }));
  if (!item) throw new Error(`No Task titled "${title}" ${columnName ? `in ${columnName}` : 'on the Board'}`);
  return item;
}

/** The Label chips a Task shows in its Column, in order. */
export function labelChipsOf(title: string): HTMLElement[] {
  const labels = within(taskItem(title)).queryByRole('group', { name: 'Labels' });
  return labels ? within(labels).getAllByText(/./) : [];
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
