import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { FeedbackSheet } from './FeedbackSheet';

describe('FeedbackSheet (spec 2026-10-04 §3)', () => {
  it('neutral: only the action button, no message', () => {
    render(<FeedbackSheet actionLabel="继续" disabled onAction={vi.fn()} />);
    expect(document.querySelector('.sheet.sheet--neutral')).toBeTruthy();
    expect(document.querySelector('.sheet__msg')).toBeNull();
    expect(document.querySelector('[role="status"]')).toBeNull();
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });
  it('good / oops: a status message with title and detail, and the action', () => {
    const go = vi.fn();
    render(<FeedbackSheet tone="oops" title="再想想" detail={<span class="hanzi">银行</span>} actionLabel="继续" onAction={go} />);
    const sheet = document.querySelector('.sheet.sheet--oops')!;
    expect(sheet.getAttribute('role')).toBe('status');
    expect(sheet.querySelector('.sheet__title')!.textContent).toContain('再想想');
    expect(sheet.querySelector('.sheet__detail .hanzi')!.textContent).toBe('银行');
    fireEvent.click(screen.getByRole('button'));
    expect(go).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button').className).toContain('btn--oops');
  });
  it('a disabled action never fires', () => {
    const go = vi.fn();
    render(<FeedbackSheet actionLabel="继续" disabled onAction={go} />);
    fireEvent.click(screen.getByRole('button'));
    expect(go).not.toHaveBeenCalled();
  });
  it("an optional icon sits after the label (placement's 不知道)", () => {
    render(<FeedbackSheet actionLabel="不知道" actionIcon={<i class="probe" />} onAction={vi.fn()} />);
    expect(screen.getByRole('button').querySelector('.probe')).toBeTruthy();
  });
});
