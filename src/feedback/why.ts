// Why a wrong answer was wrong (spec 2026-10-12 §3): the part that tells two look-alikes apart, and the kind of pinyin slip.
// Worked out at runtime from the content's components and radicals; the sheets in src/ui/stage/WhyLine.tsx show them.
import { getCharInfo, hanChars } from '../content';
import { radicalMeaning } from '../content/radicals';
import { taughtAt } from '../content/curriculum';
import { TRIVIAL } from '../activities/components/zibian';
import { soundParts, splitSyllable } from '../activities/flashcards/pinyinTraps';
import { syllableTone } from '../activities/flashcards/tones';
import type { Word } from '../types';

/** A character's parts worth naming: its radical and components, never itself; a trivial part only when it is its meaningful radical (何's 亻). */
function partsOf(ch: string): string[] {
  const info = getCharInfo(ch);
  if (!info) return [];
  const out: string[] = [];
  for (const p of [info.radical, ...info.components]) {
    if (!p || p === ch || out.includes(p)) continue;
    if (TRIVIAL.has(p) && !(p === info.radical && radicalMeaning(p))) continue;
    out.push(p);
  }
  return out;
}

/**
 * The parts in one character and not the other (河 · 何 → 氵 · 亻). Nothing when they share no part (not look-alikes) or only
 * trivial strokes differ; a part inside a shared part is no difference (生 · 星 → only 星's 日).
 */
export function differingParts(a: string, b: string): { right: string[]; picked: string[] } {
  const pa = partsOf(a);
  const pb = partsOf(b);
  const inB = new Set([b, ...pb]);
  const shared = [a, ...pa].filter((x) => inB.has(x));
  if (a === b || !shared.length) return { right: [], picked: [] };
  const inside = new Set(shared.flatMap((s) => {
    const info = getCharInfo(s);
    return [s, ...(info ? [info.radical, ...info.components] : [])];
  }));
  return { right: pa.filter((p) => !inside.has(p)), picked: pb.filter((p) => !inside.has(p)) };
}

/**
 * A character as the sum of its parts beside a look-alike (扫 · 扬 → 扫 = 扌 + 彐, 彐 its own): the parts both share and the
 * parts only it has, in its own order. Empty when it has none to show beyond itself (生 inside 星).
 */
export function partsSum(ch: string, other: string): { part: string; own: boolean }[] {
  const own = new Set(differingParts(ch, other).right);
  const inOther = new Set([other, ...partsOf(other)]);
  return partsOf(ch).filter((p) => own.has(p) || inOther.has(p)).map((p) => ({ part: p, own: own.has(p) }));
}

/** A part a P1–P3 child knows (review 2026-10-17): a radical with a meaning (氵 water) or a character his book teaches (its
 *  lists run 一上 to 三下). 丷, 冏, 彐 or 亠 are strokes to him, not parts. */
export const knownPart = (p: string): boolean => !!radicalMeaning(p) || taughtAt(p) !== undefined;

/** Two characters that really look alike: something tells them apart, and what they share is at least half of each (河 · 何
 *  share 可, 根 · 跟 share 艮, 生 is inside 星); 衣 · 商 share only 亠, a sliver of 商, so no. */
export function lookAlike(a: string, b: string): boolean {
  const d = differingParts(a, b);
  if (!d.right.length && !d.picked.length) return false;
  const bulk = (x: string, y: string) => {
    const mine = partsOf(x);
    const inY = new Set([y, ...partsOf(y)]);
    return inY.has(x) || mine.filter((p) => inY.has(p)).length * 2 >= mine.length;
  };
  return bulk(a, b) && bulk(b, a);
}

/** What the why-line shows of one character beside its look-alike: a sum of two parts he knows (河 = 氵 + 可), else the parts
 *  only it has when he knows them all (根 → 木: its 艮 is no part to him); null when nothing is left (商 → 口 丷 冏). */
export function partsToShow(ch: string, other: string): { kind: 'sum'; parts: { part: string; own: boolean }[] } | { kind: 'own'; parts: string[] } | null {
  const sum = partsSum(ch, other);
  if (sum.length === 2 && sum.every((s) => knownPart(s.part))) return { kind: 'sum', parts: sum };
  const own = differingParts(ch, other).right;
  return own.length && own.every(knownPart) ? { kind: 'own', parts: own } : null;
}

export type PinyinSlip =
  | { kind: 'tone'; right: string; picked: string }
  | { kind: 'soundPart'; part: string; partReading: string; char: string; right: string }
  | { kind: 'initial' | 'final'; right: [string, string]; picked: [string, string] } // the toned syllable cut after its initial
  | { kind: 'other' };

/** The kind of slip in a picked reading: one syllable wrong — the sound part's reading, its tone, its initial or its final. */
export function pinyinSlip(word: Word, picked: string): PinyinSlip {
  const right = word.pinyin.trim().split(/\s+/);
  const mine = picked.trim().split(/\s+/);
  if (right.length !== mine.length) return { kind: 'other' };
  const diff = right.flatMap((s, i) => (s === mine[i] ? [] : [i]));
  if (diff.length !== 1) return { kind: 'other' };
  const r = right[diff[0]!]!;
  const p = mine[diff[0]!]!;
  const chars = hanChars(word.text);
  const part = chars.length === 1 ? soundParts(chars[0]!).find((s) => s.reading === p) : undefined;
  if (part) return { kind: 'soundPart', part: part.part, partReading: part.reading, char: chars[0]!, right: r };
  const a = syllableTone(r);
  const b = syllableTone(p);
  if (a.base === b.base) return { kind: 'tone', right: r, picked: p };
  if (a.tone !== b.tone) return { kind: 'other' };
  const [ai, af] = splitSyllable(a.base);
  const [bi, bf] = splitSyllable(b.base);
  const cut = (s: string, n: number): [string, string] => [s.slice(0, n), s.slice(n)];
  if (ai !== bi && af === bf) return { kind: 'initial', right: cut(r, ai.length), picked: cut(p, bi.length) };
  if (ai === bi && af !== bf) return { kind: 'final', right: cut(r, ai.length), picked: cut(p, bi.length) };
  return { kind: 'other' };
}
