# 03: Move Tasks between and within Columns

**Parent:** `.scratch/task-board/spec.md`

**What to build:** The user drags a Task to another Column to change its Status, or up and down within its Column to reorder it; the Task lands exactly where it's dropped. The same moves work with the keyboard alone (pick up, move, drop), using dnd-kit's pointer and keyboard sensors so both go through one path. Any Status can move to any other. Moving a Task into Done records Completed at; moving it out clears it; moving it into Done again records a new time. Counts update immediately and the new order survives a reload.

**Blocked by:** 02 (Add a Task and keep it after reload)

**Status:** resolved

- [x] Dragging moves a Task across Columns and reorders it within a Column, landing at the drop position.
- [x] Keyboard alone can pick up, move and drop a Task within and across Columns.
- [x] A Task can move from any Status to any other, including Done back to To Do.
- [x] Completed at is set on entering Done, cleared on leaving, and set fresh on re-entering.
- [x] Column counts update after every move; order and Status survive a reload.
- [x] Board module tests cover moves, positions and Completed at; app-level Testing Library tests drive moves via the keyboard; Playwright tests cover drag across Columns and reorder within a Column.

## Comments

**2026-10-10 (implement-spec):** Resolved on integration branch `task-board-phase-1`. Merged as 0c8d17e (Merge ticket 03); review fixes in 927b86a. All Vitest, typecheck and Playwright suites pass at 927b86a.
