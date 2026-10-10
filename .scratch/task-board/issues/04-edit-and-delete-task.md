# 04: Edit and delete a Task in the modal

**Parent:** `.scratch/task-board/spec.md`

**What to build:** Clicking a Task opens a modal showing all its fields. The user edits the title, a multi-line plain-text description, Priority (None, Low, Medium, High, Urgent) and Due date (a calendar date with no time, which can be cleared). Every change saves automatically and updates Updated at; there is no Save/Cancel. Created at, Updated at and Completed at (when set) are shown read-only. If the title is cleared, it reverts to its previous value when the field loses focus or the modal closes. The modal keeps focus inside it and closes on Escape or its close button. A Delete action in the modal asks for confirmation: cancelling leaves the Task untouched; confirming permanently removes it, closes the modal and updates the Column count. There is no undo or archive.

**Blocked by:** 02 (Add a Task and keep it after reload)

**Status:** ready-for-agent

- [ ] Clicking a Task opens its modal with every field; Escape and the close button close it; focus stays inside while open.
- [ ] Title, description, Priority and Due date edits save immediately and survive a reload.
- [ ] Updated at changes on every edit; timestamps are shown read-only, Completed at only when set.
- [ ] A cleared title reverts to the previous value on blur and on close.
- [ ] Delete asks for confirmation; cancel changes nothing; confirm removes the Task permanently, closes the modal and updates the count.
- [ ] Board module tests cover field updates, Updated at, title revert and deletion; app-level Testing Library tests cover autosave, title revert, Escape and the delete confirmation; Playwright tests cover editing and deleting.

## Comments
