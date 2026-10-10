// App-level tests for the task modal: editing and deleting a Task.
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Board } from './board/board';
import { task } from './test/boards';
import { manualClock } from './test/clocks';
import { column, openTask, taskModal as modal, taskTitles } from './test/queries';
import { renderApp, renderAppWith, type User } from './test/renderApp';

describe('Opening a Task', () => {
  it('shows every field of the clicked Task in a modal', async () => {
    const { user } = renderAppWith({
      labels: [],
      tasks: [
        task({
          id: 't1',
          title: 'Write spec',
          description: 'Line one\nLine two',
          priority: 'high',
          dueDate: '2026-10-20',
        }),
      ],
    });

    const dialog = await openTask(user, 'Write spec');

    expect(within(dialog).getByLabelText('Title')).toHaveValue('Write spec');
    expect(within(dialog).getByLabelText('Description')).toHaveValue('Line one\nLine two');
    expect(within(dialog).getByLabelText('Priority')).toHaveDisplayValue('High');
    expect(within(dialog).getByLabelText('Due date')).toHaveValue('2026-10-20');
    expect(within(dialog).getByLabelText('Created at')).toHaveAttribute('datetime', '2026-10-01T08:00:00.000Z');
    expect(within(dialog).getByLabelText('Updated at')).toHaveAttribute('datetime', '2026-10-02T08:00:00.000Z');
  });

  it('shows Completed at only when it is set', async () => {
    const { user } = renderAppWith({
      labels: [],
      tasks: [
        task({ id: 't1', title: 'Open work' }),
        task({ id: 't2', title: 'Finished', status: 'done', completedAt: '2026-10-05T17:00:00.000Z' }),
      ],
    });

    let dialog = await openTask(user, 'Open work');
    expect(within(dialog).queryByText('Completed at')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /close/i }));

    dialog = await openTask(user, 'Finished');
    expect(within(dialog).getByLabelText('Completed at')).toHaveAttribute('datetime', '2026-10-05T17:00:00.000Z');
  });
});

