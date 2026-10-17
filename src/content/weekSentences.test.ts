// @vitest-environment node
// The weekly list's own sentences (parent ruling 2026-10-17): the list sentence bank (weekSentences.json, written for the app) and
// the Tatoeba subset (tatoeba.json, scripts/build-tatoeba.ts). Each passes the gates a sentence the child sees must pass; the
// bank also sits in the content gate's sentence surfaces (contentGate.test.ts), with its pinyin stored.
import { describe, expect, it } from 'vitest';
import { sentenceFor } from '../weeklist/fit';
import { matchText } from '../weeklist/match';
import { BLOCKED, ERHUA } from './blocked';
import moe from './moe2024.json';
import { HSK_WORDS } from './index';
import tatoebaFile from './tatoeba.json';
import bankFile from './weekSentences.json';
import { blockedWordsIn } from './zuju';

const bank = (bankFile as { words: Record<string, string> }).words;
const tatoeba = (tatoebaFile as unknown as { words: Record<string, { id: number; s: string }[]>; license: string }).words;
const word = (t: string) => matchText(t, new Map(), 0, () => t).word;
const once = (s: string, w: string) => { const at = s.indexOf(w); return at >= 0 && s.indexOf(w, at + 1) < 0; };
const ERHUA_OK = /儿子|女儿|儿童|儿歌|幼儿园|婴儿/;
/** What every sentence of either source must be: the word once, a whole sentence, nothing blocked, no 儿化, no Latin. */
function problems(w: string, s: string, min: number, max: number): string[] {
  const out: string[] = [];
  const n = Array.from(s).length;
  if (!once(s, w)) out.push('the word once');
  if (n < min || n > max) out.push(`${n} characters`);
  if (!/[。！？]$/u.test(s)) out.push('no ending');
  if (/[A-Za-z0-9\s]/.test(s)) out.push('Latin, digits or spaces');
  if (s.includes('儿') && !ERHUA_OK.test(s)) out.push('儿化');
  if (Object.keys(ERHUA).some((e) => s.includes(e))) out.push('儿化');
  const blocked = [...blockedWordsIn(s), ...[...BLOCKED].filter((b) => Array.from(b).length > 1 && s.includes(b))];
  if (blocked.length) out.push(`blocked ${blocked.join(' ')}`);
  return out.map((p) => `${w} ${s}: ${p}`);
}

describe('the list sentence bank', () => {
  it('holds 400–800 words, one sentence each', () => {
    expect(Object.keys(bank).length).toBeGreaterThanOrEqual(400);
    expect(Object.keys(bank).length).toBeLessThanOrEqual(800);
  });
  it('every sentence is 8–16 characters, the word once, nothing blocked, no 儿化', () => {
    expect(Object.entries(bank).flatMap(([w, s]) => problems(w, s, 8, 16))).toEqual([]);
  });
  it('adds only words with no sentence of the app\'s own (school file, bank): none is dead weight', () => {
    expect(Object.keys(bank).filter((w) => sentenceFor(word(w)) !== null)).toEqual([]);
  });
  it('covers the common tuition-sheet words', () => {
    const extra = { bank, tatoeba: {} };
    const words = ['共用', '整齐', '原谅', '羽毛', '扁豆', '碰碰车', '冰凉', '热闹', '指着', '亮晶晶', '低下头', '结出', '摸', '套', '圈圈', '鸡翅', '摊', '气球'];
    expect(words.filter((w) => !sentenceFor(word(w), extra))).toEqual([]);
  });
});

describe('the Tatoeba subset', () => {
  const moeChars = new Set((moe as unknown as { lessons: { read: string; write: string }[] }).lessons.flatMap((l) => Array.from(l.read + l.write)));
  const hsk12 = new Set([...HSK_WORDS].filter(([, l]) => l <= 2).flatMap(([w]) => Array.from(w)));
  const rows = Object.entries(tatoeba).flatMap(([w, xs]) => xs.map((x) => ({ w, ...x })));
  it('is attributed: CC BY 2.0 FR, each sentence with its Tatoeba id', () => {
    expect((tatoebaFile as { license: string }).license).toMatch(/CC BY 2\.0 FR/);
    expect(rows.every((r) => Number.isInteger(r.id) && r.id > 0)).toBe(true);
  });
  it('at most 2 a word, and only for words with no sentence of ours', () => {
    expect(Object.values(tatoeba).every((xs) => xs.length >= 1 && xs.length <= 2)).toBe(true);
    expect(Object.keys(tatoeba).filter((w) => w in bank)).toEqual([]);
  });
  it('every sentence is 6–20 characters, the word once, nothing blocked, no 儿化', () => {
    expect(rows.flatMap((r) => problems(r.w, r.s, 6, 20))).toEqual([]);
  });
  it('reads with his school characters and HSK 1–2 (the word\'s own characters aside): simplified only', () => {
    const bad = rows.filter((r) => Array.from(r.s).some((c) => /\p{Script=Han}/u.test(c) && !moeChars.has(c) && !hsk12.has(c) && !r.w.includes(c)));
    expect(bad.map((r) => r.s)).toEqual([]);
    expect(rows.some((r) => /[們這麼說話]/u.test(r.s))).toBe(false);
  });
  it('carries none of the adult topics the build leaves out (他妈的 came through the blocklist)', () => {
    expect(rows.filter((r) => /他妈|妈的|死|杀|酒|地狱|吻/u.test(r.s)).map((r) => r.s)).toEqual([]);
  });
});
