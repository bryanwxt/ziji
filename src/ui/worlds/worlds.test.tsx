import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { WORLDS } from '../../fun/worlds';
import { RIVER } from './river';
import { sceneFor } from './scene';
import { WorldScene } from './WorldScene';

describe('One River scenes (spec 2026-10-13 §5)', () => {
  it('WorldScene draws the painting as one image in the 1000 box, with the boat and the world\'s props, decorative only', () => {
    const { container } = render(<WorldScene world="home" time="afternoon" />);
    const el = container.querySelector('.world-scene')!;
    expect([el.getAttribute('data-world'), el.getAttribute('data-time'), el.getAttribute('aria-hidden')]).toEqual(['home', 'afternoon', 'true']);
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 1000 1000');
    expect(container.querySelector('svg')!.getAttribute('preserveAspectRatio')).toBe('xMidYMax slice');
    const img = container.querySelectorAll('image');
    expect(img).toHaveLength(1);
    expect(img[0]!.getAttribute('href')).toBe('/worlds/home.webp');
    for (const p of ['boat']) expect(container.querySelector(`[data-prop="${p}"]`), p).toBeTruthy();
    expect(container.querySelector('[data-part="dusk"]')).toBeNull();
  });
  it('evening tints the painting, hangs the moon and lights the world, under the props; 银河 is night already', () => {
    for (const w of WORLDS) {
      const s = sceneFor(w.id, 'evening');
      expect(s.includes('data-part="dusk"'), w.id).toBe(RIVER[w.id].dusk > 0);
      expect(s.includes('data-part="moon"'), w.id).toBe(!!RIVER[w.id].moon);
      expect(s, w.id).toContain('data-part="boat-lantern"');
      expect(s.indexOf('data-part="lights"'), w.id).toBeLessThan(s.indexOf('data-prop='));
      expect(s.length, w.id).toBeLessThan(60_000);
    }
  });
  it('morning and afternoon are the painting as it is', () => {
    for (const w of WORLDS) expect(sceneFor(w.id, 'morning')).toBe(sceneFor(w.id, 'afternoon'));
  });
});
