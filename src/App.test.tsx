import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from './test/renderApp';

function columnNames() {
  return screen.getAllByRole('region').map((region) => region.getAttribute('aria-label'));
}

function column(name: string) {
  return screen.getByRole('region', { name });
}

describe('The empty Board', () => {
  it('shows the Columns To Do, In Progress and Done, in that order', () => {
    renderApp();
    expect(columnNames()).toEqual(['To Do', 'In Progress', 'Done']);
  });

  it('shows a Task count of 0 in every Column header', () => {
    renderApp();
    for (const name of ['To Do', 'In Progress', 'Done']) {
      expect(within(column(name)).getByLabelText('Task count')).toHaveTextContent('0');
    }
  });

  it('shows a hint in To Do explaining how to add a Task', () => {
    renderApp();
    expect(within(column('To Do')).getByText(/no tasks yet/i)).toBeInTheDocument();
    expect(within(column('In Progress')).queryByText(/no tasks yet/i)).not.toBeInTheDocument();
    expect(within(column('Done')).queryByText(/no tasks yet/i)).not.toBeInTheDocument();
  });

  it('has no sample Tasks on first launch', () => {
    renderApp();
    expect(screen.queryAllByRole('listitem')).toEqual([]);
  });
});
