import { wordComponents } from '../../content';
import { trapReadings } from './pinyinTraps';
import { questionMeaning } from '../../content/glossary';
import { heardReadings, readingsOf, soundAlikes, soundsLike, wordReadings } from './homophones';
import { shuffle, type Rng } from '../../lib/random';
import type { Word } from '../../types';

export { syllableTone, toneless, withTone } from './tones';
import { syllableTone, withTone } from './tones';

const lengthOf = (w: Word) => Array.from(w.text).length;

function sharesComponent(a: Word, b: Word): boolean {
  const parts = new Set(wordComponents(a.text));
  return wordComponents(b.text).some((p) => parts.has(p));
}

/** Six options where five good wrong ones exist, otherwise four (spec 2026-10-11 §3: more honest taps). */
export const MANY_WRONG = 5;
export const FEW_WRONG = 3;
/** Five wrong options when the picker found five, else three of them. */
export const fiveOrThree = <T>(wrong: T[]): T[] => wrong.slice(0, wrong.length >= MANY_WRONG ? MANY_WRONG : FEW_WRONG);

/** Not said like the target's spoken reading in any tone, by any reading of its own (地 is dì and de: never a choice when 的 is said). */
const soundsApart = (target: Word) => {
  const mine = heardReadings(target);
  return (w: Word) => !soundsLike(mine, wordReadings(w), false);
};

/** Different in sound, near his level (within two levels up): the look-alikes worth showing. */
function nearOf(target: Word, pool: Word[]): Word[] {
  const apart = soundsApart(target);
  const eligible = pool.filter((w) => lengthOf(w) === lengthOf(target) && w.text !== target.text && apart(w));
  return target.level === null ? eligible : eligible.filter((w) => (w.level ?? 9) <= target.level! + 2);
}

/**
 * Five look-alikes for a six-option "find the character" (spec 2026-10-11 §3): each shares a part with it, near his level, and
 * sounds different. Fewer than five: none, and the question keeps four options.
 */
export function pickLookAlikes(target: Word, pool: Word[], rng: Rng): Word[] {
  const seen = new Set([target.text]);
  const out: Word[] = [];
  for (const w of shuffle(nearOf(target, pool).filter((x) => sharesComponent(target, x)), rng)) {
    if (seen.has(w.text)) continue;
    seen.add(w.text);
    out.push(w);
    if (out.length === MANY_WRONG) return out;
  }
  return [];
}

