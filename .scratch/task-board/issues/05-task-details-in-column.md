# 05: Show Priority, Due date and description on the Task in its Column

**Parent:** `.scratch/task-board/spec.md`

**What to build:** On the Board, each Task shows more than its title: a Priority badge (hidden when Priority is None), its Due date, and a small icon when it has a description. The Due date is shown in red when the Task is Overdue — its Due date is before today (the user's local date) and its Status is not Done. A Task due today is not Overdue, and a Task in Done never is. Timestamps stay out of the Column view.

**Blocked by:** 04 (Edit and delete a Task in the modal)

**Status:** resolved

- [x] A Priority badge shows for Low, Medium, High and Urgent, and not for None.
- [x] The Due date shows on the Task, in red only when the Task is Overdue.
- [x] A Task due today is not shown as Overdue; a Task in Done is never shown as Overdue.
- [x] The description icon shows only when the description is non-empty.
- [x] Board module tests cover the Overdue rule (past date, today, Done, no Due date) with a fixed clock; app-level Testing Library tests cover what the Task shows in its Column.

## Comments

**2026-10-10 (implement-spec):** Resolved on integration branch `task-board-phase-1`. Merged as 14ededd (Merge ticket 05); review fixes in 927b86a. All Vitest, typecheck and Playwright suites pass at 927b86a.
