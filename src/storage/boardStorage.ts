// Thin storage adapter: loads and saves the Board as the same versioned format
// used for export. No logic of its own.
import { exportBoard, importBoard, type Board } from '../board/board';

export const STORAGE_KEY = 'task-board';

/** The subset of the Web Storage API the adapter needs (localStorage fits). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface BoardStorage {
  /** The saved Board, or null when nothing (usable) is stored. */
  load(): Board | null;
  save(board: Board): void;
}

export function createBoardStorage(store: KeyValueStore): BoardStorage {
  return {
    load() {
      const text = store.getItem(STORAGE_KEY);
      if (text === null) return null;
      const result = importBoard(text);
      return result.ok ? result.board : null;
    },
    save(board) {
      store.setItem(STORAGE_KEY, exportBoard(board));
    },
  };
}

/** An in-memory KeyValueStore, for tests. */
export function memoryKeyValueStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}
