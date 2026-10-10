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

/** The Tasks with the given Status, in Column order (top first). */
export function tasksIn(board: Board, status: StatusId): Task[] {
  return board.tasks
    .filter((task) => task.status === status)
    .sort((a, b) => a.position - b.position);
}
