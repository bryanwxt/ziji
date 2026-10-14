// Prop moments on One River (spec 2026-10-13 §6; the moment rules of 2026-10-04 §4.5): which creatures and things each world
// has, what each moment does, and the daily finds they host. The find rules are unchanged (src/fun/finds.ts); only where they
// happen moved: the zodiac animal comes out of the paper boat, the gem is the lotus's pearl, the egg is in 恐龙谷, the dig in 海湾.
import type { Sfx } from '../../audio/sfx';
import { findAnimal } from '../../fun/finds';
import type { WorldId } from '../../fun/worlds';
import type { KidState } from '../../types';
import type { ReactionKind } from '../truffle/timelines';

/** What a moment draws (momentFx.ts turns it into SVG). Each world's task adds its kinds to this union. */
export type Fx =
  | { kind: 'boat'; animal: string | null }
  | { kind: 'otters' } | { kind: 'dart' } | { kind: 'glide' } | { kind: 'swing' } | { kind: 'flutter' };

/**
 * A prop and its moment. `auto` moments also start by themselves on Home now and then (never ones that hold a find); `tap` is
 * false for a prop whose spot Home's cards or path cover on some screens (the WebKit sweep): it only plays by itself.
 */
export interface PropMoment { prop: string; label: string; auto: boolean; tap: boolean }

const BOAT: PropMoment = { prop: 'boat', label: '纸船', auto: false, tap: true };

/** Every world has the paper boat first; each world's task adds its creatures after it. */
export const MOMENTS: Record<WorldId, PropMoment[]> = {
  home: [BOAT, { prop: 'otter', label: '水獭', auto: true, tap: true }, { prop: 'kingfisher', label: '翠鸟', auto: true, tap: true }],
  rainforest: [BOAT, { prop: 'hornbill', label: '犀鸟', auto: true, tap: true }, { prop: 'monkey', label: '猴子', auto: true, tap: false }, { prop: 'butterfly', label: '蝴蝶', auto: true, tap: true }],
  bamboo: [BOAT],
  terraces: [BOAT],
  dino: [BOAT],
  lantern: [BOAT],
  cove: [BOAT],
  milkyway: [BOAT],
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

/** One moment. Pure, so the finds keep their rules: one animal, one pearl (after three taps) and one dig star a day; the egg remembered. */
export function runMoment(world: WorldId, prop: string, kid: KidState, today: string, lotusTaps: number): Outcome {
  const f = kid.finds;
  if (prop === 'boat') {
    const r = findAnimal(f, today);
    return r.isNew ? { fx: { kind: 'boat', animal: r.animal }, react: 'excited', kid: { ...kid, finds: r.finds }, say: '找到了！' } : { fx: { kind: 'boat', animal: null }, react: 'watch' };
  }
  switch (`${world}:${prop}`) {
    // each world's task adds its cases here
    case 'home:otter': return { fx: { kind: 'otters' }, react: 'excited', say: '水獭！', later: { say: '它们在玩！', ms: 1200 } };
    case 'home:kingfisher': return { fx: { kind: 'dart' }, react: 'watch', say: '好快！' };
    case 'rainforest:hornbill': return { fx: { kind: 'glide' }, react: 'watch', say: '大鸟！' };
    case 'rainforest:monkey': return { fx: { kind: 'swing' }, react: 'excited', say: '荡秋千！' };
    case 'rainforest:butterfly': return { fx: { kind: 'flutter' }, react: 'pounce' };
  }
  void lotusTaps;
  throw new Error(`no moment for ${world}:${prop}`);
}
