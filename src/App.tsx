import { useState, type FormEvent } from 'react';
import { STATUSES, tasksIn, type Board, type Status } from './board/board';
import type { Clock } from './clock';
import type { BoardStorage } from './storage/boardStorage';
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
  const [board, dispatch] = useBoard(storage, clock);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const boardIsEmpty = board.tasks.length === 0;
  const openTask = board.tasks.find((task) => task.id === openTaskId);

  return (
    <>
      <main className="board">
        {STATUSES.map((status) => (
          <Column
            key={status.id}
            status={status}
            board={board}
            dispatch={dispatch}
            showHint={boardIsEmpty && status.id === 'todo'}
            onOpenTask={setOpenTaskId}
          />
        ))}
      </main>
      {openTask && <TaskModal key={openTask.id} task={openTask} dispatch={dispatch} onClose={() => setOpenTaskId(null)} />}
    </>
  );
}

interface ColumnProps {
  status: Status;
  board: Board;
  dispatch: Dispatch;
  showHint: boolean;
  onOpenTask: (id: string) => void;
}

function Column({ status, board, dispatch, showHint, onOpenTask }: ColumnProps) {
  const tasks = tasksIn(board, status.id);
  return (
    <section className="column" aria-label={status.name}>
      <header className="column-header">
        <h2>{status.name}</h2>
        <span className="column-count" aria-label="Task count">
          {tasks.length}
        </span>
      </header>
      {showHint && <p className="empty-hint">No tasks yet. Type a title in “+ Add task” below and press Enter.</p>}
      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id} className="task" onClick={() => onOpenTask(task.id)}>
            {task.title}
          </li>
        ))}
      </ul>
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
