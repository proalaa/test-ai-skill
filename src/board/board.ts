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
export type BoardAction =
  | AddTask
  | MoveTask
  | UpdateTask
  | DeleteTask
  | AttachLabel
  | DetachLabel
  | RenameLabel
  | RecolorLabel
  | DeleteLabel;

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

/**
 * Attaches the Label called `name` (ignoring case) to a Task, creating it with
 * id `newLabelId` when the Board has no Label of that name.
 */
export interface AttachLabel {
  type: 'attachLabel';
  taskId: string;
  name: string;
  newLabelId: string;
}

/** Removes a Label from one Task. The Label stays on the Board. */
export interface DetachLabel {
  type: 'detachLabel';
  taskId: string;
  labelId: string;
}

/** Gives a Label a new name, which every Task carrying it then shows. */
export interface RenameLabel {
  type: 'renameLabel';
  labelId: string;
  name: string;
}

/** Gives a Label a new color, which every Task carrying it then shows. */
export interface RecolorLabel {
  type: 'recolorLabel';
  labelId: string;
  color: string;
}

/** Deletes a Label from the Board and removes it from every Task carrying it. */
export interface DeleteLabel {
  type: 'deleteLabel';
  labelId: string;
}

/** The fixed palette new Labels take their color from, in order. */
export const LABEL_COLORS: readonly string[] = [
  '#0c66e4', // blue
  '#1f845a', // green
  '#b65c02', // orange
  '#6e5dc6', // purple
  '#c9372c', // red
  '#227d9b', // teal
  '#ae4787', // magenta
  '#626f86', // gray
];

/** The Board after `action` was applied at time `now`. Never mutates `board`. */
export function applyAction(board: Board, action: BoardAction, now: Date): Board {
  switch (action.type) {
    case 'addTask':
      return addTask(board, action, now);
    case 'moveTask':
      return moveTask(board, action, now);
    case 'updateTask':
      return updateTask(board, action, now);
    case 'deleteTask':
      return deleteTask(board, action);
    case 'attachLabel':
      return attachLabel(board, action, now);
    case 'detachLabel':
      return detachLabel(board, action, now);
    case 'renameLabel':
      return renameLabel(board, action);
    case 'recolorLabel':
      return recolorLabel(board, action);
    case 'deleteLabel':
      return deleteLabel(board, action, now);
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

/** Attaches a Label by name to a Task, creating the Label when the name is new. */
function attachLabel(board: Board, { taskId, name, newLabelId }: AttachLabel, now: Date): Board {
  const task = board.tasks.find((t) => t.id === taskId);
  const trimmed = name.trim();
  if (!task || trimmed === '') return board;
  const existing = findLabelByName(board, trimmed);
  if (existing && task.labelIds.includes(existing.id)) return board;
  const label: Label = existing ?? { id: newLabelId, name: trimmed, color: nextLabelColor(board) };
  const labels = existing ? board.labels : [...board.labels, label];
  const updated: Task = { ...task, labelIds: [...task.labelIds, label.id], updatedAt: now.toISOString() };
  return { labels, tasks: board.tasks.map((t) => (t.id === taskId ? updated : t)) };
}

/** Removes a Label from one Task; the Label itself stays on the Board for reuse. */
function detachLabel(board: Board, { taskId, labelId }: DetachLabel, now: Date): Board {
  const task = board.tasks.find((t) => t.id === taskId);
  if (!task || !task.labelIds.includes(labelId)) return board;
  const updated: Task = { ...task, labelIds: task.labelIds.filter((id) => id !== labelId), updatedAt: now.toISOString() };
  return { ...board, tasks: board.tasks.map((t) => (t.id === taskId ? updated : t)) };
}

/**
 * Renames a Label. Tasks refer to Labels by id, so they all show the new name.
 * A name `labelRenameError` rejects leaves the Board unchanged.
 */
function renameLabel(board: Board, { labelId, name }: RenameLabel): Board {
  const label = board.labels.find((l) => l.id === labelId);
  const trimmed = name.trim();
  if (!label || label.name === trimmed || labelRenameError(board, labelId, name) !== null) return board;
  return { ...board, labels: board.labels.map((l) => (l === label ? { ...l, name: trimmed } : l)) };
}

/** Changes a Label's color. Tasks refer to Labels by id, so they all show it. */
function recolorLabel(board: Board, { labelId, color }: RecolorLabel): Board {
  const label = board.labels.find((l) => l.id === labelId);
  if (!label || label.color === color) return board;
  return { ...board, labels: board.labels.map((l) => (l === label ? { ...l, color } : l)) };
}

/**
 * Deletes a Label for good. Every Task that carried it loses it and gets a new
 * Updated at, so no Task is left pointing at a Label that is not on the Board.
 */
function deleteLabel(board: Board, { labelId }: DeleteLabel, now: Date): Board {
  if (!board.labels.some((label) => label.id === labelId)) return board;
  const labels = board.labels.filter((label) => label.id !== labelId);
  if (labelUsageCount(board, labelId) === 0) return { ...board, labels };
  const timestamp = now.toISOString();
  const tasks = board.tasks.map((task) =>
    task.labelIds.includes(labelId)
      ? { ...task, labelIds: task.labelIds.filter((id) => id !== labelId), updatedAt: timestamp }
      : task,
  );
  return { labels, tasks };
}

/**
 * Why renaming a Label to `name` would be rejected, as a message for the user,
 * or null when the rename is allowed. Names are trimmed, must not be blank and
 * must not clash, ignoring case, with another Label on the Board.
 */
export function labelRenameError(board: Pick<Board, 'labels'>, labelId: string, name: string): string | null {
  const trimmed = name.trim();
  if (trimmed === '') return 'A Label needs a name.';
  const clash = findLabelByName(board, trimmed);
  if (clash && clash.id !== labelId) return `There is already a Label named “${clash.name}”.`;
  return null;
}

/** The palette color the fewest Labels use; the earliest in the palette on a tie. */
function nextLabelColor(board: Board): string {
  const uses = (color: string) => board.labels.filter((label) => label.color === color).length;
  return LABEL_COLORS.reduce((best, color) => (uses(color) < uses(best) ? color : best));
}

/** The Label with the given name, ignoring case, if the Board has one. */
function findLabelByName(board: Pick<Board, 'labels'>, name: string): Label | undefined {
  const key = name.toLowerCase();
  return board.labels.find((label) => label.name.toLowerCase() === key);
}

/** The Labels a Task carries, in the order they were attached. */
export function labelsOf(board: Pick<Board, 'labels'>, task: Task): Label[] {
  return task.labelIds.flatMap((id) => board.labels.find((label) => label.id === id) ?? []);
}

/** How many Tasks on the Board carry the Label. */
export function labelUsageCount(board: Board, labelId: string): number {
  return board.tasks.filter((task) => task.labelIds.includes(labelId)).length;
}

/** The local calendar date of `date` (in the user's time zone), as `YYYY-MM-DD`. */
export function localDate(date: Date): LocalDate {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Whether the Task is Overdue on the local date `today`. */
export function isOverdue(task: Task, today: LocalDate): boolean {
  // `YYYY-MM-DD` strings sort in calendar order, so a string compare is enough.
  return task.status !== 'done' && task.dueDate !== null && task.dueDate < today;
}

/** The Tasks with the given Status, in Column order (top first). */
export function tasksIn(board: Board, status: StatusId): Task[] {
  return board.tasks
    .filter((task) => task.status === status)
    .sort((a, b) => a.position - b.position);
}
