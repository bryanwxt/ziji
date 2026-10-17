// src/weeklist/fit.ts
// 选词填空 from the list (weekly list spec 2026-10-17 §7.3): a written sentence with the word blanked, three list-mates that
// don't fit, confirmed by the parent before it is ever asked.
import { MAX_SENTENCE_CUE } from '../activities/flashcards/meaning';
import { BLOCKED, ERHUA } from '../content/blocked';
import { DAPEI } from '../content/dapei';
import { dictionaryGloss, glossFor } from '../content/glossary';
import { kidGloss } from '../content/kidGloss';
import { getCharInfo, HSK_WORDS, PASSAGES } from '../content';
import { bankFor, BLANK, fillGap, SENTENCE_BANK } from '../content/sentenceBank';
import { allSchoolSentences, sentencesFor } from '../content/understand';
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
type Kind = 'verb' | 'adj' | 'noun' | 'other';

let corpus: string | null = null;
/** Every sentence written for the app (school file, bank, passages), joined: where a word is seen tells its kind and its spots. */
const CORPUS = () => (corpus ??= [
  ...allSchoolSentences(), ...SENTENCE_BANK.flatMap((b) => b.gaps.map((g) => fillGap(g, b.word))), ...PASSAGES.map((p) => p.text),
].join('|'));
const DEGREE = ['很', '非常', '真', '太', '特别'];
/** Seen as an adjective: after 很/非常/真/太, or before 极了. */
const seenAsAdj = (w: string) => DEGREE.some((d) => CORPUS().includes(d + w)) || CORPUS().includes(`${w}极了`);
const reduplicated = (t: string) => { const c = Array.from(t); return (c.length === 3 && (c[1] === c[2] || c[0] === c[1])) || (c.length === 4 && c[0] === c[1] && c[2] === c[3]); };

/**
 * A word's part of speech, as well as the app can tell (follow-up 2026-10-17): the bank's type, then its place in the list's
 * pairs, its shape (ABB, AABB, 「X的」), the dictionary's "to …" for a verb, being seen after 很 for an adjective, a dictionary
 * gloss for a noun. Null when nothing says.
 */
export function wordKind(text: string, pairs: DraftPair[]): Kind | null {
  const bank = bankFor(text);
  if (bank) return bank.type === 'v' ? 'verb' : bank.type === 'adj' ? 'adj' : bank.type === 'n' ? 'noun' : 'other';
  if (pairs.some((p) => p.left === text) || VERBS.has(text)) return 'verb';
  if (isAdjPhrase(text) || reduplicated(text)) return 'adj';
  if (pairs.some((p) => p.right === text)) return 'noun';
  const gloss = dictionaryGloss(text) ?? glossFor(text);
  if (gloss && /^to /i.test(gloss)) return 'verb';
  if (seenAsAdj(text)) return 'adj';
  return gloss ? 'noun' : null;
}

/** Shapes a child reads without reading the word (rule 6, as questionProblems): a decoy differs from the answer in none of them. */
const SHAPES: ((t: string) => boolean)[] = [reduplicated, (t) => t.endsWith('的'), (t) => t.endsWith('了'), (t) => t.startsWith('很'), (t) => t.startsWith('在')];
const sameShape = (a: string, b: string) => SHAPES.every((f) => f(a) === f(b));

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

/** How many rows already use each word as a decoy, and the most any word may be (spread, follow-up 2026-10-17). */
export const DECOY_CAP = 3;

/**
 * Three list-mates that don't fit the blank (spec §7.3). Never a different part of speech or shape from the answer, when the
 * answer's is known (rule 6: the grammar must not give it away); confusables first, then the least-used decoys. Null when fewer
 * than three are left.
 */
