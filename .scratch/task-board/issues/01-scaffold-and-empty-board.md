# 01: Scaffold the app and show the empty Board

**Parent:** `.scratch/task-board/spec.md`

**What to build:** Opening the app shows one empty Board with three Columns — To Do, In Progress, Done — in that fixed order, each header showing a count of 0, and a short hint in To Do explaining how to add a Task. The theme follows the operating system's light/dark setting, and on a narrow window the Columns scroll sideways.

Behind that, this ticket lays the foundations every later ticket builds on:
- The project and its test tooling: React + TypeScript on Vite, Vitest + Testing Library, Playwright, all runnable from scripts.
- The Board module with the **complete Phase 1 data model** (Task with every Phase 1 field, Labels on the Board) and the versioned data format (version 1), even though most fields aren't used by the UI yet.
- The thin localStorage storage adapter, and the app's top level receiving storage and a clock, so tests can inject in-memory storage and a fixed clock. On first launch (nothing stored) the app starts from an empty Board; no sample Tasks.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The dev server, the Vitest suite and the Playwright suite all run from a clean checkout via scripts.
- [ ] The app shows To Do, In Progress, Done in that order, each with a count of 0.
- [ ] The empty-board hint appears in To Do when the Board has no Tasks.
- [ ] No sample Tasks exist on first launch.
- [ ] The theme switches with the OS (or emulated) color-scheme preference.
- [ ] On a narrow viewport the Columns scroll horizontally rather than squashing.
- [ ] The Board module's data model covers every Phase 1 field, and stored data carries data-format version 1.
- [ ] The app's top level takes storage and a clock; nothing below it reads localStorage or the system time directly.
- [ ] A Testing Library test renders the whole app (in-memory storage, fixed clock) and sees the three Columns and the hint; a Playwright smoke test sees the same in a real browser.

## Comments
