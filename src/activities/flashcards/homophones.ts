// Sound-alikes for the questions he answers by ear alone (parent 2026-10-17: 她 heard, "he, him" marked wrong — both are tā).
//
// The rule, for a prompt that is only a sound (Hear: its English; 听一听 / listen: find the character):
//   - no wrong choice may sound like the answer. A meaning choice is checked through the word it came from; a character through
//     every reading it has (地 is dì and de), not only the card's;
//   - no meaning choice may fit any word that sounds like the answer, offered or not ("it" beside 她: 它 is tā too);
//   - "sounds like" for a meaning: the same syllables with the same tones, a neutral (轻声) syllable matching any tone, and 一/不/七/八's
//     tone changes counted (一 yī/yí/yì). Tones count because he hears them (his slips are j/q/x and finals, not tones), so tà is
//     not tā; the character choices keep their older, stricter rule — any tone (妈 among 马 蚂 would be a giveaway).
//   - the answer's sound is the one Truffle says (the card's reading); a wrong choice's word counts by every reading it has;
//   - an answer from a 同音字 set his school book teaches side by side (他/她/它, 在/再, 进/近, 做/作/坐) can't be told by ear even
//     with clean choices: he knows several tā and can't know which was meant. Its Hear question shows the character beside the
//     speaker (ambiguousByEar). Every single syllable has some sound-alike (about one in six of his words has a common one), so
//     the rest stay ear-only: no wrong choice there can be what he heard, and the question still tests his ear.
import { pinyin } from 'pinyin-pro';
import { builtinWords } from '../../content';
import { questionMeaning } from '../../content/glossary';
import { askedAs, kidGlossReading } from '../../content/kidGloss';
import { ladderWords } from '../../content/ladder';
import type { Word } from '../../types';
import { syllableTone } from './tones';

/** Readings 一 and 不 take before other tones (一个 yí, 一天 yì, 不是 bú) — dictionaries list only yī and bù. */
export const TONE_CHANGE: Record<string, string[]> = { 一: ['yí', 'yì'], 不: ['bú'], 七: ['qí'], 八: ['bá'] }; // 七/八 take 2nd tone before a 4th in many children's speech

const norm = (p: string) => p.trim().toLowerCase().replace(/v/g, 'ü').replace(/\s+/g, ' ');

/** Every way the text can be said: the given reading, a lone character's every dictionary reading and tone change, a word's usual one. */
export function readingsOf(text: string, given?: string): string[] {
  const out = new Set<string>();
  if (given && given !== 'x') out.add(norm(given));
  if (Array.from(text).length === 1) {
    for (const r of pinyin(text, { multiple: true, type: 'array' })) out.add(norm(r));
    for (const r of TONE_CHANGE[text] ?? []) out.add(r);
  } else out.add(norm(pinyin(text, { type: 'array' }).join(' ')));
  return [...out].filter(Boolean);
}

/** Every way a word can be said: each reading of it, and a bound character's pair (番 → 番茄) — for a choice he might know. */
export function wordReadings(w: Pick<Word, 'text' | 'pinyin'>): string[] {
  const said = askedAs(w.text);
  return said === w.text ? readingsOf(w.text, w.pinyin) : [...readingsOf(w.text, w.pinyin), ...readingsOf(said, kidGlossReading(said))];
}

/** What Truffle says for a heard question: the card's reading (一's tone changes too), or a bound character's pair. 她 is said tā,
 *  never its old dictionary reading jiě. */
export function heardReadings(w: Pick<Word, 'text' | 'pinyin'>): string[] {
  const said = askedAs(w.text);
  if (said !== w.text) return readingsOf(said, kidGlossReading(said)).slice(0, 1);
  if (!w.pinyin || w.pinyin === 'x') return readingsOf(w.text);
  return [norm(w.pinyin), ...(TONE_CHANGE[w.text] ?? [])];
}

/** Two readings said the same: syllable by syllable, the same sound and — when `toned` — the same tone or a neutral one. */
export function sameSound(a: string, b: string, toned = true): boolean {
  const sa = a.split(' ');
  const sb = b.split(' ');
  if (sa.length !== sb.length) return false;
  return sa.every((x, i) => {
    const p = syllableTone(x);
    const q = syllableTone(sb[i]!);
    return p.base === q.base && (!toned || p.tone === q.tone || p.tone === 5 || q.tone === 5);
  });
}

export const soundsLike = (a: readonly string[], b: readonly string[], toned = true): boolean => a.some((x) => b.some((y) => sameSound(x, y, toned)));

interface Entry { text: string; readings: string[]; gloss: string; level: number | null; source: Word['source'] }
const entry = (w: Word): Entry | null => {
  const gloss = questionMeaning(w);
  return gloss ? { text: w.text, readings: wordReadings(w), gloss, level: w.level, source: w.source } : null;
};

let index: Map<string, Entry[]> | null = null;
const keyOf = (r: string) => r.split(' ').map((s) => syllableTone(s).base).join(' ');
/** Every built-in character and ladder word that takes an English question, by its sound without tones. */
function soundIndex(): Map<string, Entry[]> {
  if (index) return index;
  index = new Map();
  for (const w of [...builtinWords(0), ...ladderWords()]) {
    const e = entry(w);
    if (!e) continue;
    for (const k of new Set(e.readings.map(keyOf))) {
      const list = index.get(k) ?? [];
      list.push(e);
      index.set(k, list);
    }
  }
  return index;
}

/** The words that sound like this word (in the content, or his own list) and mean something in English: what he might think he heard. */
export function soundAlikes(word: Pick<Word, 'text' | 'pinyin'>, pool: readonly Word[] = []): Entry[] {
  const mine = heardReadings(word);
  const seen = new Set([word.text, askedAs(word.text)]); // a bound character's pair is the word itself, said
  const out: Entry[] = [];
  const consider = (e: Entry | null) => {
    if (!e || seen.has(e.text) || !soundsLike(mine, e.readings)) return;
    seen.add(e.text);
    out.push(e);
  };
  const idx = soundIndex();
  for (const k of new Set(mine.map(keyOf))) for (const e of idx.get(k) ?? []) consider(e);
  for (const w of pool) if (!w.paused) consider(entry(w));
  return out;
}

/** 同音字 his school book (一上–二下) sets side by side: one sound, characters he learns to tell apart by meaning. */
export const SAME_SOUND_SETS: readonly string[] = [
  '他她它', '在再', '的得地', '做作坐座', '进近', '已以', '象像向', '园元员原圆', '是事市', '到道', '见件', '气汽', '今金', '和河合',
  '有友', '洗喜', '十时', '机鸡', '工公', '一衣医', '里理', '那哪', '马吗妈', '平苹', '青清', '晴情', '分份', '欢环', '远院',
];
const setOf = new Map(SAME_SOUND_SETS.flatMap((g) => Array.from(g).map((c) => [c, g] as const)));

/**
 * Its English can't be told by ear: it is in a 同音字 set and another of the set is said the same and means something else (他 beside
 * 她, 再 beside 在). `alike` says whether two meanings would both be right (做/作 both "do, make": no matter which he heard).
 */
export function ambiguousByEar(word: Word, pool: readonly Word[], alike: (a: string, b: string) => boolean): boolean {
  const own = questionMeaning(word);
  const set = setOf.get(word.text);
  if (!own || !set) return false;
  return soundAlikes(word, pool).some((e) => set.includes(e.text) && !alike(own, e.gloss));
}
