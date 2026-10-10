import { useRef, type ReactNode } from 'react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  /** The question, e.g. "Delete this Task?"; also the dialog's accessible name. */
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  /** Called by the Cancel button and by Escape. */
  onCancel: () => void;
}

/**
 * Asks the user to confirm a destructive action. Focus starts on Cancel so
 * that pressing Enter straight away is safe.
 */
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Modal label={title} role="alertdialog" className="confirm-dialog" onClose={onCancel} initialFocus={cancelRef}>
      <h2 className="confirm-title">{title}</h2>
      {children && <div className="confirm-body">{children}</div>}
      <div className="confirm-actions">
        <button ref={cancelRef} type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="button button-danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
