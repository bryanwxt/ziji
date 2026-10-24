// @vitest-environment node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUILTIN, PASSAGES } from '../src/content';
import moe from '../src/content/moe2024.json';
import { PASSAGE_QUESTIONS, QUESTION_BATCHES } from '../src/content/passageQuestions';
import { passageFit, termReadable } from '../src/langdu/level';
import type { Passage, PassageQuestion } from '../src/types';
import { TALK_ALLOWED, TALK_PATTERNS, TALK_PROMPTS, TALK_THEMES } from '../src/content/talkPrompts';
import { checkContent, checkOwnPassages, checkPassageQuestions, checkQuestionCoverage, checkStretchPassages, checkTalkPrompts, linksIn, p2Readable, questionProblems, stretchCounts, topWord, wordProblems } from './check-content';

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
describe('questions (spec 2026-10-24 §5)', () => {
  it('every built-in passage with its six passes every rule', () => {
    expect(checkPassageQuestions(PASSAGES, PASSAGE_QUESTIONS)).toEqual([]);
  });
  it('every built-in passage has its six, from one batch file: 133 of ours and 15 storybook chunks', () => {
    expect(checkQuestionCoverage(PASSAGES, QUESTION_BATCHES)).toEqual([]);
    expect(PASSAGES).toHaveLength(148);
    expect(Object.keys(PASSAGE_QUESTIONS)).toHaveLength(148);
  });
  // the plan's worked example 1 (2026-10-24 plan, Content rules): p08 with six questions that pass every rule
  const p08 = PASSAGES.find((p) => p.id === 'p08')!;
  const SIX: PassageQuestion[] = [
    { q: '我为什么想坐飞机去？', choices: ['爷爷要坐飞机', '天上没有星星', '星星离我们太远', '门口看不见星星'], answer: 2, kind: 'why', sentences: [2, 3] },
    { q: '爷爷说的“很远很远”，是什么意思？', choices: ['一点也不远', '非常非常远', '有一点远', '就在门口'], answer: 1, kind: 'word', sentence: 2 },
    { q: '我和爷爷在门口做了什么以后，我才想坐飞机？', choices: ['看星星', '坐飞机', '长大了', '吃晚饭'], answer: 0, kind: 'order', sentence: 1 },
    { q: '哪一个题目最好？', choices: ['爷爷的新飞机', '晚上在门口吃饭', '天上有很多飞机', '飞到远远的星星那里'], answer: 3, kind: 'main', sentences: [1, 3] },
    { q: '我们坐在哪里？', choices: ['门口', '天上', '飞机', '星星'], answer: 0, kind: 'fact', sentence: 1 },
    { q: '谁说星星很远？', choices: ['我', '爷爷', '星星', '飞机'], answer: 1, kind: 'fact', sentence: 2 },
  ];
  const [why, word, order, main, fact] = SIX as [PassageQuestion, PassageQuestion, PassageQuestion, PassageQuestion, PassageQuestion];
  const flags = (q: PassageQuestion) => questionProblems(p08, q);
  it('a fair six passes', () => {
    expect(checkPassageQuestions([p08], { p08: SIX })).toEqual([]);
  });
  it('shape: a known kind, what it asks, four different choices, the right one among them', () => {
    expect(flags({ ...fact, kind: 'who' as never })).toContain('p08 "我们坐在哪里？": kind who is not one of why word order main fact');
    expect(flags({ ...fact, q: '我们坐在门口吗？' })).toContain('p08 "我们坐在门口吗？": asks none of 谁 哪 什么 为什么 怎么样');
    expect(flags({ ...fact, choices: ['门口', '门口', '飞机', '星星'] })).toContain('p08 "我们坐在哪里？": needs four different choices');
    expect(flags({ ...fact, choices: ['门口', '天上', '飞机'] as never })).toContain('p08 "我们坐在哪里？": needs four different choices');
    expect(flags({ ...fact, answer: 4 as never })).toContain('p08 "我们坐在哪里？": the right answer is not among the choices');
  });
  it('a miss reads one sentence (fact, word, order) or two (why, main), each a real one', () => {
    expect(flags({ ...fact, sentence: 9 })).toContain('p08 "我们坐在哪里？": answering sentence 9 is not one of its 4 sentences');
    expect(flags({ ...order, sentence: undefined })).toContain('p08 "我和爷爷在门口做了什么以后，我才想坐飞机？": answering sentence undefined is not one of its 4 sentences');
    expect(flags({ ...why, sentences: undefined })).toContain('p08 "我为什么想坐飞机去？": a why question needs two different supporting sentences of its 4');
    expect(flags({ ...main, sentences: [3, 3] })).toContain('p08 "哪一个题目最好？": a main question needs two different supporting sentences of its 4');
  });
  it('characters: from the passage, or his lists through the later of its term and 二下, or 意思/题目', () => {
    expect(flags({ ...fact, choices: ['门口', '天上', '飞机', '鬱金香'] })).toContain('p08 "我们坐在哪里？": uses 鬱 in neither the passage nor the lists through 二下');
    expect(flags(word)).toEqual([]); // 意思: a frame word
  });
  it('every wrong choice names something in the passage; an answer found word for word has at least one wrong one found too', () => {
    expect(flags({ ...fact, choices: ['门口', '天上', '飞机', '学校'] })).toContain('p08 "我们坐在哪里？": the wrong choice 学校 names nothing in the passage');
    expect(flags({ ...fact, choices: ['门口', '飞机上', '星星上', '飞机里'] })).toContain('p08 "我们坐在哪里？": the answer is in the passage word for word, and no wrong choice is');
    expect(flags({ ...fact, choices: ['门口', '飞机上', '星星上', '天上'] })).not.toContain('p08 "我们坐在哪里？": the answer is in the passage word for word, and no wrong choice is');
  });
  it('choice lengths within 3 characters', () => {
    expect(flags({ ...main, choices: ['爷爷', '晚上在门口吃饭', '天上有很多飞机', '飞到远远的星星那里'] })).toContain('p08 "哪一个题目最好？": choice lengths 2/7/7/9 differ by more than 3');
  });
  it("no character of the answer in the question (function characters aside; a word question's own word aside)", () => {
    expect(flags({ ...fact, q: '我们坐在哪个门里？' })).toContain('p08 "我们坐在哪个门里？": the question gives away 门 from its answer');
    expect(flags({ ...word, choices: ['一点也不远', '很远很远的', '有一点远', '就在门口'] })).toContain('p08 "爷爷说的“很远很远”，是什么意思？": the answer repeats the word it explains');
    expect(flags({ ...word, q: '爷爷说的“远方”，是什么意思？' })).toContain('p08 "爷爷说的“远方”，是什么意思？": a word question quotes (“…”) a word of the passage');
  });
  it("the answer is never the passage's most frequent word", () => {
    expect(topWord(p08.text)).toBe('星星');
    expect(flags({ ...fact, q: '我和爷爷看什么？', choices: ['星星', '门口', '飞机', '天上'], sentence: 1 })).toContain('p08 "我和爷爷看什么？": the answer 星星 is the passage\'s most frequent word');
  });
  it('a why or main answer copies no sentence: at most 60% of its characters from any one', () => {
    expect(flags({ ...why, choices: ['爷爷要坐飞机', '天上没有星星', '星星很远很远', '门口看不见星星'] })).toContain('p08 "我为什么想坐飞机去？": the why answer copies "爷爷说：“星星很远很远。”" (100% of its characters)');
  });
  it("the answer is not the only choice that fits the question's grammar", () => {
    expect(flags({ ...why, choices: ['爷爷要坐飞机', '天上没有星星', '星星离我们太远了', '门口看不见星星'] })).toContain('p08 "我为什么想坐飞机去？": the answer alone is …了');
  });
  it('six a passage: every kind but fact, fact at most twice, no answer place more than twice, no repeats, no stray ids', () => {
    expect(checkPassageQuestions([p08], { p08: SIX.slice(0, 5) })).toContain('p08: 5 questions, expected 6');
    expect(checkPassageQuestions([p08], { p08: [...SIX.slice(0, 5), SIX[4]!] })).toContain('p08: the same question twice');
    expect(checkPassageQuestions([p08], { p08: [{ ...why, kind: 'fact', sentence: 2 }, ...SIX.slice(1)] })).toEqual(expect.arrayContaining(['p08: no why question', 'p08: 3 fact questions, at most 2']));
    expect(checkPassageQuestions([p08], { p08: SIX.map((q, i) => (i < 3 ? { ...q, choices: [q.choices[q.answer]!, ...q.choices.filter((_, j) => j !== q.answer)] as PassageQuestion['choices'], answer: 0 as const } : q)) })).toContain('p08: the answer is choice 1 in 4 questions, at most 2');
    expect(checkPassageQuestions([p08], { p08: SIX, x9: SIX })).toEqual(['x9: questions for no passage']);
  });
  it('coverage: every passage has its six, from one batch file only', () => {
    const p01 = PASSAGES.find((p) => p.id === 'p01')!;
    expect(checkQuestionCoverage([p08], [{ p08: SIX }])).toEqual([]);
    expect(checkQuestionCoverage([p01, p08], [{ p08: SIX }])).toEqual(['p01: no questions']);
    expect(checkQuestionCoverage([p08], [{ p08: SIX }, { p08: SIX }])).toEqual(['p08: questions in batch 1 and batch 2']);
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

describe('stretch passages (spec 2026-10-24 §4)', () => {
  const built = new Set(BUILTIN.map((c) => c.char));
  it('every one passes: term, length, sentences, linking patterns, fit at its term, 生词, built-in characters', () => {
    expect(checkStretchPassages(PASSAGES, built)).toEqual([]);
  });
  it('all sixty are there: 二下 15, 三上 25, 三下 20', () => {
    expect(stretchCounts(PASSAGES)).toEqual([]);
    expect(stretchCounts([])).toEqual(['二下: 0 stretch passages, expected 15', '三上: 0 stretch passages, expected 25', '三下: 0 stretch passages, expected 20']);
  });
  // the plan's worked example 2 (2026-10-24 plan, Content rules): passes as written
  const p74: Passage = {
    id: 'p74', title: '在巴刹走散了', term: '二下', source: 'ziji',
    text: '星期六早上，奶奶带我去巴刹买菜。巴刹里人很多，又热闹又拥挤。我一边走，一边看两旁的水果摊，走着走着，奶奶不在我身边了！我心里很慌张，差一点哭了出来。但是我想起妈妈说过：“如果找不到大人，就站着别走，等大人来找你。”所以我镇定下来，站在鱼摊旁边，没有乱跑。过了一会，奶奶果然找到了我。她摸摸我的头说：“你真聪明！”',
    words: [{ text: '拥挤', gloss: 'crowded' }, { text: '慌张', gloss: 'flustered' }, { text: '镇定', gloss: 'calm' }],
  };
  const flags = (over: Partial<Passage>) => checkStretchPassages([{ ...p74, ...over }], built);
  it('the worked example passes', () => {
    expect(checkStretchPassages([p74], built)).toEqual([]);
    expect(checkOwnPassages([p74])).toEqual([]);
  });
  it('its term is one of 二下 三上 三下', () => {
    expect(flags({ term: '二上' })).toContain('p74: term 二上, expected one of 二下 三上 三下');
  });
  it('80–140 characters in 4–8 sentences', () => {
    expect(flags({ text: '因为下雨，所以我在家。虽然很闷，但是我看书。' })).toEqual(expect.arrayContaining(['p74: 18 characters, expected 80–140', 'p74: 2 sentences, expected 4–8']));
  });
  it('at least two linking patterns, two-part ones within one sentence', () => {
    expect(linksIn('因为下雨，所以我在家。虽然很闷。但是我看书。我先吃饭，然后洗澡。最后睡觉。')).toEqual(['因为…所以', '先…然后…最后']);
    expect(linksIn('我一边走，一边唱。如果下雨，我就回家。不但好看，而且好吃。')).toEqual(['如果…就', '一边…一边', '不但…而且']);
    expect(flags({ text: p74.text.replace('如果', '要是') })).toContain('p74: linking patterns 一边…一边, expected at least 2 of 因为…所以 虽然…但是 先…然后…最后 如果…就 一边…一边 不但…而且');
  });
  it('a fit of 0.80–0.95 for a reader who has finished its term', () => {
    expect(passageFit(p74.text, termReadable('二下'))).toBeCloseTo(0.93, 2);
    expect(flags({ text: p74.text.replace('又热闹又拥挤', '又热闹又好玩').replace('慌张', '害怕').replace('镇定下来', '不哭了') })).toContain('p74: fit 0.96 at 二下, expected 0.8–0.95');
  });
  it('1–4 生词, each in the passage, glossed, with a character new at its term', () => {
    expect(flags({ words: [] })).toContain('p74: 0 生词, expected 1–4');
    expect(flags({ words: [{ text: '星星', gloss: 'star' }] })).toEqual(expect.arrayContaining(['p74: 生词 星星 is not in the passage', 'p74: 生词 星星 has no character new at 二下']));
    expect(flags({ words: [{ text: '拥挤', gloss: 'so many people that you cannot move' }] })).toContain('p74: 生词 拥挤 gloss "so many people that you cannot move": 7 words (at most 4)');
  });
  it('no 儿化, and every character a built-in one', () => {
    expect(flags({ text: p74.text.replace('过了一会', '过了一会儿') })).toContain('p74: 儿化');
    expect(checkStretchPassages([p74], new Set(Array.from('星期六')))).toEqual(expect.arrayContaining([expect.stringMatching(/^p74: .+ not built in$/)]));
  });
  it('the first 73 are not held to these rules', () => {
    expect(checkStretchPassages(PASSAGES.filter((p) => Number(p.id.slice(1)) < 74), built)).toEqual([]);
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
  it('flags a sample word beyond a P2 child (the passage word gate; the parent\'s questions may go further)', () => {
    const p = TALK_PROMPTS[0]!;
    expect(checkTalkPrompts([{ ...p, sample: '我最喜欢和哥哥一起玩，因为水龙头坏了。' }], TALK_THEMES, TALK_PATTERNS, readable)).toContain('t01: sample: 水龙头: not a word for a P2 child (HSK 7)');
    expect(checkTalkPrompts([{ ...p, open: '你会关水龙头吗？我们一家人怎么节约用水？' }], TALK_THEMES, TALK_PATTERNS, readable).filter((x) => x.includes('sample'))).toEqual([]);
    expect(checkTalkPrompts([{ ...p, sample: '我最喜欢和哥哥一起玩，因为水龙头坏了。', hooks: ['水龙头'] }], TALK_THEMES, TALK_PATTERNS, readable).filter((x) => x.includes('sample'))).toEqual([]); // its topic word
  });
  it('the allow-list is only the Singapore theme words his lists lack', () => {
    const bare = p2Readable(BUILTIN, (moe as { lessons: { term: string; read: string }[] }).lessons);
    expect(Array.from(TALK_ALLOWED).filter((c) => bare.has(c))).toEqual([]);
    expect(TALK_ALLOWED).toBe('榴莲刹端粽笼舟');
  });
});
