// The Board module: the domain core. Plain TypeScript, no React, no storage,
// no system time. Every rule of the app lives here. Time, when a rule needs it,
// is always passed in by the caller.

export type StatusId = 'todo' | 'in-progress' | 'done';

export interface Status {
  id: StatusId;
  name: string;
}

/** The fixed set of Statuses, in Column order. */
export const STATUSES: readonly Status[] = [
  { id: 'todo', name: 'To Do' },
  { id: 'in-progress', name: 'In Progress' },
  { id: 'done', name: 'Done' },
];

export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

/** A calendar day with no time of day, as `YYYY-MM-DD`. */
export type LocalDate = string;

/** A point in time, as an ISO 8601 string (e.g. from `Date#toISOString`). */
export type Timestamp = string;

export interface Task {
  id: string;
  title: string;
  description: string;
  status: StatusId;
  /** Position within the Task's Column, 0 at the top. */
  position: number;
  priority: Priority;
  dueDate: LocalDate | null;
  labelIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt: Timestamp | null;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Board {
  tasks: Task[];
  labels: Label[];
}

export function emptyBoard(): Board {
  return { tasks: [], labels: [] };
}

/**
 * The data-format version written by this app. Stored data and export files
 * share the format `{ version, board }`.
 */
export const DATA_FORMAT_VERSION = 1;

export type ImportResult = { ok: true; board: Board } | { ok: false; error: string };

/** Board → versioned JSON text (used for both storage and export files). */
export function exportBoard(board: Board): string {
  return JSON.stringify({ version: DATA_FORMAT_VERSION, board }, null, 2);
}

/** Versioned JSON text → Board, or an error saying why it was rejected. */
export function importBoard(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }
  const { version, board } = (data ?? {}) as { version?: unknown; board?: unknown };
  if (version !== DATA_FORMAT_VERSION) {
    return { ok: false, error: `Unknown data-format version: ${String(version)}.` };
  }
  // TODO(ticket 08): validate the shape of `board` and reject malformed data.
  return { ok: true, board: board as Board };
}

/**
 * Something the user does to the Board. The caller supplies new ids so the
 * Board module stays deterministic.
 */
export type BoardAction = AddTask | MoveTask;

export interface AddTask {
  type: 'addTask';
  id: string;
  status: StatusId;
  title: string;
}

/**
 * Moves a Task to `status` so that it ends up at index `position` of that
 * Column (0 = top), counted after the Task has left its old place.
 */
export interface MoveTask {
  type: 'moveTask';
  id: string;
  status: StatusId;
  position: number;
}

/** The Board after `action` was applied at time `now`. Never mutates `board`. */
export function applyAction(board: Board, action: BoardAction, now: Date): Board {
  switch (action.type) {
    case 'addTask':
      return addTask(board, action, now);
    case 'moveTask':
      return moveTask(board, action, now);
  }
}

/**
 * Moves a Task to a Status and position, renumbering both affected Columns so
 * positions stay 0..n-1. A move to where the Task already is changes nothing.
 */
function moveTask(board: Board, { id, status, position }: MoveTask, now: Date): Board {
  const task = board.tasks.find((t) => t.id === id);
  if (!task) return board;

  const target = tasksIn(board, status).filter((t) => t.id !== id);
  const index = Math.max(0, Math.min(Math.trunc(position), target.length));
  if (task.status === status && task.position === index) return board;

  const timestamp = now.toISOString();
  const moved: Task = { ...task, status, updatedAt: timestamp, completedAt: completedAtAfterMove(task, status, timestamp) };
  target.splice(index, 0, moved);

  const renumbered = new Map<string, Task>();
  const renumber = (tasks: Task[]) =>
    tasks.forEach((t, i) => renumbered.set(t.id, t.position === i && t !== moved ? t : { ...t, position: i }));
  renumber(target);
  if (task.status !== status) renumber(tasksIn(board, task.status).filter((t) => t.id !== id));

  return { ...board, tasks: board.tasks.map((t) => renumbered.get(t.id) ?? t) };
}

/** Entering Done records Completed at; leaving Done clears it; otherwise it is kept. */
function completedAtAfterMove(task: Task, status: StatusId, now: Timestamp): Timestamp | null {
  if (status !== 'done') return null;
  return task.status === 'done' ? task.completedAt : now;
}

/** Adds a Task at the bottom of its Column. A blank title adds nothing. */
function addTask(board: Board, { id, status, title }: AddTask, now: Date): Board {
  const trimmed = title.trim();
  if (trimmed === '') return board;
  const timestamp = now.toISOString();
  const task: Task = {
    id,
    title: trimmed,
    description: '',
    status,
    position: tasksIn(board, status).length,
    priority: 'none',
    dueDate: null,
    labelIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
  };
  return { ...board, tasks: [...board.tasks, task] };
}

/** The Tasks with the given Status, in Column order (top first). */
export function tasksIn(board: Board, status: StatusId): Task[] {
  return board.tasks
    .filter((task) => task.status === status)
    .sort((a, b) => a.position - b.position);
}
