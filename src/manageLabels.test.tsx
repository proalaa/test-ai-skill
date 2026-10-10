// App-level tests for the Manage labels screen: listing, renaming, recoloring and deleting Labels.
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Board, Task } from './board/board';
import { createBoardStorage, memoryKeyValueStore } from './storage/boardStorage';
import { renderApp } from './test/renderApp';

type User = ReturnType<typeof renderApp>['user'];

function task(fields: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    description: '',
    status: 'todo',
    position: 0,
    priority: 'none',
    dueDate: null,
    labelIds: [],
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    completedAt: null,
    ...fields,
  };
}

/** Fix login carries Bug and UI, Fix logout (Done) carries Bug, Write docs carries nothing. Docs is unused. */
const board: Board = {
  labels: [
    { id: 'bug', name: 'Bug', color: '#0c66e4' },
    { id: 'ui', name: 'UI', color: '#1f845a' },
    { id: 'docs', name: 'Docs', color: '#b65c02' },
  ],
  tasks: [
    task({ id: 't1', title: 'Fix login', position: 0, labelIds: ['bug', 'ui'] }),
    task({ id: 't3', title: 'Write docs', position: 1 }),
    task({ id: 't2', title: 'Fix logout', status: 'done', labelIds: ['bug'], completedAt: '2026-10-02T08:00:00.000Z' }),
  ],
};

/** Renders the app over a Board that is already saved in storage. */
function renderAppWith(saved: Board) {
  const store = memoryKeyValueStore();
  createBoardStorage(store).save(saved);
  return renderApp({ store });
}

function manageLabels() {
  return screen.getByRole('dialog', { name: /manage labels/i });
}

async function openManageLabels(user: User) {
  await user.click(screen.getByRole('button', { name: /manage labels/i }));
  return manageLabels();
}

/** A Label's row on the Manage labels screen. */
function labelRow(name: string) {
  return within(manageLabels()).getByRole('listitem', { name });
}

/** The names of the Labels on the Manage labels screen, in order. */
function listedLabelNames() {
  return within(manageLabels())
    .getAllByRole('listitem')
    .map((row) => row.getAttribute('aria-label'));
}

/** The Label chips on a Task's card in the Column, as `[name, color]`. */
function chipsOnCard(title: string) {
  const card = screen
    .getAllByRole('listitem')
    .find((li) => li.querySelector('.task-title')?.textContent === title && !manageLabels().contains(li));
  if (!card) throw new Error(`No Task card for “${title}”`);
  return Array.from(card.querySelectorAll<HTMLElement>('.label-chip')).map((chip) => [chip.textContent, chip.style.backgroundColor]);
}

