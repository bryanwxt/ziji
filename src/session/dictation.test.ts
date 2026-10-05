// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../content';
import { allCards, allWords, getSettings, putCards, putWords, seedBuiltinWords } from '../store/repo';
import { freshDb, makeCard } from '../test/fixtures';
import { buildSessionPlan } from './plan';
import { applyDictationMistakes } from './dictation';

vi.mock('../content/strokes', () => ({ strokeAvailability: vi.fn(async () => 'yes') })); // no network in tests

const now = new Date(2026, 9, 5, 18);

describe('school 听写 mistakes (spec §19 part 3)', () => {
  it('a built-in character keeps its id and reading card; its write card comes due now', async () => {
    const db = await freshDb();
    const ws = builtinWords(0);
    await putWords(db, ws);
    const jia = ws.find((w) => w.text === '加')!;
    await putCards(db, [makeCard(jia.id, 'recognise', new Date(2026, 9, 20), true), makeCard(jia.id, 'write', new Date(2026, 9, 25), true)]);
    const r = await applyDictationMistakes(db, '加', now);
    expect(r).toEqual({ marked: ['加'], added: [], skipped: [], noStrokes: [] });
    const cards = new Map((await allCards(db)).map((c) => [c.id, c]));
    expect(cards.get(`${jia.id}:write`)!.fsrs.due.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(cards.get(`${jia.id}:recognise`)!.fsrs.due).toEqual(new Date(2026, 9, 20)); // keeps the reading card as it was
  });
  it('a word the app does not have is added as a writeable school word with a write card due now', async () => {
    const db = await freshDb();
    const r = await applyDictationMistakes(db, '新加坡\n', now);
    expect(r.added).toEqual(['新加坡']);
    const w = (await allWords(db)).find((x) => x.text === '新加坡')!;
    expect([w.source, w.writeable, w.listName]).toEqual(['parent', true, '听写 mistakes']);
    expect((await allCards(db)).find((c) => c.id === `${w.id}:write`)!.fsrs.due.getTime()).toBeLessThanOrEqual(now.getTime());
  });
  it('skips lines that are not 1–4 Chinese characters, and reports them', async () => {
    const db = await freshDb();
    const r = await applyDictationMistakes(db, 'xin jia po\n\n市区\nmum says 加油', now);
    expect(r.marked).toEqual(['市区']);
    expect(r.skipped).toEqual(['xin jia po', 'mum says 加油']);
  });
  it('a word marked twice stays one word with one write card', async () => {
    const db = await freshDb();
    await applyDictationMistakes(db, '市区', now);
    await applyDictationMistakes(db, '市区\n市区', new Date(now.getTime() + 1000));
    expect((await allWords(db)).filter((w) => w.text === '市区')).toHaveLength(1);
    expect((await allCards(db)).filter((c) => c.kind === 'write')).toHaveLength(1);
  });
  it('a paused word is unpaused and made writeable', async () => {
    const db = await freshDb();
    const ws = builtinWords(0);
    await putWords(db, ws.map((w) => (w.text === '区' ? { ...w, paused: true, writeable: false } : w)));
    await applyDictationMistakes(db, '区', now);
    const w = (await allWords(db)).find((x) => x.text === '区')!;
    expect([w.paused, w.writeable]).toEqual([false, true]);
  });
  it("comes first in the next lesson's 写一写", async () => {
    const db = await freshDb();
    const ws = builtinWords(0);
    await putWords(db, ws);
    const other = ws[3]!;
    await putCards(db, [makeCard(other.id, 'recognise', new Date(2026, 9, 20), true), makeCard(other.id, 'write', new Date(2026, 9, 4), true)]);
    await applyDictationMistakes(db, '市区', now);
    const plan = buildSessionPlan({ cards: await allCards(db), words: await allWords(db), settings: await getSettings(db), now: new Date(2026, 9, 6, 9) });
    expect((await allWords(db)).find((w) => w.id === plan.writeCandidates[0]!.wordId)!.text).toBe('市区');
  });
  it('a built-in character stays writeable after the next app launch re-seeds the built-ins', async () => {
    const db = await freshDb();
    const ws = builtinWords(0);
    const zui = ws.find((w) => !w.writeable)!;
    await putWords(db, ws);
    await applyDictationMistakes(db, zui.text, now);
    await seedBuiltinWords(db, builtinWords(0));
    const w = (await allWords(db)).find((x) => x.id === zui.id)!;
    expect([w.writeable, w.listName]).toEqual([true, '听写 mistakes']);
  });
  it('a word he has never written starts with tracing (a new write word), not from memory', async () => {
    const db = await freshDb();
    await applyDictationMistakes(db, '新加坡', now);
    const plan = buildSessionPlan({ cards: await allCards(db), words: await allWords(db), settings: await getSettings(db), now: new Date(2026, 9, 6, 9) });
    expect(plan.writeCandidates[0]).toMatchObject({ isNew: true });
  });
  it('a word with no stroke data is reported, not made a writing word (it would be skipped every lesson)', async () => {
    const db = await freshDb();
    const r = await applyDictationMistakes(db, '市区\n坼裂', now, async (ch) => (ch === '坼' ? 'no' : 'yes'));
    expect(r.noStrokes).toEqual(['坼裂']);
    expect(r.marked).toEqual(['市区']);
    expect((await allCards(db)).filter((c) => c.kind === 'write')).toHaveLength(1);
  });
  it('marked words are written in the order typed', async () => {
    const db = await freshDb();
    await applyDictationMistakes(db, '新加坡\n市区\n安静', now);
    const plan = buildSessionPlan({ cards: await allCards(db), words: await allWords(db), settings: { ...(await getSettings(db)), sessionMinutes: 30 }, now: new Date(2026, 9, 6, 9) });
    const byId = new Map((await allWords(db)).map((w) => [w.id, w.text]));
    expect(plan.writeCandidates.slice(0, 3).map((c) => byId.get(c.wordId))).toEqual(['新加坡', '市区', '安静']);
  });
  it('a new school word is also first for 认一认, ahead of older unstarted lists', async () => {
    const db = await freshDb();
    await putWords(db, [{ ...builtinWords(0)[0]!, id: 'p:old', text: '旧词', source: 'parent', rank: null, level: null, listName: 'Week 1', listedAt: 1 }]);
    await applyDictationMistakes(db, '新加坡', now);
    const plan = buildSessionPlan({ cards: await allCards(db), words: await allWords(db), settings: await getSettings(db), now: new Date(2026, 9, 6, 9) });
    const byId = new Map((await allWords(db)).map((w) => [w.id, w.text]));
    expect(byId.get(plan.newWordIds[0]!)).toBe('新加坡');
  });
});

describe('sweep: 听写 mistakes keep the order typed', () => {
  it('each new word comes first in line in the order the parent typed it', async () => {
    const db = await freshDb();
    await applyDictationMistakes(db, '新加坡\n小学\n朋友们', new Date(2026, 9, 6), async () => 'yes');
    const ws = (await allWords(db)).filter((w) => w.listName === '听写 mistakes').sort((a, b) => a.listedAt! - b.listedAt!);
    expect(ws.map((w) => w.text)).toEqual(['新加坡', '小学', '朋友们']);
  });
});

