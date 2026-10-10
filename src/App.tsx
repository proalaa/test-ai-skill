import { useState, type FormEvent } from 'react';
import { STATUSES, labelsOf, localDate, type Label, type LocalDate, type Status, type Task } from './board/board';
import { BoardTransfer } from './BoardTransfer';
import { ManageLabels } from './ManageLabels';
import type { Clock } from './clock';
import type { NewId } from './ids';
import { MovableColumnTasks, MovableTasks, useColumnDropTarget } from './MovableTasks';
import type { BoardStorage } from './storage/boardStorage';
import { TaskSummary } from './TaskSummary';
import { TaskModal } from './TaskModal';
import { useBoard } from './useBoard';
import './App.css';

export interface AppProps {
  storage: BoardStorage;
  clock: Clock;
  newId: NewId;
}

/**
 * The top level of the app. The only place that holds storage, the clock and
 * the id source; nothing below it reads localStorage, the system time or makes
 * ids of its own.
 */
export function App({ storage, clock, newId }: AppProps) {
  const [board, dispatch, replaceBoard, loadProblem] = useBoard(storage, clock);
  const [showLoadProblem, setShowLoadProblem] = useState(true);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [managingLabels, setManagingLabels] = useState(false);
  const boardIsEmpty = board.tasks.length === 0;
  const openTask = board.tasks.find((task) => task.id === openTaskId);
  const today = localDate(clock.now());

  return (
    <>
      <header className="app-header">
        <h1>Task Board</h1>
        <div className="header-actions">
          <button type="button" className="button" onClick={() => setManagingLabels(true)}>
            Manage labels
          </button>
          <BoardTransfer board={board} replaceBoard={replaceBoard} clock={clock} />
        </div>
      </header>
      {loadProblem && showLoadProblem && (
        <p className="load-problem" role="alert">
          Your saved Board couldn’t be read ({loadProblem}) so you are starting with an empty Board. The saved data
          has been kept aside in this browser, untouched.{' '}
          <button type="button" className="link-button" onClick={() => setShowLoadProblem(false)}>
            Dismiss
          </button>
        </p>
      )}
      <main className="board">
        <MovableTasks board={board} dispatch={dispatch}>
          {(tasksOf) =>
            STATUSES.map((status) => (
              <Column
                key={status.id}
                status={status}
                tasks={tasksOf(status.id)}
                onAddTask={(title) => dispatch({ type: 'addTask', id: newId(), status: status.id, title })}
                showHint={boardIsEmpty && status === STATUSES[0]}
                onOpenTask={setOpenTaskId}
                today={today}
                labelsOf={(task) => labelsOf(board, task)}
              />
            ))
          }
        </MovableTasks>
      </main>
      {openTask && (
        <TaskModal
          key={openTask.id}
          task={openTask}
          board={board}
          dispatch={dispatch}
          newId={newId}
          onClose={() => setOpenTaskId(null)}
        />
      )}
      {managingLabels && <ManageLabels board={board} dispatch={dispatch} onClose={() => setManagingLabels(false)} />}
    </>
  );
}

interface ColumnProps {
  status: Status;
  /** The Tasks shown in this Column, top first. */
  tasks: Task[];
  /** Adds a Task with this title to the bottom of the Column; returns whether it was added. */
  onAddTask: (title: string) => boolean;
  showHint: boolean;
  onOpenTask: (id: string) => void;
  /** The user's local date, for showing Overdue Tasks. */
  today: LocalDate;
  /** The Labels a Task carries, for its Label chips. */
  labelsOf: (task: Task) => Label[];
}

function Column({ status, tasks, onAddTask, showHint, onOpenTask, today, labelsOf }: ColumnProps) {
  const dropTargetRef = useColumnDropTarget(status.id);
  return (
    <section ref={dropTargetRef} className="column" aria-label={status.name}>
      <header className="column-header">
        <h2>{status.name}</h2>
        <span className="column-count" aria-label="Task count">
          {tasks.length}
        </span>
      </header>
      {showHint && <p className="empty-hint">No tasks yet. Type a title in “+ Add task” below and press Enter.</p>}
      <MovableColumnTasks
        status={status.id}
        tasks={tasks}
        onOpenTask={onOpenTask}
        renderTask={(task) => <TaskSummary task={task} today={today} labels={labelsOf(task)} />}
      />
      <QuickAdd onAdd={onAddTask} />
    </section>
  );
}

/** The "+ Add task" input at the bottom of a Column. Enter adds; focus stays put. */
function QuickAdd({ onAdd }: { onAdd: (title: string) => boolean }) {
  const [title, setTitle] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (onAdd(title)) setTitle('');
  }

  return (
    <form className="quick-add" onSubmit={submit}>
      <input
        className="quick-add-input"
        aria-label="Add task"
        placeholder="+ Add task"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
    </form>
  );
}
