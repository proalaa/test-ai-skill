import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { fixedClock } from './test/clocks';
import { memoryKeyValueStore } from './test/memoryKeyValueStore';
import { addTaskInput, column, taskTitles } from './test/queries';
import { renderApp } from './test/renderApp';

function columnNames() {
  return screen.getAllByRole('region').map((region) => region.getAttribute('aria-label'));
}

describe('The empty Board', () => {
  it('shows the Columns To Do, In Progress and Done, in that order', () => {
    renderApp();
    expect(columnNames()).toEqual(['To Do', 'In Progress', 'Done']);
  });

  it('shows a Task count of 0 in every Column header', () => {
    renderApp();
    for (const name of ['To Do', 'In Progress', 'Done']) {
      expect(within(column(name)).getByLabelText('Task count')).toHaveTextContent('0');
    }
  });

  it('shows a hint in To Do explaining how to add a Task', () => {
    renderApp();
    expect(within(column('To Do')).getByText(/no tasks yet/i)).toBeInTheDocument();
    expect(within(column('In Progress')).queryByText(/no tasks yet/i)).not.toBeInTheDocument();
    expect(within(column('Done')).queryByText(/no tasks yet/i)).not.toBeInTheDocument();
  });

  it('has no sample Tasks on first launch', () => {
    renderApp();
    expect(screen.queryAllByRole('listitem')).toEqual([]);
  });
});

describe('Quick add', () => {
  it('adds a Task to the bottom of the Column whose input was used', async () => {
    const { user } = renderApp();

    await user.type(addTaskInput('In Progress'), 'First{Enter}');
    await user.type(addTaskInput('In Progress'), 'Second{Enter}');

    expect(taskTitles('In Progress')).toEqual(['First', 'Second']);
    expect(taskTitles('To Do')).toEqual([]);
    expect(taskTitles('Done')).toEqual([]);
  });

  it('keeps the input focused and empties it so several Tasks can be added in a row', async () => {
    const { user } = renderApp();
    const input = addTaskInput('To Do');

    await user.type(input, 'One{Enter}');
    expect(input).toHaveFocus();
    expect(input).toHaveValue('');

    await user.keyboard('Two{Enter}Three{Enter}');
    expect(taskTitles('To Do')).toEqual(['One', 'Two', 'Three']);
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
  ])('does nothing when Enter is pressed on an %s input', async (_, typed) => {
    const { user } = renderApp();

    await user.type(addTaskInput('Done'), `${typed}{Enter}`);

    expect(screen.queryAllByRole('listitem')).toEqual([]);
    expect(within(column('Done')).getByLabelText('Task count')).toHaveTextContent('0');
    expect(within(column('To Do')).getByText(/no tasks yet/i)).toBeInTheDocument();
  });

  it('updates the Column counts and hides the hint once a Task exists', async () => {
    const { user } = renderApp();

    await user.type(addTaskInput('Done'), 'Shipped{Enter}');
    await user.type(addTaskInput('To Do'), 'Plan{Enter}');
    await user.type(addTaskInput('To Do'), 'Build{Enter}');

    expect(within(column('To Do')).getByLabelText('Task count')).toHaveTextContent('2');
    expect(within(column('In Progress')).getByLabelText('Task count')).toHaveTextContent('0');
    expect(within(column('Done')).getByLabelText('Task count')).toHaveTextContent('1');
    expect(screen.queryByText(/no tasks yet/i)).not.toBeInTheDocument();
  });
});

describe('Autosave', () => {
  it('keeps added Tasks in the same Columns and order after a reload', async () => {
    const first = renderApp();
    await first.user.type(addTaskInput('To Do'), 'A{Enter}');
    await first.user.type(addTaskInput('Done'), 'B{Enter}');
    await first.user.type(addTaskInput('To Do'), 'C{Enter}');
    first.unmount();

    renderApp({ store: first.store });

    expect(taskTitles('To Do')).toEqual(['A', 'C']);
    expect(taskTitles('In Progress')).toEqual([]);
    expect(taskTitles('Done')).toEqual(['B']);
  });

  it('stamps Created at and Updated at from the injected clock', async () => {
    const { user, saved } = renderApp({ clock: fixedClock('2026-03-04T05:06:07.000Z') });

    await user.type(addTaskInput('To Do'), 'Timed{Enter}');

    const [task] = saved().tasks;
    expect(task.createdAt).toBe('2026-03-04T05:06:07.000Z');
    expect(task.updatedAt).toBe('2026-03-04T05:06:07.000Z');
  });
});

describe('Saved data that can’t be read', () => {
  const unreadable = '{"version": 1, "board": {"tasks": "oops"';

  it('tells the user, starts with an empty Board, and keeps the unreadable data aside before saving anything', async () => {
    const store = memoryKeyValueStore({ 'task-board': unreadable });
    const { user } = renderApp({ store });

    expect(screen.getByRole('alert')).toHaveTextContent(/saved board couldn’t be read/i);
    expect(screen.queryAllByRole('listitem')).toEqual([]);

    await user.type(addTaskInput('To Do'), 'Fresh start{Enter}');

    expect(taskTitles('To Do')).toEqual(['Fresh start']);
    expect(store.getItem('task-board-unreadable')).toBe(unreadable);
  });

  it('can be dismissed', async () => {
    const { user } = renderApp({ store: memoryKeyValueStore({ 'task-board': unreadable }) });

    await user.click(within(screen.getByRole('alert')).getByRole('button', { name: /dismiss/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('says nothing when there is no saved Board yet, or when it reads fine', async () => {
    const first = renderApp();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await first.user.type(addTaskInput('To Do'), 'Kept{Enter}');
    first.unmount();

    renderApp({ store: first.store });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(first.store.getItem('task-board-unreadable')).toBeNull();
  });
});
