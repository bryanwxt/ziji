import { screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { createSessionRecord } from '../session/runner';
import { saveSession } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import type { SessionPlan } from '../types';
import { HomeScreen } from './HomeScreen';

vi.mock('../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));

const plan: SessionPlan = { steps: [], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };

// review 2026-10-17: a parent sees the backup reminder without opening the PIN area
describe('the backup reminder on Home', () => {
  it('a small 给家长 line after 14 days with no backup', async () => {
    const app = await makeAppData(); // today is 2026-10-02
    await saveSession(app.db, { ...createSessionRecord(plan, '2026-09-10', 0), completed: true });
    renderWithApp(<HomeScreen />, app);
    const line = await screen.findByText(/No backup for 22 days/);
    expect(line.closest('.parent-nudge')!.querySelector('.label')?.getAttribute('data-zh')).toBe('给家长');
  });
  it('none for a new install, or after a recent backup', async () => {
    const app = await makeAppData();
    await saveSession(app.db, { ...createSessionRecord(plan, '2026-09-30', 0), completed: true });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(document.querySelector('.parent-nudge')).toBeNull();
  });
});