export function pickCharacterDistractors(target: Word, pool: Word[], rng: Rng, n = 3): Word[] {
  const apart = soundsApart(target);
  const eligible = pool.filter((w) => lengthOf(w) === lengthOf(target) && w.text !== target.text && apart(w));
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

export function pickPinyinDistractors(target: Word, pool: Word[], rng: Rng, n = 3): string[] {
  // A polyphonic character's other readings are right too — never offer them as wrong.
  const readings = Array.from(target.text).length === 1 ? readingsOf(target.text) : [];
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

/** A meaning's first sense: what a P2 child reads on a choice (never the whole dictionary entry; a kid gloss is one sense). */
export const firstSense = (m: string): string => m.split(';')[0]!.trim();
/** A meaning's senses compared loosely: no brackets, then each comma part with no leading to/a/an/the and no punctuation
 *  ("to teach (at a school)" = "teach"; "like, happy" = "like" and "happy"). */
const senses = (m: string): string[] => firstSense(m).replace(/\([^)]*\)/g, ' ').toLowerCase().split(',')
  .map((p) => p.replace(/^\s*(to|a|an|the)\s+/, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
/** Words too common to tell two meanings apart ("one", "something"). */
const GLUE = new Set(['and', 'the', 'for', 'with', 'one', 'ones', 'someone', 'something', 'sth', 'sb', 'used', 'kind', 'sort']);
/** Words a child takes for the same meaning (妈 "mum" beside 母 "mother", 看 "look" beside 见 "see"): two choices with one each
 *  would both look right, so they count as one key word. */
const SAME = [
  'mum mother mummy mama', 'dad father daddy', 'grandma granny', 'grandpa grandad', 'child children kid kids', 'big large huge giant',
  'small little tiny', 'happy glad joyful joy happiness pleased', 'sad unhappy heartbroken', 'look see watch view peek seen',
  'say speak talk tell chat words speech', 'hear listen', 'road street way path route', 'friend buddy partner pal',
  'country nation', 'shop store', 'cold cool chilly', 'hot warm', 'fast quick quickly hurry rush', 'slow slowly',
  'begin start', 'end finish finished over', 'right correct', 'wrong mistake', 'afraid scared scary scare fear frighten',
  'angry cross', 'clever smart intelligent', 'pretty beautiful lovely nice looking good', 'quiet calm silent',
  'noisy loud', 'shout yell call', 'hug embrace', 'house home', 'picture drawing photo painting', 'seat chair',
  'answer reply', 'ask question', 'remember recall', 'think feel', 'like love fond', 'want wish hope', 'many lots much',
  'all every each whole', 'very really extremely super', 'toilet bathroom washroom', 'rubbish trash', 'stone rock',
  'hill mountain', 'sea ocean', 'river stream', 'forest woods jungle', 'cup glass', 'clothes clothing dress',
  'pants trousers shorts', 'present gift', 'sweets candy', 'meal food', 'cook boil', 'cry weep', 'laugh smile',
  'leave away depart', 'return back', 'sleep nap asleep', 'bug insect', 'cat kitten', 'dog puppy doggy', 'help rescue',
  'protect guard defend', 'fight quarrel argue squabble', 'break smash broken', 'fall drop', 'hurt pain injury painful harm',
  'sick ill illness', 'clean tidy neat', 'strange weird odd', 'fun interesting', 'easy simple handy', 'hard difficult',
  'near nearby close', 'inside', 'outside', 'top above', 'below under down', 'middle centre', 'side beside',
  'together', 'piece slice bit lump', 'teacher coach',
].map((g) => g.split(' '));
const CANON = new Map(SAME.flatMap((g) => g.map((w) => [w, g[0]!] as const)));
const keyWords = (s: string) => s.split(' ').filter((t) => t.length >= 3 && !GLUE.has(t)).map((t) => CANON.get(t) ?? t);
const alikeSense = (a: string, b: string) => a === b || ` ${a} `.includes(` ${b} `) || ` ${b} `.includes(` ${a} `)
  || keyWords(a).some((t) => keyWords(b).includes(t));
/** Two meanings that would both be right, or look half-right side by side: any of their senses the same, one inside the other
 *  ("guide" / "tour guide"), or sharing a key word ("small box" / "meal in a box"; parent, 2026-10-12: confusing). Kid glosses
 *  list a second sense after a comma (喜 "like, happy"), so every sense counts, not only the first (欢 "happy, joyful"). */
export const alike = (a: string, b: string): boolean => {
  const sa = senses(a);
  const sb = senses(b);
  return sa.some((x) => sb.some((y) => alikeSense(x, y)));
};

/**
 * Hear / read-for-meaning (spec 2026-10-06 §3.2): its English meaning and three others (or `others`) unlike it and each other,
 * near its place in his order. Only words that take an English question are asked or offered (questionMeaning: kid glosses,
 * never a grammar word); none for a word that takes none. `byEar`: he only hears the word, so no choice comes from a word that
 * sounds like it, or means what a word that sounds like it means (homophones.ts: 她 heard, never "he, him" nor "it").
 */
export function meaningChoices(word: Word, pool: Word[], rng: Rng, others = FEW_WRONG, byEar = false): string[] | null {
  const full = questionMeaning(word);
  if (!full) return null;
  const answer = firstSense(full);
  const mine = byEar ? heardReadings(word) : [];
  const seen = [answer, ...(byEar ? soundAlikes(word, pool).map((e) => e.gloss) : [])];
  const near = pool
    .filter((w) => w.id !== word.id && w.text !== word.text && !w.paused && !!questionMeaning(w) && !(byEar && soundsLike(mine, wordReadings(w))))
    .sort((a, b) => Math.abs((a.rank ?? 1e9) - (word.rank ?? 0)) - Math.abs((b.rank ?? 1e9) - (word.rank ?? 0)))
    .slice(0, 60);
  const wrong: string[] = [];
  for (const w of shuffle(near, rng)) {
    const m = firstSense(questionMeaning(w)!);
    if (seen.some((x) => alike(x, m))) continue;
    seen.push(m);
    wrong.push(m);
    if (wrong.length === others) break;
  }
  return wrong.length === others ? shuffle([answer, ...wrong], rng) : null;
}
