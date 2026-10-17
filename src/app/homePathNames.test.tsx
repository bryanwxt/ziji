import { screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { createSessionRecord } from '../session/runner';
import { saveSession } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { localDateKey } from '../lib/date';
import type { SessionPlan } from '../types';
import { HomeScreen } from './HomeScreen';

vi.mock('../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));

const names = () => [...document.querySelectorAll('.path__name .label')].map((l) => l.getAttribute('data-zh'));

// review 2026-10-17: the stops read 认新字/练一练 before a lesson and 认一认/选一选/钓鱼 after one saved with the old steps
describe("Home's path keeps one set of names", () => {
  it('a done lesson saved with the old steps shows 认新字 and 练一练, not 认一认/选一选/钓鱼', async () => {
    const app = await makeAppData();
    const old = ['flashcards', 'choose', 'components', 'writing'] as SessionPlan['steps'];
    const plan: SessionPlan = { steps: old, reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
    await saveSession(app.db, { ...createSessionRecord(plan, localDateKey(app.now()), 0), completed: true, completedSteps: old });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(names()).toEqual(['认新字', '练一练', '写一写', '宝箱']);
  });
});
