// A lesson with a weekly list (weekly list spec 2026-10-17 §2.1, §6.4, §7): re-teaching cards first in 认新字, never graded; list
// items in 练一练, their answers noted on the list.
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../content';
import { allWeekLists, getSession, logsSince, putCards, putWeekList, putWords, updateSettings } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import type { WeekList, Word } from '../types';
import { SessionScreen } from './SessionScreen';

vi.mock('../audio/speech', () => ({ prefetchWords: vi.fn(), stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));

const fri = new Date(2026, 10, 6, 9); // the day after the check
const byText = new Map(builtinWords(0).map((w) => [w.text, w]));
const parent = (text: string, pinyin: string, meaning: string): Word => ({ id: `p:${text}`, text, pinyin, meaning, level: null, rank: null, source: 'parent', writeable: false, paused: false, createdAt: 0 });
const words: Word[] = [byText.get('炒')!, parent('亮晶晶', 'liàng jīng jīng', 'sparkly'), parent('干干净净', 'gān gān jìng jìng', 'spotless'), parent('整整齐齐', 'zhěng zhěng qí qí', 'tidy'), parent('高高兴兴', 'gāo gāo xìng xìng', 'happily')];
const list: WeekList = {
  id: 'wl:t', name: 'T', createdAt: 0, readyBy: '2026-11-05', homeworkDue: '2026-11-06',
  items: words.map((w) => ({ wordId: w.id, text: w.text, from: 'grid' as const, addedStatus: 'new' as const })),
  pairs: [],
  fits: [],
  check: { at: 1, day: '2026-11-05', done: true, results: Object.fromEntries(words.map((w) => [w.id, { form: 'read' as const, correct: w.text !== '亮晶晶' }])) },
};
list.items = list.items.map((i) => (i.text === '亮晶晶' ? { ...i, missedOn: '2026-11-05' } : i));

async function setup() {
  const app = await makeAppData({ now: () => fri });
  await putWords(app.db, words);
  await updateSettings(app.db, { newPerDay: 2, activities: { newwords: true, practice: true, writing: false, speaking: false } });
  // all begun and not due: today's lesson has only what the list adds
  await putCards(app.db, words.map((w) => makeCard(w.id, 'recognise', new Date(2026, 10, 20), true)));
  await putWeekList(app.db, list);
  return app;
}

describe('a lesson the day after the check', { timeout: 60_000 }, () => {
  it('认新字 opens on the missed word\'s card again, 再认一次！, asks it, and grades no card', async () => {
    const app = await setup();
    renderWithApp(<SessionScreen free={false} />, app);
    await waitFor(() => expect(document.querySelector('.intro__card')?.getAttribute('data-word')).toBe('亮晶晶'), { timeout: 15_000 });
    expect(document.querySelector('.pet__bubble .label')!.getAttribute('data-zh')).toBe('再认一次！');
    expect(document.querySelector('.intro__card--list')).toBeTruthy();
    fireEvent.click(screen.getByText('我记住了！'));
    // asked to read it: its pinyin among the choices
    const right = await screen.findByText('liàng jīng jīng');
    fireEvent.click(right);
    await waitFor(async () => expect((await allWeekLists(app.db))[0]!.items.find((i) => i.text === '亮晶晶')!.last?.read?.correct).toBe(true));
    expect((await logsSince(app.db, 0)).filter((l) => l.cardId === 'p:亮晶晶:recognise')).toHaveLength(0);
    const rec = (await getSession(app.db, '2026-11-06'))!;
    expect(rec.flashQueue[0]).toMatchObject({ wordId: 'p:亮晶晶', reteach: true });
  });
});
