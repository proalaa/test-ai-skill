import { isOverdue, type LocalDate, type Priority, type Task } from './board/board';

const PRIORITY_NAMES: Record<Exclude<Priority, 'none'>, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export interface TaskCardProps {
  task: Task;
  /** The user's local date, from the injected clock. Decides Overdue. */
  today: LocalDate;
}

/**
 * What a Task shows inside its Column item: the title, then a row of details.
 * Timestamps are deliberately left out; they live in the Task modal.
 */
export function TaskCard({ task, today }: TaskCardProps) {
  const hasDescription = task.description.trim() !== '';
  const hasDetails = task.priority !== 'none' || task.dueDate !== null || hasDescription;
  return (
    <>
      <span className="task-title">{task.title}</span>
      {hasDetails && (
        <span className="task-details">
          {task.priority !== 'none' && (
            <span className={`priority-badge priority-${task.priority}`}>
              <span className="visually-hidden">Priority: </span>
              {PRIORITY_NAMES[task.priority]}
            </span>
          )}
          {task.dueDate && <DueDate dueDate={task.dueDate} overdue={isOverdue(task, today)} today={today} />}
          {hasDescription && <DescriptionIcon />}
        </span>
      )}
    </>
  );
}

function DescriptionIcon() {
  return (
    <span className="description-icon" role="img" aria-label="Has a description" title="Has a description">
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
        <path d="M2 3.5h12M2 6.5h12M2 9.5h12M2 12.5h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function DueDate({ dueDate, overdue, today }: { dueDate: LocalDate; overdue: boolean; today: LocalDate }) {
  return (
    <span className={overdue ? 'due-date overdue' : 'due-date'}>
      <span className="visually-hidden">Due </span>
      <time dateTime={dueDate}>{formatDueDate(dueDate, today)}</time>
      {overdue && <span className="visually-hidden"> (Overdue)</span>}
    </span>
  );
}

/** "Oct 9" in the user's locale; the year is added when it isn't this year. */
function formatDueDate(dueDate: LocalDate, today: LocalDate): string {
  const [year, month, day] = dueDate.split('-').map(Number);
  const sameYear = dueDate.slice(0, 4) === today.slice(0, 4);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
}
