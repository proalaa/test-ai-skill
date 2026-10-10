import type { Clock } from '../clock';

/** A clock frozen at the given instant (ISO 8601 string or Date). */
export function fixedClock(at: string | Date): Clock {
  const time = new Date(at).getTime();
  return { now: () => new Date(time) };
}

/** A clock that stays put until the test moves it with `set`. */
export function manualClock(at: string): Clock & { set(at: string): void } {
  let time = new Date(at).getTime();
  return {
    now: () => new Date(time),
    set: (next) => {
      time = new Date(next).getTime();
    },
  };
}
