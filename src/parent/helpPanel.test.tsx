import { fireEvent, render, screen } from '@testing-library/preact';
import { beforeEach, describe, expect, it } from 'vitest';
import { queuedReports } from '../report/outbox';
import { HelpPanel } from './HelpPanel';

beforeEach(() => localStorage.clear());

describe('Settings → Help & feedback', () => {
  it('shows the getting-started guide and a privacy note', () => {
    render(<HelpPanel />);
    expect(screen.getByText(/Add it to the Home Screen/)).toBeTruthy();
    expect(screen.getByText(/nothing about who your child is ever leaves it/)).toBeTruthy();
  });

  it('a note goes to the outbox; with sharing off the box is shut', () => {
    render(<HelpPanel />);
    fireEvent.input(screen.getByLabelText(/A note to the 字己 team/), { target: { value: '组句 froze' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send note' }));
    expect(queuedReports()[0]).toMatchObject({ kind: 'note', body: { text: '组句 froze' } });
    expect(screen.getByRole('status').textContent).toMatch(/on its way/);
    fireEvent.click(screen.getByLabelText(/Send anonymous reports/));
    expect(queuedReports()).toHaveLength(0);
    expect((screen.getByLabelText(/A note to the 字己 team/) as HTMLTextAreaElement).disabled).toBe(true);
    expect(screen.getByText(/Sharing is off/)).toBeTruthy();
  });
});
