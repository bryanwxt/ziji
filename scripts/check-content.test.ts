// @vitest-environment node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUILTIN, PASSAGES } from '../src/content';
import moe from '../src/content/moe2024.json';
import { PASSAGE_QUESTIONS } from '../src/content/passageQuestions';
import { checkContent, checkPassageQuestions } from './check-content';

const dataDir = join(process.cwd(), 'node_modules', 'hanzi-writer-data');
const hasStrokeFile = (ch: string) => existsSync(join(dataDir, `${ch}.json`));
/** Every character his book lists, to read or to write (spec 2026-10-11 §7). */
const LISTED = (moe as { lessons: { read: string; write: string; writeHcl: string }[] }).lessons.map((l) => l.read + l.write + l.writeHcl).join('');

describe('built-in content', () => {
  it('has no problems, and has every character on his school lists', () => {
    expect(checkContent(BUILTIN, PASSAGES, hasStrokeFile, LISTED)).toEqual([]);
  });
  it('flags a listed character the app does not have', () => {
    expect(checkContent(BUILTIN.filter((c) => c.char !== '蚂'), [], hasStrokeFile, LISTED)).toContain('蚂: on his school list but not built in');
  });
  it('flags a passage that uses a character outside levels 1–2', () => {
    const problems = checkContent(BUILTIN, [{ id: 'x', title: 't', text: '我'.repeat(29) + '惜', term: '一上', source: 'ziji' }], hasStrokeFile);
    expect(problems).toContain('x: uses 惜 outside levels 1–2'); // 惜 is HSK 5
  });
});
describe('meaning questions (spec 2026-10-12 §3)', () => {
  const easy = new Set(BUILTIN.filter((c) => c.level <= 2).map((c) => c.char));
  it('every built-in passage has one: 谁/哪/什么/为什么, three choices, the right one among them, a real answering sentence, easy characters', () => {
    expect(checkPassageQuestions(PASSAGES.filter((p) => p.source === 'ziji'), PASSAGE_QUESTIONS, easy)).toEqual([]); // Global Storybooks' questions come in Task 5
  });
  it('flags a missing question, a right answer outside the choices, a bad sentence and a hard character', () => {
    const p = PASSAGES.slice(0, 2);
    const q = PASSAGE_QUESTIONS.p01!;
    expect(checkPassageQuestions(p, { p01: q }, easy)).toContain('p02: no meaning question');
    expect(checkPassageQuestions(p.slice(0, 1), { p01: { ...q, answer: 3 as never } }, easy)).toContain('p01: the right answer is not among the choices');
    expect(checkPassageQuestions(p.slice(0, 1), { p01: { ...q, sentence: 9 } }, easy)).toContain('p01: answering sentence 9 is not one of its 3 sentences');
    expect(checkPassageQuestions(p.slice(0, 1), { p01: { ...q, choices: ['爸爸', '妈妈', '鬱'] } }, easy)).toContain('p01: question uses 鬱 in neither the passage nor levels 1–2');
    expect(checkPassageQuestions(p.slice(0, 1), { p01: { ...q, q: '老师好吗？' } }, easy)).toContain('p01: the question asks none of 谁 哪 什么 为什么');
  });
});
