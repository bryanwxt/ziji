// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_FINDS, ZODIAC_ORDER } from '../../fun/finds';
import { WORLDS } from '../../fun/worlds';
import { DEFAULT_KID, type KidState } from '../../types';
import { MOMENTS, runMoment } from './moments';

const kid = (over: Partial<KidState> = {}): KidState => ({ ...DEFAULT_KID, finds: { ...DEFAULT_FINDS }, ...over });
const DAY = '2026-10-06';

describe('One River moments (spec 2026-10-13 §6)', () => {
  it('every world has the paper boat first, and every moment it lists runs', () => {
    for (const w of WORLDS) {
      expect(MOMENTS[w.id][0], w.id).toEqual({ prop: 'boat', label: '纸船', auto: false, tap: true });
      for (const x of MOMENTS[w.id]) expect(() => runMoment(w.id, x.prop, kid(), DAY, 1), `${w.id}:${x.prop}`).not.toThrow();
    }
  });
  it('labels are Chinese (child screens: no English)', () => {
    for (const w of WORLDS) for (const x of MOMENTS[w.id]) expect(x.label, x.prop).toMatch(/^[一-鿿]+$/);
  });
  it('the paper boat gives the next zodiac animal once a day, in any world; otherwise it just bobs', () => {
    for (const w of WORLDS) {
      const first = runMoment(w.id, 'boat', kid(), DAY, 0);
      expect(first.fx).toEqual({ kind: 'boat', animal: 'rat' });
      expect(first.kid!.finds.animals).toEqual(['rat']);
      const again = runMoment(w.id, 'boat', first.kid!, DAY, 0);
      expect(again.kid).toBeUndefined();
      expect(again.fx).toEqual({ kind: 'boat', animal: null });
    }
    const all = kid({ finds: { ...DEFAULT_FINDS, animals: [...ZODIAC_ORDER] } });
    expect(runMoment('home', 'boat', all, DAY, 0).fx).toEqual({ kind: 'boat', animal: null });
  });
});
