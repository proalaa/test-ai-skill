import { useId, useRef, useState } from 'react';
import type { Board, Priority, Task, TaskChanges, Timestamp } from './board/board';
import { ConfirmDialog } from './ConfirmDialog';
import { Modal } from './Modal';
import { TaskLabels } from './TaskLabels';
import type { Dispatch } from './useBoard';

const PRIORITY_NAMES: Record<Priority, string> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

interface TaskModalProps {
  task: Task;
  /** The whole Board, for the Labels field. */
  board: Board;
  dispatch: Dispatch;
  onClose: () => void;
}

/**
 * The modal showing every field of one Task. Every edit is dispatched straight
 * away (autosave); there is no Save or Cancel.
 */
export function TaskModal({ task, board, dispatch, onClose }: TaskModalProps) {
  const id = useId();
  // The title as typed. It can be blank while editing; the Board never stores a blank title.
  const [title, setTitle] = useState(task.title);
  // The title when the field gained focus: what a cleared title reverts to.
  const titleBeforeEditing = useRef(task.title);
  const titleRef = useRef<HTMLInputElement>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function update(changes: TaskChanges) {
    dispatch({ type: 'updateTask', id: task.id, changes });
  }

  /** Called when the title field loses focus and when the modal closes. */
  function settleTitle() {
    if (title.trim() === '') {
      update({ title: titleBeforeEditing.current });
      setTitle(titleBeforeEditing.current);
    } else {
      setTitle(task.title);
    }
  }

  function close() {
    settleTitle();
    onClose();
  }

  return (
    <Modal label="Task details" className="modal task-modal" onClose={close} initialFocus={titleRef}>
      <div className="modal-header">
        <label className="field field-title">
          <span className="field-label">Title</span>
          <input
            ref={titleRef}
            className="task-title-input"
            value={title}
            onFocus={() => {
              titleBeforeEditing.current = task.title;
            }}
            onChange={(event) => {
              setTitle(event.target.value);
              update({ title: event.target.value });
            }}
            onBlur={settleTitle}
          />
        </label>
        <button type="button" className="icon-button" aria-label="Close" onClick={close}>
          ×
        </button>
      </div>
      <label className="field">
        <span className="field-label">Description</span>
        <textarea
          rows={5}
          value={task.description}
          onChange={(event) => update({ description: event.target.value })}
        />
      </label>
      <div className="field-row">
        <label className="field">
          <span className="field-label">Priority</span>
          <select value={task.priority} onChange={(event) => update({ priority: event.target.value as Priority })}>
            {Object.entries(PRIORITY_NAMES).map(([value, name]) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <label className="field-label" htmlFor={`${id}-due`}>
            Due date
          </label>
          <div className="due-date-control">
            <input
              id={`${id}-due`}
              type="date"
              value={task.dueDate ?? ''}
              onChange={(event) => update({ dueDate: event.target.value || null })}
            />
            <button
              type="button"
              className="link-button"
              onClick={() => update({ dueDate: null })}
              disabled={task.dueDate === null}
            >
              Clear due date
            </button>
          </div>
        </div>
      </div>
      <TaskLabels task={task} board={board} dispatch={dispatch} />
      <dl className="timestamps">
        <TimestampItem id={`${id}-created`} label="Created at" value={task.createdAt} />
        <TimestampItem id={`${id}-updated`} label="Updated at" value={task.updatedAt} />
        {task.completedAt && <TimestampItem id={`${id}-completed`} label="Completed at" value={task.completedAt} />}
      </dl>
      <div className="modal-footer">
        <button type="button" className="button button-danger" onClick={() => setConfirmingDelete(true)}>
          Delete task
        </button>
      </div>
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this Task?"
          confirmLabel="Delete"
          onConfirm={() => {
            dispatch({ type: 'deleteTask', id: task.id });
            onClose();
          }}
          onCancel={() => setConfirmingDelete(false)}
        >
          <p>
            “{task.title}” will be deleted permanently. This can’t be undone.
          </p>
        </ConfirmDialog>
      )}
    </Modal>
  );
}

function TimestampItem({ id, label, value }: { id: string; label: string; value: Timestamp }) {
  return (
    <div>
      <dt id={id}>{label}</dt>
      <dd>
        <time aria-labelledby={id} dateTime={value}>
          {new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </time>
      </dd>
    </div>
  );
}
