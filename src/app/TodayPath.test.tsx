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
