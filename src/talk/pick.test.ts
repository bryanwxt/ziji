// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BUILTIN } from '../content';
import moe from '../content/moe2024.json';
import { TALK_PROMPTS } from '../content/talkPrompts';
import { addDays, localDateKey } from '../lib/date';
import type { ParentQuestion } from '../types';
import { p2Readable } from '../../scripts/check-content';
import { hookRank, markSeen, pickDay, readingCard, swapCard, themeForWords, THINK, wordStarter, type PickInput, type TalkPassage, type TalkWord } from './pick';

// two passages with the questions they had before 2026-10-24, fixed here so the content batches never move these tests
const P17: TalkPassage = { id: 'p17', title: '小马', questions: [
  { q: '小马为什么找不到家了？', choices: ['跑得很快', '在外面玩', '跑得很远'], answer: 2, sentence: 1 },
  { q: '牛爷爷做了什么？', choices: ['找到了小马', '带小马跑步', '给小马吃饭'], answer: 0, sentence: 2 },
] };
const P01: TalkPassage = { id: 'p01', title: '我的家', questions: [
  { q: '谁是老师？', choices: ['爸爸', '妈妈', '哥哥'], answer: 1, sentence: 1 },
  { q: '我家有什么人？', choices: ['哥哥和弟弟', '姐姐和妹妹', '哥哥和妹妹'], answer: 2, sentence: 0 },
] };
const YE: TalkWord = { text: '爷', gloss: 'grandfather', zuci: ['爷爷'], from: 'class' };
const JIE: TalkWord = { text: '借', gloss: 'to borrow', example: '我可以借你的笔吗？', zuci: ['借书'], from: 'list' };
const TODAY = '2026-10-19';
const base: PickInput = { today: TODAY, seen: {}, words: [YE], passage: P17 };
const ids = (cards: readonly ({ id: string } | null)[]) => cards.map((c) => c?.id ?? null);
const daysBefore = (n: number) => localDateKey(addDays(new Date(2026, 9, 19), -n));

