import { describe, expect, it } from 'vitest';
import { STATUSES, applyAction, emptyBoard, exportBoard, importBoard, tasksIn, type Board, type StatusId } from './board';

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
    expect(importBoard(text).ok).toBe(false);
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
