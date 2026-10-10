# Spec: Task Board — Phase 1

Status: ready-for-agent

Domain terms (Board, Status, Column, Task, Priority, Due date, Overdue, Label, Custom Field) are used exactly as defined in `GLOSSARY.md`.

## Problem Statement

I want a simple place to keep track of my own work. Today there is nothing: tasks live in my head or scattered notes, and I can't see at a glance what's waiting, what I'm working on, and what's finished. I want to add tasks quickly, move them through To Do, In Progress and Done, and arrange them in the order I care about, without signing up for anything or running a server. Because it will only live in my browser, I also need a way to back it up so I don't lose everything if the browser data is cleared.

This project is also a test bed for the spec → tickets → TDD → review workflow, so it should be small enough to finish while being built properly enough to grow into something I use day to day.

## Solution

A single-user kanban web app that runs entirely in the browser. It shows one Board with three fixed Columns: To Do, In Progress and Done. I add a Task by typing a title at the bottom of any Column, then drag it (or move it with the keyboard) between Columns and up or down within one. Clicking a Task opens a modal where I edit its description, Priority, Due date and Labels; changes save as I make them. The Board highlights Overdue Tasks, shows a count in each Column header, and follows my system's light or dark theme. Everything is stored in the browser, and I can export the whole Board to a JSON file and import it back.

Later phases add Custom Fields (Phase 2) and search and filters (Phase 3); they are outlined under Further Notes and are not part of this spec's delivery.

## User Stories

### Board

1. As a user, I want to see one Board with three Columns — To Do, In Progress, Done — so that I can see the state of all my work at a glance.
2. As a user, I want the Columns always in that fixed order, so that the Board reads left to right as progress.
3. As a user, I want each Column header to show how many Tasks it holds, so that I can see how much is waiting or in progress without counting.
4. As a first-time user, I want an empty Board with a short hint in To Do explaining how to add a Task, so that I know where to start.
5. As a first-time user, I want no sample Tasks, so that example content never gets mixed up with my real work.
6. As a user, I want the hint to disappear once I have Tasks, so that it doesn't clutter my Board.

### Adding Tasks

7. As a user, I want an "+ Add task" input at the bottom of every Column, so that I can create a Task directly in the Status it belongs to.
8. As a user, I want to type a title and press Enter to create a Task, so that capturing work takes seconds.
9. As a user, I want a new Task to appear at the bottom of its Column, so that it doesn't disturb the order I've already set.
10. As a user, I want pressing Enter with an empty or whitespace-only input to do nothing, so that I never create blank Tasks by accident.
11. As a user, I want a new Task to start with Priority None, no Due date, no description and no Labels, so that quick add stays quick.
12. As a user, I want the input to stay ready after adding a Task, so that I can add several Tasks in a row.

### Moving Tasks

13. As a user, I want to drag a Task to another Column, so that I can change its Status.
14. As a user, I want to drag a Task up or down within its Column, so that I can put the most important work at the top.
15. As a user, I want a dragged Task to land exactly where I drop it, so that I control its position in the target Column.
16. As a user, I want to move a Task from any Status to any other, including from Done back to To Do, so that the Board fits how I actually work.
17. As a keyboard user, I want to pick up, move and drop a Task using only the keyboard, both within and across Columns, so that I don't need a mouse.
18. As a user, I want Column counts to update immediately after a move, so that they're always accurate.
19. As a user, I want a Task's Completed at to be recorded when I move it into Done, so that I know when it was finished.
20. As a user, I want Completed at to be cleared when I move a Task out of Done, so that reopened work isn't shown as finished.
21. As a user, I want a fresh Completed at when a Task moves into Done again, so that it reflects the latest completion.

### Viewing a Task in its Column

22. As a user, I want to see each Task's title in its Column, so that I can recognise it.
23. As a user, I want a Priority badge on Tasks whose Priority isn't None, so that urgent work stands out.
24. As a user, I want no badge on Tasks with Priority None, so that the Board isn't noisy.
25. As a user, I want to see a Task's Due date in its Column, so that I know what's coming up.
26. As a user, I want the Due date shown in red when the Task is Overdue, so that late work catches my eye.
27. As a user, I want a Task due today not to be shown as Overdue, so that "due today" isn't treated as late.
28. As a user, I want a Task in Done never to be shown as Overdue, so that finished work doesn't nag me.
29. As a user, I want "today" to be my computer's local date, so that Overdue matches my calendar.
30. As a user, I want a Task's Labels shown as colored chips, so that I can spot related work.
31. As a user, I want a small icon on Tasks that have a description, so that I know there's more detail inside.
32. As a user, I want timestamps kept out of the Column view, so that the Board stays compact.

### Editing a Task

