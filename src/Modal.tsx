import { useEffect, useRef, type ReactNode, type RefObject } from 'react';

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
 * had it before when it goes away. Escape and Tab work even when focus has
 * somehow left the dialog. Modals can be nested (the inner one inside the
 * outer one's content): only the innermost one handles Escape and Tab.
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

  // Keys are handled at the document, not on the dialog, so Escape and Tab
  // still work when focus has left the dialog (e.g. its element was removed).
  const latestOnClose = useRef(onClose);
  latestOnClose.current = onClose;
  useEffect(() => {
    const dialog = dialogRef.current!;
    openDialogs.add(dialog);
    function onKeyDown(event: KeyboardEvent) {
      if (!isInnermost(dialog)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        latestOnClose.current();
      } else if (event.key === 'Tab') {
        trapTab(dialog, event);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      openDialogs.delete(dialog);
    };
  }, []);

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
      >
        {children}
      </div>
    </div>
  );
}

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
}

/** Every open dialog element, for finding the innermost one. */
const openDialogs = new Set<HTMLElement>();

/** Whether no other open dialog sits inside `dialog`. */
function isInnermost(dialog: HTMLElement): boolean {
  return ![...openDialogs].some((other) => other !== dialog && dialog.contains(other));
}

/** Moves focus round to the other end of the dialog at either end, or into it when it is outside. */
function trapTab(dialog: HTMLElement, event: KeyboardEvent): void {
  const focusable = focusableIn(dialog);
  if (focusable.length === 0) {
    event.preventDefault();
    dialog.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  const outside = !dialog.contains(active);
  if (event.shiftKey && (active === first || outside)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || outside)) {
    event.preventDefault();
    first.focus();
  }
}
