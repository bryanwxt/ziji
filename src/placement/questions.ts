import { pinyin } from 'pinyin-pro';
import { splitSyllable, isSyllable } from '../activities/flashcards/pinyinTraps';
import { syllableTone, toneless, withTone } from '../activities/flashcards/tones';
import { readingsOf, soundsLike } from '../activities/flashcards/homophones';
import { BUILTIN, schoolTerm } from '../content';
import { boundPair } from '../content/kidGloss';
import { shuffle, type Rng } from '../lib/random';
import type { Word } from '../types';
import { TERMS, type Style } from './walk';

/**
 * One placement question (spec 2026-10-14, v2.1). charId: the term character it asks, never asked twice. The right answer is
 * never shown as right or wrong to the child (§14). Both styles are hard to guess: 4 options, none of which can be ruled out by
 * its shape or sound pattern alone.
 */
export type PlacementQuestion =
  | { style: 'read'; wordId: string; charId: string; text: string; answer: string; options: string[] } // 读一读: the character → its pinyin, near misses only
  | { style: 'listen'; wordId: string; charId: string; text: string; reading: string; answer: string; options: string[] }; // 听一听: Truffle says it → pick it from look-alikes

/** Each term's characters: the built-in characters first read in it (taughtAt), in book order. */
export function termWords(words: Word[]): Word[][] {
  const chars = words.filter((w) => w.source === 'builtin' && Array.from(w.text).length === 1).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  return TERMS.map((t) => chars.filter((w) => schoolTerm(w.text) === t));
}

const INFO = new Map(BUILTIN.map((c) => [c.char, c]));
/** How many built-in characters use each character as a part (口 in 吃, 叫, 和…). */
const USED_AS_PART = new Map<string, number>();
for (const c of BUILTIN) for (const p of new Set([c.radical, ...c.components])) if (p !== c.char) USED_AS_PART.set(p, (USED_AS_PART.get(p) ?? 0) + 1);
/** Single strokes and bare enclosures (冂 in 丽, 肉, 见): sharing one says nothing about the shape. */
const TRIVIAL_PARTS = new Set([...'一丨丶丿乀乙亅乚乛𠃌𠃊冂冖凵匚匸亠丷']);
/** Used as a part by this many characters or more: a radical-like character he could know from other characters alone. */
const RADICAL_LIKE = 5;
/** A term's hard pool keeps at least this many characters; smaller, and HSK 1 characters stay in. */
const MIN_POOL = 24;

/**
 * A character he could know from a part alone (spec v2.1): it is its own radical (口, 木, 火), has no parts (九), or is itself
 * a part of 5+ other characters (大, 小, 门). Never asked.
 */
export function standsAlone(ch: string): boolean {
  const info = INFO.get(ch);
  return !info || info.components.length === 0 || info.radical === ch || (USED_AS_PART.get(ch) ?? 0) >= RADICAL_LIKE;
}

/**
 * The characters a term asks (spec v2.1): the later half of the term by book order, never one he could know from a part alone
 * nor one read in 轻声; of those, the less common ones (beyond HSK 1), topped up with the book's latest HSK 1 characters when
 * fewer than 24 are left (一上 has few).
 */
export function askable(term: Word[]): Word[] {
  const late = term.slice(Math.floor(term.length / 2)).filter((w) => !standsAlone(w.text) && syllableTone(w.pinyin).tone !== 5);
  const rarer = late.filter((w) => (w.level ?? 9) > 1);
  const common = late.filter((w) => (w.level ?? 9) <= 1).reverse(); // latest in the book first
  return [...rarer, ...common.slice(0, Math.max(0, MIN_POOL - rarer.length))];
}

/** Each term's askable characters. */
export const askableTerms = (terms: Word[][]): Word[][] => terms.map(askable);

/**
 * A term's styles (spec v2.1): with a voice 2 读一读 and 2 听一听 in a random order, and a fifth (on a 3 of 4) of either; without
 * a voice, 读一读 only.
 */
export const termStyles = (canHear: boolean, rng: Rng): Style[] =>
  canHear ? [...shuffle<Style>(['read', 'read', 'listen', 'listen'], rng), rng() < 0.5 ? 'read' : 'listen'] : ['read', 'read', 'read', 'read', 'read'];

/** Initials a P2 reader mixes up (l/n, b/p, z/zh, j/q/x…): the near misses of 读一读. */
const NEAR_INITIALS: Record<string, string[]> = {
  b: ['p'], p: ['b'], d: ['t'], t: ['d'], g: ['k'], k: ['g', 'h'], h: ['f', 'k'], f: ['h'], l: ['n', 'r'], n: ['l'], r: ['l'], m: ['n'],
  j: ['q', 'x', 'z'], q: ['j', 'x', 'c'], x: ['s', 'j', 'q'], z: ['zh', 'c', 'j'], c: ['ch', 'z', 'q'], s: ['sh', 'x'],
  zh: ['z', 'ch'], ch: ['c', 'zh'], sh: ['s', 'x'], y: ['w'], w: ['y'],
};

/**
 * Four readings for 读一读 that differ only in tone or initial (spec v2.1): a 2×2 of two near initials by two tones (lì lí nì
 * ní), so every option shares its initial with one other and its tone with one other and none stands out; with no near
 * initial, the syllable's four tones. Never another reading of the character. Null when no such four exist.
 */
