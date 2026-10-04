import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { TRUFFLE_MOODS } from './parts';
import { Truffle } from './Truffle';

const svg = (c: Element) => c.querySelector('svg.truffle')!;

describe('Truffle', () => {
  it('is an image labelled 松露 with body, head and the requested face', () => {
    const { container } = render(<Truffle mood="wow" />);
    expect(svg(container).getAttribute('role')).toBe('img');
    expect(svg(container).getAttribute('aria-label')).toBe('松露');
    expect(svg(container).getAttribute('data-mood')).toBe('wow');
    expect(container.querySelector('.truffle__body')).toBeTruthy();
    expect(container.querySelector('.truffle__head')).toBeTruthy();
    expect(container.querySelector('.truffle__face--wow')).toBeTruthy();
  });
  it('has a face for every mood', () => {
    for (const mood of TRUFFLE_MOODS) {
      const { container, unmount } = render(<Truffle mood={mood} />);
      expect(container.querySelector(`.truffle__face--${mood}`)?.innerHTML.length).toBeGreaterThan(20);
      unmount();
    }
  });
  it('wears an accessory where it belongs: face items tilt with the head, back items sit behind the body', () => {
    const glasses = render(<Truffle accessory="sunglasses" />);
    expect(glasses.container.querySelector('svg.truffle')?.getAttribute('data-accessory')).toBe('sunglasses');
    expect(glasses.container.querySelector('.truffle__head')?.parentElement?.querySelector('.truffle__accessory--face')).toBeTruthy();
    glasses.unmount();
    const wings = render(<Truffle accessory="wings" />);
    const back = wings.container.querySelector('.truffle__accessory--back')!;
    expect(back.compareDocumentPosition(wings.container.querySelector('.truffle__body')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('gives each instance its own grain filter id', () => {
    const { container } = render(<><Truffle /><Truffle /></>);
    const ids = [...container.querySelectorAll('filter')].map((f) => f.id);
    expect(new Set(ids).size).toBe(2);
  });
  it('can be decorative', () => {
    const { container } = render(<Truffle label={null} />);
    expect(svg(container).getAttribute('aria-hidden')).toBe('true');
  });
});

describe('Truffle powers', () => {
  it('draws a power by tier: mark, then aura, then cape with the power character', () => {
    const t1 = render(<Truffle power="fire" powerTier={1} />);
    expect(t1.container.querySelector('svg.truffle')?.getAttribute('data-power')).toBe('fire');
    expect(t1.container.querySelector('.truffle__power-head')?.innerHTML).toContain('#ff6a3d'); // the ink flame icon
    expect(t1.container.querySelector('.truffle__power-back')?.innerHTML).toBe('');
    t1.unmount();
    const t3 = render(<Truffle power="fire" powerTier={3} />);
    expect(t3.container.querySelectorAll('.truffle__power-back circle').length).toBe(2);
    expect(t3.container.querySelector('.truffle__power-back .truffle__cape')).toBeTruthy();
    expect(t3.container.querySelector('.truffle__power-front .truffle__emblem')?.textContent).toBe('火');
  });
  it('a mark on his head turns with his head; the wind streaks stay by his body', () => {
    const { container, unmount } = render(<Truffle power="fire" powerTier={1} lookAt={1} />);
    expect(container.querySelector('g[transform^="rotate"] .truffle__power-head')).toBeTruthy();
    unmount();
    const wind = render(<Truffle power="dash" powerTier={1} lookAt={1} />);
    expect(wind.container.querySelector('g[transform^="rotate"] .truffle__power-head')).toBeNull();
    expect(wind.container.querySelector('.truffle__power-front')?.innerHTML).toContain('svg');
  });
  it('draws nothing for tier 0 or no power', () => {
    const { container } = render(<Truffle power="fire" powerTier={0} />);
    expect(container.querySelector('.truffle__power-front, .truffle__power-head')).toBeNull();
    expect(container.querySelector('svg.truffle')?.getAttribute('data-tier')).toBe('0');
  });
});

describe('Truffle costumes', () => {
  it('renders every costume with body and head layers', async () => {
    const { COSTUMES } = await import('../../fun/costumes');
    for (const c of COSTUMES) {
      const { container, unmount } = render(<Truffle outfit={c.id} />);
      expect(container.querySelector('svg.truffle')?.getAttribute('data-outfit')).toBe(c.id);
      expect(container.querySelector('.truffle__outfit-body')?.innerHTML.length).toBeGreaterThan(10);
      expect(container.querySelector('.truffle__outfit-head')?.innerHTML.length).toBeGreaterThan(10);
      unmount();
    }
  });
  it('ignores unknown outfits', () => {
    const { container } = render(<Truffle outfit="bogus" />);
    expect(container.querySelector('.truffle__outfit-body')).toBeNull();
    expect(container.querySelector('svg.truffle')?.hasAttribute('data-outfit')).toBe(false);
  });
});

describe('Truffle onesie hood', () => {
  it("hides Truffle's own ears under a onesie hood (and only then)", () => {
    const hooded = render(<Truffle outfit="tiger" />);
    expect(hooded.container.querySelector('.truffle__head')!.innerHTML).not.toContain('M74 92');
    hooded.unmount();
    const chef = render(<Truffle outfit="chef" />);
    expect(chef.container.querySelector('.truffle__head')!.innerHTML).toContain('M74 92');
  });
});

describe('Truffle accessories v2', () => {
  it('draws every accessory as ink art (never emoji text)', async () => {
    const { ACCESSORY_IDS } = await import('../../fun/accessories');
    for (const id of ACCESSORY_IDS) {
      const { container, unmount } = render(<Truffle accessory={id} />);
      expect(container.querySelector('svg.truffle')?.getAttribute('data-accessory')).toBe(id);
      const art = [...container.querySelectorAll('.truffle__accessory')].map((g) => g.innerHTML).join('');
      expect(art).toContain('stroke="#2a2630"');
      expect(art).not.toMatch(/\p{Extended_Pictographic}/u);
      unmount();
    }
  });
  it('ignores unknown accessories', () => {
    const { container } = render(<Truffle accessory="🎩" />);
    expect(container.querySelector('.truffle__accessory')).toBeNull();
  });
});

describe('accessories never hide earned powers', () => {
  const circles = (html: string) => [...html.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)].map((m) => m.slice(1).map(Number));
  it('the gold medal and the tier-3 power emblem do not overlap', async () => {
    const { accessoryLayer } = await import('./accessories');
    const { powerLayer } = await import('./powers');
    const [mx, my, mr] = circles(accessoryLayer('medal')!.under).find(([, , r]) => r >= 12)!;
    const [ex, ey, er] = circles(powerLayer('fire', 3).front).find(([, , r]) => r >= 15)!;
    expect(Math.hypot(mx! - ex!, my! - ey!)).toBeGreaterThan(mr! + er!);
  });
  it('the power mark sits on the left, clear of held items on the right', async () => {
    const { powerLayer } = await import('./powers');
    for (const id of ['water', 'fire', 'wood', 'sun', 'roar'] as const) {
      const x = Number(/<svg x="([\d.]+)"/.exec(powerLayer(id, 1).head)![1]);
      expect(x).toBeLessThan(120);
    }
  });
  it('room thumbnails are cropped tightly to each accessory, without the paw', async () => {
    const { accessoryThumb } = await import('./accessories');
    for (const id of ['lantern', 'kite', 'balloon', 'wand', 'brush']) {
      const t = accessoryThumb(id)!;
      expect(Number(t.viewBox.split(' ')[3])).toBeLessThanOrEqual(120);
      expect(t.markup).not.toContain('rx="16" ry="11"');
    }
  });
});
