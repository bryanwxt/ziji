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
  it('家门口 and 雨林: the otters, the kingfisher, the hornbill, the monkey and the butterfly; the monkey only plays by itself (the cards cover the walkway)', () => {
    expect(MOMENTS.home.map((m) => m.prop)).toEqual(['boat', 'otter', 'kingfisher']);
    expect(MOMENTS.rainforest.map((m) => m.prop)).toEqual(['boat', 'hornbill', 'monkey', 'butterfly']);
    expect(MOMENTS.rainforest.find((m) => m.prop === 'monkey')).toMatchObject({ auto: true, tap: false });
    expect(runMoment('home', 'otter', kid(), DAY, 0)).toMatchObject({ fx: { kind: 'otters' }, react: 'excited', say: '水獭！', later: { say: '它们在玩！', ms: 1200 } });
    for (const w of ['home', 'rainforest'] as const) for (const m of MOMENTS[w].filter((x) => x.auto)) expect(runMoment(w, m.prop, kid(), DAY, 3).kid).toBeUndefined();
  });
  it('竹林 and 梯田: the panda munches then rolls (with the munch sound), the frog hops; the kite only plays by itself (the cards cover its sky)', () => {
    expect(MOMENTS.bamboo.map((m) => m.prop)).toEqual(['boat', 'panda', 'frog']);
    expect(MOMENTS.terraces.map((m) => m.prop)).toEqual(['boat', 'ducks', 'kite', 'dragonfly']);
    expect(runMoment('bamboo', 'panda', kid(), DAY, 0)).toMatchObject({ fx: { kind: 'roll' }, react: 'munch', sfx: 'munch', later: { say: '哈哈，打滚了！' } });
    expect(MOMENTS.terraces.find((m) => m.prop === 'kite')).toMatchObject({ auto: true, tap: false });
  });
  it('the lotus opens over three taps, and the fourth shows the day\'s pearl (the gem rule)', () => {
    for (let n = 1; n <= 3; n++) {
      const o = runMoment('lantern', 'lotus', kid(), DAY, n);
      expect(o.fx).toEqual({ kind: 'bloom', opened: n, pearl: false });
      expect(o.kid).toBeUndefined();
    }
    const pop = runMoment('lantern', 'lotus', kid(), DAY, 4);
    expect(pop.fx).toMatchObject({ kind: 'bloom', pearl: true });
    expect(pop.kid!.finds.gems).toBe(1);
    expect(pop.say).toBe('珍珠！');
    expect(runMoment('lantern', 'lotus', pop.kid!, DAY, 5).kid).toBeUndefined();
  });
  it('the egg in 恐龙谷 remembers the tap; once hatched the baby hops', () => {
    const o = runMoment('dino', 'nest', kid(), DAY, 0);
    expect(o.fx).toEqual({ kind: 'wobble' });
    expect(o.kid!.finds.eggTapped).toBe(true);
    expect(runMoment('dino', 'nest', o.kid!, DAY, 0).kid).toBeUndefined();
    const hatched = runMoment('dino', 'nest', kid({ finds: { ...DEFAULT_FINDS, eggTapped: true, dinoHatched: true } }), DAY, 0);
    expect(hatched).toMatchObject({ fx: { kind: 'hatchling' }, say: '你好，小恐龙！' });
  });
  it('every world has the boat and 1–3 creatures or things, each with a moment', () => {
    for (const w of WORLDS) {
      const m = MOMENTS[w.id];
      expect(m[0]!.prop, w.id).toBe('boat');
      expect(m.length, w.id).toBeGreaterThanOrEqual(3);
      expect(m.length, w.id).toBeLessThanOrEqual(4);
      for (const x of m) expect(() => runMoment(w.id, x.prop, kid(), DAY, 1), `${w.id}:${x.prop}`).not.toThrow();
    }
  });
  it('a moment that starts by itself never gives a find, and every world has one', () => {
    for (const w of WORLDS) {
      expect(MOMENTS[w.id].some((m) => m.auto), w.id).toBe(true);
      for (const x of MOMENTS[w.id].filter((m) => m.auto)) for (let taps = 1; taps <= 5; taps++) expect(runMoment(w.id, x.prop, kid(), DAY, taps).kid, `${w.id}:${x.prop}`).toBeUndefined();
    }
  });
  it('a prop Home covers on some screens only plays by itself; every world keeps one to tap', () => {
    for (const w of WORLDS) {
      for (const m of MOMENTS[w.id].filter((x) => !x.tap)) expect(m.auto, `${w.id}:${m.prop}`).toBe(true);
      expect(MOMENTS[w.id].some((m) => m.tap), w.id).toBe(true);
    }
  });
  it('the X in 海湾 gives one bonus star a day, then Truffle just digs', () => {
    const o = runMoment('cove', 'x', kid({ bonusStars: 2 }), DAY, 0);
    expect(o.fx).toEqual({ kind: 'dig', star: true });
    expect(o.kid).toMatchObject({ bonusStars: 3, finds: { lastDigDate: DAY } });
    const again = runMoment('cove', 'x', o.kid!, DAY, 0);
    expect(again.kid).toBeUndefined();
    expect(again.say).toBe('挖呀挖！');
  });
  it('the finds live only where the spec puts them', () => {
    const hosts = WORLDS.flatMap((w) => MOMENTS[w.id].filter((m) => !m.auto).map((m) => `${w.id}:${m.prop}`)).filter((h) => !h.endsWith(':boat'));
    expect(hosts).toEqual(['dino:nest', 'lantern:lotus', 'cove:x']);
  });
});
