import { screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { getSession, saveSession } from '../store/repo';
import { createSessionRecord } from '../session/runner';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import type { SessionPlan } from '../types';
import { SessionScreen } from './SessionScreen';

vi.mock('../audio/speech', () => ({ prefetchWords: vi.fn(), stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
vi.mock('../session/stars', () => ({ settleLessonStars: vi.fn(async () => { throw new Error('IndexedDB closed'); }) }));

/** A lesson saved on its last step (写一写) with nothing left to write: it finishes as soon as it opens. */
const plan: SessionPlan = { steps: ['newwords', 'practice', 'writing'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0, sayIds: [] };
const lastStep = () => ({ ...createSessionRecord(plan, '2026-10-02', 0), stepIndex: 2, completedSteps: ['newwords' as const, 'practice' as const] });

describe('a lesson whose stars cannot be settled (final review I3)', () => {
  it('is still saved finished, with a star, and celebrated', async () => {
    const app = await makeAppData();
    await saveSession(app.db, lastStep());
    renderWithApp(<SessionScreen free={false} />, app);
    expect(await screen.findByText('太棒了！', {}, { timeout: 4000 })).toBeTruthy();
    await waitFor(async () => expect((await getSession(app.db, '2026-10-02'))!.completed).toBe(true));
    const rec = (await getSession(app.db, '2026-10-02'))!;
    expect([rec.stars, rec.produced]).toEqual([1, { write: 0, say: 0 }]);
  });
  it('a lesson begun before mastery stars keeps the stars its steps earned', async () => {
    const app = await makeAppData();
    const { stars: _, ...legacy } = lastStep();
    await saveSession(app.db, legacy);
    renderWithApp(<SessionScreen free={false} />, app);
    expect(await screen.findByText('太棒了！', {}, { timeout: 4000 })).toBeTruthy();
    await waitFor(async () => expect((await getSession(app.db, '2026-10-02'))!.stars).toBe(4)); // 1 + 2 + 1
  });
});
