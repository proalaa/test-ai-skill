import { useState, type ChangeEvent } from 'react';
import { exportBoard, importBoard, localDate, type Board } from './board/board';
import type { Clock } from './clock';
import { ConfirmDialog } from './ConfirmDialog';
import type { ReplaceBoard } from './useBoard';

export interface BoardTransferProps {
  board: Board;
  replaceBoard: ReplaceBoard;
  clock: Clock;
}

/** Export and import controls for the whole Board. */
export function BoardTransfer({ board, replaceBoard, clock }: BoardTransferProps) {
  const [pending, setPending] = useState<{ fileName: string; board: Board } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Clear the input so choosing the same file again still fires a change.
    input.value = '';
    if (!file) return;
    setError(null);
    const result = importBoard(await file.text());
    if (result.ok) setPending({ fileName: file.name, board: result.board });
    else setError(`Couldn’t import “${file.name}”: ${result.error} Your Board was not changed.`);
  }

  function exportToFile() {
    const blob = new Blob([exportBoard(board)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `task-board-${localDate(clock.now())}.json`;
    link.click();
    // Revoke after the browser has started the download.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function confirmImport() {
    if (pending) replaceBoard(pending.board);
    setPending(null);
  }

  return (
    <div className="board-transfer">
      <button type="button" className="button" onClick={exportToFile}>
        Export
      </button>
      <label className="button">
        Import
        <input type="file" accept="application/json,.json" className="visually-hidden" onChange={chooseFile} />
      </label>
      {error && (
        <p className="import-error" role="alert">
          {error}{' '}
          <button type="button" className="link-button" onClick={() => setError(null)}>
            Dismiss
          </button>
        </p>
      )}
      {pending && (
        <ConfirmDialog
          title="Replace the whole Board?"
          confirmLabel="Replace board"
          onConfirm={confirmImport}
          onCancel={() => setPending(null)}
        >
          <p>
            Importing “{pending.fileName}” replaces every Task and Label on your Board. Nothing is merged, and this
            can’t be undone.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
