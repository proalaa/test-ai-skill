import { useId, useRef, useState, type FormEvent } from 'react';
import { LABEL_COLORS, labelRenameError, labelUsageCount, type Board, type Label } from './board/board';
import { ConfirmDialog } from './ConfirmDialog';
import { LabelChip } from './LabelChip';
import { Modal } from './Modal';
import type { Dispatch } from './useBoard';

/** What the palette colors are called, for screen readers and tooltips. */
const COLOR_NAMES: Record<string, string> = {
  '#0c66e4': 'Blue',
  '#1f845a': 'Green',
  '#b65c02': 'Orange',
  '#6e5dc6': 'Purple',
  '#c9372c': 'Red',
  '#227d9b': 'Teal',
  '#ae4787': 'Magenta',
  '#626f86': 'Gray',
};

interface ManageLabelsProps {
  board: Board;
  dispatch: Dispatch;
  onClose: () => void;
}

/**
 * The Manage labels screen: every Label on the Board, used or unused, where
 * each can be renamed, recolored or deleted (after a confirmation).
 */
export function ManageLabels({ board, dispatch, onClose }: ManageLabelsProps) {
  const [deleting, setDeleting] = useState<Label | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  function confirmDelete(label: Label) {
    // The Delete button goes away with the row, so keep focus on this screen.
    closeRef.current?.focus();
    dispatch({ type: 'deleteLabel', labelId: label.id });
    setDeleting(null);
  }

  return (
    <Modal label="Manage labels" className="modal manage-labels" onClose={onClose}>
      <div className="modal-header">
        <h2>Manage labels</h2>
        <button ref={closeRef} type="button" className="icon-button" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      {board.labels.length === 0 ? (
        <p className="empty-hint">No labels yet. Add one from a Task’s details.</p>
      ) : (
        <ul className="label-rows">
          {board.labels.map((label) => (
            <LabelRow key={label.id} label={label} usage={labelUsageCount(board, label.id)} board={board} dispatch={dispatch} onDelete={() => setDeleting(label)} />
          ))}
        </ul>
      )}
      {deleting && (
        <DeleteLabelConfirmation
          label={deleting}
          usage={labelUsageCount(board, deleting.id)}
          onConfirm={() => confirmDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </Modal>
  );
}

interface LabelRowProps {
  label: Label;
  /** How many Tasks carry the Label. */
  usage: number;
  /** The whole Board, to check a new name against the other Labels. */
  board: Board;
  dispatch: Dispatch;
  /** Asks to delete the Label. */
  onDelete: () => void;
}

/** One Label on the Manage labels screen. The name is renamed on Enter or when the field loses focus. */
function LabelRow({ label, usage, board, dispatch, onDelete }: LabelRowProps) {
  const id = useId();
  // The name as typed; it only reaches the Board when the rename is allowed.
  const [name, setName] = useState(label.name);
  const [error, setError] = useState<string | null>(null);

  function rename(event?: FormEvent) {
    event?.preventDefault();
    const problem = labelRenameError(board, label.id, name);
    setError(problem);
    if (problem !== null) return;
    dispatch({ type: 'renameLabel', labelId: label.id, name });
    setName(name.trim());
  }

  return (
    <li className="label-row" aria-label={label.name}>
      <LabelChip label={label} />
      <form className="label-rename" onSubmit={rename}>
        <input
          aria-label="Name"
          aria-invalid={error !== null}
          aria-describedby={error !== null ? `${id}-error` : undefined}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          onBlur={() => rename()}
        />
      </form>
      {error !== null && (
        <p id={`${id}-error`} className="label-error" role="alert">
          {error}
        </p>
      )}
      <div className="label-colors" role="radiogroup" aria-label="Color">
        {LABEL_COLORS.map((color) => (
          <input
            key={color}
            type="radio"
            className="label-color"
            name={`${id}-color`}
            aria-label={COLOR_NAMES[color]}
            title={COLOR_NAMES[color]}
            style={{ backgroundColor: color }}
            checked={label.color === color}
            onChange={() => dispatch({ type: 'recolorLabel', labelId: label.id, color })}
          />
        ))}
      </div>
      <span className="label-usage">{usageText(usage)}</span>
      <button type="button" className="button" onClick={onDelete}>
        Delete
      </button>
    </li>
  );
}

interface DeleteLabelConfirmationProps {
  label: Label;
  usage: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/** "Remove from N tasks?" for a Label in use; a simple confirmation for an unused one. */
function DeleteLabelConfirmation({ label, usage, onConfirm, onCancel }: DeleteLabelConfirmationProps) {
  const used = usage > 0;
  return (
    <ConfirmDialog
      title={used ? `Remove from ${tasksText(usage)}?` : `Delete the Label “${label.name}”?`}
      confirmLabel="Delete label"
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <p>
        {used
          ? `“${label.name}” will be removed from every Task that carries it and deleted from the Board.`
          : `No Task carries it. “${label.name}” will be deleted from the Board.`}
      </p>
    </ConfirmDialog>
  );
}

function usageText(usage: number) {
  if (usage === 0) return 'Not used';
  return `Used by ${tasksText(usage)}`;
}

/** "1 task", "2 tasks". */
function tasksText(count: number) {
  return `${count} ${count === 1 ? 'task' : 'tasks'}`;
}
