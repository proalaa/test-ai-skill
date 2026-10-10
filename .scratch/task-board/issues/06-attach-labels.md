# 06: Attach Labels to Tasks

**Parent:** `.scratch/task-board/spec.md`

**What to build:** In the task modal the user attaches Labels by typing a name. A name that matches no existing Label creates one with an automatically assigned color from a fixed palette; a name matching an existing Label ignoring case ("bug" when "Bug" exists) attaches the existing one, so no duplicates appear. The user can remove a Label from a Task; the Label stays on the Board even when no Task uses it. On the Board, each Task shows its Labels as colored chips. Labels and their attachments persist across reloads.

**Blocked by:** 04 (Edit and delete a Task in the modal)

**Status:** ready-for-agent

- [ ] Typing a new name creates a Label with an automatic color and attaches it.
- [ ] Typing an existing name in any case attaches the existing Label; no duplicate is created.
- [ ] Removing a Label from a Task works, and removing it from its last Task keeps it available for reuse.
- [ ] Label chips with their colors show on the Task in its Column.
- [ ] Labels and attachments survive a reload.
- [ ] Board module tests cover create, case-insensitive reuse, detach and color assignment; app-level Testing Library tests cover attaching and the chips.

## Comments
