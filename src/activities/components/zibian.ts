import { BUILTIN, getCharInfo, HSK_WORDS } from '../../content';
import { shuffle, type Rng } from '../../lib/random';
import type { Word } from '../../types';

/** One 字辨 item (spec §20 part 8): a word with one character missing, and 4 look-alike characters to fish from. */
export interface ZibianItem { wordId: string; word: string; index: number; answer: string; options: string[] }

export const zibianCount = (minutes: number) => (minutes < 25 ? 4 : 6);
const MIN_ITEMS = 4;
const TRIVIAL = new Set(['一', '丨', '丶', '丿', '乙', '亅', '二', '十', '口', '人', '亻']); // parts so common that sharing one says nothing

const strokes = new Map(BUILTIN.map((c) => [c.char, c.strokes]));
const level = new Map(BUILTIN.map((c) => [c.char, c.level]));
let parts: Map<string, string[]> | null = null;
/** part → the built-in characters that contain it (from makemeahanzi's decomposition, already in the content). */
function partIndex(): Map<string, string[]> {
  if (parts) return parts;
  parts = new Map();
  for (const c of BUILTIN) for (const p of new Set([c.radical, ...c.components])) if (p !== c.char) (parts.get(p) ?? parts.set(p, []).get(p)!).push(c.char);
  return parts;
}

/** Look-alikes of `ch` in two groups: the same phonetic part with another radical — his own mistake (银 → 根 很 跟) — and the same radical with about as many strokes (容 → 室). */
function lookAlikeGroups(ch: string): { phonetic: string[]; radical: string[] } {
  const info = getCharInfo(ch);
  if (!info) return { phonetic: [], radical: [] };
  const idx = partIndex();
  const phonetic = [...new Set(info.components.filter((p) => p !== info.radical && p !== ch && !TRIVIAL.has(p)).flatMap((p) => idx.get(p) ?? []))].filter((c) => c !== ch);
  const sameRadical = TRIVIAL.has(info.radical) ? [] : (idx.get(info.radical) ?? []).filter((c) => c !== ch && !phonetic.includes(c) && Math.abs((strokes.get(c) ?? 0) - (strokes.get(ch) ?? 0)) <= 2);
  return { phonetic, radical: sameRadical };
}

/** Characters a child could put for `ch`: the same phonetic part first (跟 根 很 银), then the same radical with about as many strokes (容 室). */
export function lookAlikeChars(ch: string): string[] {
  const g = lookAlikeGroups(ch);
  return [...g.phonetic, ...g.radical];
}

/**
 * The missing character of a word and 3 look-alikes, shuffled, or null when there aren't 3. His own mistake first (the same
 * phonetic part), then the same radical; characters he knows before ones near his level; none makes another real word there.
 */
export function fillChoices(chars: string[], k: number, rng: Rng, known: ReadonlySet<string> = new Set()): string[] | null {
  const answer = chars[k]!;
  const fits = (o: string) => HSK_WORDS.has(chars.map((c, j) => (j === k ? o : c)).join(''));
  const g = lookAlikeGroups(answer);
  const usable = (list: string[], knownOnly: boolean) => list.filter((c) => !fits(c) && (knownOnly ? known.has(c) : !known.has(c) && (level.get(c) ?? 7) <= (level.get(answer) ?? 7) + 1));
  const wrong = [usable(g.phonetic, true), usable(g.radical, true), usable(g.phonetic, false), usable(g.radical, false)].flatMap((l) => shuffle(l, rng)).slice(0, 3);
  return wrong.length < 3 ? null : shuffle([answer, ...wrong], rng);
}

/**
 * 钓鱼 for a character he confused (spec 2026-10-05 §3.4): the word (or its two-character 组词) with the character missing, the
 * look-alikes he picked among the fish first, then others. Null when there is no such word, or fewer than 3 look-alikes.
 */
export function fishItem(word: Word, confused: string[], known: ReadonlySet<string>, rng: Rng): ZibianItem | null {
  const own = Array.from(word.text);
  // a 组词 that holds the character once: 妈妈 would show the answer beside the gap (sweep)
  const text = own.length > 1 ? word.text : word.examples?.find((e) => Array.from(e.text).length === 2 && e.text.split(word.text).length === 2)?.text;
  if (!text) return null;
  const chars = Array.from(text);
  const k = own.length > 1 ? 0 : chars.indexOf(word.text);
  const answer = chars[k]!;
  const fits = (o: string) => HSK_WORDS.has(chars.map((c, j) => (j === k ? o : c)).join(''));
  const others = fillChoices(chars, k, rng, known)?.filter((c) => c !== answer) ?? [];
  const wrong = [...new Set([...confused.filter((c) => c !== answer && !fits(c)), ...others])].slice(0, 3);
  if (wrong.length < 3) return null;
  return { wordId: word.id, word: text, index: k, answer, options: shuffle([answer, ...wrong], rng) };
}

export interface ZibianInput {
  words: Word[];
  knownChars: ReadonlySet<string>;
  practised: ReadonlyMap<string, number>; // word id → last answered in a lesson
  rng: Rng;
  count: number;
}

/**
 * 字辨 items from his class-list words and recent words, newest first (spec §20 part 8). A single character practises inside
 * one of its 组词 words. Choices he knows come first; none makes another real word in the gap. Null when fewer than 4 can be built.
 */
export function buildZibianRound(i: ZibianInput): ZibianItem[] | null {
  const recent = (w: Word) => Math.max(i.practised.get(w.id) ?? 0, w.listedAt ?? 0);
  const candidates = i.words.filter((w) => !w.paused && (w.listedAt !== undefined || i.practised.has(w.id))).sort((a, b) => recent(b) - recent(a));
  const out: ZibianItem[] = [];
  for (const w of candidates) {
    if (out.length >= i.count) break;
    const own = Array.from(w.text);
    const word = own.length > 1 ? w.text : w.examples?.find((e) => Array.from(e.text).length === 2 && e.text.includes(w.text))?.text;
    if (!word) continue;
    const chars = Array.from(word);
    const positions = own.length > 1 ? chars.map((_, k) => k) : [chars.indexOf(w.text)];
    for (const k of shuffle(positions, i.rng)) {
      const options = fillChoices(chars, k, i.rng, i.knownChars);
      if (!options) continue;
      out.push({ wordId: w.id, word, index: k, answer: chars[k]!, options });
      break;
    }
  }
  return out.length >= Math.min(MIN_ITEMS, i.count) ? out : null;
}
