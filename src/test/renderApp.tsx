import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { fixedClock, type Clock } from '../clock';
import { createBoardStorage, memoryKeyValueStore, type KeyValueStore } from '../storage/boardStorage';

export const DEFAULT_NOW = '2026-10-10T09:00:00.000Z';

interface RenderAppOptions {
  /** Backing key/value store; pass the same one to a second render to simulate a reload. */
  store?: KeyValueStore;
  clock?: Clock;
}

/**
 * Renders the whole app the way a user sees it, with in-memory storage and a
 * fixed clock. Returns the Testing Library queries plus a `user` for driving it.
 */
export function renderApp({ store = memoryKeyValueStore(), clock = fixedClock(DEFAULT_NOW) }: RenderAppOptions = {}) {
  const storage = createBoardStorage(store);
  const user = userEvent.setup();
  const result = render(<App storage={storage} clock={clock} />);
  return { ...result, user, store, storage, clock };
}
