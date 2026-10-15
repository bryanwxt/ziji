// "Almost there" goals (rewards spec 2026-10-15 §4): after every lesson, up to three things he is close to, nearest first.
import { localDateKey } from '../lib/date';
import type { OneDayAway } from '../stats/produce';
import type { Knowledge } from '../stats/stats';
import type { KidState } from '../types';
import type { IconName } from '../ui/icons/icons';
import { costumesLeft } from './costumes';
import { METER_FULL, meterShown } from './meter';
import { POWERS, tierFor, type PowerId } from './powers';
import type { StickerFamily } from './stickers';
import { WORLDS } from './worlds';

export type GoalKind = 'write' | 'chest' | 'badge' | 'power' | 'world';
/** A goal as the Celebration shows it: its line (Chinese, read with pinyin), its icon, and the effort left (for ranking). */
export interface Goal { kind: GoalKind; zh: string; icon: IconName; effort: number }

/** What the goals are worked out from, gathered once as the Celebration loads (src/app/celebrationData.ts). */
export interface GoalFacts {
  journey: number; // characters learned since placement (the worlds count these)
  oneDay: OneDayAway[]; // words one passing day from can-write / can-say
  lessonChars: ReadonlySet<string>; // characters whose Read passed today: what the lesson moved
  counted: boolean; // the lesson moved the river meter
  families: StickerFamily[];
  powers: Record<PowerId, string[]>;
}

export const MAX_GOALS = 3;
const MAX_ONE_DAY = 2;
/** Within reach this week: about a week of new characters at his pace. */
export const WEEK_REACH = 15;
const TIE_ORDER: GoalKind[] = ['write', 'chest', 'badge', 'power', 'world'];

/** The next power tier's threshold (tierFor's steps: 3 known, then half, then all). */
function nextTierAt(size: number, known: number): number {
  const t1 = Math.min(3, size);
  const t2 = Math.max(Math.ceil(size / 2), t1);
  return known < t1 ? t1 : known < t2 ? t2 : size;
}

export function almostThere(kid: KidState, know: Pick<Knowledge, 'knownChars'>, facts: GoalFacts, now: Date): Goal[] {
  const today = localDateKey(now);
  const touched = (chars: readonly string[]) => chars.some((ch) => facts.lessonChars.has(ch));
  const out: (Goal & { moved: boolean })[] = [];

  for (const w of facts.oneDay.slice(0, MAX_ONE_DAY)) {
    out.push({
      kind: 'write',
      zh: w.kind === 'write' ? `明天再写对『${w.text}』，就会写了！` : `明天再说对『${w.text}』，就会说了！`,
      icon: w.kind === 'write' ? 'pen' : 'mic',
      effort: 1,
      moved: localDateKey(new Date(w.at)) === today,
    });
  }

  const left = costumesLeft(kid);
  if (left > 0) {
    const shown = meterShown(kid, today); // as Home's small boat shows it: a new day's meter has the bank in it
    out.push({ kind: 'chest', zh: `宝箱里还有 ${left} 件新衣服`, icon: 'gift', effort: shown.capped ? METER_FULL : METER_FULL - shown.halves, moved: facts.counted });
  }

  const badge = facts.families
    .filter((f) => !kid.badgesSeen.includes(f.component))
    .map((f) => ({ f, need: f.chars.filter((ch) => !know.knownChars.has(ch)).length }))
    .filter((x) => x.need > 0)
    .sort((a, b) => a.need - b.need)[0];
  if (badge) out.push({ kind: 'badge', zh: `再认识 ${badge.need} 个『${badge.f.component}』字，得到新徽章`, icon: 'medal', effort: badge.need, moved: touched(badge.f.chars) });

  const power = POWERS.map((p) => {
    const chars = facts.powers[p.id] ?? [];
    const known = chars.filter((ch) => know.knownChars.has(ch)).length;
    return { p, chars, need: tierFor(chars.length, known) < 3 ? nextTierAt(chars.length, known) - known : 0 };
  })
    .filter((x) => x.need > 0)
    .sort((a, b) => a.need - b.need)[0];
  if (power) out.push({ kind: 'power', zh: `再认识 ${power.need} 个『${power.p.name}』字，解锁新能力`, icon: power.p.mark, effort: power.need, moved: touched(power.chars) });

  const next = WORLDS.find((w) => w.at > facts.journey);
  if (next) out.push({ kind: 'world', zh: `还差 ${next.at - facts.journey} 个字到 ${next.zh}`, icon: 'mountain', effort: next.at - facts.journey, moved: facts.lessonChars.size > 0 });

  return out
    .filter((g) => g.moved || g.effort <= WEEK_REACH)
    .sort((a, b) => a.effort - b.effort || TIE_ORDER.indexOf(a.kind) - TIE_ORDER.indexOf(b.kind))
    .slice(0, MAX_GOALS)
    .map(({ moved: _moved, ...g }) => g);
}
