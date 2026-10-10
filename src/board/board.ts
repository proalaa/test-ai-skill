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
export type BoardAction = AddTask | UpdateTask | DeleteTask;

export interface AddTask {
  type: 'addTask';
  id: string;
  status: StatusId;
  title: string;
}

/** The Task fields the user edits directly (in the task modal). */
export type TaskChanges = Partial<Pick<Task, 'title' | 'description' | 'priority' | 'dueDate'>>;

export interface UpdateTask {
  type: 'updateTask';
  id: string;
  changes: TaskChanges;
}

export interface DeleteTask {
  type: 'deleteTask';
  id: string;
}

/** The Board after `action` was applied at time `now`. Never mutates `board`. */
export function applyAction(board: Board, action: BoardAction, now: Date): Board {
  switch (action.type) {
    case 'addTask':
      return addTask(board, action, now);
    case 'updateTask':
      return updateTask(board, action, now);
    case 'deleteTask':
      return deleteTask(board, action);
  }
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

/**
 * Changes a Task's editable fields and stamps its Updated at. The title is
 * trimmed; a blank title keeps the previous one. If no field actually changes,
 * the Board is returned unchanged.
 */
function updateTask(board: Board, { id, changes }: UpdateTask, now: Date): Board {
  const task = board.tasks.find((t) => t.id === id);
  if (!task) return board;

  const { title, ...rest } = changes;
  const accepted: TaskChanges = { ...rest };
  if (title !== undefined && title.trim() !== '') accepted.title = title.trim();

  const changed = (Object.keys(accepted) as (keyof TaskChanges)[]).some((field) => accepted[field] !== task[field]);
  if (!changed) return board;

  const updated: Task = { ...task, ...accepted, updatedAt: now.toISOString() };
  return { ...board, tasks: board.tasks.map((t) => (t.id === id ? updated : t)) };
}

/** Removes a Task for good; the Tasks below it in its Column move up. */
function deleteTask(board: Board, { id }: DeleteTask): Board {
  const task = board.tasks.find((t) => t.id === id);
  if (!task) return board;
  return {
    ...board,
    tasks: board.tasks
      .filter((t) => t.id !== id)
      .map((t) => (t.status === task.status && t.position > task.position ? { ...t, position: t.position - 1 } : t)),
  };
}

/** The Tasks with the given Status, in Column order (top first). */
export function tasksIn(board: Board, status: StatusId): Task[] {
  return board.tasks
    .filter((task) => task.status === status)
    .sort((a, b) => a.position - b.position);
}
