import { useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  /** Accessible name of the dialog (or use `labelledBy`). */
  label?: string;
  /** Id of the element that names the dialog. */
  labelledBy?: string;
  /** Id of the element that describes the dialog. */
  describedBy?: string;
  /** `alertdialog` for confirmations. */
  role?: 'dialog' | 'alertdialog';
  className?: string;
  backdropClassName?: string;
  /** Called on Escape. Close buttons inside call their own handlers. */
  onClose: () => void;
  /** What gets focus when the modal opens; defaults to the first focusable element. */
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}

/**
 * A modal dialog over a backdrop. It moves focus inside when it opens, keeps
 * Tab and Shift+Tab inside, closes on Escape, and gives focus back to whatever
 * had it before when it goes away. Modals can be nested: the innermost one
 * handles Escape and Tab and stops them reaching the outer one.
 */
export function Modal({
  label,
  labelledBy,
  describedBy,
  role = 'dialog',
  className = 'modal',
  backdropClassName = 'modal-backdrop',
  onClose,
  initialFocus,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const target = initialFocus?.current ?? focusableIn(dialogRef.current!)[0] ?? dialogRef.current;
    target?.focus();
    return () => {
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
    // Only on open and close.
  }, []);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      event.preventDefault();
      onClose();
    } else if (event.key === 'Tab') {
      event.stopPropagation();
      const focusable = focusableIn(dialogRef.current!);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current!.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialogRef.current!.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div className={backdropClassName}>
      <div
        ref={dialogRef}
        className={className}
        role={role}
        aria-modal="true"
        aria-label={label}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </div>
  );
}

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
}
