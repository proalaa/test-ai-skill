import { describe, expect, it } from 'vitest';
import { fixedClock } from '../clock';
import {
  STATUSES,
  applyAction,
  emptyBoard,
  exportBoard,
  importBoard,
  isOverdue,
  localDate,
  tasksIn,
  type Board,
  type StatusId,
  type Task,
} from './board';

describe('Board', () => {
  it('has the Statuses To Do, In Progress and Done, in that order', () => {
    expect(STATUSES.map((s) => s.name)).toEqual(['To Do', 'In Progress', 'Done']);
  });

  it('starts empty: no Tasks in any Status and no Labels', () => {
    const board = emptyBoard();
    for (const status of STATUSES) {
      expect(tasksIn(board, status.id)).toEqual([]);
    }
    expect(board.labels).toEqual([]);
  });
});

describe('Board data format', () => {
  const fullBoard: Board = {
    labels: [
      { id: 'l1', name: 'Bug', color: '#d73a49' },
      { id: 'l2', name: 'Unused', color: '#0366d6' },
    ],
    tasks: [
      {
        id: 't1',
        title: 'Write the spec',
        description: 'Line one\nLine two',
        status: 'done',
        position: 0,
        priority: 'urgent',
        dueDate: '2026-10-01',
        labelIds: ['l1'],
        createdAt: '2026-09-30T08:00:00.000Z',
        updatedAt: '2026-10-02T09:30:00.000Z',
        completedAt: '2026-10-02T09:30:00.000Z',
      },
      {
        id: 't2',
        title: 'Plan tickets',
        description: '',
        status: 'todo',
        position: 0,
        priority: 'none',
        dueDate: null,
        labelIds: [],
        createdAt: '2026-10-03T10:00:00.000Z',
        updatedAt: '2026-10-03T10:00:00.000Z',
        completedAt: null,
      },
    ],
  };

  it('records data-format version 1', () => {
    expect(JSON.parse(exportBoard(emptyBoard())).version).toBe(1);
  });

  it('round-trips a Board with every Phase 1 field through export and import', () => {
    expect(importBoard(exportBoard(fullBoard))).toEqual({ ok: true, board: fullBoard });
  });

  it('rejects data with an unknown version', () => {
    const text = JSON.stringify({ version: 99, board: fullBoard });
    expect(importBoard(text)).toEqual({ ok: false, error: expect.stringMatching(/version/i) });
  });

  it('rejects text that is not valid JSON', () => {
    expect(importBoard('{"version": 1, "board": ')).toEqual({ ok: false, error: expect.stringMatching(/JSON/) });
  });

  it.each([
    ['a bare array', []],
    ['null', null],
    ['an export with no Board', { version: 1 }],
    ['a Board that is not an object', { version: 1, board: 'tasks' }],
    ['a Board without Tasks', { version: 1, board: { labels: [] } }],
    ['a Board without Labels', { version: 1, board: { tasks: [] } }],
  ])('rejects %s', (_, data) => {
    expect(importBoard(JSON.stringify(data))).toEqual({ ok: false, error: expect.any(String) });
  });

  /** fullBoard exported, with the first Task's fields overridden (undefined drops the field). */
  function withFirstTask(fields: Record<string, unknown>): string {
    const [first, ...rest] = fullBoard.tasks;
    return JSON.stringify({ version: 1, board: { ...fullBoard, tasks: [{ ...first, ...fields }, ...rest] } });
  }

  it.each<[string, Record<string, unknown>]>([
    ['no id', { id: undefined }],
    ['a numeric id', { id: 7 }],
    ['no title', { title: undefined }],
    ['a blank title', { title: '   ' }],
    ['a description that is not text', { description: null }],
    ['an unknown Status', { status: 'blocked' }],
    ['a position that is not a number', { position: '0' }],
    ['a negative position', { position: -1 }],
    ['a fractional position', { position: 0.5 }],
    ['an unknown Priority', { priority: 'critical' }],
    ['a Due date that is not a calendar date', { dueDate: '1 Oct 2026' }],
    ['Label ids that are not a list', { labelIds: 'l1' }],
    ['a Label id that is not text', { labelIds: [1] }],
    ['no Created at', { createdAt: undefined }],
    ['an Updated at that is not a timestamp', { updatedAt: 'yesterday' }],
    ['a Completed at that is not a timestamp', { completedAt: 42 }],
  ])('rejects a Task with %s', (_, fields) => {
    expect(importBoard(withFirstTask(fields))).toEqual({ ok: false, error: expect.stringMatching(/task/i) });
  });

  it('rejects a Task list that holds something other than Tasks', () => {
    const text = JSON.stringify({ version: 1, board: { tasks: ['Write the spec'], labels: [] } });
    expect(importBoard(text).ok).toBe(false);
  });

  function withLabels(labels: unknown[]): string {
    return JSON.stringify({ version: 1, board: { ...fullBoard, labels } });
  }

  it.each<[string, unknown]>([
    ['something other than a Label', 'Bug'],
    ['no id', { name: 'Bug', color: '#d73a49' }],
    ['no name', { id: 'l1', color: '#d73a49' }],
    ['a blank name', { id: 'l1', name: ' ', color: '#d73a49' }],
    ['a color that is not text', { id: 'l1', name: 'Bug', color: 0xd73a49 }],
  ])('rejects a Label with %s', (_, label) => {
    expect(importBoard(withLabels([label, fullBoard.labels[1]]))).toEqual({
      ok: false,
      error: expect.stringMatching(/label/i),
    });
  });

  it('rejects two Labels whose names differ only in case', () => {
    const text = withLabels([...fullBoard.labels, { id: 'l3', name: 'bug', color: '#000000' }]);
    expect(importBoard(text)).toEqual({ ok: false, error: expect.stringMatching(/bug/) });
  });

  it('rejects two Labels with the same id', () => {
    const text = withLabels([...fullBoard.labels, { id: 'l1', name: 'Other', color: '#000000' }]);
    expect(importBoard(text).ok).toBe(false);
  });

  it('rejects two Tasks with the same id', () => {
    const text = withFirstTask({ id: 't2' });
    expect(importBoard(text).ok).toBe(false);
  });

  it('rejects a Task carrying a Label that is not on the Board', () => {
    const text = withFirstTask({ labelIds: ['l1', 'missing'] });
    expect(importBoard(text)).toEqual({ ok: false, error: expect.stringMatching(/label/i) });
  });
});

