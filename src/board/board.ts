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
  if (!isRecord(data)) return { ok: false, error: NOT_AN_EXPORT };
  const { version, board } = data;
  if (version !== DATA_FORMAT_VERSION) {
    return { ok: false, error: `Unknown data-format version: ${String(version)}.` };
  }
  if (!isRecord(board)) return { ok: false, error: NOT_AN_EXPORT };
  if (!Array.isArray(board.tasks)) return { ok: false, error: 'The Board has no list of Tasks.' };
  if (!Array.isArray(board.labels)) return { ok: false, error: 'The Board has no list of Labels.' };
  try {
    const labels = board.labels.map((label, index) => readLabel(label, `Label ${index + 1}`));
    const tasks = board.tasks.map((task, index) => readTask(task, `Task ${index + 1}`));
    checkConsistency({ tasks, labels });
    return { ok: true, board: { tasks, labels } };
  } catch (error) {
    if (error instanceof InvalidData) return { ok: false, error: error.message };
    throw error;
  }
}

const NOT_AN_EXPORT = 'The file is not a Task Board export.';
const STATUS_IDS: readonly string[] = STATUSES.map((status) => status.id);
const PRIORITIES: readonly string[] = ['none', 'low', 'medium', 'high', 'urgent'] satisfies Priority[];

/** Thrown while reading imported data; its message says what is wrong. */
class InvalidData extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string';
}

function isLocalDate(value: unknown): value is LocalDate {
  return isText(value) && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function isTimestamp(value: unknown): value is Timestamp {
  return isText(value) && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
}

function isId(value: unknown): value is string {
  return isText(value) && value !== '';
}

function isNonBlankText(value: unknown): value is string {
  return isText(value) && value.trim() !== '';
}

type FieldReader = <T>(key: string, valid: (value: unknown) => value is T, what: string) => T;

/** Reads fields of `data` (named `name` in errors), throwing InvalidData on the first bad one. */
function fieldReader(data: unknown, name: string, kind: string): FieldReader {
  if (!isRecord(data)) throw new InvalidData(`${name} is not a ${kind}.`);
  return (key, valid, what) => {
    const value = data[key];
    if (!valid(value)) throw new InvalidData(`${name} has ${what}.`);
    return value;
  };
}

/** Copies a Label's fields out of untrusted data, or throws InvalidData naming the bad field. */
function readLabel(data: unknown, name: string): Label {
  const field = fieldReader(data, name, 'Label');
  return {
    id: field('id', isId, 'no valid id'),
    name: field('name', isNonBlankText, 'no name'),
    color: field('color', isText, 'a color that is not text'),
  };
}

/** Copies a Task's fields out of untrusted data, or throws InvalidData naming the bad field. */
function readTask(data: unknown, name: string): Task {
  const field = fieldReader(data, name, 'Task');
  return {
    id: field('id', isId, 'no valid id'),
    title: field('title', isNonBlankText, 'no title'),
    description: field('description', isText, 'a description that is not text'),
    status: field('status', (v): v is StatusId => isText(v) && STATUS_IDS.includes(v), 'an unknown Status'),
    position: field('position', (v): v is number => Number.isInteger(v) && (v as number) >= 0, 'an invalid position'),
    priority: field('priority', (v): v is Priority => isText(v) && PRIORITIES.includes(v), 'an unknown Priority'),
    dueDate: field('dueDate', (v): v is LocalDate | null => v === null || isLocalDate(v), 'an invalid Due date'),
    labelIds: field('labelIds', (v): v is string[] => Array.isArray(v) && v.every(isText), 'invalid Label ids'),
    createdAt: field('createdAt', isTimestamp, 'an invalid Created at'),
    updatedAt: field('updatedAt', isTimestamp, 'an invalid Updated at'),
    completedAt: field('completedAt', (v): v is Timestamp | null => v === null || isTimestamp(v), 'an invalid Completed at'),
  };
}

/** Checks the rules that span the Board: unique ids, unique Label names, no missing Labels. */
function checkConsistency({ tasks, labels }: Board): void {
  const labelIds = new Set<string>();
  const labelNames = new Set<string>();
  for (const label of labels) {
    if (labelIds.has(label.id)) throw new InvalidData(`Two Labels share the id “${label.id}”.`);
    const key = label.name.toLowerCase();
    if (labelNames.has(key)) throw new InvalidData(`Two Labels are named “${label.name}” (ignoring case).`);
    labelIds.add(label.id);
    labelNames.add(key);
  }
  const taskIds = new Set<string>();
  for (const task of tasks) {
    if (taskIds.has(task.id)) throw new InvalidData(`Two Tasks share the id “${task.id}”.`);
    taskIds.add(task.id);
    const missing = task.labelIds.find((id) => !labelIds.has(id));
    if (missing !== undefined) {
      throw new InvalidData(`Task “${task.title}” carries a Label that is not on the Board (“${missing}”).`);
    }
  }
}

/**
 * Something the user does to the Board. The caller supplies new ids so the
 * Board module stays deterministic.
 */
export type BoardAction = AddTask;

export interface AddTask {
  type: 'addTask';
  id: string;
  status: StatusId;
  title: string;
}

/** The Board after `action` was applied at time `now`. Never mutates `board`. */
export function applyAction(board: Board, action: BoardAction, now: Date): Board {
  switch (action.type) {
    case 'addTask':
      return addTask(board, action, now);
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

/** The Tasks with the given Status, in Column order (top first). */
export function tasksIn(board: Board, status: StatusId): Task[] {
  return board.tasks
    .filter((task) => task.status === status)
    .sort((a, b) => a.position - b.position);
}