describe('Manage labels screen', () => {
  it('lists every Label on the Board, used or unused, with how many Tasks carry it', async () => {
    const { user } = renderAppWith(board);
    await openManageLabels(user);

    expect(listedLabelNames()).toEqual(['Bug', 'UI', 'Docs']);
    expect(labelRow('Bug')).toHaveTextContent(/used by 2 tasks/i);
    expect(labelRow('UI')).toHaveTextContent(/used by 1 task(?!s)/i);
    expect(labelRow('Docs')).toHaveTextContent(/not used/i);
  });

  it('renames a Label with Enter, and every Task carrying it shows the new name, also after a reload', async () => {
    const { user, store } = renderAppWith(board);
    await openManageLabels(user);

    const name = within(labelRow('Bug')).getByLabelText('Name');
    await user.clear(name);
    await user.type(name, 'Defect{Enter}');

    expect(listedLabelNames()).toEqual(['Defect', 'UI', 'Docs']);
    expect(chipsOnCard('Fix login').map(([n]) => n)).toEqual(['Defect', 'UI']);
    expect(chipsOnCard('Fix logout').map(([n]) => n)).toEqual(['Defect']);
    expect(createBoardStorage(store).load()?.labels.map((label) => label.name)).toEqual(['Defect', 'UI', 'Docs']);
  });

  it('renames a Label when its name field loses focus', async () => {
    const { user } = renderAppWith(board);
    await openManageLabels(user);

    const name = within(labelRow('UI')).getByLabelText('Name');
    await user.clear(name);
    await user.type(name, '  Frontend ');
    await user.tab();

    expect(listedLabelNames()).toEqual(['Bug', 'Frontend', 'Docs']);
    expect(within(labelRow('Frontend')).getByLabelText('Name')).toHaveValue('Frontend');
    expect(chipsOnCard('Fix login').map(([n]) => n)).toEqual(['Bug', 'Frontend']);
  });

  it('rejects a rename that clashes with another Label ignoring case, with a message, until the name is fixed', async () => {
    const { user, store } = renderAppWith(board);
    await openManageLabels(user);

    const name = within(labelRow('Bug')).getByLabelText('Name');
    await user.clear(name);
    await user.type(name, 'ui{Enter}');

    expect(within(labelRow('Bug')).getByRole('alert')).toHaveTextContent('There is already a Label named “UI”.');
    expect(name).toHaveAccessibleDescription('There is already a Label named “UI”.');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveValue('ui');
    expect(listedLabelNames()).toEqual(['Bug', 'UI', 'Docs']);
    expect(chipsOnCard('Fix login').map(([n]) => n)).toEqual(['Bug', 'UI']);
    expect(createBoardStorage(store).load()?.labels.map((label) => label.name)).toEqual(['Bug', 'UI', 'Docs']);

    await user.type(name, 'x{Enter}');
    expect(within(manageLabels()).queryByRole('alert')).not.toBeInTheDocument();
    expect(name).not.toHaveAttribute('aria-invalid', 'true');
    expect(listedLabelNames()).toEqual(['uix', 'UI', 'Docs']);
  });

  it('rejects a blank name with a message', async () => {
    const { user } = renderAppWith(board);
    await openManageLabels(user);

    const name = within(labelRow('Docs')).getByLabelText('Name');
    await user.clear(name);
    await user.tab();

    expect(within(labelRow('Docs')).getByRole('alert')).toHaveTextContent('A Label needs a name.');
    expect(listedLabelNames()).toEqual(['Bug', 'UI', 'Docs']);
  });

  it('offers the palette colors with the current one picked, and a new pick recolors the Label on every Task', async () => {
    const { user, store } = renderAppWith(board);
    await openManageLabels(user);

    const colors = within(labelRow('Bug')).getByRole('radiogroup', { name: 'Color' });
    expect(within(colors).getAllByRole('radio').map((radio) => radio.getAttribute('aria-label'))).toEqual([
      'Blue',
      'Green',
      'Orange',
      'Purple',
      'Red',
      'Teal',
      'Magenta',
      'Gray',
    ]);
    expect(within(colors).getByRole('radio', { name: 'Blue' })).toBeChecked();

    await user.click(within(colors).getByRole('radio', { name: 'Red' }));

    expect(within(colors).getByRole('radio', { name: 'Red' })).toBeChecked();
    expect(labelRow('Bug').querySelector('.label-chip')).toHaveStyle({ backgroundColor: '#c9372c' });
    expect(chipsOnCard('Fix login')).toEqual([
      ['Bug', 'rgb(201, 55, 44)'],
      ['UI', 'rgb(31, 132, 90)'],
    ]);
    expect(chipsOnCard('Fix logout')).toEqual([['Bug', 'rgb(201, 55, 44)']]);
    expect(createBoardStorage(store).load()?.labels[0]).toEqual({ id: 'bug', name: 'Bug', color: '#c9372c' });
  });

  describe('deleting a Label', () => {
    it('asks “Remove from 2 tasks?” for a Label two Tasks carry, and on confirm removes it everywhere', async () => {
      const { user, store } = renderAppWith(board);
      await openManageLabels(user);

      await user.click(within(labelRow('Bug')).getByRole('button', { name: 'Delete' }));
      const confirm = screen.getByRole('alertdialog', { name: 'Remove from 2 tasks?' });
      expect(confirm).toHaveAccessibleDescription(/“Bug”/);
      await user.click(within(confirm).getByRole('button', { name: 'Delete label' }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(listedLabelNames()).toEqual(['UI', 'Docs']);
      expect(chipsOnCard('Fix login').map(([n]) => n)).toEqual(['UI']);
      expect(chipsOnCard('Fix logout')).toEqual([]);
      const saved = createBoardStorage(store).load();
      expect(saved?.labels.map((label) => label.name)).toEqual(['UI', 'Docs']);
      expect(saved?.tasks.flatMap((t) => t.labelIds)).toEqual(['ui']);
      // Focus stays on the Manage labels screen.
      expect(manageLabels()).toContainElement(document.activeElement as HTMLElement);
    });

    it('says “Remove from 1 task?” for a Label one Task carries', async () => {
      const { user } = renderAppWith(board);
      await openManageLabels(user);

      await user.click(within(labelRow('UI')).getByRole('button', { name: 'Delete' }));
      expect(screen.getByRole('alertdialog', { name: 'Remove from 1 task?' })).toBeInTheDocument();
    });

    it('changes nothing when the confirmation is cancelled, by button or Escape', async () => {
      const { user, store } = renderAppWith(board);
      const savedBefore = store.getItem('task-board');
      await openManageLabels(user);

      await user.click(within(labelRow('Bug')).getByRole('button', { name: 'Delete' }));
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

      await user.click(within(labelRow('Bug')).getByRole('button', { name: 'Delete' }));
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      // Escape closed only the confirmation, not the Manage labels screen.
      expect(manageLabels()).toBeInTheDocument();

      expect(listedLabelNames()).toEqual(['Bug', 'UI', 'Docs']);
      expect(chipsOnCard('Fix login').map(([n]) => n)).toEqual(['Bug', 'UI']);
      expect(store.getItem('task-board')).toBe(savedBefore);
    });

    it('deletes an unused Label after a simple confirmation', async () => {
      const { user, store } = renderAppWith(board);
      await openManageLabels(user);

      await user.click(within(labelRow('Docs')).getByRole('button', { name: 'Delete' }));
      const confirm = screen.getByRole('alertdialog', { name: 'Delete the Label “Docs”?' });
      expect(confirm).toHaveAccessibleDescription(/no task carries it/i);
      await user.click(within(confirm).getByRole('button', { name: 'Delete label' }));

      expect(listedLabelNames()).toEqual(['Bug', 'UI']);
      expect(createBoardStorage(store).load()?.labels.map((label) => label.name)).toEqual(['Bug', 'UI']);
    });
  });

  it('shows a hint when the Board has no Labels, and closes with the Close button or Escape', async () => {
    const { user } = renderAppWith({ labels: [], tasks: [] });
    await openManageLabels(user);
    expect(manageLabels()).toHaveTextContent(/no labels yet/i);

    await user.click(within(manageLabels()).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await openManageLabels(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manage labels/i })).toHaveFocus();
  });
});