describe('Adding a Task', () => {
  const now = new Date('2026-10-10T09:00:00.000Z');

  it('creates a Task in the given Status with the default field values', () => {
    const board = applyAction(emptyBoard(), { type: 'addTask', id: 't1', status: 'in-progress', title: 'Write tests' }, now);

    expect(board.tasks).toEqual([
      {
        id: 't1',
        title: 'Write tests',
        description: '',
        status: 'in-progress',
        position: 0,
        priority: 'none',
        dueDate: null,
        labelIds: [],
        createdAt: '2026-10-10T09:00:00.000Z',
        updatedAt: '2026-10-10T09:00:00.000Z',
        completedAt: null,
      },
    ]);
  });

  it('places the new Task at the bottom of its Column without disturbing other Columns', () => {
    let board = emptyBoard();
    board = applyAction(board, { type: 'addTask', id: 'a', status: 'todo', title: 'First' }, now);
    board = applyAction(board, { type: 'addTask', id: 'b', status: 'done', title: 'Elsewhere' }, now);
    board = applyAction(board, { type: 'addTask', id: 'c', status: 'todo', title: 'Second' }, now);
    board = applyAction(board, { type: 'addTask', id: 'd', status: 'todo', title: 'Third' }, now);

    expect(tasksIn(board, 'todo').map((t) => [t.title, t.position])).toEqual([
      ['First', 0],
      ['Second', 1],
      ['Third', 2],
    ]);
    expect(tasksIn(board, 'done').map((t) => [t.title, t.position])).toEqual([['Elsewhere', 0]]);
  });

  it.each(['', '   ', '\t \n'])('rejects an empty or whitespace-only title (%j), leaving the Board unchanged', (title) => {
    const before = emptyBoard();
    const after = applyAction(before, { type: 'addTask', id: 't1', status: 'todo', title }, now);
    expect(after).toBe(before);
  });

  it('trims surrounding whitespace from the title', () => {
    const board = applyAction(emptyBoard(), { type: 'addTask', id: 't1', status: 'todo', title: '  Buy milk \n' }, now);
    expect(board.tasks[0].title).toBe('Buy milk');
  });
});

