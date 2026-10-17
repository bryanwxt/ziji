import { describe, expect, it } from 'vitest';
import { readBackup } from '../src/store/backup';
import { buildFitProfile } from './fit-profile';

const NOW = new Date(2026, 9, 6, 16, 0);

describe('buildFitProfile', () => {
  it('is a valid backup with known words, a goal, a long parent passage and a set PIN', async () => {
    const p = readBackup(await buildFitProfile({ now: NOW }));
    expect(p.counts.cards).toBeGreaterThanOrEqual(60);
    const settings = p.file.settings as { pinHash: string | null; placementDone: boolean };
    expect(settings.pinHash).toBeTruthy();
    expect(settings.placementDone).toBe(true);
    expect((p.file.stores.rewards ?? []).length).toBe(1);
    const passages = (p.file.stores.passages ?? []) as { text: string }[];
    expect(passages[0]!.text.length).toBeGreaterThanOrEqual(160);
  });
  it('can be done for today (every Home card at once) and can switch activities and the world', async () => {
    const p = readBackup(await buildFitProfile({ now: NOW, doneToday: true, activities: { writing: false }, world: 'terraces', speakingLast: 'story' }));
    const sessions = (p.file.stores.sessions ?? []) as { date: string; completed: boolean }[];
    expect(sessions.some((s) => s.date === '2026-10-06' && s.completed)).toBe(true);
    const kid = p.file.kid as { lastChestDate: string; world: string; worldsSeen: string[]; speakingLast: string };
    expect(kid.lastChestDate).toBe('2026-10-06');
    expect(kid.world).toBe('terraces');
    expect(kid.worldsSeen).toContain('terraces');
    expect(kid.speakingLast).toBe('story');
    expect((p.file.settings as { activities: Record<string, boolean> }).activities.writing).toBe(false);
  });
  it('can stop before the PIN, the pet or placement', async () => {
    expect((readBackup(await buildFitProfile({ now: NOW, pin: false })).file.settings as { pinHash: unknown }).pinHash).toBeNull();
    expect(readBackup(await buildFitProfile({ now: NOW, kid: false })).file.kid).toBeNull();
    expect((readBackup(await buildFitProfile({ now: NOW, placementDone: false })).file.settings as { placementDone: boolean }).placementDone).toBe(false);
  });
  it('sweep: can own every costume and accessory, so the chest gives stars', async () => {
    const { openChest } = await import('../src/fun/costumes');
    const p = readBackup(await buildFitProfile({ now: NOW, ownsAll: true }));
    const kid = p.file.kid as Parameters<typeof openChest>[0];
    expect(openChest(kid, '2026-10-06').result.kind).toBe('stars');
  });
  it('can seed when the day’s lesson ended, and a word mastered since (learning rules 2026-10-17)', async () => {
    const p = readBackup(await buildFitProfile({ now: NOW, doneToday: true, doneMinutesAgo: 30, extraMastered: true }));
    const kid = p.file.kid as { starredUpTo?: number };
    expect(kid.starredUpTo).toBe(NOW.getTime() - 30 * 60_000);
    const cards = (p.file.stores.cards ?? []) as { kind: string; passed?: number }[];
    expect(cards.some((c) => c.kind === 'write' && c.passed === NOW.getTime() - 60_000)).toBe(true);
  });
  it('can seed the river meter and the bank (rewards spec §3)', async () => {
    const p = readBackup(await buildFitProfile({ now: NOW, doneToday: true, meter: { halves: 1, chestsToday: 1 }, bank: 1 }));
    const kid = p.file.kid as { meter: { halves: number; chestsToday: number; owed: number; lesson: number | null }; bank: number };
    expect(kid.meter).toMatchObject({ halves: 1, chestsToday: 1, owed: 0, lesson: null });
    expect(kid.bank).toBe(1);
  });
});