describe("the day's three cards (parent loop spec §4)", () => {
  it('his word (a starter about it), shared reading of today\'s passage, a rotating theme', () => {
    expect(pickDay(base).map((c) => [c!.kind, c!.id, c!.theme, c!.word])).toEqual([
      ['word', 't04', 'family', '爷'],
      ['reading', 'r:p17:0', undefined, undefined],
      ['theme', 't12', 'school', undefined],
    ]);
  });
  it('a list word with no starter about it gets the word starter', () => {
    expect(pickDay({ ...base, words: [JIE] })[0]).toEqual({
      kind: 'word', id: 'w:借', word: '借',
      open: '你在哪里看到过『借』，或者听人说过『借』？',
      en: "This week's list word: 借 (to borrow). Where has your child met it? Get them using it about their own day.",
      followUps: ['用『借』说一说你自己的事。', '书上有一句：「我可以借你的笔吗？」你也用『借』说一句。', '『借』还可以和哪些字一起用？'],
      pattern: '…借…',
      sample: '我可以借你的笔吗？',
    });
  });
  it('a two-character list word finds a starter about it; a one-character hook never matches inside it', () => {
    expect(pickDay({ ...base, words: [{ text: '新年', zuci: [], from: 'list' }] })[0]!.id).toBe('t44');
    expect(hookRank('新', '新年')).toBeNull();
    expect(hookRank('爷爷', '爷')).toBe(1);
    expect(hookRank('新年', '过新年')).toBe(2);
    expect(hookRank('新年', '新年')).toBe(0);
  });
  it('朗读 off (or nothing read) and no words yet: theme starters fill those slots, each a different theme', () => {
    const cards = pickDay({ ...base, words: [], passage: null });
    expect(cards.map((c) => [c!.kind, c!.id, c!.theme])).toEqual([['theme', 't53', 'singapore'], ['theme', 't12', 'school'], ['theme', 't61', 'environment']]);
  });
  it('the same input picks the same three', () => {
    expect(pickDay(base)).toEqual(pickDay(structuredClone(base)));
  });
  it('「换一个」: the next of the same kind, never a card on screen', () => {
    const cards = pickDay(base);
    const seen = markSeen({}, cards, TODAY);
    expect(ids(swapCard(cards, 0, { ...base, seen }))).toEqual(['w:爷', 'r:p17:0', 't12']);
    expect(ids(swapCard(cards, 1, { ...base, seen }))).toEqual(['t04', 'r:p17:1', 't12']);
    expect(ids(swapCard(cards, 2, { ...base, seen }))).toEqual(['t04', 'r:p17:0', 't61']);
  });
  it('a swap with nothing else of its kind falls back to a theme starter', () => {
    const only = { ...base, words: [JIE] };
    const cards = pickDay(only);
    const next = swapCard(cards, 0, { ...only, seen: markSeen({}, cards, TODAY) });
    expect(next[0]!.kind).toBe('theme');
    expect(new Set(ids(next)).size).toBe(3);
  });
  it('nothing shown in the last 14 days comes back; 14 days ago can', () => {
    expect(pickDay({ ...base, seen: { t04: daysBefore(13) } })[0]!.id).toBe('w:爷');
    expect(pickDay({ ...base, seen: { t04: daysBefore(14) } })[0]!.id).toBe('t04');
  });
  it('a kind that has run out repeats its least recently shown rather than leave a gap', () => {
    const seen = { t04: daysBefore(2), 'w:爷': daysBefore(5), 'r:p17:0': daysBefore(1), 'r:p17:1': daysBefore(3), 'r:p17:2': daysBefore(2), 'r:p17:3': daysBefore(4) };
    expect(ids(pickDay({ ...base, seen })).slice(0, 2)).toEqual(['w:爷', 'r:p17:3']);
  });
  it('the theme card takes a theme not used in the last 6 days', () => {
    const one = (theme: string) => TALK_PROMPTS.find((p) => p.theme === theme)!.id;
    const others = ['family', 'school', 'friends', 'festivals', 'singapore', 'environment', 'technology', 'feelings'];
    const seen = Object.fromEntries(others.map((t) => [one(t), daysBefore(6)]));
    expect(pickDay({ ...base, words: [], passage: null, seen })[0]!.theme).toBe('food');
  });
  it('four weeks: no bank starter twice within 14 days, and all nine themes within five days', () => {
    let seen: Record<string, string> = {};
    const shown: { day: number; id: string; theme?: string }[] = [];
    for (let day = 0; day < 28; day++) {
      const today = localDateKey(addDays(new Date(2026, 9, 1), day));
      const cards = pickDay({ today, seen, words: [], passage: P17 });
      seen = markSeen(seen, cards, today);
      shown.push(...cards.map((c) => ({ day, id: c!.id, theme: c!.theme })));
    }
    const bank = shown.filter((s) => s.theme);
    for (const s of bank) expect(bank.filter((x) => x.id === s.id && x.day !== s.day && Math.abs(x.day - s.day) < 14)).toEqual([]);
    expect(new Set(shown.filter((s) => s.day < 5).map((s) => s.theme).filter(Boolean)).size).toBe(9);
  });
  it('an empty bank leaves a slot empty in its place, so the slots never shift (review finding 4)', () => {
    const cards = pickDay({ ...base, words: [], bank: [] });
    expect(cards).toHaveLength(3);
    expect(cards.map((c) => c?.id ?? null)).toEqual([null, 'r:p17:0', null]);
    const seen = markSeen({}, cards, TODAY);
    expect(seen).toEqual({ 'r:p17:0': TODAY });
    expect(swapCard(cards, 0, { ...base, words: [], bank: [], seen }).map((c) => c?.id ?? null)).toEqual([null, 'r:p17:0', null]);
    expect(swapCard(cards, 1, { ...base, words: [], bank: [], seen }).map((c) => c?.id ?? null)).toEqual([null, 'r:p17:1', null]);
  });
  it('remembers what was shown for 60 days', () => {
    expect(markSeen({ t01: daysBefore(59), t02: daysBefore(60) }, [{ id: 't03' }], TODAY)).toEqual({ t01: daysBefore(59), t03: TODAY });
  });
});

describe('shared reading (spec §4: 谁 / 为什么 / 你觉得)', () => {
  it("the passage's own questions where it has them, with their answers", () => {
    expect(readingCard(P17, 0)).toMatchObject({
      id: 'r:p17:0', passageId: 'p17', open: '牛爷爷做了什么？',
      followUps: ['小马为什么找不到家了？', THINK[0]!.zh], answers: ['找到了小马', '跑得很远', null],
    });
  });
  it('a passage with a 谁 question and no 为什么 one: an open why', () => {
    expect(readingCard(P01, 2)).toMatchObject({ open: '谁是老师？', followUps: ['书里的人做了一件什么事？他为什么这样做？你从哪一句知道的？', THINK[2]!.zh], answers: ['妈妈', null, null] });
  });
  it('a parent text without a question: all three open', () => {
    expect(readingCard({ id: 'pp:a', title: '我的学校', questions: [] }, 5)).toMatchObject({ id: 'r:pp:a:1', open: '《我的学校》里有谁？', answers: [null, null, null] });
  });
});

