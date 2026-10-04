import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { WORLDS } from '../../fun/worlds';
import { SCENES, timeLayers } from './scenes';
import { WorldScene } from './WorldScene';

describe('world scenes', () => {
  it('every world has ink-outlined art with no gradients or filters', () => {
    for (const w of WORLDS) {
      const s = SCENES[w.id];
      expect(s.length).toBeGreaterThan(400);
      expect(s).toContain('#2a2630');
      expect(s).not.toMatch(/Gradient|<filter|url\(#/);
    }
  });
  it('WorldScene draws the world with its time of day, decorative only', () => {
    const { container } = render(<WorldScene world="race" time="afternoon" />);
    const el = container.querySelector('.world-scene')!;
    expect(el.getAttribute('data-world')).toBe('race');
    expect(el.getAttribute('data-time')).toBe('afternoon');
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('[data-part="moon"]')).toBeNull();
  });
  it('evening adds the moon, stars and lanterns', () => {
    const { container } = render(<WorldScene world="yard" time="evening" />);
    expect(container.querySelector('[data-part="moon"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-part="lantern"]').length).toBe(4);
    expect(container.querySelectorAll('[data-part="lanterns"] [data-part="lantern"]').length).toBe(4); // one group with its string, so a lesson can drop it
    expect(timeLayers('morning').over).toBe('');
  });
  it('the morning and afternoon washes cover the whole canvas (no seam)', () => {
    for (const t of ['morning', 'afternoon'] as const) expect(timeLayers(t).wash).toContain('height="480"');
  });
  it('the moon base keeps its own sky in the evening: stars, no lanterns or second moon', () => {
    const { container } = render(<WorldScene world="space" time="evening" />);
    expect(container.querySelector('[data-part="moon"]')).toBeNull();
    expect(container.querySelectorAll('[data-part="lantern"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-part="star"]').length).toBeGreaterThan(0);
  });
  it('the race flag stands on the hill, not in mid-air', () => {
    const m = SCENES.race.match(/data-part="flag"[^>]*>\s*<path d="M40 (\d+) v-(\d+)"/);
    expect(m).toBeTruthy();
    expect(Number(m![1])).toBeGreaterThanOrEqual(395); // the ground line near x=40
  });
  it('soft wash: big background planes carry no heavy ink outline, and the colours are the muted palette', () => {
    const LOUD = ['#ff5532', '#4aa3ff', '#7fdc7a', '#ffc94a', '#ff9b3d', '#5fbf5a'];
    for (const w of WORLDS) {
      const s = SCENES[w.id];
      for (const c of LOUD) expect(s, `${w.id} uses ${c}`).not.toContain(c);
      const planes = s.match(/<path d="[^"]*(?:L360 480 L0 480Z|V480 H0Z)"[^>]*>/g) ?? [];
      for (const p of planes) expect(p, `${w.id}: ${p.slice(0, 60)}`).not.toMatch(/stroke="#2a2630"(?![^>]*stroke-opacity)/);
    }
  });
  it('no car drives upside down on the race track', () => {
    const rots = [...SCENES.race.matchAll(/rotate\((-?\d+)/g)].map((m) => Number(m[1]));
    expect(rots.length).toBeGreaterThan(0);
    for (const r of rots) expect(Math.abs(((((r + 180) % 360) + 360) % 360) - 180), `rotate(${r})`).toBeLessThanOrEqual(60); // within ±60° of upright
  });
});
