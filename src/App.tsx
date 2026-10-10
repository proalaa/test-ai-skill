import { useState } from 'react';
import { STATUSES, emptyBoard, tasksIn, type Board, type Status } from './board/board';
import type { Clock } from './clock';
import type { BoardStorage } from './storage/boardStorage';
import './App.css';

export interface AppProps {
  storage: BoardStorage;
  clock: Clock;
}

/**
 * The top level of the app. The only place that holds storage and the clock;
 * nothing below it reads localStorage or the system time directly.
 */
// `clock` is unused until Tasks can change (ticket 02 onwards).
export function App({ storage }: AppProps) {
  const [board] = useState<Board>(() => storage.load() ?? emptyBoard());
  const boardIsEmpty = board.tasks.length === 0;

  return (
    <main className="board">
      {STATUSES.map((status) => (
        <Column key={status.id} status={status} board={board} showHint={boardIsEmpty && status.id === 'todo'} />
      ))}
    </main>
  );
}

function Column({ status, board, showHint }: { status: Status; board: Board; showHint: boolean }) {
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
          <li key={task.id} className="task">
            {task.title}
          </li>
        ))}
      </ul>
    </section>
  );
}
