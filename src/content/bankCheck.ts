import { BUILTIN, HSK_WORDS } from '.';
import { MAX_SENTENCE_CUE } from '../activities/flashcards/meaning';
import { BLANK, fillGap, type BankItem } from './sentenceBank';

const CHAR_LEVEL = new Map(BUILTIN.map((c) => [c.char, c.level]));
const HAN = /\p{Script=Han}/u;
export const isRealWord = (t: string) => (Array.from(t).length > 1 ? HSK_WORDS.has(t) : CHAR_LEVEL.has(t));
export const wordLevel = (t: string): number | undefined => (Array.from(t).length > 1 ? HSK_WORDS.get(t) : CHAR_LEVEL.get(t));
const count = (s: string, part: string) => s.split(part).length - 1;

/** Problems with one bank item (spec §19 part 4, §20 part 4); empty when it is fine. */
export function checkBankItem(item: BankItem): string[] {
  const p: string[] = [];
  const level = wordLevel(item.word);
  if (level === undefined) return [`${item.word}: not an HSK word or character`];
  const len = Array.from(item.word).length;
  const readable = (s: string, what: string) => {
    for (const ch of Array.from(s).filter((c) => HAN.test(c))) {
      const l = CHAR_LEVEL.get(ch);
      if (l === undefined || l > level + 1) p.push(`${item.word} ${what}: ${ch} is HSK ${l ?? '?'} (word is HSK ${level})`);
    }
    if (Array.from(s).length > MAX_SENTENCE_CUE) p.push(`${item.word} ${what}: longer than ${MAX_SENTENCE_CUE} characters`);
  };
  item.gaps.forEach((g, i) => {
    const at = `gap ${i + 1}`;
    if (count(g.text, BLANK) !== 1) p.push(`${item.word} ${at}: needs exactly one ${BLANK}`);
    if (new Set(g.wrong).size !== 3 || g.wrong.includes(item.word)) p.push(`${item.word} ${at}: 3 different wrong choices, none the word`);
    for (const w of g.wrong) {
      if (!isRealWord(w)) p.push(`${item.word} ${at}: ${w} is not a real word`);
      if (Array.from(w).length !== len) p.push(`${item.word} ${at}: ${w} is not ${len} characters`);
      readable(w, `${at} choice`);
    }
    const full = fillGap(g, item.word);
    if (count(full, item.word) !== 1) p.push(`${item.word} ${at}: the word must appear once`);
    readable(full, at);
  });
  if (count(item.misuse, item.word) !== 1 || item.misuse.includes(BLANK)) p.push(`${item.word} misuse: must use the word exactly once`);
  readable(item.misuse, 'misuse');
  if (item.pair && !isRealWord(item.pair)) p.push(`${item.word} pair: ${item.pair} is not a real word`);
  return p;
}
