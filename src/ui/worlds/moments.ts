// Prop moments on One River (spec 2026-10-13 §6; the moment rules of 2026-10-04 §4.5): which creatures and things each world
// has, what each moment does, and the daily finds they host. The find rules are unchanged (src/fun/finds.ts); only where they
// happen moved: the zodiac animal comes out of the paper boat, the gem is the lotus's pearl, the egg is in 恐龙谷, the dig in 海湾.
import type { Sfx } from '../../audio/sfx';
import { dig, findAnimal, tapEgg, tapGem } from '../../fun/finds';
import type { WorldId } from '../../fun/worlds';
import type { KidState } from '../../types';
import type { ReactionKind } from '../truffle/timelines';

/** What a moment draws (momentFx.ts turns it into SVG). Each world's task adds its kinds to this union. */
export type Fx =
  | { kind: 'boat'; animal: string | null }
  | { kind: 'otters' } | { kind: 'dart' } | { kind: 'glide' } | { kind: 'swing' } | { kind: 'flutter' }
  | { kind: 'roll' } | { kind: 'hop' } | { kind: 'paddle' } | { kind: 'dip' } | { kind: 'zip' }
  | { kind: 'wobble' } | { kind: 'hatchling' } | { kind: 'soar' } | { kind: 'puff' } | { kind: 'bloom'; opened: number; pearl: boolean } | { kind: 'leap' } | { kind: 'rise' }
  | { kind: 'dig'; star: boolean } | { kind: 'scuttle' } | { kind: 'flap' } | { kind: 'bridge' } | { kind: 'streak' };

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
  bamboo: [BOAT, { prop: 'panda', label: '熊猫', auto: true, tap: true }, { prop: 'frog', label: '青蛙', auto: true, tap: true }],
  terraces: [BOAT, { prop: 'ducks', label: '鸭子', auto: true, tap: true }, { prop: 'kite', label: '风筝', auto: true, tap: false }, { prop: 'dragonfly', label: '蜻蜓', auto: true, tap: true }],
  dino: [BOAT, { prop: 'nest', label: '恐龙蛋', auto: false, tap: true }, { prop: 'pterosaur', label: '翼龙', auto: true, tap: true }, { prop: 'volcano', label: '火山', auto: true, tap: true }],
  lantern: [BOAT, { prop: 'lotus', label: '荷花', auto: false, tap: true }, { prop: 'koi', label: '锦鲤', auto: true, tap: true }, { prop: 'skylantern', label: '孔明灯', auto: true, tap: true }],
  cove: [BOAT, { prop: 'x', label: '宝藏', auto: false, tap: true }, { prop: 'crab', label: '螃蟹', auto: true, tap: true }, { prop: 'parrot', label: '鹦鹉', auto: true, tap: true }],
  milkyway: [BOAT, { prop: 'magpies', label: '喜鹊', auto: true, tap: true }, { prop: 'shootingstar', label: '流星', auto: true, tap: true }],
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
    case 'bamboo:panda': return { fx: { kind: 'roll' }, react: 'munch', say: '好吃！', later: { say: '哈哈，打滚了！', ms: 1300 }, sfx: 'munch' };
    case 'bamboo:frog': return { fx: { kind: 'hop' }, react: 'pounce', say: '呱呱！' };
    case 'terraces:ducks': return { fx: { kind: 'paddle' }, react: 'watch', say: '鸭妈妈和鸭宝宝！' };
    case 'terraces:kite': return { fx: { kind: 'dip' }, react: 'excited', say: '飞高高！' };
    case 'terraces:dragonfly': return { fx: { kind: 'zip' }, react: 'pounce' };
    case 'dino:nest': {
      if (f.dinoHatched) return { fx: { kind: 'hatchling' }, react: 'excited', say: '你好，小恐龙！' };
      const next = tapEgg(f);
      return { fx: { kind: 'wobble' }, react: 'watch', ...(next !== f ? { kid: { ...kid, finds: next } } : {}) };
    }
    case 'dino:pterosaur': return { fx: { kind: 'soar' }, react: 'watch', say: '翼龙！' };
    case 'dino:volcano': return { fx: { kind: 'puff' }, react: 'flinch', say: '哇！' };
    case 'lantern:lotus': {
      const r = tapGem(f, today, lotusTaps);
      return { fx: { kind: 'bloom', opened: r.cracks, pearl: r.gem }, react: r.gem ? 'excited' : 'watch', ...(r.gem ? { kid: { ...kid, finds: r.finds }, say: '珍珠！' } : {}) };
    }
    case 'lantern:koi': return { fx: { kind: 'leap' }, react: 'pounce', say: '鱼跳起来了！' };
    case 'lantern:skylantern': return { fx: { kind: 'rise' }, react: 'watch', say: '飞走了！' };
    case 'cove:x': {
      const r = dig(f, today);
      return { fx: { kind: 'dig', star: r.star }, react: 'excited', ...(r.star ? { kid: { ...kid, finds: r.finds, bonusStars: kid.bonusStars + 1 }, say: '找到星星了！' } : { say: '挖呀挖！' }) };
    }
    case 'cove:crab': return { fx: { kind: 'scuttle' }, react: 'pounce', say: '横着走！' };
    case 'cove:parrot': return { fx: { kind: 'flap' }, react: 'watch', say: '你好！' }; // it may start by itself, which never speaks: Truffle says hello back
    case 'milkyway:magpies': return { fx: { kind: 'bridge' }, react: 'proud', say: '鹊桥！' };
    case 'milkyway:shootingstar': return { fx: { kind: 'streak' }, react: 'excited', say: '许个愿！' };
  }
  throw new Error(`no moment for ${world}:${prop}`);
}
