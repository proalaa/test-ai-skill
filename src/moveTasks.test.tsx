import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { fixedClock } from './clock';
import { renderApp } from './test/renderApp';
import { addTasks, keyboardMove, taskCount, taskItem, taskTitles } from './test/queries';

describe('Moving Tasks with the keyboard', () => {
  it('reorders a Task down within its Column', async () => {
    const { user } = renderApp();
    await addTasks(user, 'To Do', 'A', 'B', 'C');

    await keyboardMove(user, 'A', '{ArrowDown}');

    expect(taskTitles('To Do')).toEqual(['B', 'A', 'C']);
  });

  it('reorders a Task up several places within its Column', async () => {
    const { user } = renderApp();
    await addTasks(user, 'To Do', 'A', 'B', 'C', 'D');

    await keyboardMove(user, 'D', '{ArrowUp}{ArrowUp}{ArrowUp}');

    expect(taskTitles('To Do')).toEqual(['D', 'A', 'B', 'C']);
  });

  it('moves a Task into an empty Column to the right', async () => {
    const { user } = renderApp();
    await addTasks(user, 'To Do', 'A', 'B');

    await keyboardMove(user, 'A', '{ArrowRight}');

    expect(taskTitles('To Do')).toEqual(['B']);
    expect(taskTitles('In Progress')).toEqual(['A']);
  });

  it('moves a Task across two Columns and down past the Tasks already there', async () => {
    const { user } = renderApp();
    await addTasks(user, 'To Do', 'A');
    await addTasks(user, 'Done', 'X', 'Y');

    await keyboardMove(user, 'A', '{ArrowRight}{ArrowRight}{ArrowDown}{ArrowDown}');

    expect(taskTitles('To Do')).toEqual([]);
    expect(taskTitles('Done')).toEqual(['X', 'Y', 'A']);
  });

  it('moves a Task from Done back to To Do', async () => {
    const { user } = renderApp();
    await addTasks(user, 'To Do', 'A');
    await addTasks(user, 'Done', 'Finished');

    await keyboardMove(user, 'Finished', '{ArrowLeft}{ArrowLeft}');

    expect(taskTitles('Done')).toEqual([]);
    expect(taskTitles('To Do')).toContain('Finished');
  });

  it('updates the Column counts after a move', async () => {
    const { user } = renderApp();
    await addTasks(user, 'To Do', 'A', 'B');

    await keyboardMove(user, 'B', '{ArrowRight}');

    expect(taskCount('To Do')).toBe('1');
    expect(taskCount('In Progress')).toBe('1');
    expect(taskCount('Done')).toBe('0');
  });

  it('leaves the Board as it was when the move is cancelled with Escape', async () => {
    const { user, storage } = renderApp();
    await addTasks(user, 'To Do', 'A', 'B');
    const saved = storage.load();

    await keyboardMove(user, 'A', '{ArrowRight}{Escape}');

    expect(taskTitles('To Do')).toEqual(['A', 'B']);
    expect(taskTitles('In Progress')).toEqual([]);
    expect(storage.load()).toEqual(saved);
  });

  it('records Completed at when a Task moves into Done and clears it when it moves out', async () => {
    let now = '2026-10-10T09:00:00.000Z';
    const clock = { now: () => new Date(now) };
    const { user, storage } = renderApp({ clock });
    await addTasks(user, 'In Progress', 'Ship it');

    now = '2026-10-11T15:30:00.000Z';
    await keyboardMove(user, 'Ship it', '{ArrowRight}');
    expect(storage.load()!.tasks[0]).toMatchObject({ status: 'done', completedAt: '2026-10-11T15:30:00.000Z' });

    now = '2026-10-12T08:00:00.000Z';
    await keyboardMove(user, 'Ship it', '{ArrowLeft}');
    expect(storage.load()!.tasks[0]).toMatchObject({ status: 'in-progress', completedAt: null });
  });

  it('opens a focused Task with Enter, while Space picks it up instead', async () => {
    const { user } = renderApp();
    await addTasks(user, 'To Do', 'A', 'B');

    await keyboardMove(user, 'A', '{ArrowDown}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(taskTitles('To Do')).toEqual(['B', 'A']);

    taskItem('B').focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: /task details/i })).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByLabelText('Title')).toHaveValue('B');
  });

  it('keeps the new order and Status after a reload', async () => {
    const first = renderApp({ clock: fixedClock('2026-10-10T09:00:00.000Z') });
    await addTasks(first.user, 'To Do', 'A', 'B', 'C');
    await keyboardMove(first.user, 'C', '{ArrowUp}{ArrowUp}');
    await keyboardMove(first.user, 'B', '{ArrowRight}');
    first.unmount();

    renderApp({ store: first.store });

    expect(taskTitles('To Do')).toEqual(['C', 'A']);
    expect(taskTitles('In Progress')).toEqual(['B']);
  });
});