describe('Keyboard use of the modal', () => {
  it('moves focus into the modal when it opens', async () => {
    const { user } = renderAppWith({ labels: [], tasks: [task({ id: 't1', title: 'Focus' })] });
    const dialog = await openTask(user, 'Focus');
    expect(within(dialog).getByLabelText('Title')).toHaveFocus();
  });

  it('closes on Escape', async () => {
    const { user } = renderAppWith({ labels: [], tasks: [task({ id: 't1', title: 'Esc' })] });
    const dialog = await openTask(user, 'Esc');

    await user.click(within(dialog).getByLabelText('Priority'));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reverts a cleared title when closed with Escape', async () => {
    const { user, saved } = renderAppWith({ labels: [], tasks: [task({ id: 't1', title: 'Abc' })] });
    await openTask(user, 'Abc');

    await user.keyboard('{End}{Backspace}{Backspace}{Backspace}{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(taskTitles('To Do')).toEqual(['Abc']);
    expect(saved().tasks[0].title).toBe('Abc');
  });

  it('keeps focus inside the modal when tabbing past either end', async () => {
    const { user } = renderAppWith({ labels: [], tasks: [task({ id: 't1', title: 'Trap' })] });
    const dialog = await openTask(user, 'Trap');

    for (let i = 0; i < 12; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    for (let i = 0; i < 12; i++) {
      await user.tab({ shift: true });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  describe('after removing a Label chip', () => {
    function withLabel(): Board {
      return {
        labels: [{ id: 'bug', name: 'Bug', color: '#c9372c' }],
        tasks: [task({ id: 't1', title: 'Chipped', labelIds: ['bug'] })],
      };
    }

    async function removeChip(user: User) {
      const dialog = await openTask(user, 'Chipped');
      await user.click(within(dialog).getByRole('button', { name: /remove label bug/i }));
      return dialog;
    }

    it('keeps focus inside the modal', async () => {
      const { user } = renderAppWith(withLabel());
      const dialog = await removeChip(user);
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    });

    it('still closes on Escape', async () => {
      const { user } = renderAppWith(withLabel());
      await removeChip(user);

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('still keeps Tab inside the modal', async () => {
      const { user } = renderAppWith(withLabel());
      const dialog = await removeChip(user);

      for (let i = 0; i < 12; i++) {
        await user.tab();
        expect(dialog).toContainElement(document.activeElement as HTMLElement);
      }
    });
  });

  describe('when focus has somehow left the modal', () => {
    function blurEverything() {
      (document.activeElement as HTMLElement | null)?.blur();
      expect(document.activeElement).toBe(document.body);
    }

    it('still closes on Escape', async () => {
      const { user } = renderAppWith({ labels: [], tasks: [task({ id: 't1', title: 'Lost' })] });
      await openTask(user, 'Lost');
      blurEverything();

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it.each([
      ['Tab', false],
      ['Shift+Tab', true],
    ])('brings focus back into the modal on %s', async (_, shift) => {
      const { user } = renderAppWith({ labels: [], tasks: [task({ id: 't1', title: 'Lost' })] });
      const dialog = await openTask(user, 'Lost');
      blurEverything();

      await user.tab({ shift });

      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    });
  });
});

describe('Editing a Task in the modal', () => {
  it('saves title, description, Priority and Due date as they change, and they survive a reload', async () => {
    const first = renderAppWith({ labels: [], tasks: [task({ id: 't1', title: 'Draft' })] });
    const dialog = await openTask(first.user, 'Draft');

    await first.user.type(within(dialog).getByLabelText('Title'), ' plan');
    await first.user.type(within(dialog).getByLabelText('Description'), 'First line{Enter}Second line');
    await first.user.selectOptions(within(dialog).getByLabelText('Priority'), 'Urgent');
    await first.user.type(within(dialog).getByLabelText('Due date'), '2026-11-03');

    // Saved already, with no Save button involved.
    expect(first.saved().tasks[0]).toMatchObject({
      title: 'Draft plan',
      description: 'First line\nSecond line',
      priority: 'urgent',
      dueDate: '2026-11-03',
    });
    expect(within(dialog).queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(within(column('To Do')).getByText('Draft plan')).toBeInTheDocument();

    first.unmount();
    const second = renderApp({ store: first.store });
    const reopened = await openTask(second.user, 'Draft plan');
    expect(within(reopened).getByLabelText('Description')).toHaveValue('First line\nSecond line');
    expect(within(reopened).getByLabelText('Priority')).toHaveDisplayValue('Urgent');
    expect(within(reopened).getByLabelText('Due date')).toHaveValue('2026-11-03');
  });

  it('clears the Due date', async () => {
    const { user, saved } = renderAppWith({
      labels: [],
      tasks: [task({ id: 't1', title: 'Dated', dueDate: '2026-10-20' })],
    });
    const dialog = await openTask(user, 'Dated');

    await user.click(within(dialog).getByRole('button', { name: /clear due date/i }));

    expect(within(dialog).getByLabelText('Due date')).toHaveValue('');
    expect(saved().tasks[0].dueDate).toBeNull();
  });

  it('changes Updated at on every edit and shows it in the modal', async () => {
    const clock = manualClock('2026-10-10T09:00:00.000Z');
    const { user, saved } = renderAppWith({ labels: [], tasks: [task({ id: 't1', title: 'Timed' })] }, { clock });
    const dialog = await openTask(user, 'Timed');

    clock.set('2026-10-10T10:00:00.000Z');
    await user.selectOptions(within(dialog).getByLabelText('Priority'), 'Low');
    expect(saved().tasks[0].updatedAt).toBe('2026-10-10T10:00:00.000Z');
    expect(within(dialog).getByLabelText('Updated at')).toHaveAttribute('datetime', '2026-10-10T10:00:00.000Z');

    clock.set('2026-10-10T11:30:00.000Z');
    await user.type(within(dialog).getByLabelText('Description'), 'x');
    expect(saved().tasks[0].updatedAt).toBe('2026-10-10T11:30:00.000Z');
    expect(within(dialog).getByLabelText('Updated at')).toHaveAttribute('datetime', '2026-10-10T11:30:00.000Z');
    expect(within(dialog).getByLabelText('Created at')).toHaveAttribute('datetime', '2026-10-01T08:00:00.000Z');
  });
});

describe('Deleting a Task from the modal', () => {
  function twoTasks(): Board {
    return {
      labels: [],
      tasks: [task({ id: 't1', title: 'Doomed', position: 0 }), task({ id: 't2', title: 'Survivor', position: 1 })],
    };
  }

  function confirmation() {
    return screen.getByRole('alertdialog', { name: /delete this task/i });
  }

  it('asks for confirmation before deleting', async () => {
    const { user, saved } = renderAppWith(twoTasks());
    const dialog = await openTask(user, 'Doomed');

    await user.click(within(dialog).getByRole('button', { name: /delete task/i }));

    expect(confirmation()).toBeInTheDocument();
    expect(within(confirmation()).getByRole('button', { name: /cancel/i })).toHaveFocus();
    expect(taskTitles('To Do')).toEqual(['Doomed', 'Survivor']);
    expect(saved().tasks).toHaveLength(2);
  });

  it('leaves the Task untouched and the modal open when the confirmation is cancelled', async () => {
    const { user, saved } = renderAppWith(twoTasks());
    const before = saved();
    const dialog = await openTask(user, 'Doomed');

    await user.click(within(dialog).getByRole('button', { name: /delete task/i }));
    await user.click(within(confirmation()).getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(modal()).toBeInTheDocument();
    expect(taskTitles('To Do')).toEqual(['Doomed', 'Survivor']);
    expect(saved()).toEqual(before);
  });

  it('cancels only the confirmation on Escape, keeping the modal open', async () => {
    const { user } = renderAppWith(twoTasks());
    const dialog = await openTask(user, 'Doomed');

    await user.click(within(dialog).getByRole('button', { name: /delete task/i }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(modal()).toBeInTheDocument();
    expect(taskTitles('To Do')).toEqual(['Doomed', 'Survivor']);
  });

  it('removes the Task permanently, closes the modal and updates the Column count when confirmed', async () => {
    const first = renderAppWith(twoTasks());
    const dialog = await openTask(first.user, 'Doomed');

    await first.user.click(within(dialog).getByRole('button', { name: /delete task/i }));
    await first.user.click(within(confirmation()).getByRole('button', { name: /^delete$/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(taskTitles('To Do')).toEqual(['Survivor']);
    expect(within(column('To Do')).getByLabelText('Task count')).toHaveTextContent('1');

    first.unmount();
    renderApp({ store: first.store });
    expect(taskTitles('To Do')).toEqual(['Survivor']);
  });
});

describe('Clearing the title in the modal', () => {
  it('reverts to the previous title when the title field loses focus', async () => {
    const { user, saved } = renderAppWith({ labels: [], tasks: [task({ id: 't1', title: 'Keep me' })] });
    const dialog = await openTask(user, 'Keep me');
    const titleInput = within(dialog).getByLabelText('Title');

    await user.clear(titleInput);
    expect(titleInput).toHaveValue('');
    await user.tab();

    expect(titleInput).toHaveValue('Keep me');
    expect(saved().tasks[0].title).toBe('Keep me');
    expect(taskTitles('To Do')).toEqual(['Keep me']);
  });

  it('reverts to the title from before editing even when deleted one character at a time', async () => {
    const { user, saved } = renderAppWith({ labels: [], tasks: [task({ id: 't1', title: 'Abc' })] });
    const dialog = await openTask(user, 'Abc');
    const titleInput = within(dialog).getByLabelText('Title');

    await user.click(titleInput);
    await user.keyboard('{End}{Backspace}{Backspace}{Backspace}');
    expect(titleInput).toHaveValue('');
    await user.tab();

    expect(titleInput).toHaveValue('Abc');
    expect(saved().tasks[0].title).toBe('Abc');
  });

  it('reverts to the previous title when the modal is closed', async () => {
    const { user, saved } = renderAppWith({ labels: [], tasks: [task({ id: 't1', title: 'Abc' })] });
    const dialog = await openTask(user, 'Abc');

    await user.click(within(dialog).getByLabelText('Title'));
    await user.keyboard('{End}{Backspace}{Backspace}{Backspace}');
    await user.click(within(dialog).getByRole('button', { name: /close/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(taskTitles('To Do')).toEqual(['Abc']);
    expect(saved().tasks[0].title).toBe('Abc');
  });
});
