// App-level tests for what a Task shows in its Column: Priority badge,
// Due date (and whether it is Overdue) and the description icon.
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Task } from './board/board';
import { task } from './test/boards';
import { fixedClock } from './test/clocks';
import { renderApp, renderAppWith as renderBoard, storeWith } from './test/renderApp';

// 09:00 local time on 10 October 2026: "today" is 2026-10-10 in any time zone.
const clock = fixedClock(new Date(2026, 9, 10, 9, 0));

/** Renders the app over a saved Board holding `tasks` and no Labels. */
function renderAppWith(tasks: Task[]) {
  return renderBoard({ tasks, labels: [] }, { clock });
}



/** The Task with the given title, as shown in its Column. */
function taskCard(title: string) {
  const card = screen.getAllByRole('listitem').find((item) => within(item).queryByText(title));
  if (!card) throw new Error(`No Task titled "${title}" on the Board`);
  return card;
}

describe('Priority badge', () => {
  it('shows the Priority for Low, Medium, High and Urgent, and nothing for None', () => {
    renderAppWith([
      task({ id: 'n', title: 'Task N', priority: 'none', position: 0 }),
      task({ id: 'l', title: 'Task L', priority: 'low', position: 1 }),
      task({ id: 'm', title: 'Task M', priority: 'medium', position: 2 }),
      task({ id: 'h', title: 'Task H', priority: 'high', position: 3 }),
      task({ id: 'u', title: 'Task U', priority: 'urgent', position: 4 }),
    ]);

    expect(taskCard('Task L')).toHaveTextContent(/priority:? low/i);
    expect(taskCard('Task M')).toHaveTextContent(/priority:? medium/i);
    expect(taskCard('Task H')).toHaveTextContent(/priority:? high/i);
    expect(taskCard('Task U')).toHaveTextContent(/priority:? urgent/i);
    expect(taskCard('Task N')).not.toHaveTextContent(/priority/i);
    expect(taskCard('Task N')).toHaveTextContent(/^Task N$/);
  });
});

describe('Due date', () => {
  /** The Due date shown on the Task, as its `YYYY-MM-DD` value, or null. */
  function shownDueDate(title: string) {
    return taskCard(title).querySelector('time')?.getAttribute('datetime') ?? null;
  }

  it('shows the Due date, and marks it Overdue only when it is before today and the Task is not Done', () => {
    renderAppWith([
      task({ id: 'p', title: 'Past', status: 'todo', dueDate: '2026-10-09', position: 0 }),
      task({ id: 't', title: 'Today', status: 'todo', dueDate: '2026-10-10', position: 1 }),
      task({ id: 'f', title: 'Future', status: 'in-progress', dueDate: '2026-11-03', position: 0 }),
      task({ id: 'w', title: 'Past in progress', status: 'in-progress', dueDate: '2026-09-30', position: 1 }),
      task({ id: 'd', title: 'Past but done', status: 'done', dueDate: '2026-10-01', position: 0 }),
      task({ id: 'n', title: 'No date', status: 'todo', dueDate: null, position: 2 }),
    ]);

    expect(shownDueDate('Past')).toBe('2026-10-09');
    expect(taskCard('Past')).toHaveTextContent(/overdue/i);
    expect(taskCard('Past in progress')).toHaveTextContent(/overdue/i);

    expect(shownDueDate('Today')).toBe('2026-10-10');
    expect(taskCard('Today')).not.toHaveTextContent(/overdue/i);

    expect(shownDueDate('Future')).toBe('2026-11-03');
    expect(taskCard('Future')).not.toHaveTextContent(/overdue/i);

    expect(shownDueDate('Past but done')).toBe('2026-10-01');
    expect(taskCard('Past but done')).not.toHaveTextContent(/overdue/i);

    expect(shownDueDate('No date')).toBeNull();
    expect(taskCard('No date')).toHaveTextContent(/^No date$/);
  });

  it('takes "today" from the injected clock', () => {
    const store = storeWith({ labels: [], tasks: [task({ id: 'x', title: 'Ship', dueDate: '2026-10-10' })] });

    const onTheDay = renderApp({ store, clock: fixedClock(new Date(2026, 9, 10, 23, 59)) });
    expect(taskCard('Ship')).not.toHaveTextContent(/overdue/i);
    onTheDay.unmount();

    renderApp({ store, clock: fixedClock(new Date(2026, 9, 11, 0, 1)) });
    expect(taskCard('Ship')).toHaveTextContent(/overdue/i);
  });
});

describe('Description icon', () => {
  it('shows only when the Task has a description', () => {
    renderAppWith([
      task({ id: 'a', title: 'With notes', description: 'Remember the edge cases', position: 0 }),
      task({ id: 'b', title: 'Without notes', description: '', position: 1 }),
      task({ id: 'c', title: 'Only spaces', description: '  \n ', position: 2 }),
    ]);

    expect(within(taskCard('With notes')).getByRole('img', { name: /has a description/i })).toBeInTheDocument();
    expect(within(taskCard('Without notes')).queryByRole('img')).not.toBeInTheDocument();
    expect(within(taskCard('Only spaces')).queryByRole('img')).not.toBeInTheDocument();
  });
});
