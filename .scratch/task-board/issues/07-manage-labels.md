# 07: Manage labels screen

**Parent:** `.scratch/task-board/spec.md`

**What to build:** A "Manage labels" screen lists every Label on the Board, including unused ones. From it the user can rename a Label (the new name shows on every Task carrying it; a name that clashes with another Label ignoring case is rejected with a message), change its color (updated everywhere), or delete it. Deleting a Label in use asks "Remove from N tasks?" with the correct count and, on confirmation, removes it from every Task; an unused Label is deleted after a simple confirmation.

**Blocked by:** 06 (Attach Labels to Tasks)

**Status:** resolved

- [x] Every Label, used or unused, is listed.
- [x] Renaming updates the name on every Task carrying the Label.
- [x] A rename that clashes with another Label (ignoring case) is rejected with a message.
- [x] Changing a color updates it on every Task.
- [x] Deleting a used Label shows "Remove from N tasks?" with the right N and removes it everywhere on confirm; cancel changes nothing.
- [x] An unused Label is deleted after a simple confirmation.
- [x] Board module tests cover rename uniqueness, recolor, usage count and delete-from-all-Tasks; app-level Testing Library tests cover the screen and the confirmation count.

## Comments

**2026-10-10 (implement-spec):** Resolved on integration branch `task-board-phase-1`. Merged as 9dba772 (Merge ticket 07); review fixes in 927b86a. All Vitest, typecheck and Playwright suites pass at 927b86a.
