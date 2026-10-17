// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { backupNudgeDays } from './backupNudge';

const day = 86_400_000;
const now = new Date(2026, 9, 17, 9).getTime();

describe('the backup reminder on Home (review 2026-10-17)', () => {
  it('shows after 14 days without a backup, with how many', () => {
    expect(backupNudgeDays({ lastBackupAt: now - 13 * day, firstUse: now - 60 * day, now })).toBeNull();
    expect(backupNudgeDays({ lastBackupAt: now - 16 * day, firstUse: now - 60 * day, now })).toBe(16);
  });
  it('never backed up: counted from his first lesson, so a new install is not nagged', () => {
    expect(backupNudgeDays({ lastBackupAt: null, firstUse: now - 3 * day, now })).toBeNull();
    expect(backupNudgeDays({ lastBackupAt: null, firstUse: now - 20 * day, now })).toBe(20);
    expect(backupNudgeDays({ lastBackupAt: null, firstUse: null, now })).toBeNull();
  });
});
