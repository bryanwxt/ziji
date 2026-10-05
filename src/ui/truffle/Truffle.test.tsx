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
  it('has no live filters (spec §6): the grain is gone from the moving parts', () => {
    const { container } = render(<Truffle mood="neutral" />);
    expect(container.querySelector('filter, [filter]')).toBeNull();
  });
  it('is built from parts: separate ears, lidded eyes, brows, a mouth, a tail, and a rounded body top', () => {
    const { container } = render(<Truffle mood="neutral" />);
    for (const part of ['ear-l', 'ear-r', 'iris-l', 'iris-r', 'lid-top-l', 'lid-top-r', 'lid-bottom-l', 'brow-l', 'brow-r', 'mouth', 'blush-l', 'tail']) {
      expect(container.querySelector(`[data-part="${part}"]`), part).toBeTruthy();
    }
    expect(container.querySelector('.truffle__body path')!.getAttribute('d')).toMatch(/^M110 186 C112 158 208 158 210 186/); // rounded top under the head: no seam when he leans
  });
  it('shows the preset for its mood (sulk → grumpy, side → curious) and an explicit expression overrides the mood', () => {
    expect(render(<Truffle mood="side" />).container.querySelector('svg')!.getAttribute('data-expression')).toBe('curious');
    expect(render(<Truffle mood="sulk" expression="joy" />).container.querySelector('svg')!.getAttribute('data-expression')).toBe('joy');
  });
  it('joy draws closed ^ eyes; neutral draws open ones', () => {
    const joy = render(<Truffle expression="joy" />).container;
    expect(joy.querySelector('[data-part="lid-closed-l"]')!.getAttribute('opacity')).toBe('1');
    const neutral = render(<Truffle expression="neutral" />).container;
    expect(neutral.querySelector('[data-part="lid-closed-l"]')!.getAttribute('opacity')).toBe('0');
  });
  it('curious brings its question mark; neutral has no marks', () => {
    expect(render(<Truffle expression="curious" />).container.querySelector('[data-part="extra-curious"]')!.getAttribute('opacity')).toBe('1');
    expect(render(<Truffle expression="neutral" />).container.querySelector('[data-part="extra-curious"]')!.getAttribute('opacity')).toBe('0');
  });
  it('the lids are his fur colour under every outfit (review focus 4)', async () => {
    const { COSTUMES } = await import('../../fun/costumes');
    for (const c of COSTUMES) {
      const { container, unmount } = render(<Truffle outfit={c.id} />);
      expect(container.querySelector('[data-part="lid-top-l"]')!.getAttribute('fill'), c.id).toBe('#b8b3b6');
      unmount();
    }
  });
  it('glasses ride in the head group, and a hood still hides his ears (review focus 4)', () => {
    const g = render(<Truffle accessory="sunglasses" />).container;
    expect(g.querySelector('g[transform^="rotate"] .truffle__accessory--face')).toBeTruthy();
    const hood = render(<Truffle outfit="rabbit" />).container;
    expect(hood.querySelector('[data-part="ear-l"]')).toBeNull();
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
  it('the power mark turns with his head', () => {
    const { container } = render(<Truffle power="fire" powerTier={1} lookAt={1} />);
    expect(container.querySelector('g[transform^="rotate"] .truffle__power-head')).toBeTruthy();
  });
  it('an unknown power id (old or damaged data) draws nothing and never throws', () => {
    const { container } = render(<Truffle power="lightning" powerTier={3} />);
    expect(container.querySelector('svg.truffle')).toBeTruthy();
    expect(container.querySelector('.truffle__power-head, .truffle__power-front')).toBeNull();
  });
  it('draws nothing for tier 0 or no power', () => {
    const { container } = render(<Truffle power="fire" powerTier={0} />);
    expect(container.querySelector('.truffle__power-front, .truffle__power-head')).toBeNull();
    expect(container.querySelector('svg.truffle')?.getAttribute('data-tier')).toBe('0');
  });
});

