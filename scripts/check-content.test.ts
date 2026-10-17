// @vitest-environment node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUILTIN, PASSAGES } from '../src/content';
import moe from '../src/content/moe2024.json';
import { PASSAGE_QUESTIONS } from '../src/content/passageQuestions';
import type { Passage, PassageQuestion } from '../src/types';
import { TALK_ALLOWED, TALK_PATTERNS, TALK_PROMPTS, TALK_THEMES } from '../src/content/talkPrompts';
import { checkContent, checkOwnPassages, checkPassageQuestions, checkTalkPrompts, p2Readable, questionProblems, topWord, wordProblems } from './check-content';

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
    expect(topWord('婆婆在家。婆婆做饭。我很高兴。')).toBe('婆婆'); // not an HSK word, still repeated
    expect(topWord('爸爸买炒面。我吃炒面。炒面很香。')).toBe('炒面');
  });
  it('rule 4: a side-by-side pair never breaks a real word’s lead, and never cuts across a word', () => {
    expect(topWord('妹妹折的船最大。妹妹折的船最好。')).toBe('妹妹'); // 船最 twice is no word: 妹妹 still leads
    expect(topWord('我的纸飞机，你的纸飞机，他的纸飞机。')).toBe('飞机'); // 纸飞 cuts 飞机 in two
  });
  it('rule 5: the answer is not the only choice sharing characters with the passage (a child matching characters picks it)', () => {
    expect(flags({ q: '我家有什么人？', choices: ['姐姐和弟弟', '奶奶和爷爷', '哥哥和妹妹'], answer: 2, sentence: 0 })).toContain('x1 "我家有什么人？": only the answer shares characters with the passage');
    expect(flags({ q: '我家有什么人？', choices: ['哥哥和弟弟', '姐姐和妹妹', '哥哥和妹妹'], answer: 2, sentence: 0 })).toEqual([]);
    expect(flags(ok)).toEqual([]); // all three from the passage
  });
  it("rule 6: the answer is not the only choice that fits the question's grammar", () => {
    expect(flags({ ...ok, choices: ['一个妈妈', '爸爸', '哥哥'], answer: 0 })).toContain('x1 "谁是老师？": the answer alone is counted (一本…)');
    expect(flags({ q: '妈妈怎么样？', choices: ['好了', '很好', '在家'], answer: 0, sentence: 1 })).toContain('x1 "妈妈怎么样？": the answer alone is …了');
    expect(flags({ q: '妈妈怎么样？', choices: ['好', '很好', '很高'], answer: 0, sentence: 1 })).toContain('x1 "妈妈怎么样？": the answer alone is not 很…');
    expect(flags({ q: '我家有什么？', choices: ['五个人', '五本书', '五只鸟'], answer: 0, sentence: 0 })).not.toEqual(expect.arrayContaining([expect.stringContaining('counted')]));
    expect(flags({ q: '我家有什么？', choices: ['五个人', '五只猫', '五只鸟'], answer: 0, sentence: 0 })).toContain('x1 "我家有什么？": the answer alone is counted with 个');
  });
  it('two different questions per passage, about different sentences, and none for a passage that is not there', () => {
    expect(checkPassageQuestions([p], { x1: [ok] })).toContain('x1: 1 meaning questions, expected 2');
    expect(checkPassageQuestions([p], { x1: [ok, ok] })).toContain('x1: the same question twice');
    expect(checkPassageQuestions([p], { x1: [ok, { ...other, sentence: 1 }] })).toContain('x1: both questions are answered by sentence 1');
    expect(checkPassageQuestions([p], { x1: [ok, { ...other, sentence: 0 }], x9: [ok, other] })).toEqual(['x9: questions for no passage']);
  });
});
describe('our passages (spec 2026-10-15 §2.2)', () => {
  it('every one passes: its term, the word gate, no duplicates; the new ones every writing rule', () => {
    expect(checkOwnPassages(PASSAGES)).toEqual([]);
  });
  // drafted for this plan and measured: each passes as written
  const p21: Passage = { id: 'p21', title: '新学年', text: '新学年开始了，我读二年级了。我们的班很大，有三十个同学。新老师又亲切又美丽。第一天，她帮我们找座位，还教我们读新的课文。下课了，我和新朋友一起去操场玩。', term: '二上', source: 'ziji', words: [{ text: '年级', gloss: 'grade, year (school)' }, { text: '座位', gloss: 'seat' }, { text: '操场', gloss: 'playground, field' }] };
  const p33: Passage = { id: 'p33', title: '放风筝', text: '星期天，天气很好，我跟爸爸去公园放风筝。我的风筝是一只老鹰，又大又漂亮。风一吹，老鹰就飞上了天。旁边的小朋友都跑过来看，一群人围着我们。大家说：“你的风筝真好看！”我高兴得笑了。', term: '二下', source: 'ziji', words: [{ text: '风筝', gloss: 'kite' }, { text: '老鹰', gloss: 'eagle' }] };
  const p49: Passage = { id: 'p49', title: '迟到了', text: '今天早上，闹钟没有响，我起床晚了。我赶快穿好衣服，背上书包，跑去车站。可是巴士刚刚开走了。我只好走路去学校。我对老师说：“对不起，我迟到了。”老师说：“没关系，明天要准时。”从那天起，我每天晚上都准备好书包，再也没有迟到过。', term: '三上', source: 'ziji', words: [{ text: '迟到', gloss: 'be late' }, { text: '准时', gloss: 'on time' }, { text: '赶快', gloss: 'quickly' }] };
  it('the new ones are not held to the first twenty\'s 30–80 characters and HSK 1–2', () => {
    expect(checkContent(BUILTIN, [p21, p33, p49], hasStrokeFile)).toEqual([]);
    expect(checkContent(BUILTIN, [{ ...p49, id: 'p20' }], hasStrokeFile)).toEqual(expect.arrayContaining([expect.stringMatching(/^p20: \d+ characters, expected 30–80$/)]));
  });
  it('a duplicate id is flagged among the new ones too', () => {
    expect(checkContent(BUILTIN, [p21, { ...p33, id: 'p21' }], hasStrokeFile)).toContain('duplicate passage p21');
  });
  it('three drafts, one a term, pass every rule', () => {
    expect(checkOwnPassages([p21, p33, p49])).toEqual([]);
  });
  it('length, sentences and term', () => {
    expect(checkOwnPassages([{ ...p21, text: '新学年开始了。我读二年级了。' }])).toContain('p21: 12 characters, expected 50–110');
    expect(checkOwnPassages([{ ...p21, text: p21.text.replace(/。/g, '，').replace(/，$/, '。') }])).toContain('p21: 1 sentences, expected 3–7');
    expect(checkOwnPassages([{ ...p21, term: '二下' }])).toContain('p21: stored term 二下, levels at 二上');
  });
  it('coverage: at most 3 characters beyond the term, each from the next term', () => {
    expect(checkOwnPassages([{ ...p21, text: p21.text.replace('操场', '鬱場') }])).toContain('p21: 鬱場 not taught by 二下');
  });
  it('at least 6 characters first taught in its term', () => {
    expect(checkOwnPassages([{ ...p33, text: p33.text.replace('一群人围着我们', '大家看着我们').replace('我跟爸爸', '我和爸爸') }])).toContain('p33: 4 characters first taught in 二下 (筝鹰漂吹), expected 6');
  });
  it('the word gate: no blocked word, no adult word unless it is a 生词', () => {
    expect(wordProblems('他们去参加婚礼。')).toContain('婚礼: blocked (romantic/dating/marriage)');
    expect(wordProblems('我们一家人。')).toEqual(['一家人: not a word for a P2 child (HSK 7)']);
    expect(wordProblems('我们一家人。', ['一家人'])).toEqual([]);
    expect(wordProblems('新学年开始了，我们十个人一天读一本书。')).toEqual([]); // not dictionary words: 十个人, 一天
  });
  it('生词: 1–4, in the passage, from the term, with a kid gloss that matches the app’s', () => {
    expect(checkOwnPassages([{ ...p21, words: [] }])).toContain('p21: 0 生词, expected 1–4');
    expect(checkOwnPassages([{ ...p21, words: [{ text: '星星', gloss: 'star' }] }])).toEqual(expect.arrayContaining(['p21: 生词 星星 is not in the passage', 'p21: 生词 星星 has no character first taught in 二上']));
    expect(checkOwnPassages([{ ...p21, words: [{ text: '座位', gloss: 'a place where you sit down' }] }])).toEqual(expect.arrayContaining(['p21: 生词 座位 gloss "a place where you sit down": 6 words (at most 4)', 'p21: 生词 座位 gloss "a place where you sit down" differs from its kid gloss "seat"']));
  });
  it('no duplicate text, no two sentences opening alike', () => {
    expect(checkOwnPassages([p21, { ...p21, id: 'p22' }])).toContain('p22: the same text as p21');
    expect(checkOwnPassages([p49, { ...p33, id: 'p34', text: '今天早上，闹钟没有响，' + p33.text }])).toContain('p34: "今天早上，闹钟没有响，星期天，天气很好，我跟爸爸去公园放风筝。" opens like a sentence of p49');
  });
});

