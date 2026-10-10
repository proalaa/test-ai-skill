import { useState, type FormEvent } from 'react';
import { STATUSES, localDate, type Label, type LocalDate, type Status, type Task } from './board/board';
import { BoardTransfer } from './BoardTransfer';
import type { Clock } from './clock';
import { MovableTaskList, MovableTasks, useColumnDropTarget } from './MovableTasks';
import type { BoardStorage } from './storage/boardStorage';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { useBoard, type Dispatch } from './useBoard';
import './App.css';

export interface AppProps {
  storage: BoardStorage;
  clock: Clock;
}

/**
 * The top level of the app. The only place that holds storage and the clock;
 * nothing below it reads localStorage or the system time directly.
 */
export function App({ storage, clock }: AppProps) {
  const [board, dispatch, replaceBoard] = useBoard(storage, clock);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const boardIsEmpty = board.tasks.length === 0;
  const openTask = board.tasks.find((task) => task.id === openTaskId);
  const today = localDate(clock.now());

  return (
    <>
      <header className="app-header">
        <h1>Task Board</h1>
        <BoardTransfer board={board} replaceBoard={replaceBoard} clock={clock} />
      </header>
      <main className="board">
        <MovableTasks board={board} dispatch={dispatch}>
          {(tasksOf) =>
            STATUSES.map((status) => (
              <Column
                key={status.id}
                status={status}
                tasks={tasksOf(status.id)}
                dispatch={dispatch}
                showHint={boardIsEmpty && status.id === 'todo'}
                onOpenTask={setOpenTaskId}
                today={today}
                labels={board.labels}
              />
            ))
          }
        </MovableTasks>
      </main>
      {openTask && (
        <TaskModal key={openTask.id} task={openTask} board={board} dispatch={dispatch} onClose={() => setOpenTaskId(null)} />
      )}
    </>
  );
}

interface ColumnProps {
  status: Status;
  /** The Tasks shown in this Column, top first. */
  tasks: Task[];
  dispatch: Dispatch;
  showHint: boolean;
  onOpenTask: (id: string) => void;
  /** The user's local date, for showing Overdue Tasks. */
  today: LocalDate;
  /** Every Label on the Board, for the Label chips. */
  labels: Label[];
}

function Column({ status, tasks, dispatch, showHint, onOpenTask, today, labels }: ColumnProps) {
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
      <MovableTaskList
        status={status.id}
        tasks={tasks}
        onOpenTask={onOpenTask}
        renderTask={(task) => <TaskCard task={task} today={today} labels={labels} />}
      />
      <QuickAdd onAdd={(title) => dispatch({ type: 'addTask', id: crypto.randomUUID(), status: status.id, title })} />
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
