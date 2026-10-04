import { HSK_WORDS } from '../../content';
import { shuffle, type Rng } from '../../lib/random';
import { syllableTone, toneless } from './tones';
import type { Word } from '../../types';

export interface MeaningCue {
  full: string;
  pinyin: string;
  before: string;
  after: string;
}

/** Characters that make a word with almost anything (不懂, 别让, 车子): a cue like 不__ has many right answers. */
const GLUE = new Set([...'不没很太别也都再了们子儿上下的地得着过就还又第可好打老小大头里个一有是这那']);

/** The example reads the word the way he's learning it (长 cháng in 长短, not zhǎng in 班长); a 轻声 syllable counts. */
function sameReading(exPinyin: string, at: number, word: Word): boolean {
  const ex = exPinyin.split(' ').slice(at, at + Array.from(word.text).length);
  const own = word.pinyin.split(' ');
  return ex.length === own.length && ex.every((s, i) => s === own[i] || s === syllableTone(own[i]!).base);
}

/** 组词 as the meaning cue: a longer example with the word blanked. Never English (spec §19). The example must
 *  use the word once, in the reading he's learning, and its other part must not be a glue character. */
export function meaningCue(word: Word): MeaningCue | null {
  for (const ex of word.examples ?? []) {
    if (ex.text.length <= word.text.length) continue;
    const at = ex.text.indexOf(word.text);
    if (at < 0 || ex.text.indexOf(word.text, at + 1) >= 0) continue; // once only: 妈妈 would give it away
    if (!sameReading(ex.pinyin, Array.from(ex.text.slice(0, at)).length, word)) continue;
    const before = ex.text.slice(0, at);
    const after = ex.text.slice(at + word.text.length);
    const rest = before + after;
    if (Array.from(rest).length === 1 && GLUE.has(rest)) continue;
    return { full: ex.text, pinyin: ex.pinyin, before, after };
  }
  return null;
}

/** Same-sound choices (same syllable first, then same initial), minus any that would make a real word with the cue. */
export function pickSoundAlikes(word: Word, cue: MeaningCue, pool: Word[], rng: Rng, n = 3): string[] {
  const sound = toneless(word.pinyin);
  const initial = sound.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?/)![0];
  const fits = (t: string) => HSK_WORDS.has(cue.before + t + cue.after);
  const eligible = pool.filter((w) => w.text.length === word.text.length && w.text !== word.text && !fits(w.text));
  // Around his word's own level first (a level-1 word doesn't get HSK 7–9 choices), then any level.
  const near = eligible.filter((w) => (w.level ?? 7) <= (word.level ?? 7) + 1);
  const sameSound = (list: Word[]) => list.filter((w) => toneless(w.pinyin) === sound);
  const sameInitial = (list: Word[]) => list.filter((w) => toneless(w.pinyin).startsWith(initial || '\u0000'));
  const tiers = [sameSound(near), sameInitial(near), near, sameSound(eligible), eligible];
  const out: string[] = [];
  for (const tier of tiers) for (const w of shuffle(tier, rng)) { if (out.length >= n) return out; if (!out.includes(w.text)) out.push(w.text); }
  return out;
}
