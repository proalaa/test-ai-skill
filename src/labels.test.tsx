// App-level tests for attaching Labels to Tasks in the task modal and showing them as chips.
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { task } from './test/boards';
import { openTask, taskItem, taskModal as modal } from './test/queries';
import { renderApp, renderAppWith, type User } from './test/renderApp';

/** The names of the Labels attached to the open Task, read from their remove buttons in the modal. */
function modalLabelNames() {
  return within(modal())
    .queryAllByRole('button', { name: /^remove label /i })
    .map((button) => button.getAttribute('aria-label')?.replace(/^remove label /i, ''));
}

async function attachLabel(user: User, name: string) {
  await user.type(within(modal()).getByLabelText('Add label'), `${name}{Enter}`);
}

describe('Attaching Labels in the task modal', () => {
  it('creates a Label from a new name with a palette color and shows it as a chip on the Task', async () => {
    const { user, saved } = renderAppWith({ labels: [], tasks: [task({ id: 't1', title: 'Fix login' })] });

    await openTask(user, 'Fix login');
    await attachLabel(user, 'Bug');

    expect(modalLabelNames()).toEqual(['Bug']);
    expect(within(modal()).getByLabelText('Add label')).toHaveValue('');
    const chip = within(taskItem('Fix login', 'To Do')).getByText('Bug');
    expect(chip).toHaveStyle({ backgroundColor: '#0c66e4' });
    expect(saved().labels).toEqual([{ id: expect.any(String), name: 'Bug', color: '#0c66e4' }]);
  });

  it('reuses an existing Label when the name is typed in another case, creating no duplicate', async () => {
    const { user, saved } = renderAppWith({
      labels: [{ id: 'bug', name: 'Bug', color: '#c9372c' }],
      tasks: [task({ id: 't1', title: 'Fix login', labelIds: ['bug'] }), task({ id: 't2', title: 'Fix logout', position: 1 })],
    });

    await openTask(user, 'Fix logout');
    await attachLabel(user, 'bUG');

    expect(modalLabelNames()).toEqual(['Bug']);
    expect(within(taskItem('Fix logout', 'To Do')).getByText('Bug')).toHaveStyle({ backgroundColor: '#c9372c' });
    expect(saved().labels).toEqual([{ id: 'bug', name: 'Bug', color: '#c9372c' }]);
    expect(saved().tasks.find((t) => t.id === 't2')?.labelIds).toEqual(['bug']);
  });

  it('removes a Label from the Task but keeps it on the Board for reuse', async () => {
    const { user, saved } = renderAppWith({
      labels: [{ id: 'bug', name: 'Bug', color: '#c9372c' }],
      tasks: [task({ id: 't1', title: 'Fix login', labelIds: ['bug'] })],
    });

    await openTask(user, 'Fix login');
    await user.click(within(modal()).getByRole('button', { name: /remove label bug/i }));

    expect(modalLabelNames()).toEqual([]);
    expect(within(taskItem('Fix login', 'To Do')).queryByText('Bug')).not.toBeInTheDocument();
    expect(saved().labels).toEqual([{ id: 'bug', name: 'Bug', color: '#c9372c' }]);

    await attachLabel(user, 'bug');
    expect(modalLabelNames()).toEqual(['Bug']);
    expect(saved().labels).toHaveLength(1);
  });

  it('keeps the modal open and focus in the input after attaching, ready for the next Label', async () => {
    const { user } = renderAppWith({ labels: [], tasks: [task({ id: 't1', title: 'Fix login' })] });

    await openTask(user, 'Fix login');
    await attachLabel(user, 'Bug');
    await user.keyboard('UI{Enter}');

    expect(modalLabelNames()).toEqual(['Bug', 'UI']);
    expect(within(modal()).getByLabelText('Add label')).toHaveFocus();
  });

  it('attaches nothing for a blank name', async () => {
    const { user, saved } = renderAppWith({ labels: [], tasks: [task({ id: 't1', title: 'Fix login' })] });

    await openTask(user, 'Fix login');
    await attachLabel(user, '   ');

    expect(modalLabelNames()).toEqual([]);
    expect(saved().labels).toEqual([]);
  });
});

describe('Label chips on the Task in its Column', () => {
  it('shows each Task’s Labels as chips in their colors, in the order they were attached', () => {
    renderAppWith({
      labels: [
        { id: 'bug', name: 'Bug', color: '#c9372c' },
        { id: 'ui', name: 'UI', color: '#6e5dc6' },
        { id: 'unused', name: 'Docs', color: '#1f845a' },
      ],
      tasks: [
        task({ id: 't1', title: 'Fix login', labelIds: ['ui', 'bug'] }),
        task({ id: 't2', title: 'Release', status: 'done' }),
      ],
    });

    const item = taskItem('Fix login', 'To Do');
    expect(within(item).getByText('UI')).toHaveStyle({ backgroundColor: '#6e5dc6' });
    expect(within(item).getByText('Bug')).toHaveStyle({ backgroundColor: '#c9372c' });
    expect(item.textContent).toBe('Fix loginUIBug');
    expect(taskItem('Release', 'Done').textContent).toBe('Release');
    expect(screen.queryByText('Docs')).not.toBeInTheDocument();
  });

  it('keeps Labels and their attachments after a reload', async () => {
    const first = renderAppWith({ labels: [], tasks: [task({ id: 't1', title: 'Fix login' })] });
    await openTask(first.user, 'Fix login');
    await attachLabel(first.user, 'Bug');
    await attachLabel(first.user, 'UI');
    first.unmount();

    const { user } = renderApp({ store: first.store });

    const item = taskItem('Fix login', 'To Do');
    expect(within(item).getByText('Bug')).toHaveStyle({ backgroundColor: '#0c66e4' });
    expect(within(item).getByText('UI')).toHaveStyle({ backgroundColor: '#1f845a' });
    await openTask(user, 'Fix login');
    expect(modalLabelNames()).toEqual(['Bug', 'UI']);
  });
});
