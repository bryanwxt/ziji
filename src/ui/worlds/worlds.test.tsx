import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { WORLDS } from '../../fun/worlds';
import { INK } from './legacy';
import { SCENES, WORLD_ART } from './scenes';
import { WorldScene } from './WorldScene';

describe('world scenes', () => {
  it('every world is drawn: in paper, or in ink until it is redrawn', () => {
    for (const w of WORLDS) expect(WORLD_ART[w.id] ?? INK[w.id], w.id).toBeTruthy();
  });
  it('a world still in ink keeps its ink rules (outlines, no gradients or filters)', () => {
    for (const w of WORLDS.filter((x) => !WORLD_ART[x.id])) {
      expect(SCENES[w.id]).toContain('#2a2630');
      expect(SCENES[w.id]).not.toMatch(/Gradient|<filter|url\(#/);
    }
  });
  it('WorldScene draws the world at its time of day, decorative only', () => {
    const { container } = render(<WorldScene world="yard" time="afternoon" />);
    const el = container.querySelector('.world-scene')!;
    expect(el.getAttribute('data-world')).toBe('yard');
    expect(el.getAttribute('data-time')).toBe('afternoon');
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('[data-prop="ball"]')).toBeTruthy();
    expect(container.querySelector('[data-part="moon"]')).toBeNull();
  });
  it('evening in the yard: the moon is up, and the lanterns hang in one group with their string (a lesson hides it)', () => {
    const { container } = render(<WorldScene world="yard" time="evening" />);
    expect(container.querySelector('[data-part="moon"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-part="lanterns"] [data-part="lantern"]')).toHaveLength(4);
  });
});