describe('talk prompts (parent loop spec §3)', () => {
  const readable = p2Readable(BUILTIN, (moe as { lessons: { term: string; read: string }[] }).lessons, TALK_ALLOWED);
  it('80 starters, at least 6 per theme, every field there, one of the six patterns, P2 characters, no 儿化', () => {
    expect(TALK_PROMPTS).toHaveLength(80);
    expect(checkTalkPrompts(TALK_PROMPTS, TALK_THEMES, TALK_PATTERNS, readable)).toEqual([]);
  });
  it('every pattern is used at least 10 times', () => {
    for (const p of TALK_PATTERNS) expect(TALK_PROMPTS.filter((t) => t.pattern === p).length).toBeGreaterThanOrEqual(10);
  });
  it('flags a duplicate id, a thin starter, an unknown pattern, a hard character, 儿化, a yes/no opening and a thin theme', () => {
    const p = TALK_PROMPTS[0]!;
    const bad = { ...p, open: '你喜欢玩吗？', followUps: ['为什么？'], pattern: '因为…所以…', sample: '我喜欢一会儿去鬱金香公园。' };
    expect(checkTalkPrompts([p, bad], TALK_THEMES, TALK_PATTERNS, readable)).toEqual(expect.arrayContaining([
      'duplicate talk prompt t01', 't01: needs 2–3 follow-ups', 't01: pattern 因为…所以… is not one of the six', 't01: a yes/no opening',
      't01: 儿化', 't01: uses 鬱 beyond P2', 'theme school has 0 starters, expected at least 6',
    ]));
  });
  it('flags a blocked word (the content gate every surface uses)', () => {
    const p = TALK_PROMPTS[0]!;
    expect(checkTalkPrompts([{ ...p, sample: '我觉得他不是笨蛋，因为他会做。' }], TALK_THEMES, TALK_PATTERNS, readable)).toContain('t01: blocked word 笨蛋');
  });
  it('the allow-list is only the Singapore theme words his lists lack', () => {
    const bare = p2Readable(BUILTIN, (moe as { lessons: { term: string; read: string }[] }).lessons);
    expect(Array.from(TALK_ALLOWED).filter((c) => bare.has(c))).toEqual([]);
    expect(TALK_ALLOWED).toBe('榴莲刹端粽笼舟');
  });
});
