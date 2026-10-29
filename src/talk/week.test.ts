// @vitest-environment node
import { Rating } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import { createSessionRecord } from '../session/runner';
import { addReviewLog, addTalk, putCards, putWords, saveSession, addRecording } from '../store/repo';
import { freshDb, makeCard, makeWord } from '../test/fixtures';
import type { Recording, ReviewLog, SessionPlan, TalkLog } from '../types';
import { focusLine, summarizeWeek, talkNudge, talkTotals, weekRange, type WeekSummary } from './week';
import { loadWeek } from './weekLoad';

const at = (d: number, h = 19, m = 0) => new Date(2026, 9, d, h, m).getTime();
const plan = (ids: string[]): SessionPlan => ({ steps: ['newwords', 'speaking'], reviewWordIds: [], newWordIds: ids, flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 });
const lesson = (date: string, ids: string[], langdu = true) => ({ ...createSessionRecord(plan(ids), date, 0), flashIndex: ids.length, completed: true, completedSteps: langdu ? (['newwords', 'speaking'] as const).slice() : ['newwords' as const] });
const miss = (wordId: string, d: number): ReviewLog => ({ cardId: `${wordId}:recognise`, wordId, kind: 'recognise', at: at(d), rating: Rating.Again, correct: false });
const take = (passageId: string, d: number, correct: boolean | null): Recording => ({ id: `r${passageId}${d}`, createdAt: at(d), prompt: { kind: 'passage', passageId }, blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 30, ...(correct === null ? {} : { meaning: { correct, picked: 'x' } }) });
const empty: Omit<WeekSummary, 'focus'> = { talk: { days: 3, minutes: 30, times: 3 }, lessons: 5, langduDays: 5, newly: { read: [], write: [], say: [] }, newWords: [], shaky: [], reading: [], waiting: 0 };

describe('the week (parent loop spec §5)', () => {
  it('Monday to Sunday: late Sunday is this week; just after midnight Monday is the next; back 1 is last week', () => {
    expect(weekRange(new Date(2026, 9, 25, 23, 59))).toMatchObject({ from: '2026-10-19', to: '2026-10-25' });
    expect(weekRange(new Date(2026, 9, 26, 0, 5))).toMatchObject({ from: '2026-10-26', to: '2026-11-01' });
    const r = weekRange(new Date(2026, 9, 21), 1);
    expect(r).toEqual({ from: '2026-10-12', to: '2026-10-18', start: new Date(2026, 9, 12).getTime(), end: new Date(2026, 9, 19).getTime() });
  });
  it('talk: days with a talk, minutes added up (none counts 0), times', () => {
    const talks: TalkLog[] = [{ id: 'a', at: at(19, 8), minutes: 5 }, { id: 'b', at: at(19, 20), minutes: 10 }, { id: 'c', at: at(21) }, { id: 'd', at: at(26, 0, 1), minutes: 15 }];
    const r = weekRange(new Date(2026, 9, 21));
    expect(talkTotals(talks, r.start, r.end)).toEqual({ days: 2, minutes: 15, times: 3 });
  });
  it('the 2-day note: nothing today or yesterday; the weekday within six days, the date beyond; never logged', () => {
    const now = new Date(2026, 9, 22, 20); // Thu
    expect(talkNudge([{ id: 'a', at: at(21) }], now)).toBeNull();
    expect(talkNudge([{ id: 'a', at: at(20) }], now)).toBe('No talk logged since Tue.');
    expect(talkNudge([{ id: 'a', at: at(12) }], now)).toBe('No talk logged since 12 Oct.');
    expect(talkNudge([], now)).toBe('No talk logged yet.');
  });
});

