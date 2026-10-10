import { describe, expect, it } from 'vitest';
import { STATUSES, applyAction, emptyBoard, exportBoard, importBoard, tasksIn, type Board } from './board';

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
