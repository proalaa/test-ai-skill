// Thin storage adapter: loads and saves the Board as the same versioned format
// used for export. Its one rule: stored text that can't be read is copied
// aside before anything else, so a later save never destroys it.
import { exportBoard, importBoard, type Board } from '../board/board';

export const STORAGE_KEY = 'task-board';

/** Where stored text that could not be read is kept, untouched. */
export const UNREADABLE_BACKUP_KEY = 'task-board-unreadable';

/** The subset of the Web Storage API the adapter needs (localStorage fits). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** What `load` found: nothing yet, a Board, or stored text that is not a valid Board. */
export type LoadResult =
  | { status: 'empty' }
  | { status: 'loaded'; board: Board }
  | { status: 'unreadable'; error: string };

export interface BoardStorage {
  /** The saved Board. Unreadable text is first copied to UNREADABLE_BACKUP_KEY. */
  load(): LoadResult;
  save(board: Board): void;
}

export function createBoardStorage(store: KeyValueStore): BoardStorage {
  return {
    load() {
      const text = store.getItem(STORAGE_KEY);
      if (text === null) return { status: 'empty' };
      const result = importBoard(text);
      if (result.ok) return { status: 'loaded', board: result.board };
      store.setItem(UNREADABLE_BACKUP_KEY, text);
      return { status: 'unreadable', error: result.error };
    },
    save(board) {
      store.setItem(STORAGE_KEY, exportBoard(board));
    },
  };
}
