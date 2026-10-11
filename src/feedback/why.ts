// Why a wrong answer was wrong (spec 2026-10-12 §3): the part that tells two look-alikes apart, and the kind of pinyin slip.
// Worked out at runtime from the content's components and radicals; the sheets in src/ui/stage/WhyLine.tsx show them.
import { getCharInfo, hanChars } from '../content';
import { radicalMeaning } from '../content/radicals';
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
