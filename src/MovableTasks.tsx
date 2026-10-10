// Drag and drop for Tasks, with dnd-kit. Pointer and keyboard moves go through
// the same sensors and the same handlers, and each finished move becomes one
// `moveTask` action. While a drag is in progress, the Columns show a preview of
// where every Task is; the Board itself only changes when the Task is dropped.

import {
  DndContext,
  KeyboardCode,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type Active,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type Over,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRef, useState, type ReactNode } from 'react';
import { STATUSES, tasksIn, type Board, type StatusId, type Task } from './board/board';
import type { Dispatch } from './useBoard';

/** The Task ids in each Column, top to bottom. */
type Placement = Record<StatusId, string[]>;

const COLUMN_ID_PREFIX = 'column:';

function columnDroppableId(status: StatusId): string {
  return COLUMN_ID_PREFIX + status;
}

function statusOfColumn(id: UniqueIdentifier): StatusId | undefined {
  const text = String(id);
  return text.startsWith(COLUMN_ID_PREFIX) ? (text.slice(COLUMN_ID_PREFIX.length) as StatusId) : undefined;
}

function placementOf(board: Board): Placement {
  return Object.fromEntries(STATUSES.map((s) => [s.id, tasksIn(board, s.id).map((t) => t.id)])) as Placement;
}

/** The Column a Task or Column droppable is in, according to `placement`. */
function columnOf(placement: Placement, id: UniqueIdentifier): StatusId | undefined {
  return statusOfColumn(id) ?? STATUSES.find((s) => placement[s.id].includes(String(id)))?.id;
}

/** Whether the dragged Task's middle is below the middle of what it is over. */
function isBelow(active: Active, over: Over): boolean {
  const dragged = active.rect.current.translated;
  if (!dragged) return false;
  return dragged.top + dragged.height / 2 > over.rect.top + over.rect.height / 2;
}

/**
 * Where everything is once the dragged Task is put over `over`. Over a Task in
 * another Column it goes just above or below that Task; over a Column it goes
 * to the bottom. Within its own Column it takes the place of the Task it is over
 * only when `reorder` is set (on drop), as dnd-kit already shows that shift.
 */
function placeOver(placement: Placement, active: Active, over: Over, reorder: boolean): Placement {
  const activeId = String(active.id);
  const from = columnOf(placement, activeId);
  const to = columnOf(placement, over.id);
  if (!from || !to) return placement;

  const overIsColumn = statusOfColumn(over.id) !== undefined;
  if (from === to) {
    if (!reorder || overIsColumn) return placement;
    const ids = placement[to];
    return { ...placement, [to]: arrayMove(ids, ids.indexOf(activeId), ids.indexOf(String(over.id))) };
  }

  const target = placement[to];
  const index = overIsColumn ? target.length : target.indexOf(String(over.id)) + (isBelow(active, over) ? 1 : 0);
  return {
    ...placement,
    [from]: placement[from].filter((id) => id !== activeId),
    [to]: [...target.slice(0, index), activeId, ...target.slice(index)],
  };
}

/**
 * What the dragged Task is over. The pointer decides for pointer drags; for
 * keyboard moves it is whatever the moved Task overlaps. A Task wins over the
 * Column it sits in.
 */
const detectCollisions: CollisionDetection = (args) => {
  const hits = args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args);
  const taskHits = hits.filter((hit) => statusOfColumn(hit.id) === undefined);
  return taskHits.length > 0 ? taskHits : hits;
};

const screenReaderInstructions = {
  draggable:
    'To pick up a Task, press Space. Use the arrow keys to move it up and down within its Column or to another Column. Press Space again to drop it, or Escape to cancel.',
};

interface MovableTasksProps {
  board: Board;
  dispatch: Dispatch;
  /** Renders the Columns, given the Tasks each one shows right now (top first). */
  children: (tasksOf: (status: StatusId) => Task[]) => ReactNode;
}

