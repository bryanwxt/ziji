// Sentences for the Understand rung (spec 2026-10-06 §3.1–3.2): two short spoken sentences per word, written for the app (never
// from class material), each using only characters taught by the word's own school term. One JSON file per term.
import type { Word } from '../types';
import { cardMeaning } from './glossary';
import { builtinWords, MOE_TERMS, schoolTerm } from './index';
import { ladderWords } from './ladder';
import s1a from './sentences/一上.json';
import s1b from './sentences/一下.json';
import s2a from './sentences/二上.json';
import s2b from './sentences/二下.json';

export const SENTENCE_TERMS = ['一上', '一下', '二上', '二下'] as const;
export interface Sentence { zh: string; en: string }
interface Row { word: string; s: Sentence[] }

const BY_WORD = new Map<string, Sentence[]>(([s1a, s1b, s2a, s2b] as Row[][]).flat().map((r) => [r.word, r.s]));
const isHan = (c: string) => /\p{Script=Han}/u.test(c);
const order = (t: string) => MOE_TERMS.indexOf(t);

/** The latest school term among the word's characters; null when one has no term. */
export function wordTerm(text: string): string | null {
  let latest: string | null = null;
  for (const c of Array.from(text).filter(isHan)) {
    const t = schoolTerm(c);
    if (!t) return null;
    if (latest === null || order(t) > order(latest)) latest = t;
  }
  return latest;
}

const allowedCache = new Map<string, Set<string>>();
/** Every character taught by the end of this term. */
export function allowedChars(term: string): Set<string> {
  let out = allowedCache.get(term);
  if (!out) {
    out = new Set(builtinWords(0).map((w) => w.text).filter((c) => { const t = schoolTerm(c); return !!t && order(t) <= order(term); }));
    allowedCache.set(term, out);
  }
  return out;
}

export const sentencesFor = (text: string): Sentence[] => BY_WORD.get(text) ?? [];

/** The hearable words of a term, characters and ladder 词语, in ladder order (what the writer works through). */
export function inScopeWords(term: string): Word[] {
  const chars = builtinWords(0).filter((w) => schoolTerm(w.text) === term && !!cardMeaning(w));
  const words = ladderWords().filter((w) => wordTerm(w.text) === term && !!cardMeaning(w));
  return [...chars, ...words].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9));
}

/** What is wrong with a word's sentences (empty when they follow every rule). */
export function sentenceProblems(word: string, s: Sentence[]): string[] {
  const out: string[] = [];
  const term = wordTerm(word);
  if (s.length !== 2) out.push(`${word}: needs two sentences, has ${s.length}`);
  if (s.length === 2 && s[0]!.zh === s[1]!.zh) out.push(`${word}: the same sentence twice`);
  if (s.length === 2 && s[0]!.en === s[1]!.en) out.push(`${word}: the same English twice`);
  const ok = term ? allowedChars(term) : new Set<string>();
  for (const { zh, en } of s) {
    const han = Array.from(zh).filter(isHan);
    if (!zh.includes(word)) out.push(`${word}: "${zh}" does not contain the word`);
    if (han.length < 5 || han.length > 16) out.push(`${word}: "${zh}" has ${han.length} characters (5–16)`);
    if (!/[。！？]$/.test(zh)) out.push(`${word}: "${zh}" must end with 。！or？`);
    if (/[A-Za-z\p{Extended_Pictographic}]/u.test(zh)) out.push(`${word}: "${zh}" has letters or emoji`);
    const late = han.filter((c) => !ok.has(c));
    if (late.length) out.push(`${word}: "${zh}" uses character(s) not taught by ${term ?? 'its term'}: ${[...new Set(late)].join('')}`);
    if (!/^[\x20-\x7E]+$/.test(en) || !en.trim()) out.push(`${word}: English "${en}" must be plain English`);
    else if (!/^[A-Z"']/.test(en)) out.push(`${word}: English "${en}" must start with a capital`);
    if (en.length > 80) out.push(`${word}: English "${en}" is over 80 characters`);
  }
  return out;
}
