import { render } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
vi.mock('./v3', () => ({
  V3: {
    astronaut: () => ({ back: '', body: '', head: '', feetL: '<path data-t="boot-l" d="M116 272 L160 272"/>', feetR: '<path data-t="boot-r" d="M160 272 L204 272"/>', mittL: '<path data-t="mitt-l" d="M120 266 L150 266"/>', mittR: '<path data-t="mitt-r" d="M170 266 L200 266"/>', pawR: '<path data-t="flag" d="M190 260 L240 220"/>', overR: true, hidesEars: false }),
    chef: () => ({ back: '', body: '<path d="M110 190 L210 190"/>', head: '<path d="M60 90 L260 90"/>', pawL: '<circle data-t="glove-l" cx="138" cy="266" r="4"/>', pawR: '<circle data-t="prop-r" cx="200" cy="230" r="9"/>', hidesEars: false }),
  },
}));
import { Truffle } from './Truffle';
import { PAW_L, PAW_R } from './parts';

describe('costume paw slots (rewards spec §5.1; docs/worlds/costumes/rig-slot.diff)', () => {
  it("a costume's pawL/pawR art is drawn inside each paw's group, after the paw", () => {
    const { container } = render(<Truffle outfit="chef" />);
    expect(container.querySelector('[data-part="paw-l"] .truffle__outfit-paw [data-t="glove-l"]')).toBeTruthy();
    const r = container.querySelector('[data-part="paw-r"]')!;
    expect(r.querySelector('.truffle__outfit-paw [data-t="prop-r"]')).toBeTruthy();
    expect(r.lastElementChild?.classList.contains('truffle__outfit-paw')).toBe(true);
  });
  it('a held prop rides the paw: a raised paw moves its group', () => {
    const { container } = render(<Truffle outfit="chef" paws={{ lx: 0, ly: 0, lr: 0, rx: 4, ry: -62, rr: -12 }} />);
    const r = container.querySelector('[data-part="paw-r"]')!;
    expect(r.getAttribute('transform')).toBe('translate(4 -62) rotate(-12 182 266)');
    expect(r.querySelector('[data-t="prop-r"]')).toBeTruthy();
  });
  it('a held accessory stays over the costume prop in the right paw', () => {
    const { container } = render(<Truffle outfit="chef" accessory="lantern" />);
    expect(container.querySelector('[data-part="paw-r"]')!.lastElementChild?.classList.contains('truffle__accessory--over')).toBe(true);
  });
  it('costumes without paw art leave the paws as they were', () => {
    expect(render(<Truffle outfit="tiger" />).container.querySelector('.truffle__outfit-paw')).toBeNull();
  });
  it('feet (footwear, an animal\'s feet) replace his own paws inside each paw group, so a foot is one foot (parent 2026-10-16)', () => {
    const { container } = render(<Truffle outfit="astronaut" paws={{ lx: 0, ly: 0, lr: 0, rx: 4, ry: -62, rr: -12 }} />);
    const l = container.querySelector('[data-part="paw-l"]')!;
    const r = container.querySelector('[data-part="paw-r"]')!;
    expect(l.querySelector('[data-t="boot-l"]')).toBeTruthy();
    expect(r.querySelector('[data-t="boot-r"]')).toBeTruthy(); // it rides the raised paw
    expect(l.innerHTML).not.toContain(PAW_L.slice(0, 60));
    expect(r.innerHTML).not.toContain(PAW_R.slice(0, 60));
  });
  it('without feet his own paws are drawn', () => {
    expect(render(<Truffle outfit="chef" />).container.querySelector('[data-part="paw-l"]')!.innerHTML).toContain(PAW_L.slice(0, 60));
  });
  it('a raised paw shows its mitt, a resting one its boot; a prop held in it is closed over by the same (parent 2026-10-16)', () => {
    const shown = (c: Element, part: string) => c.querySelector(`[data-part="${part}"]`)!.getAttribute('display');
    const up = render(<Truffle outfit="astronaut" paws={{ lx: 0, ly: 0, lr: 0, rx: 4, ry: -62, rr: -12 }} />).container;
    expect([shown(up, 'foot-r'), shown(up, 'mitt-r'), shown(up, 'foot-r-over'), shown(up, 'mitt-r-over')]).toEqual(['none', 'inline', 'none', 'inline']);
    expect([shown(up, 'foot-l'), shown(up, 'mitt-l')]).toEqual(['inline', 'none']);
    expect(up.querySelector('[data-part="paw-r"]')!.getAttribute('data-raised')).toBe('1');
    const r = up.querySelector('[data-part="paw-r"]')!;
    const order = [...r.querySelectorAll('[data-t]')].map((e) => e.getAttribute('data-t'));
    expect(order).toEqual(['boot-r', 'mitt-r', 'flag', 'boot-r', 'mitt-r']); // the flag between the paw and the paw closing over it
    const knead = render(<Truffle outfit="astronaut" paws={{ lx: 0, ly: -6, lr: 0, rx: 0, ry: 0, rr: 0 }} />).container;
    expect(shown(knead, 'foot-l')).toBe('inline'); // kneading keeps his feet down
    expect(render(<Truffle outfit="chef" />).container.querySelector('[data-part="foot-l"]')).toBeNull(); // no feet: just his paws
  });
});
