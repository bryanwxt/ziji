import { render } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
vi.mock('./v3', () => ({
  V3: {
    chef: () => ({ back: '', body: '<path d="M110 190 L210 190"/>', head: '<path d="M60 90 L260 90"/>', pawL: '<circle data-t="glove-l" cx="138" cy="266" r="4"/>', pawR: '<circle data-t="prop-r" cx="200" cy="230" r="9"/>', hidesEars: false }),
  },
}));
import { Truffle } from './Truffle';

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
});
