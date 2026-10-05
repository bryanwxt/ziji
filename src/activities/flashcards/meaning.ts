import { pinyin } from 'pinyin-pro';
import { HSK_WORDS } from '../../content';
import { CHENGYU, chengyuLevel, chengyuOf, isIdiomWord } from '../../content/chengyu';
import { BLANK, bankFor, fillGap } from '../../content/sentenceBank';
import { shuffle, type Rng } from '../../lib/random';
import { syllableTone, toneless } from './tones';
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
    const level = chengyuLevel(word.text);
    const near = CHENGYU.filter((c) => c.text !== word.text && Math.abs(chengyuLevel(c.text) - level) <= 1).map((c) => c.text);
    const from = word.text.codePointAt(0)! % Math.max(1, near.length - 2);
    return { kind: 'sentence', source: 'bank', full, pinyin: '', before: full.slice(0, at), after: full.slice(at + word.text.length), wrong: near.slice(from, from + 3), pair: word.pairs?.[0] };
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
export function usageLine(word: Word): { before: string; after: string; full: string; pinyin: string } | null {
  const cue = meaningCue(word, 1);
  return cue ? { before: cue.before, after: cue.after, full: cue.full, pinyin: cue.kind === 'word' ? cue.pinyin : word.pinyin } : null;
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
    list = [...HSK_WORDS].filter(([t]) => t.length === length).map(([text, level]) => ({ text, level, pinyin: pinyin(text) }));
    hskByLength.set(length, list);
  }
  return list;
}

export function pickSoundAlikes(word: Word, cue: MeaningCue, pool: Word[], rng: Rng, n = 3): string[] {
  const sound = toneless(word.pinyin);
  const initial = sound.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?/)![0];
  const fits = (t: string) => HSK_WORDS.has(cue.before + t + cue.after);
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
  const tiers = [sameSound(ownNear), ownNear, sameSound(near), sameInitial(near), near, sameSound(eligible), eligible];
  const out: string[] = [];
  for (const tier of tiers) for (const w of shuffle(tier, rng)) { if (out.length >= n) return out; if (!out.includes(w.text)) out.push(w.text); }
  return out;
}
