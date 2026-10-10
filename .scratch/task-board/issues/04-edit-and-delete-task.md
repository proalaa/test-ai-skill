# 04: Edit and delete a Task in the modal

**Parent:** `.scratch/task-board/spec.md`

**What to build:** Clicking a Task opens a modal showing all its fields. The user edits the title, a multi-line plain-text description, Priority (None, Low, Medium, High, Urgent) and Due date (a calendar date with no time, which can be cleared). Every change saves automatically and updates Updated at; there is no Save/Cancel. Created at, Updated at and Completed at (when set) are shown read-only. If the title is cleared, it reverts to its previous value when the field loses focus or the modal closes. The modal keeps focus inside it and closes on Escape or its close button. A Delete action in the modal asks for confirmation: cancelling leaves the Task untouched; confirming permanently removes it, closes the modal and updates the Column count. There is no undo or archive.

**Blocked by:** 02 (Add a Task and keep it after reload)

**Status:** resolved

- [x] Clicking a Task opens its modal with every field; Escape and the close button close it; focus stays inside while open.
- [x] Title, description, Priority and Due date edits save immediately and survive a reload.
- [x] Updated at changes on every edit; timestamps are shown read-only, Completed at only when set.
- [x] A cleared title reverts to the previous value on blur and on close.
- [x] Delete asks for confirmation; cancel changes nothing; confirm removes the Task permanently, closes the modal and updates the count.
- [x] Board module tests cover field updates, Updated at, title revert and deletion; app-level Testing Library tests cover autosave, title revert, Escape and the delete confirmation; Playwright tests cover editing and deleting.

## Comments

**2026-10-10 (implement-spec):** Resolved on integration branch `task-board-phase-1`. Merged as ec7d248 (Merge ticket 04); review fixes in 927b86a. All Vitest, typecheck and Playwright suites pass at 927b86a.
