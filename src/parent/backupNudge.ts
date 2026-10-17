// A quiet reminder to back up, on Home for the parent (review 2026-10-17): the Dashboard's own nudge only shows behind the PIN.

export const BACKUP_NUDGE_DAYS = 14;
const DAY = 86_400_000;

/** Whole days since the last backup (or, never backed up, since his first lesson) once that reaches BACKUP_NUDGE_DAYS; else null. */
export function backupNudgeDays({ lastBackupAt, firstUse, now }: { lastBackupAt: number | null; firstUse: number | null; now: number }): number | null {
  const since = lastBackupAt ?? firstUse;
  if (since === null) return null;
  const days = Math.floor((now - since) / DAY);
  return days >= BACKUP_NUDGE_DAYS ? days : null;
}
