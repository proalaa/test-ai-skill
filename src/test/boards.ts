import type { Task } from '../board/board';

/** A Task in To Do at position 0 with default fields, overridden by `fields`. */
export function task(fields: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    description: '',
    status: 'todo',
    position: 0,
    priority: 'none',
    dueDate: null,
    labelIds: [],
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-02T08:00:00.000Z',
    completedAt: null,
    ...fields,
  };
}
