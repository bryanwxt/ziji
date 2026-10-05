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
    const p = readBackup(await buildFitProfile({ now: NOW, doneToday: true, activities: { writing: false }, world: 'blocks', speakingLast: 'story' }));
    const sessions = (p.file.stores.sessions ?? []) as { date: string; completed: boolean }[];
    expect(sessions.some((s) => s.date === '2026-10-06' && s.completed)).toBe(true);
    const kid = p.file.kid as { lastChestDate: string; world: string; worldsSeen: string[]; speakingLast: string };
    expect(kid.lastChestDate).toBe('2026-10-06');
    expect(kid.world).toBe('blocks');
    expect(kid.worldsSeen).toContain('blocks');
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
    expect(openChest(kid, '2026-10-06', null).result.kind).toBe('stars');
  });
});
