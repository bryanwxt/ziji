import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../audio/speech', () => ({ prefetchWords: vi.fn(), stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
import { builtinWords } from '../content';
import { createSessionRecord } from '../session/runner';
import { allCards, getSession, putCards, putWords, saveSession, updateSettings } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { SessionScreen } from './SessionScreen';

const words = builtinWords(0);
const byText = (t: string) => words.find((w) => w.text === t)!;

describe('a placement recheck missed in a lesson (review M1)', () => {
  it('sends the word back: the rest of the lesson skips it and makes no fresh card for it', async () => {
    const app = await makeAppData({ voice: false });
    await putWords(app.db, words);
    await updateSettings(app.db, { activities: { newwords: true, practice: true, writing: false, speaking: false } });
    const x = byText('大');
    const y = byText('山');
    const due = new Date(2026, 9, 2, 8);
    await putCards(app.db, [
      { ...makeCard(x.id, 'recognise', due, true), placed: true },
      makeCard(x.id, 'meaning', due),
      makeCard(y.id, 'recognise', due, true),
    ]);
    const plan = { steps: ['practice' as const], reviewWordIds: [x.id, y.id], newWordIds: [], flashTimeBoxMs: 0, practiceTimeBoxMs: 600_000, writeCandidates: [], writeCount: 0 };
    const rec = createSessionRecord(plan, '2026-10-02', app.now().getTime());
    await saveSession(app.db, {
      ...rec, activeMs: 1000, practiceIndex: 0, practiceElapsedMs: 0,
      practiceQueue: [
        { wordId: x.id, rung: 1, ask: 'read', grades: 'recognise', retry: false, due: true },
        { wordId: y.id, rung: 1, ask: 'read', grades: 'recognise', retry: false, due: true },
        { wordId: x.id, rung: 2, ask: 'word', grades: 'meaning', retry: false },
        { wordId: x.id, rung: 3, ask: 'read', grades: null, retry: false },
      ],
    });
    renderWithApp(<SessionScreen free={false} />, app);
    await waitFor(() => expect(document.querySelector('.hanzi--xl, .flash__char, [data-q]')?.textContent).toContain('大'), { timeout: 10_000 });
    await waitFor(() => expect(document.querySelector('.choice:not([disabled])')).toBeTruthy());
    const wrong = [...document.querySelectorAll<HTMLElement>('.choice:not([disabled])')].find((b) => b.textContent!.trim() !== x.pinyin)!;
    fireEvent.click(wrong);
    fireEvent.click(await screen.findByText('继续'));
    await waitFor(async () => expect((await allCards(app.db)).filter((c) => c.wordId === x.id)).toEqual([]));
    await waitFor(async () => expect((await getSession(app.db, '2026-10-02'))!.sentBack).toEqual([x.id]), { timeout: 10_000 });
    const queue = (await getSession(app.db, '2026-10-02'))!.practiceQueue!;
    expect(queue.slice(1).map((q) => q.wordId)).toEqual([y.id]);
    expect((await allCards(app.db)).filter((c) => c.wordId === x.id)).toEqual([]);
  }, 20_000);
});
