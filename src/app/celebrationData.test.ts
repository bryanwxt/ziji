// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { EMPTY_METER } from '../fun/meter';
import { createSessionRecord } from '../session/runner';
import { getKid, saveKid } from '../store/repo';
import { freshDb } from '../test/fixtures';
import { DEFAULT_KID, type SessionPlan } from '../types';
import { settleMeter } from './celebrationData';

const plan: SessionPlan = { steps: ['newwords'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
const lesson = (day: string, startedAt: number) => ({ ...createSessionRecord(plan, day, startedAt), completed: true, completedSteps: ['newwords' as const] });

describe('settleMeter (rewards spec §3)', () => {
  it('a meter dated in the future (a clock that ran ahead) never rejects today\'s lessons: its day is set aside first', async () => {
    const db = await freshDb();
    await saveKid(db, { ...DEFAULT_KID, meter: { ...EMPTY_METER, chestsToday: 2, day: '2027-01-01', lesson: 5 } });
    const { fill } = await settleMeter(db, lesson('2026-10-02', 10), '2026-10-02');
    expect(fill).toMatchObject({ counted: true, chests: 1 });
    expect((await getKid(db))!.meter).toMatchObject({ day: '2026-10-02', owed: 1, chestsToday: 1 });
  });
  it('counts a lesson once', async () => {
    const db = await freshDb();
    await settleMeter(db, lesson('2026-10-02', 10), '2026-10-02');
    const again = await settleMeter(db, lesson('2026-10-02', 10), '2026-10-02');
    expect(again.fill?.counted).toBe(false);
    expect((await getKid(db))!.meter.owed).toBe(1);
  });
});
