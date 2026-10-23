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
