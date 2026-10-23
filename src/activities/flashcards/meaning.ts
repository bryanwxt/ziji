import { HSK_WORDS } from '../../content';
import { isChildWord, readingOf } from '../../content/wordGate';
import { chengyuOf, idiomWrongs, isIdiomWord } from '../../content/chengyu';
import { mulberry32 } from '../../lib/random';
import { BLANK, bankFor, fillGap } from '../../content/sentenceBank';
import { shuffle, type Rng } from '../../lib/random';
import { syllableTone, toneless } from './tones';
import { lookAlikeChars } from '../components/zibian';
import type { Word } from '../../types';

export interface MeaningCue {
  kind: 'sentence' | 'word'; // a sentence (his class's or the bank's), or a 组词 word
  source: 'class' | 'bank' | 'word';
  full: string;
  pinyin: string;
  before: string;
  after: string;
  wrong?: string[]; // the bank's hand-picked wrong choices
  clue?: string; // the bank's clue, shown after a miss
  pair?: string; // a word it goes with (保持 + 安静)
}

/** Characters that make a word with almost anything (不懂, 别让, 车子): a cue like 不__ has many right answers. */
const GLUE = new Set([...'不没很太别也都再了们子儿上下的地得着过就还又第可好打老小大头里个一有是这那']);

/** The example reads the word the way he's learning it (长 cháng in 长短, not zhǎng in 班长); a 轻声 syllable counts. */
function sameReading(exPinyin: string, at: number, word: Word): boolean {
  const ex = exPinyin.split(' ').slice(at, at + Array.from(word.text).length);
  const own = word.pinyin.split(' ');
  return ex.length === own.length && ex.every((s, i) => s === own[i] || s === syllableTone(own[i]!).base);
}

export const MAX_SENTENCE_CUE = 30;

/** The 组词 cue alone, for the 词语 rung (spec 2026-10-05 §3.2): a longer word that uses this one once, at its reading, whose other part is not a glue character. */
export function wordCue(word: Word): MeaningCue | null {
  for (const ex of word.examples ?? []) {
    if (ex.text.length <= word.text.length) continue;
    const at = ex.text.indexOf(word.text);
    if (at < 0 || ex.text.indexOf(word.text, at + 1) >= 0) continue; // once only: 妈妈 would give it away
    if (!sameReading(ex.pinyin, Array.from(ex.text.slice(0, at)).length, word)) continue;
    const before = ex.text.slice(0, at);
    const after = ex.text.slice(at + word.text.length);
    const rest = before + after;
    if (Array.from(rest).length === 1 && GLUE.has(rest)) continue;
    return { kind: 'word', source: 'word', full: ex.text, pinyin: ex.pinyin, before, after };
  }
  return null;
}

/**
 * The word in use, with the word blanked (spec §19 part 2, §20 part 4). Never English. In order:
 * his class sentence, a sentence-bank gap (`variant` picks which of its two), then 组词 — a longer example that
 * uses the word once, in the reading he's learning, whose other part is not a glue character.
 */
export function meaningCue(word: Word, variant = 0): MeaningCue | null {
  // An imported class sentence comes first (spec §19 part 2): the word once, with real context around it.
  const usable = (word.sentences ?? []).filter((s) => {
    const at = s.text.indexOf(word.text);
    const len = Array.from(s.text).length;
    return at >= 0 && s.text.indexOf(word.text, at + 1) < 0 && len >= Array.from(word.text).length + 4 && len <= MAX_SENTENCE_CUE; // real context, short enough for a phone
  });
  if (usable.length) {
    const s = usable[variant % usable.length]!;
    const at = s.text.indexOf(word.text);
    return { kind: 'sentence', source: 'class', full: s.text, pinyin: s.pinyin, before: s.text.slice(0, at), after: s.text.slice(at + word.text.length), pair: word.pairs?.[0] };
  }
  // a school 成语 in the list: its sentence, with other 成语 near its level as the wrong choices (spec 2026-10-05 §4)
  const idiom = isIdiomWord(word) ? chengyuOf(word.text) : undefined;
  if (idiom) {
    const full = idiom.sentences[variant % idiom.sentences.length]!;
    const at = full.indexOf(word.text);
    const wrong = idiomWrongs(word.text, mulberry32(word.text.codePointAt(0)! + variant));
    return { kind: 'sentence', source: 'bank', full, pinyin: '', before: full.slice(0, at), after: full.slice(at + word.text.length), wrong, pair: word.pairs?.[0] };
  }
  const bank = bankFor(word.text);
  if (bank) {
    const gap = bank.gaps[variant % 2]!;
    const at = gap.text.indexOf(BLANK);
    return {
      kind: 'sentence', source: 'bank', full: fillGap(gap, word.text), pinyin: '',
      before: gap.text.slice(0, at), after: gap.text.slice(at + BLANK.length),
      wrong: [...gap.wrong], clue: bank.clue, pair: word.pairs?.[0] ?? bank.pair,
    };
  }
  return wordCue(word);
}

/**
 * The word in use for reviews and intros (spec §20 part 1), with the word in place. It takes the other sentence where there
 * is one (variant 1), so the intro never shows the exact sentence 认一认's meaning question will blank. The pinyin is the
 * word's own for a sentence (a whole sentence's pinyin won't fit a phone), the 组词 word's for a 组词.
 */