describe('Truffle costumes', () => {
  it('a zodiac onesie has the animal\'s own tail in his tail\'s place (it swishes with his), and its face on the hood', async () => {
    const { ONESIES } = await import('../../fun/costumes');
    for (const c of ONESIES) {
      const { container, unmount } = render(<Truffle outfit={c.id} />);
      const tail = container.querySelector('[data-part="tail"]')!;
      expect(tail.innerHTML, c.id).not.toBe(render(<Truffle />).container.querySelector('[data-part="tail"]')!.innerHTML);
      expect(tail.innerHTML.length, c.id).toBeGreaterThan(40);
      expect(container.querySelector('.truffle__outfit-head [data-hood-face]'), c.id).toBeTruthy();
      unmount();
    }
    const own = render(<Truffle />).container.querySelector('[data-part="tail"]')!.innerHTML;
    const { container } = render(<Truffle outfit="chef" />);
    expect(container.querySelector('[data-part="tail"]')!.innerHTML).toBe(own); // an outfit leaves his own tail
  });
  it("every onesie's ears, horns and spikes stay inside his box (30 20 260 270), so a tile or a clipped screen never cuts them", async () => {
    const { COSTUMES } = await import('../../fun/costumes');
    const { costumeLayer } = await import('./costumes');
    const out: string[] = [];
    for (const c of COSTUMES.filter((x) => x.kind === 'onesie')) { // the zodiac and the hooded creatures
      const l = costumeLayer(c.id)!;
      const art = l.back + l.head;
      for (const m of art.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)) {
        const [x, y, r] = [Number(m[1]), Number(m[2]), Number(m[3])];
        if (x - r < 31.6 || x + r > 288.4 || y - r < 21.6) out.push(`${c.id} circle ${x},${y} r${r}`);
      }
      for (const m of art.matchAll(/ d="(M[^"]*)"/g)) {
        if (/[a-z]/.test(m[1]!.replace(/Z/g, ''))) continue; // relative paths are small details inside
        for (const v of m[1]!.matchAll(/[ML] ?([\d.]+) ([\d.]+)/g)) {
          const [x, y] = [Number(v[1]), Number(v[2])];
          if (x < 31.6 || x > 288.4 || y < 21.6) out.push(`${c.id} point ${x},${y}`);
        }
      }
    }
    expect(out).toEqual([]);
  });
  it('renders every costume with body and head layers', async () => {
    const { COSTUMES } = await import('../../fun/costumes');
    for (const c of COSTUMES) {
      const { container, unmount } = render(<Truffle outfit={c.id} />);
      expect(container.querySelector('svg.truffle')?.getAttribute('data-outfit')).toBe(c.id);
      expect(container.querySelector('.truffle__outfit-body')?.innerHTML.length).toBeGreaterThan(10);
      // a jersey, a gi, the Golden Fleece and the fortune cat's collar are all body: nothing on his head
      if (!['football', 'gi', 'jason', 'luckycat'].includes(c.id)) expect(container.querySelector('.truffle__outfit-head')?.innerHTML.length, c.id).toBeGreaterThan(10);
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
  it('the 辶 wind streaks sit clear of the wings and the jetpack (both on his back, from y 178 down)', async () => {
    const { powerLayer } = await import('./powers');
    const m = /<svg x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/.exec(powerLayer('dash', 1).head)!;
    expect(Number(m[2]) + Number(m[3])).toBeLessThanOrEqual(176);
    expect(Number(m[1])).toBeGreaterThanOrEqual(30); // inside the viewBox
  });
  it('the power mark sits on the left, clear of held items on the right', async () => {
    const { powerLayer } = await import('./powers');
    for (const id of ['water', 'fire', 'wood', 'sun', 'roar', 'dash'] as const) {
      const x = Number(/<svg x="([\d.]+)"/.exec(powerLayer(id, 1).head)![1]);
      expect(x).toBeLessThan(120);
    }
  });
  it('wings and the jetpack thumbnails draw the pair close in on a small back, big enough to read (not two specks)', async () => {
    const { accessoryThumb } = await import('./accessories');
    for (const id of ['wings', 'jetpack']) {
      expect(accessoryThumb(id)!.markup.startsWith('<ellipse class="thumb__back"')).toBe(true);
      expect(Number(accessoryThumb(id)!.viewBox.split(' ')[2])).toBeLessThanOrEqual(170); // was 212–256 wide
    }
    expect(accessoryThumb('backpack')!.markup).not.toContain('thumb__back');
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

describe('paws (spec 2026-10-04 §4.6, phase E)', () => {
  it('his front paws are parts of their own, drawn in front of his head so he can cover his eyes', () => {
    const { container } = render(<Truffle mood="neutral" />);
    const all = [...container.querySelectorAll('[data-part]')].map((e) => e.getAttribute('data-part'));
    expect(all).toContain('paw-l');
    expect(all).toContain('paw-r');
    expect(all.indexOf('paw-l')).toBeGreaterThan(all.indexOf('headpos'));
    expect(container.querySelector('[data-part="paw-l"]')!.innerHTML).toContain('M122 262');
    expect(container.querySelector('[data-part="paw-r"]')!.innerHTML).toContain('M198 262');
    expect(container.querySelector('[data-part="body"]')!.innerHTML).not.toContain('M122 262');
  });
  it('final review I1: a held item (the wand) moves with his right paw, so a raised paw never leaves a third one behind', () => {
    const { container } = render(<Truffle mood="neutral" accessory="wand" />);
    const pawR = container.querySelector('[data-part="paw-r"]')!;
    expect(pawR.querySelector('.truffle__accessory--over')).toBeTruthy();
    expect(container.querySelectorAll('.truffle__accessory--over')).toHaveLength(1);
  });
});

