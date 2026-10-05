// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_FINDS } from '../../fun/finds';
import { WORLDS } from '../../fun/worlds';
import { DEFAULT_KID, type KidState } from '../../types';
import { MOMENTS, runMoment } from './moments';
import { WORLD_ART } from './scenes';

const kid = (over: Partial<KidState> = {}): KidState => ({ ...DEFAULT_KID, finds: { ...DEFAULT_FINDS }, ...over });
const DAY = '2026-10-06';

describe('prop moments (spec 2026-10-04 §4.5)', () => {
  it("every world has 2–4 moments, one for each of its props, and Truffle's own props are 2–3 of them", () => {
    for (const w of WORLDS) {
      const m = MOMENTS[w.id];
      expect(m.length, w.id).toBeGreaterThanOrEqual(2);
      expect(m.length, w.id).toBeLessThanOrEqual(4);
      expect(m.map((x) => x.prop).sort(), w.id).toEqual(Object.keys(WORLD_ART[w.id].props).sort());
      for (const x of m) expect(() => runMoment(w.id, x.prop, kid(), DAY, 1), `${w.id}:${x.prop}`).not.toThrow();
    }
  });
  it('labels are Chinese (child screens: no English)', () => {
    for (const w of WORLDS) for (const x of MOMENTS[w.id]) expect(x.label, x.prop).toMatch(/^[一-鿿]+$/);
  });
  it('a moment that starts by itself never gives a find (review focus 1)', () => {
    for (const w of WORLDS) for (const x of MOMENTS[w.id].filter((m) => m.auto)) {
      for (let taps = 1; taps <= 5; taps++) expect(runMoment(w.id, x.prop, kid(), DAY, taps).kid, `${w.id}:${x.prop}`).toBeUndefined();
    }
  });
  it('every world has at least one moment that can start by itself on Home', () => {
    for (const w of WORLDS) expect(MOMENTS[w.id].some((m) => m.auto), w.id).toBe(true);
  });
  it('the box in the tall grass shows the next animal once a day', () => {
    const first = runMoment('grass', 'box', kid(), DAY, 1);
    expect(first.fx).toEqual({ kind: 'animal', animal: 'rat' });
    expect(first.kid!.finds.animals).toEqual(['rat']);
    expect(first.say).toBe('找到了！');
    const again = runMoment('grass', 'box', first.kid!, DAY, 1);
    expect(again.kid).toBeUndefined(); // nothing new today; the rat just waves
    expect(again.fx).toEqual({ kind: 'animal', animal: 'rat' });
  });
  it('the gem block cracks three times, then pops the day’s gem; a new day starts over (review focus 3)', () => {
    for (let n = 1; n <= 3; n++) {
      const o = runMoment('blocks', 'gem-block', kid(), DAY, n);
      expect(o.fx).toEqual({ kind: 'crack', cracks: n, gem: false });
      expect(o.kid).toBeUndefined();
    }
    const pop = runMoment('blocks', 'gem-block', kid(), DAY, 4);
    expect(pop.fx).toMatchObject({ kind: 'crack', gem: true });
    expect(pop.kid!.finds.gems).toBe(1);
    expect(runMoment('blocks', 'gem-block', pop.kid!, DAY, 5).kid).toBeUndefined(); // one gem a day
  });
  it('the egg remembers the tap; once hatched the baby hops', () => {
    const o = runMoment('dino', 'nest', kid(), DAY, 1);
    expect(o.fx).toEqual({ kind: 'wobble' });
    expect(o.kid!.finds.eggTapped).toBe(true);
    expect(runMoment('dino', 'nest', o.kid!, DAY, 1).kid).toBeUndefined(); // already remembered
    const hatched = runMoment('dino', 'nest', kid({ finds: { ...DEFAULT_FINDS, eggTapped: true, dinoHatched: true } }), DAY, 1);
    expect(hatched.fx).toEqual({ kind: 'hop' });
    expect(hatched.say).toBe('你好，小恐龙！');
  });
  it('the X gives one bonus star a day, then Truffle just digs', () => {
    const o = runMoment('pirate', 'x', kid({ bonusStars: 2 }), DAY, 1);
    expect(o.fx).toEqual({ kind: 'dig', star: true });
    expect(o.kid).toMatchObject({ bonusStars: 3, finds: { lastDigDate: DAY } });
    const again = runMoment('pirate', 'x', o.kid!, DAY, 1);
    expect(again.kid).toBeUndefined();
    expect(again.say).toBe('挖呀挖！');
  });
  it('the rocket counts down in Chinese; the parrot says hello; the sprinkler gets a flinch, then a laugh', () => {
    expect(runMoment('space', 'rocket', kid(), DAY, 1).speak).toBe('三，二，一！');
    expect(runMoment('pirate', 'parrot', kid(), DAY, 1).speak).toBe('你好！');
    const s = runMoment('yard', 'sprinkler', kid(), DAY, 1);
    expect(s).toMatchObject({ react: 'flinch', say: '哇！', later: { say: '哈哈哈！', ms: 700 } });
  });
  it('Truffle plays along: he pounces on the ball, munches at his bowl and watches the bird', () => {
    expect(runMoment('yard', 'ball', kid(), DAY, 1).react).toBe('pounce');
    expect(runMoment('yard', 'bowl', kid(), DAY, 1)).toMatchObject({ react: 'munch', sfx: 'munch' });
    expect(runMoment('yard', 'birdhouse', kid(), DAY, 1).react).toBe('watch');
  });
});

describe('props Home covers on some screens (WebKit sweep)', () => {
  it('play by themselves rather than wait for a tap that would land on a card or the path', () => {
    const hands = (w: Parameters<typeof runMoment>[0]) => MOMENTS[w].filter((m) => !m.tap).map((m) => m.prop);
    expect(hands('yard')).toEqual(['birdhouse']);
    expect(hands('blocks')).toEqual(['statue']);
    expect(hands('space')).toEqual(['yarn']);
    expect(hands('pirate')).toEqual(['parrot']);
    for (const w of WORLDS) {
      for (const m of MOMENTS[w.id].filter((x) => !x.tap)) expect(m.auto, `${w.id}:${m.prop}`).toBe(true);
      expect(MOMENTS[w.id].some((m) => m.tap), w.id).toBe(true);
    }
  });
});

