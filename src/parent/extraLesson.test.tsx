// The parent can start a review lesson at once (learning rules 2026-10-17): Home waits 2 hours after the day's lesson.
import { fireEvent, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { createSessionRecord } from '../session/runner';
import { saveSession } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import type { SessionPlan } from '../types';
import { ExtraLessonButton } from './ExtraLessonButton';

const plan: SessionPlan = { steps: [], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };

describe('ExtraLessonButton', () => {
  it("once today's lesson is done: starts a review lesson straight away", async () => {
    const app = await makeAppData();
    await saveSession(app.db, { ...createSessionRecord(plan, '2026-10-02', new Date(2026, 9, 2, 8, 50).getTime()), completed: true, completedSteps: ['practice'] });
    renderWithApp(<ExtraLessonButton />, app);
    fireEvent.click(await screen.findByRole('button', { name: /review lesson now/i }));
    expect(app.go).toHaveBeenCalledWith({ name: 'session', free: false, extra: true });
  });
  it("before today's lesson is done: nothing", async () => {
    const app = await makeAppData();
    const view = renderWithApp(<ExtraLessonButton />, app);
    await new Promise((r) => setTimeout(r, 20));
    expect(view.container.textContent).toBe('');
  });
});
