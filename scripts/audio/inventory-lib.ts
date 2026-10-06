// What a neural voice is asked to say, and how each clip is named (spec 2026-10-06 §4).
import { pinyin } from 'pinyin-pro';
import SAY_AS from '../../src/audio/sayAs.json';

export type ClipKind = 'char' | 'word' | 'sentence' | 'fragment';
export interface ClipJob { key: string; id: string; text: string; engineText: string; expected: string; kind: ClipKind; sure: boolean }

/** FNV-1a 64-bit of the UTF-8 bytes, as 16 hex digits. */
export function fnv64(s: string): string {
  let h = 0xcbf29ce484222325n;
  for (const b of new TextEncoder().encode(s)) h = ((h ^ BigInt(b)) * 0x100000001b3n) & 0xffffffffffffffffn;
  return h.toString(16).padStart(16, '0');
}

/** A clip's file name: a new reading or a new voice is a new file, so a file never changes once written. */
export const clipId = (key: string, expected: string, voice: string): string => fnv64(`${key}\u0000${expected}\u0000${voice}`);

const isHan = (c: string) => /\p{Script=Han}/u.test(c);
const marked = (s: string) => /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(s);
const SANDHI = new Set(['一', '不']); // engines change their tone from the next syllable: never swapped
const readingsCache = new Map<string, string[]>();
const readingsOf = (ch: string) => {
  let r = readingsCache.get(ch);
  if (!r) readingsCache.set(ch, (r = [...new Set(pinyin(ch, { multiple: true, type: 'array' }))]));
  return r;
};
/**
 * Toned syllable → a common character read that way and not a 多音字 a child meets (scripts/gen-say-as.ts's table, which
 * already steers the iPad voice). pinyin-pro lists rare readings even for 条 and 车, so "one reading" is not the test.
 */
const TWINS: Record<string, string> = Object.fromEntries(
  Object.entries((SAY_AS as { plain: Record<string, string> }).plain).filter(([, c]) => !SANDHI.has(c)),
);

/** Does the engine need help with this character? 一/不, 儿化 and 轻声 come right from the word itself. */
const needsHelp = (ch: string, want: string, got: string | undefined) => !SANDHI.has(ch) && want !== 'r' && marked(want) && got !== want;

/**
 * The text an engine is given so every character is read as `expected` says (space-separated, one syllable per character).
 * A lone 多音字 is always swapped (below). In a longer word, where a context reader (pinyin-pro, which works like the engines'
 * own front ends) would read a character otherwise, that character is swapped for a plain one with the wanted reading: the
 * same sound, so the same audio. `sure` is false when the pinyin can't be lined up or a swap didn't settle it: those clips go
 * on the parent's spot-listen list.
 */
export function engineText(text: string, expected: string): { text: string; sure: boolean } {
  const chars = Array.from(text);
  const want = expected.trim().split(/\s+/);
  const hanAt = chars.flatMap((c, i) => (isHan(c) ? [i] : []));
  if (hanAt.length !== want.length) return { text, sure: false };
  // A lone 多音字 has no context: a voice guesses its reading (调 alone came out diào, parent 2026-10-05), and pinyin-pro's
  // guess (tiáo) is no guide to a voice's. So it is always said as a plain character with only the taught reading.
  if (chars.length === 1 && hanAt.length === 1 && !SANDHI.has(text) && readingsOf(text).length > 1) {
    const twin = TWINS[want[0]!];
    if (twin) return { text: twin, sure: true };
    return { text, sure: pinyin(text) === want[0] }; // no twin: fine when the taught reading is its common one (大 dà, 说 shuō)
  }
  for (let pass = 0; pass < 3; pass++) {
    const got = pinyin(chars.join(''), { type: 'all' }).filter((p) => p.isZh).map((p) => p.pinyin);
    const wrong = hanAt.map((at, k) => [at, k] as const).filter(([at, k]) => needsHelp(chars[at]!, want[k]!, got[k]));
    if (!wrong.length) return { text: chars.join(''), sure: true };
    let changed = false;
    for (const [at, k] of wrong) {
      const twin = TWINS[want[k]!];
      if (twin && twin !== chars[at]) { chars[at] = twin; changed = true; }
    }
    if (!changed) break;
  }
  return { text: chars.join(''), sure: false };
}
