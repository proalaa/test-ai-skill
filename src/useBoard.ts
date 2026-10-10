import { useCallback, useRef, useState } from 'react';
import { applyAction, emptyBoard, type Board, type BoardAction } from './board/board';
import type { Clock } from './clock';
import type { BoardStorage } from './storage/boardStorage';

/** Applies an action to the Board. Returns whether the Board changed. */
export type Dispatch = (action: BoardAction) => boolean;

/**
 * The Board as React state. `dispatch` runs an action through the Board module
 * at `clock.now()` and, when the Board changed, saves it (autosave).
 */
export function useBoard(storage: BoardStorage, clock: Clock): [Board, Dispatch] {
  const [board, setBoard] = useState<Board>(() => storage.load() ?? emptyBoard());
  // The latest Board, so several dispatches before a re-render all build on each other.
  const latest = useRef(board);

  const dispatch = useCallback<Dispatch>(
    (action) => {
      const next = applyAction(latest.current, action, clock.now());
      if (next === latest.current) return false;
      latest.current = next;
      setBoard(next);
      storage.save(next);
      return true;
    },
    [storage, clock],
  );

  return [board, dispatch];
}