33. As a user, I want to click a Task to open a modal showing all its fields, so that I can see and change everything about it in one place.
34. As a user, I want to edit the title, description, Priority and Due date in the modal, so that I can refine a Task after quick-adding it.
35. As a user, I want the description to be multi-line plain text, so that I can write notes without learning a syntax.
36. As a user, I want to choose Priority from None, Low, Medium, High and Urgent, so that I can mark how urgent a Task is.
37. As a user, I want to set or clear a Due date as a calendar date with no time, so that deadlines stay simple.
38. As a user, I want every change to save automatically as I make it, so that I never lose edits by forgetting to press Save.
39. As a user, I want to see Created at, Updated at and Completed at (when set) in the modal, so that I can check a Task's history.
40. As a user, I want Updated at to change whenever I change a Task, so that it reflects the latest edit.
41. As a user, I want a cleared title to revert to its previous value when I leave the field or close the modal, so that a Task can never be untitled.
42. As a keyboard user, I want to close the modal with Escape and keep focus inside it while it's open, so that it's usable without a mouse.

### Deleting a Task

43. As a user, I want a Delete action inside the modal, so that I can remove Tasks I no longer need.
44. As a user, I want to confirm before a Task is deleted, so that I don't delete one by accident.
45. As a user, I want cancelling the confirmation to leave the Task untouched, so that backing out is safe.
46. As a user, I want a confirmed deletion to be permanent and to close the modal, so that the Task is gone and I'm back on the Board.

### Labels

47. As a user, I want to attach Labels to a Task by typing in the modal, so that I can group related work.
48. As a user, I want typing a new name to create a Label with an automatically assigned color, so that tagging is fast.
49. As a user, I want typing an existing name in any case ("bug" when "Bug" exists) to reuse the existing Label, so that I don't end up with duplicates.
50. As a user, I want to remove a Label from a Task in the modal, so that I can correct mistakes.
51. As a user, I want a Label to stay on the Board after I remove it from its last Task, so that I can reuse it later.
52. As a user, I want a "Manage labels" screen listing every Label, so that I can tidy them in one place.
53. As a user, I want to rename a Label and have the new name appear on every Task that carries it, so that I can fix names globally.
54. As a user, I want a rename that clashes with another Label's name (ignoring case) to be rejected with a message, so that names stay unique.
55. As a user, I want to change a Label's color and see it update everywhere, so that I can make Labels easy to tell apart.
56. As a user, I want deleting a Label that's in use to tell me how many Tasks it will be removed from ("Remove from 7 tasks?"), so that I understand the impact.
57. As a user, I want confirming that deletion to remove the Label from every Task, so that no Task is left pointing at a deleted Label.
58. As a user, I want to delete an unused Label after a simple confirmation, so that I can clean up.

### Persistence, export and import

59. As a user, I want my Board saved in the browser automatically, so that it's still there when I reload or come back later.
60. As a user, I want positions, Statuses, every field and all Labels preserved across reloads, so that nothing shifts unexpectedly.
61. As a user, I want to export my whole Board to a JSON file, so that I have a backup in case browser data is cleared.
62. As a user, I want to import a previously exported file, so that I can restore my Board.
63. As a user, I want import to ask for confirmation before replacing my current Board, so that I don't overwrite it by accident.
64. As a user, I want import to replace the Board entirely rather than merge, so that the result is exactly what I backed up.
65. As a user, I want an invalid or unrecognised file to be rejected with an error and my Board left unchanged, so that a bad file can't corrupt my data.
66. As a future user of later phases, I want exported files to record their data-format version, so that newer versions of the app can still read my old backups.

### Look and layout

67. As a user, I want the theme to follow my system's light or dark setting, so that the app matches my environment.
68. As a desktop user, I want the Board laid out for a wide screen, so that all three Columns are visible side by side.
69. As a user on a narrow window, I want the Columns to scroll sideways instead of squashing, so that Tasks stay readable.

## Implementation Decisions

### Stack

- React + TypeScript, built with Vite.
- dnd-kit for drag and drop, using both its pointer and keyboard sensors so pointer and keyboard moves go through the same path.
- Vitest + Testing Library for fast tests; Playwright for a small set of real-browser tests.

### Modules

**Board module (the domain core)**
- A plain TypeScript module with no React and no storage access. It holds every rule the app has.
- Its interface is: given the current Board, an action, and the current time, return the new Board. Actions: add Task, move Task (target Status and position), update Task fields, delete Task, attach Label to Task (by name, creating or reusing case-insensitively), detach Label from Task, rename Label, recolor Label, delete Label.
- Queries it answers: Tasks of a Status in order; whether a Task is Overdue on a given local date; how many Tasks carry a given Label.
- Export: Board → versioned JSON text. Import: text → either a Board or a validation error describing why the file was rejected.
- Time is always passed in, never read from the system, so behaviour is deterministic under test.
- Rules owned here:
  - New Tasks go to the bottom of their Column with Priority None and Created at / Updated at set to now.
  - Empty or whitespace-only titles are rejected; an update that would empty a title keeps the previous title.
  - Moving into Done sets Completed at; moving out clears it; moving in again sets a new value.
  - Any change to a Task updates its Updated at.
  - Overdue means the Due date is before the given local date and the Status is not Done.
  - Label names are unique on the Board ignoring case; renames that would clash are rejected.
  - Deleting a Label removes it from every Task.
  - New Labels get an automatically assigned color from a fixed palette.

