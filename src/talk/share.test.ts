// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { PASSAGE_QUESTIONS } from '../content/passageQuestions';
import { readingCard, wordStarter } from './pick';
import { shareNote, shareText, todayText, weekText } from './share';
import { weekRange, type WeekSummary } from './week';

const abort = () => Object.assign(new Error('closed'), { name: 'AbortError' });

describe('Share (parent loop spec §5)', () => {
  it('the share sheet when there is one', async () => {
    const share = vi.fn(async () => {});
    const writeText = vi.fn(async () => {});
    expect(await shareText('hi', { share, writeText })).toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'hi' });
    expect(writeText).not.toHaveBeenCalled();
  });
  it('closing the sheet copies nothing and says nothing', async () => {
    const writeText = vi.fn(async () => {});
    const r = await shareText('hi', { share: async () => { throw abort(); }, writeText });
    expect(r).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
    expect(shareNote(r)).toBeNull();
  });
  it('no sheet, or a sheet that fails: the clipboard', async () => {
    const writeText = vi.fn(async () => {});
    expect(await shareText('hi', { writeText })).toBe('copied');
    expect(await shareText('hi', { share: async () => { throw new Error('NotAllowedError'); }, writeText })).toBe('copied');
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(shareNote('copied')).toBe('Copied. Paste it into a message.');
  });
  it('neither works', async () => {
    expect(await shareText('hi', {})).toBe('failed');
    expect(await shareText('hi', { writeText: async () => { throw new Error('denied'); } })).toBe('failed');
    expect(shareNote('failed')).toBe('This device could not share or copy it.');
  });
});

describe('the shared text', () => {
  it("today's cards, with the passage's answers beside its questions", () => {
    const cards = [wordStarter({ text: '借', gloss: 'borrow', zuci: [], from: 'list' }), readingCard({ id: 'p17', title: '小马', questions: PASSAGE_QUESTIONS.p17! }, 1)];
    expect(todayText(cards, '2026-10-19')).toBe([
      '聊一聊 · 19 Oct',
      '',
      '1. 他的词 His words',
      '你在哪里看到过『借』，或者听人说过『借』？',
      "This week's list word: 借 (borrow). Where has he met it? Get him using it about his own day.",
      '· 用『借』说一说你自己的事。',
      '· 『借』可以和哪些字一起用？',
      '试试用：…借…',
      '',
      '2. 一起读 Shared reading',
      '牛爷爷做了什么？（书上：找到了小马）',
      'Shared reading: read 《小马》 together, taking turns a sentence each, then ask who, why, and what he thinks. Last question: If he were in the story, what would he do?',
      '· 小马为什么找不到家了？（书上：跑得很远）',
      '· 如果你是故事里的人，你会怎么做？',
      '试试用：我觉得…因为…',
    ].join('\n'));
  });
  it('the week', () => {
    const s: WeekSummary = {
      talk: { days: 1, minutes: 10, times: 1 }, lessons: 5, langduDays: 4,
      newly: { read: ['借', '饿'], write: [], say: ['森林'] }, newWords: ['借'], shaky: ['甜'],
      reading: [{ passageId: 'p17', title: '小马', meaning: 'missed' }, { passageId: 'p20', title: '我的学校', meaning: null }], waiting: 2,
      focus: { zh: '多读。', en: 'Read more.' },
    };
    expect(weekText(weekRange(new Date(2026, 9, 21)), s)).toBe([
      'ZiJi · week of 19 Oct – 25 Oct',
      'Talk: 1 day · 10 min',
      'Lessons: 5 · 朗读 on 4 days',
      'Newly can read: 借、饿 · write: — · say: 森林',
      'New words: 借',
      'Missed most: 甜',
      '朗读: 《小马》 question missed; 《我的学校》',
      'Waiting in Listen & confirm: 2',
      'Focus: 多读。',
      'Read more.',
    ].join('\n'));
  });
});
