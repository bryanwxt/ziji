import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../audio/speech', () => ({ prefetchWords: vi.fn(), stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
import { Rating } from 'ts-fsrs';
import { logsSince, putCards, putWords, saveSession, updateSettings } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { builtinWords } from '../content';
import { createSessionRecord } from '../session/runner';
import { makeCard, markProduced } from '../test/fixtures';
import { SessionScreen } from './SessionScreen';

const words = builtinWords(0);
const three = ['大', '小', '山'].map((t) => words.find((w) => w.text === t)!);

describe('too fast to count in a lesson (real test spec 2026-10-23 §6)', () => {
  it('a right tap at once rates Hard though the word is produced; after the second, Truffle says 「慢慢看，想好再点」', async () => {
    const app = await makeAppData();
    await putWords(app.db, words);
    await updateSettings(app.db, { activities: { newwords: false, practice: true, writing: false, speaking: false } });
    for (const w of three) await markProduced(app.db, w.id);
    await putCards(app.db, three.map((w) => makeCard(w.id, 'recognise', new Date(2026, 9, 1), true)));
    const rec = createSessionRecord({ steps: ['practice'], reviewWordIds: three.map((w) => w.id), newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0, practiceTimeBoxMs: 300_000 }, '2026-10-02', app.now().getTime());
    const queue = three.map((w) => ({ wordId: w.id, rung: 1 as const, ask: 'read' as const, grades: 'recognise' as const, retry: false, due: true }));
    await saveSession(app.db, { ...rec, activeMs: 1000, practiceQueue: queue, practiceIndex: 0, practiceElapsedMs: 0 });
    renderWithApp(<SessionScreen free={false} />, app);
    for (const w of three.slice(0, 2)) {
      fireEvent.click(await screen.findByRole('button', { name: w.pinyin })); // at once: well under 900 ms
      fireEvent.click(await screen.findByText('继续'));
    }
    await waitFor(() => expect(document.querySelector('.pet__bubble')?.textContent).toContain('慢慢看，想好再点'));
    const logs = await logsSince(app.db, 0);
    expect(logs.filter((l) => l.kind === 'recognise').map((l) => [l.rating, l.guess])).toEqual([[Rating.Hard, true], [Rating.Hard, true]]);
  });
});

describe('a guessed weekly list 选词填空 (final review m5b)', () => {
  it('rates his meaning card Hard and logs the guess, as the other taps do', async () => {
    const { putWeekList } = await import('../store/repo');
    const parent = (text: string, pinyin: string, meaning: string) => ({ id: `p:${text}`, text, pinyin, meaning, level: null, rank: null, source: 'parent' as const, writeable: false, paused: false, createdAt: 0 });
    const ws = [parent('亮晶晶', 'liàng jīng jīng', 'sparkly'), parent('胖乎乎', 'pàng hū hū', 'chubby'), parent('毛茸茸', 'máo róng róng', 'fluffy'), parent('绿油油', 'lǜ yóu yóu', 'lush green')];
    const fit = { wordId: 'p:亮晶晶', sentence: '夜空里的星星＿。', source: 'parent' as const, wrong: ['胖乎乎', '毛茸茸', '绿油油'] as [string, string, string] };
    const app = await makeAppData();
    await putWords(app.db, ws);
    await updateSettings(app.db, { activities: { newwords: false, practice: true, writing: false, speaking: false } });
    await putCards(app.db, ws.flatMap((w) => [makeCard(w.id, 'recognise', new Date(2026, 9, 20), true), makeCard(w.id, 'meaning', new Date(2026, 9, 20), true)]));
    await markProduced(app.db, 'p:亮晶晶'); // produced: a right answer would be Good, so Hard here is the guess
    await putWeekList(app.db, { id: 'wl:t', name: 'T', createdAt: 0, readyBy: '2026-10-09', homeworkDue: '2026-10-10', items: ws.map((w) => ({ wordId: w.id, text: w.text, from: 'grid' as const, addedStatus: 'new' as const })), pairs: [], fits: [fit] });
    const rec = createSessionRecord({ steps: ['practice'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0, practiceTimeBoxMs: 300_000 }, '2026-10-02', app.now().getTime());
    const queue = [{ wordId: 'p:亮晶晶', rung: 3 as const, ask: 'fit' as const, grades: null, retry: false, list: { listId: 'wl:t', form: 'fit' as const, fit, reserved: true as const } }];
    await saveSession(app.db, { ...rec, activeMs: 1000, practiceQueue: queue, practiceIndex: 0, practiceElapsedMs: 0 });
    renderWithApp(<SessionScreen free={false} />, app);
    const pick = await waitFor(() => { const b = [...document.querySelectorAll<HTMLButtonElement>('.choice')].find((x) => x.textContent === '亮晶晶'); expect(b).toBeTruthy(); return b!; }, { timeout: 15_000 });
    fireEvent.click(pick); // at once: well under 900 ms
    await waitFor(async () => expect((await logsSince(app.db, 0)).some((l) => l.kind === 'meaning')).toBe(true));
    expect((await logsSince(app.db, 0)).filter((l) => l.kind === 'meaning').map((l) => [l.wordId, l.rating, l.guess])).toEqual([['p:亮晶晶', Rating.Hard, true]]);
  });
});