export function usageLine(word: Word): { before: string; after: string; full: string; pinyin: string; isWord: boolean } | null {
  const cue = meaningCue(word, 1);
  return cue ? { before: cue.before, after: cue.after, full: cue.full, pinyin: cue.kind === 'word' ? cue.pinyin : word.pinyin, isWord: cue.kind === 'word' } : null;
}

/** Same-sound choices (same syllable first, then same initial), minus any that would make a real word with the cue. */
/** Characters that stand in for each other inside real words (其他/其它, 他们/她们): never offered against each other. */
const SWAP_SETS = ['他她它', '的地得', '那哪'];
const swaps = (a: string, b: string) => a !== b && SWAP_SETS.some((set) => set.includes(a) && set.includes(b));

const SCHOOL_LEVEL = 3; // a school word outside HSK sits around P2 class level
type Choice = { text: string; pinyin: string; level: number | null };
const hskByLength = new Map<number, Choice[]>();
/** HSK words of one length as choices, read once (his own words are mostly single characters, so a school word needs these). */
function hskChoices(length: number): Choice[] {
  let list: Choice[] | undefined = hskByLength.get(length);
  if (!list) {
    // child words only (content audit 2026-10-15): a wrong choice is still a word he reads
    list = [...HSK_WORDS].filter(([t]) => t.length === length && isChildWord(t)).map(([text, level]) => ({ text, level, pinyin: readingOf(text) }));
    hskByLength.set(length, list);
  }
  return list;
}

/** Look-alikes among a gap's choices at most (real test spec 2026-10-23 §5): 草 among 早 and 苹. */
export const MAX_LOOK_ALIKES = 2;

const wordsOf = new WeakMap<Word[], Set<string>>();
/** Every word his pool knows as a word: his own (lists, ladder 词语) and every built-in 组词 (their examples), worked out once a pool. */
function knownWords(pool: Word[]): Set<string> {
  let out = wordsOf.get(pool);
  if (!out) wordsOf.set(pool, (out = new Set(pool.flatMap((w) => [w.text, ...(w.examples ?? []).map((e) => e.text)]))));
  return out;
}

/**
 * `begun` (real test spec 2026-10-23 §5): the words he has begun, by text. With it, every choice is one he has begun, so
 * familiarity can't single out the answer — up to 2 look-alikes of a single character first, then same sound, same initial —
 * when at least 3 qualify; fewer, and the choices fill from his level as before. No choice makes a word with the cue: HSK, his
 * own words or a built-in 组词.
 */
export function pickSoundAlikes(word: Word, cue: MeaningCue, pool: Word[], rng: Rng, n = 3, begun?: ReadonlySet<string>): string[] {
  const sound = toneless(word.pinyin);
  const initial = sound.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?/)![0];
  const known = knownWords(pool);
  const fits = (t: string) => { const made = cue.before + t + cue.after; return HSK_WORDS.has(made) || known.has(made); };
  const own = new Set(pool.map((w) => w.text));
  const candidates: Choice[] = word.text.length > 1 ? [...pool, ...hskChoices(word.text.length).filter((w) => !own.has(w.text))] : pool;
  // A choice sharing a character with a school word (保证 for 保持) could fit its sentence too, so it's never offered.
  const sharesChar = (t: string) => (word.text.length > 1 && Array.from(t).some((ch) => word.text.includes(ch))) || swaps(word.text, t);
  const eligible = candidates.filter((w) => w.text.length === word.text.length && w.text !== word.text && !fits(w.text) && !sharesChar(w.text));
  // Around his word's own level first (a level-1 word doesn't get HSK 7–9 choices), then any level. A school word takes its HSK level when it has one.
  const level = word.level ?? HSK_WORDS.get(word.text) ?? SCHOOL_LEVEL;
  const near = eligible.filter((w) => (w.level ?? SCHOOL_LEVEL) <= level + 1); // his own school words count as class level
  const sameSound = (list: Choice[]) => list.filter((w) => toneless(w.pinyin) === sound);
  const sameInitial = (list: Choice[]) => list.filter((w) => toneless(w.pinyin).startsWith(initial || '\u0000'));
  // A school word's choices come from his own class words first (familiar, same kind: 成语 for a 成语), then the HSK list.
  const ownNear = word.text.length > 1 ? near.filter((w) => own.has(w.text)) : [];
  const out: string[] = [];
  const take = (tiers: Choice[][], cap = n) => { for (const tier of tiers) for (const w of shuffle(tier, rng)) { if (out.length >= cap) return; if (!out.includes(w.text)) out.push(w.text); } };
  if (begun) {
    const mine = eligible.filter((w) => begun.has(w.text));
    if (new Set(mine.map((w) => w.text)).size >= Math.min(n, 3)) {
      const alike = new Set(Array.from(word.text).length === 1 ? lookAlikeChars(word.text) : []);
      take([mine.filter((w) => alike.has(w.text))], Math.min(MAX_LOOK_ALIKES, n));
      take([sameSound(mine).filter((w) => !alike.has(w.text)), sameInitial(mine).filter((w) => !alike.has(w.text)), mine.filter((w) => !alike.has(w.text))]);
      return out;
    }
  }
  take([sameSound(ownNear), ownNear, sameSound(near), sameInitial(near), near, sameSound(eligible), eligible]);
  return out;
}