/** Lets the user move Tasks between and within Columns by pointer or keyboard. */
export function MovableTasks({ board, dispatch, children }: MovableTasksProps) {
  const sensors = useSensors(
    // A short distance before a drag starts, so a plain click stays a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Only Space picks a Task up and drops it, leaving Enter free for opening it.
      keyboardCodes: {
        start: [KeyboardCode.Space],
        cancel: [KeyboardCode.Esc],
        end: [KeyboardCode.Space],
      },
    }),
  );
  const [preview, setPreviewState] = useState<Placement | null>(null);
  const latestPreview = useRef(preview);
  function setPreview(next: Placement | null) {
    latestPreview.current = next;
    setPreviewState(next);
  }

  const tasksById = new Map(board.tasks.map((task) => [task.id, task]));
  const title = (id: UniqueIdentifier) => tasksById.get(String(id))?.title ?? 'Task';
  /** Where the dragged Task would land if dropped now, e.g. "A is in Done, position 2 of 3." */
  const whereItWouldLand = (active: Active, over: Over) => {
    const placement = placeOver(latestPreview.current ?? placementOf(board), active, over, true);
    const status = columnOf(placement, active.id);
    if (!status) return undefined;
    const name = STATUSES.find((s) => s.id === status)!.name;
    const ids = placement[status];
    return `${title(active.id)} is in ${name}, position ${ids.indexOf(String(active.id)) + 1} of ${ids.length}.`;
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${title(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? whereItWouldLand(active, over) : undefined),
    onDragEnd: ({ active, over }) => (over ? `Dropped ${title(active.id)}.` : `${title(active.id)} was not moved.`),
    onDragCancel: ({ active }) => `Moving ${title(active.id)} was cancelled.`,
  };

  function handleDragOver({ active, over }: DragOverEvent) {
    const placement = latestPreview.current;
    if (!placement || !over) return;
    const next = placeOver(placement, active, over, false);
    if (next !== placement) setPreview(next);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const placement = latestPreview.current;
    setPreview(null);
    if (!placement || !over) return;
    const final = placeOver(placement, active, over, true);
    const status = columnOf(final, active.id);
    if (!status) return;
    dispatch({ type: 'moveTask', id: String(active.id), status, position: final[status].indexOf(String(active.id)) });
  }

  const tasksOf = (status: StatusId): Task[] =>
    preview ? preview[status].flatMap((id) => tasksById.get(id) ?? []) : tasksIn(board, status);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={detectCollisions}
      accessibility={{ announcements, screenReaderInstructions }}
      onDragStart={() => setPreview(placementOf(board))}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setPreview(null)}
    >
      {children(tasksOf)}
    </DndContext>
  );
}

/** Makes a Column a place Tasks can be dropped; attach the ref to the Column's element. */
export function useColumnDropTarget(status: StatusId) {
  return useDroppable({ id: columnDroppableId(status) }).setNodeRef;
}

interface MovableTaskListProps {
  status: StatusId;
  tasks: Task[];
  /** Opens a Task (on click, or Enter while it has focus). */
  onOpenTask: (id: string) => void;
}

/** The Tasks of one Column as a list whose items can be dragged. */
export function MovableTaskList({ status, tasks, onOpenTask }: MovableTaskListProps) {
  return (
    <SortableContext id={columnDroppableId(status)} items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
      <ul className="task-list">
        {tasks.map((task) => (
          <MovableTask key={task.id} task={task} onOpen={() => onOpenTask(task.id)} />
        ))}
      </ul>
    </SortableContext>
  );
}

function MovableTask({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    attributes: { role: 'listitem', roleDescription: 'movable Task' },
  });
  return (
    <li
      ref={setNodeRef}
      className={isDragging ? 'task task-dragging' : 'task'}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      // dnd-kit swallows the click that ends a pointer drag, so this only fires on a plain click.
      onClick={onOpen}
      onKeyDown={(event) => {
        listeners?.onKeyDown?.(event);
        if (event.key === 'Enter' && !isDragging && !event.defaultPrevented) onOpen();
      }}
    >
      {task.title}
    </li>
  );
}
