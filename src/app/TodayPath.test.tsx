import { fireEvent, render } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { TodayPath } from './TodayPath';

describe('TodayPath (sweep)', () => {
  it("a tap on the current stop's name starts it, like its button; other names do nothing", () => {
    const onStart = vi.fn();
    render(<TodayPath nodes={[{ kind: 'newwords', state: 'done' }, { kind: 'practice', state: 'current' }, { kind: 'writing', state: 'upcoming' }]} started onStart={onStart} />);
    const names = document.querySelectorAll<HTMLElement>('.path__name');
    fireEvent.click(names[0]!);
    fireEvent.click(names[2]!);
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.click(names[1]!);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(names[1]!.classList.contains('path__name--current')).toBe(true);
  });
});

describe('认新词 (weekly list spec §7.1; fix round 2026-10-17)', () => {
  it('the stop is 认新词 when the lesson opens on a list word card', async () => {
    const { newwordsName } = await import('./TodayPath');
    const rec = (first: string) => ({ flashQueue: [{ wordId: first, isNew: true, retry: false }], plan: { listCards: { 'p:亮晶晶': { mark: [0, 1] as [number, number] } } } });
    expect(newwordsName(rec('p:亮晶晶'))).toBe('认新词');
    expect(newwordsName(rec('b:字'))).toBe('认新字');
    expect(newwordsName(undefined)).toBe('认新字');
    render(<TodayPath nodes={[{ kind: 'newwords', state: 'current' }]} started={false} onStart={vi.fn()} newwordsName="认新词" />);
    expect(document.querySelector('.path__name .label')!.getAttribute('data-zh')).toBe('认新词');
  });
});