describe('Moving a Task', () => {
  const created = new Date('2026-10-10T09:00:00.000Z');
  const later = new Date('2026-10-11T12:00:00.000Z');

  /** A Board with Tasks a, b, c in To Do and x, y in In Progress (in that order). */
  function boardWithTasks(): Board {
    let board = emptyBoard();
    for (const [id, status] of [
      ['a', 'todo'],
      ['b', 'todo'],
      ['c', 'todo'],
      ['x', 'in-progress'],
      ['y', 'in-progress'],
    ] as const) {
      board = applyAction(board, { type: 'addTask', id, status, title: id.toUpperCase() }, created);
    }
    return board;
  }

  function order(board: Board, status: StatusId) {
    return tasksIn(board, status).map((t) => [t.id, t.position]);
  }

  it('moves a Task to another Column at the given position', () => {
    const board = applyAction(boardWithTasks(), { type: 'moveTask', id: 'b', status: 'in-progress', position: 1 }, later);

    expect(order(board, 'todo')).toEqual([
      ['a', 0],
      ['c', 1],
    ]);
    expect(order(board, 'in-progress')).toEqual([
      ['x', 0],
      ['b', 1],
      ['y', 2],
    ]);
  });

  it('reorders a Task down within its Column, landing at the given position', () => {
    const board = applyAction(boardWithTasks(), { type: 'moveTask', id: 'a', status: 'todo', position: 2 }, later);

    expect(order(board, 'todo')).toEqual([
      ['b', 0],
      ['c', 1],
      ['a', 2],
    ]);
  });

  it('reorders a Task up within its Column, landing at the given position', () => {
    const board = applyAction(boardWithTasks(), { type: 'moveTask', id: 'c', status: 'todo', position: 0 }, later);

    expect(order(board, 'todo')).toEqual([
      ['c', 0],
      ['a', 1],
      ['b', 2],
    ]);
    expect(order(board, 'in-progress')).toEqual([
      ['x', 0],
      ['y', 1],
    ]);
  });

  const statusPairs = STATUSES.flatMap((from) =>
    STATUSES.filter((to) => to.id !== from.id).map((to) => [from.id, to.id] as const),
  );

  it.each(statusPairs)('moves a Task from %s to %s', (from, to) => {
    let board = applyAction(emptyBoard(), { type: 'addTask', id: 't', status: from, title: 'Any' }, created);
    board = applyAction(board, { type: 'moveTask', id: 't', status: to, position: 0 }, later);

    expect(tasksIn(board, from)).toEqual([]);
    expect(tasksIn(board, to).map((t) => t.id)).toEqual(['t']);
  });

  it('moves a Task into an empty Column', () => {
    const board = applyAction(boardWithTasks(), { type: 'moveTask', id: 'x', status: 'done', position: 0 }, later);

    expect(order(board, 'done')).toEqual([['x', 0]]);
    expect(order(board, 'in-progress')).toEqual([['y', 0]]);
  });

  it('places a Task at the bottom when the position is past the end of the Column', () => {
    const board = applyAction(boardWithTasks(), { type: 'moveTask', id: 'a', status: 'in-progress', position: 99 }, later);

    expect(order(board, 'in-progress')).toEqual([
      ['x', 0],
      ['y', 1],
      ['a', 2],
    ]);
  });

  it('leaves the Board unchanged when a Task is dropped where it already is', () => {
    const before = boardWithTasks();
    expect(applyAction(before, { type: 'moveTask', id: 'b', status: 'todo', position: 1 }, later)).toBe(before);
  });

  it('leaves the Board unchanged when the Task does not exist', () => {
    const before = boardWithTasks();
    expect(applyAction(before, { type: 'moveTask', id: 'nope', status: 'done', position: 0 }, later)).toBe(before);
  });

  it("updates the moved Task's Updated at, and only that Task's", () => {
    const board = applyAction(boardWithTasks(), { type: 'moveTask', id: 'c', status: 'todo', position: 0 }, later);

    const updatedAt = Object.fromEntries(board.tasks.map((t) => [t.id, t.updatedAt]));
    expect(updatedAt).toEqual({
      a: '2026-10-10T09:00:00.000Z',
      b: '2026-10-10T09:00:00.000Z',
      c: '2026-10-11T12:00:00.000Z',
      x: '2026-10-10T09:00:00.000Z',
      y: '2026-10-10T09:00:00.000Z',
    });
  });

  it('does not mutate the Board it was given', () => {
    const before = boardWithTasks();
    const snapshot = structuredClone(before);
    applyAction(before, { type: 'moveTask', id: 'a', status: 'done', position: 0 }, later);
    expect(before).toEqual(snapshot);
  });
});

