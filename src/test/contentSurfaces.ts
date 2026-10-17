// Every child-facing surface that shows or says a word, with the pinyin the app gives it (the content audit's collector,
// 2026-10-15, on today's code): what src/content/contentGate.test.ts checks.
import { pickExample } from '../activities/writing/cue';
import { BUILTIN, builtinReading, builtinWords, HSK_WORDS, PASSAGES } from '../content';
import { CHENGYU, chengyuPinyin } from '../content/chengyu';
import { taughtAt } from '../content/curriculum';
import { DAPEI } from '../content/dapei';
import { familyOf } from '../content/family';
import { ladderWords } from '../content/ladder';
import { fillGap, SENTENCE_BANK } from '../content/sentenceBank';
import { shownSentences, weekBankRows } from '../content/sentenceSources';
import { isChildWord, readingOf } from '../content/wordGate';
import { collectionCards } from '../fun/collection';
import { familyDistractors } from '../practice/family';
import { dapeiQuestion, nearWords, NEAR_MAX_HSK, zuciBoard } from '../practice/pairs';
import { mulberry32 } from '../lib/random';
import { splitSentences } from '../langdu/sentences';
import type { Knowledge } from '../stats/stats';
import type { Word } from '../types';
import s1a from '../content/sentences/一上.json';
import s1b from '../content/sentences/一下.json';
import s2a from '../content/sentences/二上.json';
import s2b from '../content/sentences/二下.json';

export interface ShownWord { word: string; py: string; surface: string; via: string }

export const isHan = (c: string) => /\p{Script=Han}/u.test(c);
export const words = builtinWords(0);
export const wordByChar = new Map(words.map((w) => [w.text, w]));
/** His textbook's characters (一上–三下). */
export const school = BUILTIN.filter((c) => taughtAt(c.char) !== undefined);
export const schoolSet = new Set(school.map((c) => c.char));
export const cardReading = new Map(BUILTIN.map((c) => [c.char, builtinReading(c)]));
/** The characters whose cards he can reach: his school's, and HSK 1–3 (the ladder's range). */
export const inScope = new Set(BUILTIN.filter((c) => schoolSet.has(c.char) || c.level <= 3).map((c) => c.char));

let cache: ShownWord[] | null = null;
/** Every word a surface can show or say, with its pinyin (one syllable per Han character when it lines up). */
export function shownWords(): ShownWord[] {
  if (cache) return cache;
  const rows: ShownWord[] = [];
  const add = (word: string, py: string | undefined, surface: string, via: string) => rows.push({ word, py: py ?? readingOf(word), surface, via });
  for (const ch of inScope) {
    const w = wordByChar.get(ch)!;
    for (const e of w.examples ?? []) add(e.text, e.pinyin, 'card 组词', ch); // the 认新字 card, its usage line, word of the day
    const pe = pickExample(w);
    if (pe) add(pe.example.text, pe.example.pinyin, '写一写 cue', ch);
    const fam = familyOf(ch, inScope, cardReading.get(ch));
    if (fam.length >= 2) fam.forEach((f) => add(f.text, f.pinyin, '找一家人', ch)); // the two he must find
    if (fam.length >= 2) for (const d of familyDistractors(ch, inScope)) add(d.text, d.pinyin, '找一家人 distractor', ch);
    const board = zuciBoard(w, mulberry32(1));
    if (board) add(board.target.join(''), undefined, '连一连 own', ch);
  }
  for (const w of ladderWords()) {
    add(w.text, w.pinyin, 'ladder', w.text);
    const board = zuciBoard(w, mulberry32(1));
    if (board) add(board.target.join(''), undefined, '连一连 own', w.text);
  }
  for (const w of nearWords(NEAR_MAX_HSK)) add(w, undefined, '连一连 near', `HSK${HSK_WORDS.get(w)}`);
  // 搭配: the pairs dapeiQuestion asks, each verb's (a question's options are the partner and its three wrong ones)
  for (const verb of new Set(DAPEI.map((d) => d.verb))) {
    const w = wordByChar.get(verb) ?? ({ text: verb } as Word);
    const asked = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) { const q = dapeiQuestion(w, mulberry32(seed)); if (q) asked.add(q.noun); }
    for (const d of DAPEI.filter((x) => x.verb === verb && asked.has(x.noun))) {
      add(d.verb + d.noun, undefined, '搭配', verb);
      for (const x of [d.noun, ...d.wrong]) add(x, undefined, '搭配 option', verb);
    }
  }
  for (const b of SENTENCE_BANK) {
    add(b.word, undefined, 'bank word', b.word);
    for (const g of b.gaps) for (const x of g.wrong) add(x, undefined, 'bank choice', b.word);
  }
  for (const r of [s1a, s1b, s2a, s2b].flat() as { word: string }[]) add(r.word, undefined, 'understand word', r.word);
  for (const c of CHENGYU) add(c.text, chengyuPinyin(c.text), '成语', c.text);
  // a meaning question's choices: the HSK words of a length it may offer (meaning.ts hskChoices)
  for (const [w] of HSK_WORDS) if (isChildWord(w)) add(w, undefined, 'meaning choice', `HSK${HSK_WORDS.get(w)}`);
  // the collection: every card's example, caught or not
  const know = { knownChars: new Set(BUILTIN.map((c) => c.char)), cardsById: new Map() } as unknown as Knowledge;
  for (const c of collectionCards(BUILTIN, know)) if (c.example) add(c.example, undefined, '字卡 collection', c.char);
  return (cache = rows);
}

/** Every sentence written for the app, with what it is for. */
export function shownSentenceRows(): { s: string; for: string; surface: string }[] {
  const out: { s: string; for: string; surface: string }[] = [];
  for (const b of SENTENCE_BANK) {
    b.gaps.forEach((g) => out.push({ s: fillGap(g, b.word), for: b.word, surface: 'bank' }));
    out.push({ s: b.misuse, for: b.word, surface: 'bank misuse' });
  }
  for (const r of [s1a, s1b, s2a, s2b].flat() as { word: string; s: { zh: string }[] }[]) for (const s of r.s) out.push({ s: s.zh, for: r.word, surface: 'understand' });
  for (const c of CHENGYU) for (const s of c.sentences) out.push({ s, for: c.text, surface: '成语 sentence' });
  for (const r of weekBankRows()) out.push({ s: r.s, for: r.word, surface: 'list sentence bank' });
  for (const p of PASSAGES) for (const s of splitSentences(p.text)) out.push({ s, for: p.id, surface: '朗读 passage' });
  return out;
}
export { shownSentences };

export { sameReading } from '../content/wordGate';
