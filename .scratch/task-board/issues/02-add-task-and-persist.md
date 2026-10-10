# 02: Add a Task and keep it after reload

**Parent:** `.scratch/task-board/spec.md`

**What to build:** Every Column has an "+ Add task" input at its bottom. Typing a title and pressing Enter creates a Task in that Column, at the bottom, with Priority None, no Due date, no description and no Labels, and Created at / Updated at set to now. Pressing Enter with an empty or whitespace-only input does nothing. The input keeps focus so several Tasks can be added in a row. Column counts update, the empty-board hint disappears once any Task exists, and the Board is saved automatically so Tasks are still there, in the same Columns and order, after a reload.

**Blocked by:** 01 (Scaffold the app and show the empty Board)

**Status:** ready-for-agent

- [ ] Adding a Task in any Column places it at the bottom of that Column with the default field values.
- [ ] Created at and Updated at come from the injected clock.
- [ ] Enter on an empty or whitespace-only input creates nothing.
- [ ] The input keeps focus after a Task is added.
- [ ] Column counts reflect the number of Tasks; the hint disappears once a Task exists.
- [ ] After a reload the same Tasks appear in the same Columns and order.
- [ ] Board module tests cover add rules (placement, defaults, empty-title rejection); app-level Testing Library tests cover quick add; a Playwright test covers add then reload.

## Comments
