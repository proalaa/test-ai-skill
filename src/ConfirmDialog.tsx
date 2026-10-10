import { useId, useRef, type ReactNode } from 'react';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  /** Text of the button that goes ahead, e.g. "Replace board" or "Delete". */
  confirmLabel: string;
  onConfirm: () => void;
  /** Called by the Cancel button and by Escape. */
  onCancel: () => void;
}

/**
 * A modal "are you sure?" dialog (role `alertdialog`). Focus starts on Cancel
 * (the safe choice) and stays inside the dialog; Escape cancels. It can be
 * opened from inside another modal: Escape then cancels only this dialog.
 */
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      role="alertdialog"
      labelledBy={titleId}
      describedBy={messageId}
      className="dialog"
      backdropClassName="dialog-backdrop"
      onClose={onCancel}
      initialFocus={cancelRef}
    >
      <h2 id={titleId}>{title}</h2>
      <div id={messageId}>{children}</div>
      <div className="dialog-actions">
        <button ref={cancelRef} type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
