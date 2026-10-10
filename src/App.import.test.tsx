import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { exportBoard, type Board } from './board/board';
import { createBoardStorage, memoryKeyValueStore } from './storage/boardStorage';
import { taskTitles } from './test/queries';
import { renderApp } from './test/renderApp';

function task(id: string, title: string, status: Board['tasks'][number]['status'], position: number) {
  return {
    id,
    title,
    description: '',
    status,
    position,
    priority: 'none' as const,
    dueDate: null,
    labelIds: [],
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    completedAt: null,
  };
}

/** The Board the user already has before importing. */
const currentBoard: Board = {
  tasks: [task('c1', 'Current A', 'todo', 0), task('c2', 'Current B', 'in-progress', 0)],
  labels: [],
};

/** The Board inside the file being imported. */
const backupBoard: Board = {
  tasks: [
    { ...task('b1', 'Restored one', 'done', 0), completedAt: '2026-10-02T08:00:00.000Z', labelIds: ['l1'] },
    task('b2', 'Restored two', 'todo', 0),
  ],
  labels: [{ id: 'l1', name: 'Backup', color: '#0366d6' }],
};

/** Renders the app with `currentBoard` already saved. */
function renderWithCurrentBoard() {
  const store = memoryKeyValueStore();
  createBoardStorage(store).save(currentBoard);
  return renderApp({ store });
}

function jsonFile(text: string, name = 'backup.json') {
  return new File([text], name, { type: 'application/json' });
}

describe('Importing a Board', () => {
  it('asks for confirmation, then replaces the whole Board and saves it', async () => {
    const { user, storage } = renderWithCurrentBoard();

    await user.upload(screen.getByLabelText(/import/i), jsonFile(exportBoard(backupBoard)));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent(/replace/i);
    expect(taskTitles('To Do')).toEqual(['Current A']);

    await user.click(within(dialog).getByRole('button', { name: /replace/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(taskTitles('To Do')).toEqual(['Restored two']);
    expect(taskTitles('In Progress')).toEqual([]);
    expect(taskTitles('Done')).toEqual(['Restored one']);
    expect(storage.load()).toEqual(backupBoard);
  });

  it.each([
    ['the Cancel button', '{Cancel}'],
    ['Escape', '{Escape}'],
  ])('changes nothing when cancelled with %s', async (_, how) => {
    const { user, storage } = renderWithCurrentBoard();

    await user.upload(screen.getByLabelText(/import/i), jsonFile(exportBoard(backupBoard)));
    const dialog = await screen.findByRole('alertdialog');
    if (how === '{Cancel}') await user.click(within(dialog).getByRole('button', { name: /cancel/i }));
    else await user.keyboard(how);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(taskTitles('To Do')).toEqual(['Current A']);
    expect(taskTitles('In Progress')).toEqual(['Current B']);
    expect(taskTitles('Done')).toEqual([]);
    expect(storage.load()).toEqual(currentBoard);
  });

  it.each([
    ['unreadable JSON', '{"version": 1, "board": {', /not valid JSON/i],
    ['the wrong shape', JSON.stringify({ version: 1, board: { tasks: 'none' } }), /tasks/i],
    ['an unknown version', JSON.stringify({ version: 2, board: backupBoard }), /version/i],
  ])('shows an error and leaves the Board unchanged for a file with %s', async (_, text, reason) => {
    const { user, storage } = renderWithCurrentBoard();

    await user.upload(screen.getByLabelText(/import/i), jsonFile(text, 'broken.json'));

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent(/broken\.json/);
    expect(error).toHaveTextContent(reason);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(taskTitles('To Do')).toEqual(['Current A']);
    expect(taskTitles('In Progress')).toEqual(['Current B']);
    expect(storage.load()).toEqual(currentBoard);
  });

  it('clears the error once a valid file is imported', async () => {
    const { user } = renderWithCurrentBoard();

    await user.upload(screen.getByLabelText(/import/i), jsonFile('not json', 'broken.json'));
    await screen.findByRole('alert');
    await user.upload(screen.getByLabelText(/import/i), jsonFile(exportBoard(backupBoard)));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /replace/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(taskTitles('To Do')).toEqual(['Restored two']);
  });
});
