// @vitest-environment node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUILTIN, PASSAGES } from '../src/content';
import moe from '../src/content/moe2024.json';
import { PASSAGE_QUESTIONS } from '../src/content/passageQuestions';
import type { Passage, PassageQuestion } from '../src/types';
import { checkContent, checkPassageQuestions, questionProblems, topWord } from './check-content';

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
describe('meaning questions (spec 2026-10-15 §6)', () => {
  it('every built-in passage has two, each passing every rule', () => {
    expect(checkPassageQuestions(PASSAGES, PASSAGE_QUESTIONS)).toEqual([]);
  });
  const p: Passage = { id: 'x1', title: '我的家', text: '我家有五个人：爸爸、妈妈、哥哥、妹妹和我。爸爸是医生，妈妈是老师。我很爱我的家。', term: '一下', source: 'ziji' };
  const ok: PassageQuestion = { q: '谁是老师？', choices: ['爸爸', '妈妈', '哥哥'], answer: 1, sentence: 1 };
  const other: PassageQuestion = { q: '爸爸做什么工作？', choices: ['医生', '老师', '妹妹'], answer: 0, sentence: 1 };
  const flags = (q: PassageQuestion) => questionProblems(p, q);
  it('a fair question passes', () => {
    expect(flags(ok)).toEqual([]);
  });
  it('shape: what it asks, three different choices, the right one among them, a real answering sentence', () => {
    expect(flags({ ...ok, q: '老师好吗？' })).toContain('x1 "老师好吗？": asks none of 谁 哪 什么 为什么 怎么样');
    expect(flags({ ...ok, choices: ['爸爸', '爸爸', '哥哥'] })).toContain('x1 "谁是老师？": needs three different choices');
    expect(flags({ ...ok, answer: 3 as never })).toContain('x1 "谁是老师？": the right answer is not among the choices');
    expect(flags({ ...ok, sentence: 9 })).toContain('x1 "谁是老师？": answering sentence 9 is not one of its 3 sentences');
  });
  it("characters he knows: each from the passage or his book's lists through the passage's term", () => {
    expect(flags({ ...ok, choices: ['爸爸', '妈妈', '鬱'] })).toContain('x1 "谁是老师？": uses 鬱 in neither the passage nor the lists through 一下');
    expect(flags({ ...ok, q: '谁是老师？岁', choices: ['爸爸', '妈妈', '哥哥'] })).toContain('x1 "谁是老师？岁": uses 岁 in neither the passage nor the lists through 一下'); // 岁 is HSK 1, but taught in 二上
    expect(questionProblems({ ...p, term: '二上' }, { ...ok, q: '谁是老师？岁' })).toEqual([]);
  });
  it('rule 1: all three choices in the passage, or none', () => {
    expect(flags({ ...ok, choices: ['爸爸', '妈妈', '姐姐'] })).toContain('x1 "谁是老师？": some choices are in the passage and some not (all or none)');
  });
  it('rule 2: choice lengths within 2 characters', () => {
    expect(flags({ ...ok, choices: ['爸', '妈妈', '我的哥哥'] })).toContain('x1 "谁是老师？": choice lengths 1/2/4 differ by more than 2');
  });
  it("rule 3: the question doesn't give away the answer's characters (function characters aside)", () => {
    expect(flags({ ...ok, q: '谁是妈老师？' })).toContain('x1 "谁是妈老师？": the question gives away 妈 from its answer');
    expect(flags({ q: '我爱谁？', choices: ['我的家', '我的妈', '我的爸'], answer: 0, sentence: 2 })).not.toContain('x1 "我爱谁？": the question gives away 我 from its answer');
  });
  it("rule 4: the answer is not the passage's most frequent word (a tie leads nothing)", () => {
    expect(topWord(p.text)).toBeNull(); // 爸爸 and 妈妈 twice each
    const dad: Passage = { ...p, id: 'x2', text: '爸爸在家。爸爸看书。妈妈做饭。爸爸很高兴。' };
    expect(topWord(dad.text)).toBe('爸爸');
    expect(questionProblems(dad, { q: '谁在看书？', choices: ['爸爸', '妈妈', '我'], answer: 0, sentence: 1 })).toContain('x2 "谁在看书？": the answer 爸爸 is the passage\'s most frequent word');
  });
  it('two different questions per passage, about different sentences, and none for a passage that is not there', () => {
    expect(checkPassageQuestions([p], { x1: [ok] })).toContain('x1: 1 meaning questions, expected 2');
    expect(checkPassageQuestions([p], { x1: [ok, ok] })).toContain('x1: the same question twice');
    expect(checkPassageQuestions([p], { x1: [ok, { ...other, sentence: 1 }] })).toContain('x1: both questions are answered by sentence 1');
    expect(checkPassageQuestions([p], { x1: [ok, { ...other, sentence: 0 }], x9: [ok, other] })).toEqual(['x9: questions for no passage']);
  });
});
