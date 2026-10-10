/** The app's only source of new Task and Label ids. Injected at the top level, like the clock. */
export type NewId = () => string;

/** Random ids from the browser. */
export const randomId: NewId = () => crypto.randomUUID();