describe('the focus line, the first that applies', () => {
  it('a 朗读 question missed', () => {
    expect(focusLine({ ...empty, shaky: ['饿'], reading: [{ passageId: 'p17', title: '小马', meaning: 'missed' }] }).zh).toBe('多读：孩子这周的朗读题答错了。和孩子再读一次《小马》，轮流读，读完问问孩子故事里发生了什么。');
  });
  it('words he missed, in the theme they lean to', () => {
    expect(focusLine({ ...empty, shaky: ['饿', '饱', '甜', '马'] })).toEqual({
      zh: '多聊食物：这周常错的词是饿、饱、甜，聊天的时候多用一用。',
      en: 'Talk more about food: the words they missed most were 饿, 饱, 甜. Use them in conversation.',
    });
  });
  it('fewer than 3 talk days', () => {
    expect(focusLine({ ...empty, talk: { days: 1, minutes: 5, times: 1 }, newWords: ['饿'] }).en).toBe('Talk more: 1 day this week. Try five minutes a day; dinner is enough.');
  });
  it('new words, else a good week', () => {
    expect(focusLine({ ...empty, newWords: ['借'] }).zh).toBe('多用这些词聊天：这周的新词有借。');
    expect(focusLine(empty).zh).toBe('这周很好！下周继续每天聊一聊。');
  });
});

describe('lessons and 朗读 days', () => {
  it('a lesson that reached 朗读 but was not finished counts a 朗读 day, not a lesson: 朗读 days can exceed lessons', () => {
    const r = weekRange(new Date(2026, 9, 21));
    const s = summarizeWeek({
      range: r, talks: [], cards: [], logs: [], recordings: [], waiting: 0, textOf: () => undefined, titleOf: () => undefined,
      sessions: [lesson('2026-10-19', []), { ...lesson('2026-10-20', []), completed: false }],
    });
    expect(s).toMatchObject({ lessons: 1, langduDays: 2 });
  });
});

describe('the summary from the stores', () => {
  it('lessons, 朗读 days, what newly passed, new and shaky words, the passages and their questions, talk, waiting', async () => {
    const db = await freshDb();
    await putWords(db, ['饿', '饱', '甜', '马'].map((t) => makeWord(t)));
    await saveSession(db, lesson('2026-10-19', ['b:饿', 'b:饱']));
    await saveSession(db, lesson('2026-10-20', ['b:甜'], false));
    await saveSession(db, lesson('2026-10-12', ['b:马'])); // last week
    await putCards(db, [{ ...makeCard('b:饿', 'recognise', new Date(2026, 9, 21), true) }, { ...makeCard('b:马', 'write', new Date(2026, 9, 15), true) }]);
    for (const l of [miss('b:甜', 20), miss('b:甜', 21), miss('b:饱', 21), miss('b:马', 15)]) await addReviewLog(db, l);
    await addRecording(db, take('p17', 19, false));
    await addRecording(db, take('p17', 21, true)); // its newest take this week: right
    await addRecording(db, take('p20', 20, null));
    // a take with three answers (spec 2026-10-24 §5): 1 of 3 is not read well, so 'missed'; 2 of 3 is 'right'
    await addRecording(db, { ...take('p03', 20, null), answers: [{ kind: 'why', correct: false, picked: 'a' }, { kind: 'word', correct: true, picked: 'b' }, { kind: 'fact', correct: false, picked: 'c' }] });
    await addRecording(db, { ...take('p02', 20, null), answers: [{ kind: 'why', correct: false, picked: 'a' }, { kind: 'word', correct: true, picked: 'b' }, { kind: 'fact', correct: true, picked: 'c' }] });
    await addTalk(db, { id: 'a', at: at(19), minutes: 10 });
    const { range, summary } = await loadWeek(db, new Date(2026, 9, 22, 20));
    expect(range.from).toBe('2026-10-19');
    expect(summary).toMatchObject({
      talk: { days: 1, minutes: 10, times: 1 }, lessons: 2, langduDays: 1,
      newly: { read: ['饿'], write: [], say: [] }, newWords: ['饿', '饱', '甜'], shaky: ['甜', '饱'],
      waiting: 4,
    });
    expect(summary.reading).toHaveLength(4);
    expect(summary.reading).toEqual(expect.arrayContaining([
      { passageId: 'p17', title: '小马', meaning: 'right' }, { passageId: 'p20', title: '我的学校', meaning: null },
      { passageId: 'p03', title: '下雨了', meaning: 'missed' }, { passageId: 'p02', title: '上学', meaning: 'right' },
    ]));
    expect(summary.focus.zh).toBe('多读：孩子这周的朗读题答错了。和孩子再读一次《下雨了》，轮流读，读完问问孩子故事里发生了什么。');
    expect((await loadWeek(db, new Date(2026, 9, 22, 20), 1)).summary).toMatchObject({ lessons: 1, newWords: ['马'], shaky: ['马'], newly: { write: ['马'] } });
  });
});
