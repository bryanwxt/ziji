// src/weeklist/fit.ts
// 选词填空 from the list (weekly list spec 2026-10-17 §7.3): a written sentence with the word blanked, three list-mates that
// don't fit, confirmed by the parent before it is ever asked.
import { MAX_SENTENCE_CUE } from '../activities/flashcards/meaning';
import { BLOCKED, ERHUA } from '../content/blocked';
import { DAPEI } from '../content/dapei';
import { kidGloss } from '../content/kidGloss';
import { getCharInfo, HSK_WORDS } from '../content';
import { bankFor, BLANK, fillGap } from '../content/sentenceBank';
import { sentencesFor } from '../content/understand';
import { shuffle, type Rng } from '../lib/random';
import type { UseItem } from '../practice/useItems';
import type { WeekFit, Word } from '../types';
import { isAdjPhrase, type DraftPair } from './parse';
import { VERB_FAMILY } from './dapei';

const once = (s: string, w: string) => { const at = s.indexOf(w); return at >= 0 && s.indexOf(w, at + 1) < 0; };
const blank = (s: string, w: string) => s.replace(w, BLANK);

/** The word's sentence, blanked: his class sentence, the school sentence file, the bank's first gap (spec §7.3). */
export function sentenceFor(word: Word): { text: string; source: WeekFit['source'] } | null {
  const ok = (s: string) => once(s, word.text) && Array.from(s).length <= MAX_SENTENCE_CUE && Array.from(s).length >= Array.from(word.text).length + 4;
  const cls = (word.sentences ?? []).find((s) => ok(s.text));
  if (cls) return { text: blank(cls.text, word.text), source: 'class' };
  const school = sentencesFor(word.text).find((s) => ok(s.zh));
  if (school) return { text: blank(school.zh, word.text), source: 'school' };
  const b = bankFor(word.text);
  if (b && ok(fillGap(b.gaps[0], word.text))) return { text: b.gaps[0].text, source: 'bank' };
  return null;
}

const VERBS = new Set(DAPEI.map((d) => d.verb));
export function wordKind(text: string, pairs: DraftPair[]): 'verb' | 'adj' | 'noun' | null {
  const bank = bankFor(text);
  if (bank) return bank.type === 'v' ? 'verb' : bank.type === 'adj' ? 'adj' : bank.type === 'n' ? 'noun' : null;
  if (pairs.some((p) => p.left === text) || VERBS.has(text)) return 'verb';
  const c = Array.from(text);
  if (isAdjPhrase(text) || (c.length === 3 && c[1] === c[2])) return 'adj';
  if (pairs.some((p) => p.right === text)) return 'noun';
  return null;
}

/** Shares a character, a radical or a gloss word with the answer: a confusable, asked first (spec §7.3). */
function confusable(a: string, b: string): boolean {
  const ca = Array.from(a);
  const cb = Array.from(b);
  if (ca.some((c) => cb.includes(c))) return true;
  const rad = (s: string[]) => s.map((c) => getCharInfo(c)?.radical).filter(Boolean);
  if (rad(ca).some((r) => rad(cb).includes(r))) return true;
  const ga = (kidGloss(a) ?? '').split(/[\s,]+/);
  return (kidGloss(b) ?? '').split(/[\s,]+/).some((g) => g.length > 2 && ga.includes(g));
}

export function proposeFit(word: Word, mates: Word[], pairs: DraftPair[], sentence: { text: string; source: WeekFit['source'] }, skip: ReadonlySet<string> = new Set()): WeekFit | null {
  const at = sentence.text.indexOf(BLANK);
  const before = sentence.text.slice(0, at);
  const after = sentence.text.slice(at + 1);
  const kind = wordKind(word.text, pairs);
  const len = Array.from(word.text).length;
  const edgeWord = (d: string) => HSK_WORDS.has((before.at(-1) ?? '') + d) || HSK_WORDS.has(d + (after[0] ?? ''));
  const candidates = mates.filter((m) => {
    const d = m.text;
    if (d === word.text || d.includes(word.text) || word.text.includes(d) || skip.has(d) || BLOCKED.has(d)) return false;
    if (sentence.text.includes(d)) return false; // already printed in the sentence
    if (edgeWord(d) && !edgeWord(word.text)) return false; // it would make a word across the blank's edge
    const k = wordKind(d, pairs);
    if (kind && k && k !== kind) return false;
    if (kind === 'verb' && VERB_FAMILY[d] && VERB_FAMILY[d] === VERB_FAMILY[word.text]) return false;
    if (sentencesFor(d).some((s) => s.zh === before + d + after)) return false;
    return true;
  }).map((m) => m.text);
  const sameLen = candidates.filter((d) => Array.from(d).length === len);
  const pool = sameLen.length >= 3 ? sameLen : candidates;
  const ranked = [...pool.filter((d) => confusable(word.text, d)), ...pool.filter((d) => !confusable(word.text, d))];
  if (ranked.length < 3) return null;
  return { wordId: word.id, sentence: sentence.text, source: sentence.source, wrong: [ranked[0]!, ranked[1]!, ranked[2]!] };
}

export function parentSentenceProblems(text: string, word: string): string[] {
  const out: string[] = [];
  if (!once(text, word)) out.push('the word must appear once');
  const n = Array.from(text).length;
  if (n < 6 || n > MAX_SENTENCE_CUE) out.push(`6–${MAX_SENTENCE_CUE} characters`);
  for (const b of BLOCKED) if (text.includes(b)) out.push(b in ERHUA ? `儿化: ${b}` : `blocked: ${b}`);
  if (/[A-Za-z]/.test(text)) out.push('no English or pinyin');
  return out;
}

/** A confirmed row as 选一选's question (UseQuestion `fit`). */
export function fitUseItem(fit: WeekFit, word: Word, rng: Rng): UseItem {
  const at = fit.sentence.indexOf(BLANK);
  return { kind: 'fit', wordId: word.id, word: word.text, before: fit.sentence.slice(0, at), after: fit.sentence.slice(at + 1), options: shuffle([word.text, ...fit.wrong], rng), ...(word.meaning && word.source === 'parent' ? { meaning: word.meaning } : {}) };
}
