import type { NewId } from '../ids';

/** Ids `id-1`, `id-2`, … in order. */
export function sequentialIds(prefix = 'id'): NewId {
  let count = 0;
  return () => `${prefix}-${++count}`;
}