export function nearMissReadings(word: Word, rng: Rng): string[] | null {
  const { base, tone } = syllableTone(word.pinyin);
  if (tone < 1 || tone > 4 || word.pinyin.includes(' ')) return null;
  const [ini, fin] = splitSyllable(base);
  const right = new Set([word.pinyin, base, ...pinyin(word.text, { multiple: true, type: 'array' })]);
  const ok = (p: string) => !right.has(p);
  const tones = shuffle([1, 2, 3, 4].filter((t) => t !== tone), rng);
  for (const i2 of shuffle(NEAR_INITIALS[ini] ?? [], rng)) {
    if (!isSyllable(i2 + fin)) continue;
    for (const t2 of tones) {
      const wrong = [withTone(base, t2), withTone(i2 + fin, tone), withTone(i2 + fin, t2)];
      if (wrong.every(ok)) return wrong;
    }
  }
  const four = tones.map((t) => withTone(base, t));
  return four.every(ok) ? four : null;
}

/**
 * Three look-alikes for 听一听 (spec v2.1): built-in characters that share one part with it — the same part for all three
 * (跑 → 跳 踢 路, all 足), so the answer is not the one in the middle — and all four sound different. Only characters he meets
 * (his book's, or HSK 1–2): his book's up to the next term first. Never a character of the word Truffle says it in (番 is said 番茄: never 茄).
 */
export function lookAlikes(word: Word, pool: Word[], rng: Rng): string[] | null {
  const info = INFO.get(word.text);
  if (!info) return null;
  const sound = toneless(word.pinyin);
  const heard = [word.pinyin.trim().toLowerCase()]; // what Truffle says: the card's reading
  const said = new Set([...(boundPair(word.text) ?? ''), ...(word.examples ?? []).flatMap((e) => Array.from(e.text))]);
  const term = TERMS.indexOf(schoolTerm(word.text) ?? '');
  const near = (ch: string) => { const t = TERMS.indexOf(schoolTerm(ch) ?? ''); return t >= 0 && (term < 0 || t <= term + 1); };
  // characters a P2 child meets: his book's, or HSK 1–2 — never an obscure one he'd rule out on sight (上 → 卤 卓)
  const met = (ch: string) => !!schoolTerm(ch) || (INFO.get(ch)!.level ?? 9) <= 2;
  const chars = [...new Set(pool.filter((w) => INFO.has(w.text) && met(w.text)).map((w) => w.text))];
  const parts = [...new Set([...info.components, info.radical])].filter((p) => p !== word.text && !TRIVIAL_PARTS.has(p));
  const options: string[][] = [];
  for (const part of shuffle(parts, rng)) {
    const sharing = chars.filter((ch) => {
      if (ch === word.text || said.has(ch)) return false;
      const c = INFO.get(ch);
      // any reading of it said like his (地 is dì and de): heard alone, both would be right (homophones.ts)
      return !!c && (c.radical === part || c.components.includes(part)) && toneless(c.pinyin) !== sound && !soundsLike(heard, readingsOf(ch, c.pinyin), false) && Math.abs(c.strokes - info.strokes) <= 5;
    });
    // four different sounds: three 马 characters all said ma would give away the one that isn't (骑 among 妈 蚂 吗)
    const sounds = new Set([sound]);
    const picked: string[] = [];
    for (const ch of [...shuffle(sharing.filter(near), rng), ...shuffle(sharing.filter((x) => !near(x)), rng)]) {
      const s = toneless(INFO.get(ch)!.pinyin);
      if (picked.length < 3 && !sounds.has(s)) { sounds.add(s); picked.push(ch); }
    }
    if (picked.length === 3) options.push(picked);
  }
  // the part whose look-alikes are school characters he has met, when there is one
  return options.sort((a, b) => b.filter(near).length - a.filter(near).length)[0] ?? null;
}

export function buildQuestion(style: Style, word: Word, pool: Word[], rng: Rng): PlacementQuestion | null {
  if (style === 'read') {
    const wrong = nearMissReadings(word, rng);
    return wrong ? { style, wordId: word.id, charId: word.id, text: word.text, answer: word.pinyin, options: shuffle([word.pinyin, ...wrong], rng) } : null;
  }
  const wrong = lookAlikes(word, pool, rng);
  return wrong ? { style, wordId: word.id, charId: word.id, text: word.text, reading: word.pinyin, answer: word.text, options: shuffle([word.text, ...wrong], rng) } : null;
}

/**
 * A question of `style` on an untested askable character of the term, picked at random. A term run short (never in practice:
 * each term has 30+ askable characters and is asked at most 5) borrows the nearest term's. 读一读 is the fallback style.
 */
export function nextQuestion(terms: Word[][], term: number, style: Style, pool: Word[], rng: Rng, used: ReadonlySet<string>): PlacementQuestion {
  const near = terms.map((_, i) => i).sort((a, b) => Math.abs(a - term) - Math.abs(b - term) || a - b);
  for (const t of near) {
    const fresh = shuffle(terms[t]!.filter((w) => !used.has(w.id)), rng);
    for (const s of style === 'listen' ? (['listen', 'read'] as const) : (['read'] as const)) {
      for (const w of fresh) {
        const q = buildQuestion(s, w, pool, rng);
        if (q) return q;
      }
    }
  }
  const w = terms[term]![0] ?? pool[0]!; // every character asked: cannot happen within 20 questions
  return { style: 'read', wordId: w.id, charId: w.id, text: w.text, answer: w.pinyin, options: [w.pinyin] };
}