describe('Completed at', () => {
  const t1 = new Date('2026-10-10T09:00:00.000Z');
  const t2 = new Date('2026-10-11T10:00:00.000Z');
  const t3 = new Date('2026-10-12T11:00:00.000Z');
  const t4 = new Date('2026-10-13T12:00:00.000Z');

  function completedAt(board: Board) {
    return board.tasks[0].completedAt;
  }

  it('is set when a Task moves into Done, cleared when it leaves, and set fresh when it re-enters', () => {
    let board = applyAction(emptyBoard(), { type: 'addTask', id: 't', status: 'todo', title: 'Ship it' }, t1);
    expect(completedAt(board)).toBeNull();

    board = applyAction(board, { type: 'moveTask', id: 't', status: 'done', position: 0 }, t2);
    expect(completedAt(board)).toBe('2026-10-11T10:00:00.000Z');

    board = applyAction(board, { type: 'moveTask', id: 't', status: 'todo', position: 0 }, t3);
    expect(completedAt(board)).toBeNull();

    board = applyAction(board, { type: 'moveTask', id: 't', status: 'done', position: 0 }, t4);
    expect(completedAt(board)).toBe('2026-10-13T12:00:00.000Z');
  });

  it('is cleared when a Task moves from Done to In Progress', () => {
    let board = applyAction(emptyBoard(), { type: 'addTask', id: 't', status: 'done', title: 'Reopen me' }, t1);
    board = applyAction(board, { type: 'moveTask', id: 't', status: 'in-progress', position: 0 }, t2);
    board = applyAction(board, { type: 'moveTask', id: 't', status: 'done', position: 0 }, t3);
    board = applyAction(board, { type: 'moveTask', id: 't', status: 'in-progress', position: 0 }, t4);
    expect(completedAt(board)).toBeNull();
  });

  it('is kept when a Task is reordered within Done', () => {
    let board = emptyBoard();
    board = applyAction(board, { type: 'addTask', id: 't', status: 'todo', title: 'First' }, t1);
    board = applyAction(board, { type: 'moveTask', id: 't', status: 'done', position: 0 }, t2);
    board = applyAction(board, { type: 'addTask', id: 'u', status: 'done', title: 'Second' }, t2);
    board = applyAction(board, { type: 'moveTask', id: 't', status: 'done', position: 1 }, t3);

    expect(tasksIn(board, 'done').map((t) => t.id)).toEqual(['u', 't']);
    expect(board.tasks.find((t) => t.id === 't')!.completedAt).toBe('2026-10-11T10:00:00.000Z');
  });

  it('is not touched by moves between To Do and In Progress', () => {
    let board = applyAction(emptyBoard(), { type: 'addTask', id: 't', status: 'todo', title: 'Work' }, t1);
    board = applyAction(board, { type: 'moveTask', id: 't', status: 'in-progress', position: 0 }, t2);
    expect(completedAt(board)).toBeNull();
  });
});