**Storage adapter**
- A thin wrapper that loads and saves the Board to localStorage as the same versioned format used for export. No logic of its own.
- Injected into the app at the top level, so tests can supply in-memory storage instead.

**App (UI)**
- Renders the Board, Columns, Tasks, the task modal, the Manage labels screen, and export/import controls.
- Dispatches actions to the Board module and persists the result through the storage adapter after every change (autosave).
- Receives storage and a clock at its top level; nothing below reads localStorage or the system time directly.

### Data model

- Board: an ordered set of Tasks per Status, plus its Labels.
- Task: id, title, description, Status, position within its Column, Priority (None | Low | Medium | High | Urgent), Due date (local calendar date or none), Label ids, Created at, Updated at, Completed at (or none).
- Label: id, name, color.
- Stored data and exports share one format with an explicit data-format version, starting at 1. Import rejects unknown versions.

### Interactions

- Quick add at the bottom of each Column; Enter creates, empty input does nothing, the input stays focused for the next Task.
- Clicking a Task opens a modal; the modal traps focus and closes on Escape or its close button.
- Title is checked when the title field loses focus and when the modal closes; an empty title reverts.
- Delete lives in the modal and requires confirmation. There is no undo and no archive.
- Import requires confirmation and replaces the whole Board.
- Theme follows the operating system's color-scheme preference. Layout is desktop first; Columns scroll horizontally on narrow screens.

### Architecture notes

- Browser-only storage was chosen deliberately for this phase; there is no backend. Export/import is the protection against data loss.
- The data model keeps Status as a field on each Task and Labels on the Board, so that multiple Boards and Custom Fields can be added later without restructuring Tasks.

## Testing Decisions

### What makes a good test

- Tests check behaviour a user (or a caller of the module) can see, through the module's public interface. They never reach into internal state, private helpers, or component internals.
- Tests use the domain language from `GLOSSARY.md` in their names.
- Time is fixed in every test that depends on it.
- A test should survive a refactor that doesn't change behaviour.

### Seams

There are two test seams.

**Seam 1: the Board module** (Vitest unit tests). Most tests live here. They cover every rule listed under the Board module:
- Adding: bottom placement, defaults, rejecting empty titles.
- Moves: across Columns, reordering within a Column, landing at the given position, positions staying consistent.
- Completed at: set, cleared, and set again.
- Overdue: past date, due today, Done Tasks, no Due date.
- Title revert on an empty update.
- Updated at changing on every change.
- Labels: create, reuse ignoring case, rename clash, recolor, delete-from-all-Tasks, unused Labels remaining.
- Export → import round trip giving an identical Board; rejection of bad JSON, wrong shape and unknown version.

**Seam 2: the whole app, rendered at the top level**, with in-memory storage and a fixed clock injected. No per-component tests; the app is always driven as a user would drive it. Two harnesses:
- **Testing Library (Vitest, jsdom)**, for most UI behaviour:
  - the empty-board hint
  - quick add and empty-input handling
  - Column counts
  - keyboard moves within and across Columns
  - what a Task shows in its Column (Priority badge, Overdue Due date, Label chips, description icon)
  - modal autosave and title revert
  - Escape closing the modal
  - delete confirmation and cancel
  - the Manage labels screen, including the "Remove from N tasks?" count
  - import confirmation and the error message on an invalid file
- **Playwright (real browser)**, a handful of key flows:
  - add a Task and reload (this also covers the storage adapter)
  - drag across Columns
  - reorder within a Column
  - edit in the modal
  - delete
  - export followed by import

### Prior art

None. The repo has no code yet. The first ticket sets up the test tooling and establishes the patterns the rest follow.

## Out of Scope

- Accounts, login, sync, sharing, or any backend.
- Multiple Boards.
- Custom Columns separate from the fixed Statuses, and WIP limits.
- Custom Fields (Phase 2).
- Search and filters (Phase 3).
- Checklists or subtasks, estimates, Markdown descriptions.
- Archiving, undo, and merging on import.
- Touch-optimised drag and drop or mobile-specific layouts.
- Sample or seed Tasks.

## Further Notes

- **Phase 2: Custom Fields.** Defined per Board; every Task on that Board can hold a value for each one (values may be empty). Types: text, number, date, checkbox, single-select. Open decisions:
  - What happens to existing values when a Custom Field is deleted, renamed, or changes type?
  - What happens when a single-select option is removed?
  - Are Custom Fields shown on the Task in its Column, or only in the modal?
  - How do version-1 exports migrate?
- **Phase 3: Search and filters.** Text search over title and description, plus filters by Label, Priority and Overdue. Open decisions:
  - How do filters combine?
  - Are filtered-out Tasks hidden or dimmed?
  - Can Tasks be dragged while a filter is active, and how is position handled for hidden Tasks?
  - Do filters include Custom Fields?
- **Later, unscheduled:** multiple Boards; custom Columns.
- Small calls made during spec writing, not discussed explicitly:
  - an invalid import leaves the Board unchanged
  - a clashing Label rename is rejected
  - an unused Label is deleted after a simple confirmation
  - the quick-add input keeps focus after adding

## Comments