describe('themes and templates', () => {
  it('the theme his words lean to: 饿、饱、甜 are food', () => {
    expect(themeForWords(['饿', '饱', '甜'])).toBe('food');
    expect(themeForWords(['鬱'])).toBeNull();
  });
  it("the templates' own words are P2 characters", () => {
    const readable = p2Readable(BUILTIN, (moe as { lessons: { term: string; read: string }[] }).lessons);
    const cards = [wordStarter({ text: '大', zuci: [], from: 'class' }), wordStarter({ text: '大', example: '我家很大。', zuci: [], from: 'list' }), ...THINK.map((_, k) => readingCard({ id: 'x', title: '大', questions: [] }, k))];
    const text = cards.flatMap((c) => [c.open, ...c.followUps, c.pattern, c.sample]).join('');
    expect([...new Set(Array.from(text).filter((ch) => /\p{Script=Han}/u.test(ch) && !readable.has(ch)))]).toEqual([]);
  });
});

describe('review fixes (2026-10-18)', () => {
  const word = (text: string): TalkWord => ({ text, zuci: [], from: 'class' });
  it('a common character finds no starter through a longer word: 子 is not 粽子, 不 not 对不起, 人 not 机器人, 气 not 天气', () => {
    expect(hookRank('粽子', '子')).toBeNull();
    expect(hookRank('对不起', '不')).toBeNull();
    expect(hookRank('机器人', '人')).toBeNull();
    expect(hookRank('天气', '气')).toBeNull();
    expect(hookRank('生气', '气')).toBeNull();
    for (const t of ['子', '不', '人', '气']) expect(pickDay({ ...base, words: [word(t)] })[0]!.id).toBe(`w:${t}`);
  });
  it('a doubled word still finds its starter first (爷爷 for 爷); a word his character only starts comes after his own starter', () => {
    expect(hookRank('爷爷', '爷')).toBe(1);
    expect(hookRank('鸡蛋', '鸡')).toBe(3);
    expect(hookRank('蛋糕', '糕')).toBeNull(); // not the head
    expect(pickDay({ ...base, words: [word('鸡')] })[0]!.id).toBe('w:鸡');
    const cards = pickDay({ ...base, words: [word('鸡')] });
    const next = swapCard(cards, 0, { ...base, words: [word('鸡')], seen: markSeen({}, cards, TODAY) });
    expect(next[0]).toMatchObject({ kind: 'word', id: 't30', word: '鸡' });
  });
  it('a passage told as 「我」: the questions say whose 我 it is', () => {
    const q = (text: string, answer: 0 | 1 | 2 = 0): ParentQuestion => ({ q: text, choices: ['a', 'b', 'c'], answer, sentence: 0 });
    const card = readingCard({ id: 'x', title: '上学', questions: [q('谁给我唱生日歌？'), q('我在车上为什么站着？', 1)] }, 0);
    expect(card.open).toBe('书里，谁给「我」唱生日歌？');
    expect(card.followUps[0]).toBe('书里的「我」在车上为什么站着？');
    expect(readingCard({ id: 'x', title: '一家', questions: [q('我们常常一起做什么？')] }, 0).open).toBe('书里的「我们」常常一起做什么？');
    expect(readingCard({ id: 'x', title: '一家', questions: [q('早上七点，我做什么？')] }, 0).open).toBe('书里，早上七点，「我」做什么？');
    expect(readingCard(P17, 0).open).toBe('牛爷爷做了什么？');
    expect(readingCard({ id: 'x', title: '夜', questions: [q('谁说“别怕，我在你身边”？')] }, 0).open).toBe('谁说“别怕，我在你身边”？');
  });
  it('the open questions talk about 书里, never a vague 故事里', () => {
    const card = readingCard({ id: 'x', title: '大', questions: [] }, 0);
    expect(card.followUps[0]).toBe('书里的人做了一件什么事？他为什么这样做？你从哪一句知道的？');
    for (const t of THINK) expect(t.zh).not.toContain('故事');
  });
  it('a class word\'s sentence is 「有一句话」; 书上 is for his list\'s own sentence', () => {
    expect(wordStarter({ text: '借', example: '我可以借你的笔吗？', zuci: [], from: 'class' }).followUps[1]).toBe('有一句话：「我可以借你的笔吗？」你也用『借』说一句。');
    expect(wordStarter({ text: '借', example: '我可以借你的笔吗？', zuci: [], from: 'list' }).followUps[1]).toBe('书上有一句：「我可以借你的笔吗？」你也用『借』说一句。');
  });
});
