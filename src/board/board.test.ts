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
