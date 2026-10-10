import { useId, useState, type FormEvent } from 'react';
import { labelsOf, type Board, type Task } from './board/board';
import { LabelChip } from './LabelChip';
import type { Dispatch } from './useBoard';

interface TaskLabelsProps {
  task: Task;
  board: Board;
  dispatch: Dispatch;
}

/**
 * The Labels field of the task modal: the Task's Labels as chips with a remove
 * button each, and an input that attaches a Label by name (Enter). A new name
 * creates the Label; an existing one, in any case, is reused.
 */
export function TaskLabels({ task, board, dispatch }: TaskLabelsProps) {
  const id = useId();
  const [name, setName] = useState('');
  const attached = labelsOf(board, task);
  const suggestions = board.labels.filter((label) => !task.labelIds.includes(label.id));

  function attach(event: FormEvent) {
    event.preventDefault();
    if (name.trim() === '') return;
    dispatch({ type: 'attachLabel', taskId: task.id, name, newLabelId: crypto.randomUUID() });
    setName('');
  }

  return (
    <div className="field">
      <span className="field-label" id={`${id}-heading`}>
        Labels
      </span>
      <div className="task-labels-control">
        {attached.length > 0 && (
          <ul className="label-chips" aria-labelledby={`${id}-heading`}>
            {attached.map((label) => (
              <li key={label.id}>
                <LabelChip label={label}>
                  <button
                    type="button"
                    className="label-chip-remove"
                    aria-label={`Remove label ${label.name}`}
                    onClick={() => dispatch({ type: 'detachLabel', taskId: task.id, labelId: label.id })}
                  >
                    ×
                  </button>
                </LabelChip>
              </li>
            ))}
          </ul>
        )}
        <form className="label-add" onSubmit={attach}>
          <input
            aria-label="Add label"
            placeholder="Add a label…"
            list={`${id}-suggestions`}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <datalist id={`${id}-suggestions`}>
            {suggestions.map((label) => (
              <option key={label.id} value={label.name} />
            ))}
          </datalist>
        </form>
      </div>
    </div>
  );
}
