// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { createSessionRecord } from '../session/runner';
import { getSettings, putWeekList, putWords, saveKid, saveParentPassage, saveSession, updateSettings } from '../store/repo';
import { freshDb } from '../test/fixtures';
import { DEFAULT_KID, EMPTY_READING, type SessionPlan, type WeekList } from '../types';
import { swapTalk, talkWord, talkWords, todaysPassage, todayTalk } from './load';

const NOW = new Date(2026, 9, 19, 20); // a Monday evening
const words = builtinWords(0);
const w = (t: string) => words.find((x) => x.text === t)!;
const plan = (ids: string[], lanes: Record<string, 'school' | 'catchup' | 'list'> = {}): SessionPlan => ({ steps: ['newwords'], reviewWordIds: [], newWordIds: ids, newWordLanes: lanes, flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 });
/** A lesson on `date` whose 认新字 reached its first `reached` new words. */
const lesson = (date: string, ids: string[], o: { reached?: number; free?: boolean; lanes?: Record<string, 'school' | 'catchup' | 'list'> } = {}) =>
  ({ ...createSessionRecord(plan(ids, o.lanes), date, 0, o.free ?? false), flashIndex: o.reached ?? ids.length });
const list = (over: Partial<WeekList> = {}): WeekList => ({
  id: 'wl:a', name: '复习一', createdAt: 0, readyBy: '2026-10-21', homeworkDue: '2026-10-23',
  items: [{ wordId: 'b:借', text: '借', from: 'grid', addedStatus: 'new', last: { read: { at: 1, correct: true }, meaning: { at: 1, correct: true } } }, { wordId: 'b:甜', text: '甜', from: 'grid', addedStatus: 'new' }],
  pairs: [], fits: [{ wordId: 'b:甜', sentence: '这个西瓜很＿。', source: 'parent', wrong: ['借', '饿', '马'] }],
  ...over,
});
const readOn = (id: string, day: string) => ({ ...DEFAULT_KID, reading: { ...EMPTY_READING, history: { [id]: { reads: 1, lastRead: day, rest: 3, q: 1 } } } });

describe('his words (2026-10-18 update)', () => {
  it('a word as its starter needs it: the first sense, a sentence that uses it, its 组词', () => {
    expect(talkWord(w('借'), 'list')).toEqual({ text: '借', gloss: 'borrow', example: '我可以借你的笔吗？', zuci: ['借书', '借给', '借用'], from: 'list' });
    expect(talkWord({ text: '闪闪亮' }, 'list')).toEqual({ text: '闪闪亮', zuci: [], from: 'list' });
  });
  it("this week's list first (not ready before ready, its 选词填空 row as the example), then his new class words, school lane first", async () => {
    const db = await freshDb();
    await putWords(db, ['借', '甜', '饿', '饱', '马', '爷'].map(w));
    await putWeekList(db, list());
    await saveSession(db, lesson('2026-10-12', ['b:马'])); // 8 days back: out
    await saveSession(db, lesson('2026-10-14', ['b:饿', 'b:饱'], { lanes: { 'b:饿': 'catchup', 'b:饱': 'school' } }));
    await saveSession(db, lesson('2026-10-18', ['b:爷', 'b:借', 'b:甜'], { lanes: { 'b:借': 'list', 'b:甜': 'list' } }));
    await saveSession(db, lesson('2026-10-19', ['b:马'], { free: true })); // free play: never
    const got = await talkWords(db, NOW);
    expect(got.map((x) => [x.text, x.from])).toEqual([['甜', 'list'], ['借', 'list'], ['爷', 'class'], ['饱', 'class'], ['饿', 'class']]);
    expect(got[0]!.example).toBe('这个西瓜很甜。');
  });
  it('a word 认新字 never reached is not his yet; a list past its homework day is not this week', async () => {
    const db = await freshDb();
    await putWords(db, ['借', '甜', '饿'].map(w));
    await putWeekList(db, list({ homeworkDue: '2026-10-16', readyBy: '2026-10-15' }));
    await saveSession(db, lesson('2026-10-18', ['b:饿', 'b:借'], { reached: 1 }));
    expect((await talkWords(db, NOW)).map((x) => x.text)).toEqual(['饿']);
  });
});

describe("today's passage", () => {
  it('the one read today or yesterday while 朗读 is on; a parent text with its question or none', async () => {
    const db = await freshDb();
    const s = await getSettings(db);
    expect(await todaysPassage(db, s, NOW)).toBeNull(); // no kid yet
    await saveKid(db, readOn('p17', '2026-10-18'));
    expect(await todaysPassage(db, s, NOW)).toMatchObject({ id: 'p17', title: '小马', questions: [expect.objectContaining({ q: '小马为什么找不到家了？' }), expect.anything()] });
    expect(await todaysPassage(db, { ...s, langdu: false }, NOW)).toBeNull();
    await saveKid(db, readOn('p17', '2026-10-17'));
    expect(await todaysPassage(db, s, NOW)).toBeNull();
    await saveParentPassage(db, { id: 'pp:a', title: '我的学校', text: '我的学校很大。', createdAt: 1 });
    await saveKid(db, readOn('pp:a', '2026-10-19'));
    expect(await todaysPassage(db, s, NOW)).toEqual({ id: 'pp:a', title: '我的学校', questions: [] });
  });
});

describe('the day is kept (spec §4)', () => {
  it('the same three all day, new ones the next day; what was shown is remembered', async () => {
    const db = await freshDb();
    const first = await todayTalk(db, NOW);
    expect(first).toHaveLength(3);
    expect(await todayTalk(db, new Date(2026, 9, 19, 23))).toEqual(first);
    const s = await getSettings(db);
    expect(s.talkDay).toEqual({ date: '2026-10-19', cards: first });
    expect(Object.keys(s.talkSeen!).sort()).toEqual(first.map((c) => c.id).sort());
    const next = await todayTalk(db, new Date(2026, 9, 20, 8));
    expect(next.filter((c) => first.some((f) => f.id === c.id))).toEqual([]);
  });
  it('a swap is kept; the swapped-out card counts as shown', async () => {
    const db = await freshDb();
    const first = await todayTalk(db, NOW);
    const swapped = await swapTalk(db, NOW, 2);
    expect(swapped[2]!.id).not.toBe(first[2]!.id);
    expect(swapped.slice(0, 2)).toEqual(first.slice(0, 2));
    expect(await todayTalk(db, NOW)).toEqual(swapped);
    expect((await getSettings(db)).talkSeen![first[2]!.id]).toBe('2026-10-19');
  });
  it("the reading slot follows a passage read after the cards were picked (the morning's cards, the evening's lesson)", async () => {
    const db = await freshDb();
    await saveKid(db, readOn('p01', '2026-10-17')); // nothing recent: the slot is a theme
    const morning = await todayTalk(db, new Date(2026, 9, 19, 7));
    expect(morning[1]!.kind).toBe('theme');
    await saveKid(db, readOn('p17', '2026-10-19'));
    const evening = await todayTalk(db, NOW);
    expect(evening[1]).toMatchObject({ kind: 'reading', passageId: 'p17' });
    expect([evening[0], evening[2]]).toEqual([morning[0], morning[2]]);
    await updateSettings(db, {}); // nothing else changes it
    expect(await todayTalk(db, NOW)).toEqual(evening);
  });
});
