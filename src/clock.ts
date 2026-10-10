/** The app's only source of the current time. Injected at the top level. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

/** A clock frozen at the given instant (ISO 8601 string or Date). For tests. */
export function fixedClock(at: string | Date): Clock {
  const time = new Date(at).getTime();
  return { now: () => new Date(time) };
}
