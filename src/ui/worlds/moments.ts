// Prop moments (spec 2026-10-04 §4.5): Truffle plays with his own things without walking across the screen. Which props
// each world has, what each moment does, and the daily finds they host (spec §15) — the same finds as before, now on props.
import type { Sfx } from '../../audio/sfx';
import { dig, findAnimal, tapEgg, tapGem } from '../../fun/finds';
import type { WorldId } from '../../fun/worlds';
import type { KidState } from '../../types';
import type { ReactionKind } from '../truffle/timelines';

/** What a moment draws (momentFx.ts turns it into SVG). */
export type Fx =
  | { kind: 'spray' } | { kind: 'munch' } | { kind: 'roll' } | { kind: 'bird' }
  | { kind: 'animal'; animal: string } | { kind: 'flutter' }
  | { kind: 'lap' } | { kind: 'tip' }
  | { kind: 'crack'; cracks: number; gem: boolean } | { kind: 'scratch' } | { kind: 'sparkle' }
  | { kind: 'wobble' } | { kind: 'hop' } | { kind: 'drops' }
  | { kind: 'bubbles' } | { kind: 'swim' }
  | { kind: 'launch' } | { kind: 'drift' }
  | { kind: 'dig'; star: boolean } | { kind: 'open' } | { kind: 'flap' };

/**
 * A prop and its moment. `auto` moments also start by themselves on Home now and then (never ones that hold a find); `tap` is
 * false for a prop whose spot Home's cards or path cover on some screens (the WebKit sweep): it only plays by itself.
 */
export interface PropMoment { prop: string; label: string; auto: boolean; tap: boolean }

export const MOMENTS: Record<WorldId, PropMoment[]> = {
  yard: [{ prop: 'sprinkler', label: '洒水器', auto: false, tap: true }, { prop: 'bowl', label: '小碗', auto: true, tap: true }, { prop: 'ball', label: '红球', auto: true, tap: true }, { prop: 'birdhouse', label: '鸟屋', auto: true, tap: false }],
  grass: [{ prop: 'box', label: '纸箱', auto: false, tap: true }, { prop: 'butterfly', label: '蝴蝶', auto: true, tap: true }],
  race: [{ prop: 'kart', label: '赛车', auto: false, tap: true }, { prop: 'cone', label: '路障', auto: true, tap: true }],
  blocks: [{ prop: 'gem-block', label: '宝石', auto: false, tap: true }, { prop: 'post', label: '猫抓板', auto: true, tap: true }, { prop: 'statue', label: '猫雕像', auto: true, tap: false }],
  dino: [{ prop: 'nest', label: '恐龙蛋', auto: false, tap: true }, { prop: 'leaf', label: '大叶子', auto: true, tap: true }],
  sea: [{ prop: 'sub', label: '潜水艇', auto: false, tap: true }, { prop: 'fish', label: '小鱼', auto: true, tap: true }],
  space: [{ prop: 'rocket', label: '火箭', auto: false, tap: true }, { prop: 'yarn', label: '毛线球', auto: true, tap: false }],
  pirate: [{ prop: 'x', label: '宝藏', auto: false, tap: true }, { prop: 'chest', label: '藏宝箱', auto: false, tap: true }, { prop: 'parrot', label: '鹦鹉', auto: true, tap: false }],
};

/** What happens: what is drawn, how Truffle reacts, what he says (and a line after), what is spoken, a sound, a saved find. */
export interface Outcome {
  fx: Fx;
  react: ReactionKind;
  say?: string;
  later?: { say: string; ms: number };
  speak?: string;
  sfx?: Sfx;
  kid?: KidState;
}

/** One moment. Pure, so the finds keep their rules: one animal, one gem (after three cracks) and one dig star a day; the egg remembered. */
export function runMoment(world: WorldId, prop: string, kid: KidState, today: string, gemTaps: number): Outcome {
  const f = kid.finds;
  switch (`${world}:${prop}`) {
    case 'yard:sprinkler': return { fx: { kind: 'spray' }, react: 'flinch', say: '哇！', later: { say: '哈哈哈！', ms: 700 } };
    case 'yard:bowl': return { fx: { kind: 'munch' }, react: 'munch', say: '好吃！', sfx: 'munch' };
    case 'yard:ball': return { fx: { kind: 'roll' }, react: 'pounce' };
    case 'yard:birdhouse': return { fx: { kind: 'bird' }, react: 'watch', say: '小鸟！' };
    case 'grass:box': {
      const r = findAnimal(f, today);
      return { fx: { kind: 'animal', animal: r.animal }, react: 'excited', ...(r.isNew ? { kid: { ...kid, finds: r.finds }, say: '找到了！' } : {}) };
    }
    case 'grass:butterfly': return { fx: { kind: 'flutter' }, react: 'pounce' };
    case 'race:kart': return { fx: { kind: 'lap' }, react: 'excited', say: '出发！' };
    case 'race:cone': return { fx: { kind: 'tip' }, react: 'pounce' };
    case 'blocks:gem-block': {
      const r = tapGem(f, today, gemTaps);
      return { fx: { kind: 'crack', cracks: r.cracks, gem: r.gem }, react: r.gem ? 'excited' : 'watch', ...(r.gem ? { kid: { ...kid, finds: r.finds }, say: '宝石！' } : {}) };
    }
    case 'blocks:post': return { fx: { kind: 'scratch' }, react: 'excited' };
    case 'blocks:statue': return { fx: { kind: 'sparkle' }, react: 'proud', say: '像我！' };
    case 'dino:nest': {
      if (f.dinoHatched) return { fx: { kind: 'hop' }, react: 'excited', say: '你好，小恐龙！' };
      const next = tapEgg(f);
      return { fx: { kind: 'wobble' }, react: 'watch', ...(next !== f ? { kid: { ...kid, finds: next } } : {}) };
    }
    case 'dino:leaf': return { fx: { kind: 'drops' }, react: 'flinch' };
    case 'sea:sub': return { fx: { kind: 'bubbles' }, react: 'excited' };
    case 'sea:fish': return { fx: { kind: 'swim' }, react: 'pounce', say: '小鱼！' };
    case 'space:rocket': return { fx: { kind: 'launch' }, react: 'excited', speak: '三，二，一！' };
    case 'space:yarn': return { fx: { kind: 'drift' }, react: 'pounce' };
    case 'pirate:x': {
      const r = dig(f, today);
      return { fx: { kind: 'dig', star: r.star }, react: 'excited', ...(r.star ? { kid: { ...kid, finds: r.finds, bonusStars: kid.bonusStars + 1 }, say: '找到星星了！' } : { say: '挖呀挖！' }) };
    }
    case 'pirate:chest': return { fx: { kind: 'open' }, react: 'excited', say: '哇！' };
    case 'pirate:parrot': return { fx: { kind: 'flap' }, react: 'watch', speak: '你好！' };
  }
  throw new Error(`no moment for ${world}:${prop}`);
}
