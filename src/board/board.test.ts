import { describe, expect, it } from 'vitest';
import { STATUSES, emptyBoard, exportBoard, importBoard, tasksIn, type Board } from './board';

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
