import { render } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
const motion = { reduced: false };
vi.mock('./motion', () => ({ reducedMotion: () => motion.reduced }));
import { StoneMeter } from './StoneMeter';

const reached = (c: Element) => c.querySelectorAll('.stones__stone.is-reached').length;
const fresh = (c: Element) => c.querySelectorAll('.stones__stone.is-new').length;

describe("Home's stepping-stone meter (parent 2026-10-26)", () => {
  it('lights one stone per half and says where he is', () => {
    motion.reduced = false;
    for (const [h, said] of [[0, '还没开始'], [1, '走到一半了'], [2, '到宝箱了']] as const) {
      const { container, unmount } = render(<StoneMeter halves={h} />);
      const svg = container.querySelector('svg.stones')!;
      expect(reached(container)).toBe(h);
      expect(svg.getAttribute('data-halves')).toBe(String(h));
      expect(svg.getAttribute('aria-label')).toBe(said);
      expect(fresh(container)).toBe(0); // nothing newly earned: nothing pops
      unmount();
    }
  });
  it('a stone earned since `from` pops; none with reduced motion', () => {
    motion.reduced = false;
    const { container, unmount } = render(<StoneMeter from={0} halves={2} />);
    expect(fresh(container)).toBe(2);
    unmount();
    const one = render(<StoneMeter from={1} halves={2} />);
    expect(fresh(one.container)).toBe(1);
    one.unmount();
    motion.reduced = true;
    const still = render(<StoneMeter from={0} halves={1} />);
    expect(fresh(still.container)).toBe(0);
    expect(still.container.querySelector('svg.stones--still')).toBeTruthy();
  });
  it('the full chest sparkles, shut; a part-full one does not', () => {
    motion.reduced = false;
    const { container, rerender } = render(<StoneMeter halves={1} />);
    expect(container.querySelector('.river__glint')).toBeNull();
    rerender(<StoneMeter halves={2} />);
    expect(container.querySelector('svg.stones--full .stones__chest .river__glint')).toBeTruthy();
  });
  it('is drawn in light cel: no gradient, no clip-path', () => {
    const { container } = render(<StoneMeter halves={1} />);
    expect(container.innerHTML).not.toMatch(/Gradient|clip-path/);
  });
});
