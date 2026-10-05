import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { WORLDS } from '../../fun/worlds';
import { SCENES, WORLD_ART } from './scenes';
import { WorldScene } from './WorldScene';

describe('world scenes', () => {
  it('every world is storybook paper now', () => {
    for (const w of WORLDS) expect(WORLD_ART[w.id], w.id).toBeTruthy();
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
