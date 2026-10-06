import { pinyin } from 'pinyin-pro';
import { wordComponents } from '../../content';
import { trapReadings } from './pinyinTraps';
import { cardMeaning } from '../../content/glossary';
import { shuffle, type Rng } from '../../lib/random';
import type { Word } from '../../types';

export { syllableTone, toneless, withTone } from './tones';
import { syllableTone, toneless, withTone } from './tones';

const lengthOf = (w: Word) => Array.from(w.text).length;

function sharesComponent(a: Word, b: Word): boolean {
  const parts = new Set(wordComponents(a.text));
  return wordComponents(b.text).some((p) => parts.has(p));
}

export function pickCharacterDistractors(target: Word, pool: Word[], rng: Rng, n = 3): Word[] {
  const sound = toneless(target.pinyin);
  const eligible = pool.filter((w) => lengthOf(w) === lengthOf(target) && w.text !== target.text && toneless(w.pinyin) !== sound);
  // near his level first: a first-level word never gets an HSK 7–9 look-alike while nearer ones are there (sweep)
  const near = target.level === null ? eligible : eligible.filter((w) => (w.level ?? 9) <= target.level! + 2);
  const tiers = [
    near.filter((w) => sharesComponent(target, w)),
    near.filter((w) => w.level !== null && w.level === target.level),
    near,
    eligible,
  ];
  const picked: Word[] = [];
  const usedText = new Set([target.text]);
  for (const tier of tiers) {
    for (const w of shuffle(tier, rng)) {
      if (picked.length >= n) return picked;
      if (usedText.has(w.text)) continue;
      picked.push(w);
      usedText.add(w.text);
    }
  }
  return picked;
}

/** Readings 一 and 不 take before other tones (一个 yí, 一天 yì, 不是 bú) — dictionaries list only yī and bù. */
const TONE_CHANGE: Record<string, string[]> = { 一: ['yí', 'yì'], 不: ['bú'], 七: ['qí'], 八: ['bá'] }; // 七/八 take 2nd tone before a 4th in many children's speech

export function pickPinyinDistractors(target: Word, pool: Word[], rng: Rng, n = 3): string[] {
  // A polyphonic character's other readings are right too — never offer them as wrong.
  const readings = Array.from(target.text).length === 1 ? [...pinyin(target.text, { multiple: true, type: 'array' }), ...(TONE_CHANGE[target.text] ?? [])] : [];
  const syllables = target.pinyin.split(' ');
  // the toneless form is his word said in 轻声 (爸爸 bà ba): never offered as wrong
  const toneless = syllables.map((s) => syllableTone(s).base).join(' ');
  const used = new Set([target.pinyin, toneless, ...readings]);
  const out: string[] = [];
  const add = (p: string) => {
    if (out.length < n && p && !used.has(p)) {
      used.add(p);
      out.push(p);
    }
  };

  const toneVariants: string[] = [];
  syllables.forEach((s, i) => {
    const { base, tone } = syllableTone(s);
    for (const t of [1, 2, 3, 4]) {
      if (t === tone) continue;
      const copy = [...syllables];
      copy[i] = withTone(base, t);
      toneVariants.push(copy.join(' '));
    }
  });
  const variants = shuffle(toneVariants, rng);
  // His top trap (the phonetic part's reading when there is one) always appears; the rest take turns.
  const [topTrap, ...otherTraps] = trapReadings(target);
  const traps = topTrap ? [topTrap, ...shuffle(otherTraps, rng)] : [];

  // Tier 0: his real traps (the phonetic part's reading, j/q/x vs z/c/s, close finals, 轻声), up to two.
  traps.slice(0, 2).forEach(add);
  // Tier 1: one tone change (tone is rarely what he gets wrong).
  variants.slice(0, 1).forEach(add);
  // Tier 2: pinyin of look-alike words; tier 3: any word of the same length.
  const sameLength = pool.filter((w) => w.pinyin.split(' ').length === syllables.length && w.text !== target.text);
  shuffle(sameLength.filter((w) => sharesComponent(target, w)), rng).forEach((w) => add(w.pinyin));
  shuffle(sameLength, rng).forEach((w) => add(w.pinyin));
  // Tiny pools: the remaining traps, then the remaining tone variants.
  traps.forEach(add);
  variants.forEach(add);
  return out;
}

/** A meaning's first sense: what a P2 child reads on a choice (never the whole dictionary entry). */
export const firstSense = (m: string): string => m.split(';')[0]!.trim();
/** A sense compared loosely: no brackets, no leading to/a/an/the, no punctuation ("to teach (at a school)" = "teach"). */
const sense = (m: string) => firstSense(m).split(',')[0]!.replace(/\([^)]*\)/g, ' ').toLowerCase().replace(/^\s*(to|a|an|the)\s+/, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
/** Two meanings that would both be right: the same sense, or one inside the other ("guide" / "tour guide"). */
const alike = (a: string, b: string) => a === b || ` ${a} `.includes(` ${b} `) || ` ${b} `.includes(` ${a} `);

/** Hear / read-for-meaning (spec 2026-10-06 §3.2): its English meaning and three others whose first sense differs, near its place in his order. */
export function meaningChoices(word: Word, pool: Word[], rng: Rng): string[] | null {
  const full = cardMeaning(word);
  if (!full) return null;
  const answer = firstSense(full);
  const seen = new Set([sense(answer)]);
  const near = pool
    .filter((w) => w.id !== word.id && !w.paused)
    .sort((a, b) => Math.abs((a.rank ?? 1e9) - (word.rank ?? 0)) - Math.abs((b.rank ?? 1e9) - (word.rank ?? 0)))
    .slice(0, 60);
  const others: string[] = [];
  for (const w of shuffle(near, rng)) {
    const m = cardMeaning(w);
    if (!m || [...seen].some((x) => alike(x, sense(m)))) continue;
    seen.add(sense(m));
    others.push(firstSense(m));
    if (others.length === 3) break;
  }
  return others.length === 3 ? shuffle([answer, ...others], rng) : null;
}