describe('Updating a Task', () => {
  const created = new Date('2026-10-10T09:00:00.000Z');
  const later = new Date('2026-10-11T14:30:00.000Z');

  function boardWithTask(): Board {
    return applyAction(emptyBoard(), { type: 'addTask', id: 't1', status: 'todo', title: 'Write tests' }, created);
  }

  it('changes the title, description, Priority and Due date and stamps Updated at with now', () => {
    const board = applyAction(
      boardWithTask(),
      {
        type: 'updateTask',
        id: 't1',
        changes: { title: 'Write more tests', description: 'Line one\nLine two', priority: 'high', dueDate: '2026-10-20' },
      },
      later,
    );

    expect(board.tasks).toEqual([
      {
        id: 't1',
        title: 'Write more tests',
        description: 'Line one\nLine two',
        status: 'todo',
        position: 0,
        priority: 'high',
        dueDate: '2026-10-20',
        labelIds: [],
        createdAt: '2026-10-10T09:00:00.000Z',
        updatedAt: '2026-10-11T14:30:00.000Z',
        completedAt: null,
      },
    ]);
  });

  it.each(['', '   ', '\n\t'])('keeps the previous title when the update would empty it (%j), leaving the Board unchanged', (title) => {
    const before = boardWithTask();
    const after = applyAction(before, { type: 'updateTask', id: 't1', changes: { title } }, later);
    expect(after).toBe(before);
  });

  it('keeps the previous title but applies the other changes when the title would be emptied', () => {
    const board = applyAction(
      boardWithTask(),
      { type: 'updateTask', id: 't1', changes: { title: ' ', priority: 'low' } },
      later,
    );
    expect(board.tasks[0]).toMatchObject({ title: 'Write tests', priority: 'low', updatedAt: '2026-10-11T14:30:00.000Z' });
  });

  it('trims surrounding whitespace from a new title', () => {
    const board = applyAction(boardWithTask(), { type: 'updateTask', id: 't1', changes: { title: '  Ship it \n' } }, later);
    expect(board.tasks[0].title).toBe('Ship it');
  });

  it('clears the Due date', () => {
    let board = applyAction(boardWithTask(), { type: 'updateTask', id: 't1', changes: { dueDate: '2026-10-20' } }, later);
    board = applyAction(board, { type: 'updateTask', id: 't1', changes: { dueDate: null } }, later);
    expect(board.tasks[0].dueDate).toBeNull();
  });

  it('changes Updated at on every edit', () => {
    let board = boardWithTask();
    board = applyAction(board, { type: 'updateTask', id: 't1', changes: { description: 'a' } }, new Date('2026-10-11T10:00:00.000Z'));
    expect(board.tasks[0].updatedAt).toBe('2026-10-11T10:00:00.000Z');
    board = applyAction(board, { type: 'updateTask', id: 't1', changes: { priority: 'urgent' } }, new Date('2026-10-12T11:00:00.000Z'));
    expect(board.tasks[0].updatedAt).toBe('2026-10-12T11:00:00.000Z');
    expect(board.tasks[0].createdAt).toBe('2026-10-10T09:00:00.000Z');
  });

  it('leaves the Board unchanged (and Updated at alone) when nothing actually changes', () => {
    const before = boardWithTask();
    const after = applyAction(
      before,
      { type: 'updateTask', id: 't1', changes: { title: 'Write tests', description: '', priority: 'none', dueDate: null } },
      later,
    );
    expect(after).toBe(before);
  });

  it('leaves the Board unchanged for an unknown Task', () => {
    const before = boardWithTask();
    expect(applyAction(before, { type: 'updateTask', id: 'nope', changes: { title: 'X' } }, later)).toBe(before);
  });

  it('does not touch other Tasks', () => {
    const before = applyAction(boardWithTask(), { type: 'addTask', id: 't2', status: 'todo', title: 'Other' }, created);
    const after = applyAction(before, { type: 'updateTask', id: 't1', changes: { priority: 'low' } }, later);
    expect(after.tasks.find((t) => t.id === 't2')).toBe(before.tasks.find((t) => t.id === 't2'));
  });
});

