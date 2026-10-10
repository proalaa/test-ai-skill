import type { KeyValueStore } from '../storage/boardStorage';

/** An in-memory KeyValueStore, standing in for localStorage. */
export function memoryKeyValueStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}
