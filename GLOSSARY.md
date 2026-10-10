# Task Board

A personal kanban app where one person tracks their tasks by moving them across a board.

## Language

### Board and layout

**Board**:
A collection of tasks laid out as columns, one per status. There is a single board for now.
_Avoid_: Project, workspace

**Status**:
Where a task is in its progress. The set is fixed: To Do, In Progress, Done. A task can move from any status to any other.
_Avoid_: State, stage

**Column**:
The vertical lane on a board that shows every task with one particular status, in a manual order the user sets.
_Avoid_: Lane, list, swimlane

### Tasks

**Task**:
A unit of work on a board. It always has exactly one status and a position within that status's column.
_Avoid_: Card, ticket, issue, item, todo

**Priority**:
How urgent a task is: None, Low, Medium, High or Urgent. It is independent of the task's position in its column.
_Avoid_: Severity, importance

**Due date**:
The calendar day a task should be finished by. It has no time of day.
_Avoid_: Deadline

**Overdue**:
Describes a task whose due date has passed and whose status is not Done.
_Avoid_: Late, expired

**Label**:
A named, colored tag that belongs to a board and can be attached to any number of its tasks. No two labels on a board share a name, ignoring case.
_Avoid_: Tag, category

**Custom Field**:
A field the user defines on a board (text, number, date, checkbox or single-select) that every task on that board can hold a value for.
_Avoid_: Property, attribute, metadata