describe('Deleting a Task', () => {
  const now = new Date('2026-10-10T09:00:00.000Z');

  function boardWithTasks(): Board {
    let board = emptyBoard();
    board = applyAction(board, { type: 'addTask', id: 'a', status: 'todo', title: 'A' }, now);
    board = applyAction(board, { type: 'addTask', id: 'b', status: 'todo', title: 'B' }, now);
    board = applyAction(board, { type: 'addTask', id: 'c', status: 'todo', title: 'C' }, now);
    board = applyAction(board, { type: 'addTask', id: 'd', status: 'done', title: 'D' }, now);
    return board;
  }

  it('removes the Task permanently and closes the gap in its Column', () => {
    const board = applyAction(boardWithTasks(), { type: 'deleteTask', id: 'b' }, now);

    expect(board.tasks.find((t) => t.id === 'b')).toBeUndefined();
    expect(tasksIn(board, 'todo').map((t) => [t.title, t.position])).toEqual([
      ['A', 0],
      ['C', 1],
    ]);
    expect(tasksIn(board, 'done').map((t) => [t.title, t.position])).toEqual([['D', 0]]);
  });

  it('leaves the Board unchanged for an unknown Task', () => {
    const before = boardWithTasks();
    expect(applyAction(before, { type: 'deleteTask', id: 'nope' }, now)).toBe(before);
  });
});

describe('Overdue', () => {
  // A fixed clock at 09:00 local time on 10 October 2026.
  const clock = fixedClock(new Date(2026, 9, 10, 9, 0));
  const today = localDate(clock.now());

  function taskWith(fields: Partial<Pick<Task, 'status' | 'dueDate'>>): Task {
    const board = applyAction(emptyBoard(), { type: 'addTask', id: 't1', status: 'todo', title: 'Ship it' }, clock.now());
    return { ...board.tasks[0], ...fields };
  }

  it('is Overdue when the Due date is before today and the Task is not Done', () => {
    expect(isOverdue(taskWith({ status: 'todo', dueDate: '2026-10-09' }), today)).toBe(true);
    expect(isOverdue(taskWith({ status: 'in-progress', dueDate: '2025-12-31' }), today)).toBe(true);
  });

  it('is not Overdue when the Due date is today or later', () => {
    expect(isOverdue(taskWith({ status: 'todo', dueDate: '2026-10-10' }), today)).toBe(false);
    expect(isOverdue(taskWith({ status: 'todo', dueDate: '2026-10-11' }), today)).toBe(false);
  });

  it('is never Overdue in Done, even with a past Due date', () => {
    expect(isOverdue(taskWith({ status: 'done', dueDate: '2026-10-01' }), today)).toBe(false);
  });

  it('is not Overdue without a Due date', () => {
    expect(isOverdue(taskWith({ status: 'todo', dueDate: null }), today)).toBe(false);
  });

  it('takes today from the local calendar date, not the UTC one', () => {
    expect(localDate(new Date(2026, 9, 10, 0, 5))).toBe('2026-10-10');
    expect(localDate(new Date(2026, 9, 10, 23, 55))).toBe('2026-10-10');
    expect(localDate(new Date(2026, 0, 3, 12, 0))).toBe('2026-01-03');
  });
});
