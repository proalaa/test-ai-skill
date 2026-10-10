# 08: Export and import the Board

**Parent:** `.scratch/task-board/spec.md`

**What to build:** The user can export the whole Board — every Task with all its fields, positions and timestamps, plus all Labels — as a JSON file carrying the data-format version. They can import such a file back: after a confirmation, it replaces the whole current Board (no merging). If the file isn't a valid export — unreadable JSON, the wrong shape, or an unknown version — an error is shown and the current Board is left unchanged.

**Blocked by:** 02 (Add a Task and keep it after reload)

**Status:** ready-for-agent

- [ ] Export downloads a JSON file containing the data-format version and the whole Board.
- [ ] Exporting then importing gives back an identical Board, including fields and Labels not yet editable in the UI.
- [ ] Import asks for confirmation; cancelling changes nothing; confirming replaces the whole Board.
- [ ] Bad JSON, a wrong shape, or an unknown version shows an error and leaves the Board unchanged.
- [ ] Board module tests cover the round trip and every rejection case; app-level Testing Library tests cover the confirmation and the error; a Playwright test covers export followed by import.

## Comments
