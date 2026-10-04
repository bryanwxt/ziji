import { SENTENCE_BANK } from '../content/sentenceBank';
import { shuffle, type Rng } from '../lib/random';
import type { CardRecord, Word } from '../types';
import { fitItem, usageItem, type UseItem } from './useItems';

export interface ChooseInput {
  words: Word[];
  cards: CardRecord[];
  newWordIds: string[]; // today's new words
  meaningDueIds: string[]; // meaning cards due today
  missedIds: string[]; // words missed earlier in this lesson
  knownChars: ReadonlySet<string>;
  rng: Rng;
  count: number;
}

/** About 8 items at 30 minutes (spec §20 part 4), never under 4. */
export const chooseCount = (minutes: number) => Math.max(4, Math.round((8 * minutes) / 30));

const HAN = /\p{Script=Han}/u;

/**
 * 选一选 items (spec §19 part 3, §20 part 4): his words first — today's new words, due meaning words, words he missed,
 * then the rest he has begun, most recently seen first — then bank words he can read (practice only). Fit and 用对了吗 alternate.
 */
export function planChoose(i: ChooseInput): UseItem[] {
  const active = i.words.filter((w) => !w.paused);
  const byId = new Map(active.map((w) => [w.id, w]));
  const lastSeen = new Map(i.cards.map((c) => [c.wordId, c.fsrs.last_review?.getTime() ?? 0]));
  const begun = [...new Set(i.cards.filter((c) => c.kind === 'recognise').map((c) => c.wordId))]
    .filter((id) => byId.has(id))
    .sort((a, b) => (lastSeen.get(b) ?? 0) - (lastSeen.get(a) ?? 0));
  const order = [...new Set([...i.newWordIds, ...i.meaningDueIds, ...i.missedIds, ...begun])];
  const out: UseItem[] = [];
  const add = (make: (kind: UseItem['kind']) => UseItem | null) => {
    const want: UseItem['kind'] = out.length % 2 === 0 ? 'fit' : 'usage';
    const item = make(want) ?? make(want === 'fit' ? 'usage' : 'fit');
    if (item) out.push(item);
  };
  for (const id of order) {
    if (out.length >= i.count) break;
    const w = byId.get(id);
    if (w) add((k) => (k === 'fit' ? fitItem(w, active, i.rng, 1) : usageItem(w.text, w.id)));
  }
  const his = new Set(active.map((w) => w.text));
  const readable = (s: string) => Array.from(s).every((ch) => !HAN.test(ch) || i.knownChars.has(ch));
  for (const b of shuffle([...SENTENCE_BANK], i.rng)) {
    if (out.length >= i.count) break;
    if (his.has(b.word) || !readable(b.word + b.gaps.map((g) => g.text + g.wrong.join('')).join('') + b.misuse)) continue; // the wrong choices too
    const temp: Word = { id: '', text: b.word, pinyin: '', level: null, rank: null, source: 'builtin', writeable: false, paused: false, createdAt: 0 };
    add((k) => (k === 'fit' ? fitItem(temp, active, i.rng) : usageItem(b.word, null)));
  }
  return out;
}