export function proposeFit(
  word: Word, mates: Word[], pairs: DraftPair[], sentence: { text: string; source: WeekFit['source'] }, skip: ReadonlySet<string> = new Set(),
  used: ReadonlyMap<string, number> = new Map(),
): WeekFit | null {
  const at = sentence.text.indexOf(BLANK);
  const before = sentence.text.slice(0, at);
  const after = sentence.text.slice(at + 1);
  const kind = wordKind(word.text, pairs);
  const len = Array.from(word.text).length;
  const edgeWord = (d: string) => HSK_WORDS.has((before.at(-1) ?? '') + d) || HSK_WORDS.has(d + (after[0] ?? ''));
  const candidates = [...new Set(mates.map((m) => m.text))].filter((d) => {
    if (d === word.text || d.includes(word.text) || word.text.includes(d) || skip.has(d) || BLOCKED.has(d)) return false;
    if ((used.get(d) ?? 0) >= DECOY_CAP) return false;
    if (sentence.text.includes(d)) return false; // already printed in the sentence
    if (edgeWord(d) && !edgeWord(word.text)) return false; // it would make a word across the blank's edge
    if (kind && wordKind(d, pairs) !== kind) return false; // the grammar would give the answer away
    if (!sameShape(word.text, d)) return false;
    if (kind === 'verb' && VERB_FAMILY[d] && VERB_FAMILY[d] === VERB_FAMILY[word.text]) return false;
    if (sentencesFor(d).some((s) => s.zh === before + d + after)) return false;
    return true;
  });
  const sameLen = candidates.filter((d) => Array.from(d).length === len);
  const pool = sameLen.length >= 3 ? sameLen : candidates;
  const order = (d: string) => (confusable(word.text, d) ? 0 : 1) * 100 + (used.get(d) ?? 0);
  const ranked = pool.map((d, i) => [d, order(d), i] as const).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(([d]) => d);
  if (ranked.length < 3) return null;
  return { wordId: word.id, sentence: sentence.text, source: sentence.source, wrong: [ranked[0]!, ranked[1]!, ranked[2]!] };
}

/** Rows for a whole list, decoys spread so no word is a decoy in more than DECOY_CAP rows. Keyed by the word's text. */
export function proposeFits(words: Word[], pairs: DraftPair[]): Map<string, WeekFit | null> {
  const used = new Map<string, number>();
  const out = new Map<string, WeekFit | null>();
  for (const w of words) {
    if (out.has(w.text)) continue;
    const s = sentenceFor(w);
    const fit = s ? proposeFit(w, words, pairs, s, new Set(), used) : null;
    for (const d of fit?.wrong ?? []) used.set(d, (used.get(d) ?? 0) + 1);
    out.set(w.text, fit);
  }
  return out;
}

/**
 * The decoys that may well fit the blank after all (the parent looks at these rows first): seen in the app's sentences right
 * after the character before the blank (很干净), or right before the one after it.
 */
export function mightFit(fit: WeekFit): string[] {
  const at = fit.sentence.indexOf(BLANK);
  const prev = fit.sentence.slice(0, at).match(/\p{Script=Han}$/u)?.[0];
  const next = fit.sentence.slice(at + 1).match(/^\p{Script=Han}/u)?.[0];
  return fit.wrong.filter((d) => (prev && CORPUS().includes(prev + d)) || (next && CORPUS().includes(d + next)));
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

/** A confirmed row as 选一选's question (UseQuestion `fit`). `pool`: his words, for a parent decoy's own English on the miss sheet. */
export function fitUseItem(fit: WeekFit, word: Word, rng: Rng, pool: readonly Word[] = []): UseItem {
  const at = fit.sentence.indexOf(BLANK);
  const glosses = Object.fromEntries(fit.wrong.flatMap((d) => { const w = pool.find((x) => x.text === d && x.source === 'parent' && x.meaning); return w ? [[d, w.meaning!]] : []; }));
  return {
    kind: 'fit', wordId: word.id, word: word.text, before: fit.sentence.slice(0, at), after: fit.sentence.slice(at + 1), options: shuffle([word.text, ...fit.wrong], rng),
    ...(word.meaning && word.source === 'parent' ? { meaning: word.meaning } : {}), ...(Object.keys(glosses).length ? { glosses } : {}),
  };
}

/**
 * A confirmed row still guess-proof at the time it is asked (spec §7.3): the blank once; three different decoys, each still a word
 * on the list (an edit can take one off), none the answer, inside it or holding it, none printed in the sentence, none of another
 * shape than the answer (rule 6). A row that fails is not asked: the word is asked in its other forms.
 */
export function fitStillGood(fit: WeekFit, answer: string, onList: ReadonlySet<string>): boolean {
  const at = fit.sentence.indexOf(BLANK);
  if (at < 0 || fit.sentence.indexOf(BLANK, at + 1) >= 0) return false;
  if (new Set(fit.wrong).size !== 3) return false;
  return fit.wrong.every((d) => onList.has(d) && d !== answer && !d.includes(answer) && !answer.includes(d) && !fit.sentence.includes(d) && sameShape(answer, d) && !BLOCKED.has(d));
}

/** A 搭配 still guess-proof when asked (spec §7.4): three different wrong partners, none the right one. */
export const pairStillGood = (p: { right: string; wrong: readonly string[] }) => new Set(p.wrong).size === 3 && !p.wrong.includes(p.right) && p.wrong.every((w) => !BLOCKED.has(w));
