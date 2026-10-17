import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { readErrorLog } from '../app/errorLog';
import { LastMicFailure } from './MicTest';
import { localDateKey } from '../lib/date';
import { saveTextFile } from '../lib/files';
import { BackupError, backupFileName, currentWho, exportBackup, readBackup, restorePoint, restoreWithUndo, undoRestore, whoDiffers, type BackupPreview, type BackupWho } from '../store/backup';
import type { RestorePoint } from '../store/db';
import { storageKept } from '../store/persist';
import { deviceLabel, isInstalled } from '../lib/device';
import { getSettings, updateSettings } from '../store/repo';
import { setSchedulerParams } from '../srs/scheduler';
import { setSfxEnabled } from '../audio/sfx';
import { setSpeechRate } from '../audio/speech';

export function BackupPanel() {
  const { db, now, refresh, settings } = useApp();
  const [includeMedia, setIncludeMedia] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorLog] = useState(readErrorLog);
  const [logStatus, setLogStatus] = useState<string | null>(null);
  const [here, setHere] = useState<BackupWho | null>(null); // this device's child, to compare a chosen backup with
  const [point, setPoint] = useState<RestorePoint | null>(null); // what the last restore replaced: it can be put back
  const [kept, setKept] = useState<boolean | null | undefined>(undefined);
  const device = deviceLabel();

  const reload = async () => {
    try {
      setHere(await currentWho(db, now(), device));
      setPoint(await restorePoint(db));
    } catch {
      // the database closed under the panel (another tab's upgrade): nothing to compare with or undo
    }
  };
  useEffect(() => {
    void reload();
    void storageKept().then(setKept);
  }, []);

  const doExport = async () => {
    try {
      const text = await exportBackup(db, { includeMedia, now: now().getTime(), device });
      await saveTextFile(backupFileName(readBackup(text).who, localDateKey(now())), text);
      await updateSettings(db, { lastBackupAt: now().getTime() });
      await refresh();
      setStatus('Backup saved.');
    } catch (e) {
      setStatus(e instanceof DOMException && e.name === 'AbortError' ? 'Backup cancelled.' : `Backup failed: ${String(e)}`);
    }
  };
  const saveLog = async () => {
    try {
      await saveTextFile('ziji-error-log.json', JSON.stringify(errorLog, null, 2));
      setLogStatus('Error log saved.');
    } catch (e) {
      setLogStatus(e instanceof DOMException && e.name === 'AbortError' ? 'Cancelled.' : `Could not save: ${String(e)}`);
    }
  };
  const pick = async (file: File | undefined) => {
    setError(null);
    setPreview(null);
    if (!file) return;
    try {
      setPreview(readBackup(await file.text()));
    } catch (e) {
      setError(e instanceof BackupError ? e.message : 'Could not read that file.');
    }
  };
  const restore = async () => {
    if (!preview) return;
    try {
      await restoreWithUndo(db, preview, now()); // what was here is kept first: Undo puts it back (review 2026-10-17)
      await afterRestore();
      setPreview(null);
      setStatus('Backup restored.');
    } catch (e) {
      setStatus(`Restore failed: ${String(e)}. Your current data was not changed.`);
    }
  };
  const undo = async () => {
    try {
      await undoRestore(db);
      await afterRestore();
      setStatus('Restore undone: the progress from before it is back.');
    } catch (e) {
      setStatus(`Undo failed: ${String(e)}.`);
    }
  };
  /** a restore (or its undo) applies its sounds, fit and child straight away */
  const afterRestore = async () => {
    {
      const settings = await getSettings(db);
      setSpeechRate(settings.speechRate);
      setSfxEnabled(settings.soundEffects);
      setSchedulerParams(settings.fsrs?.w ?? null); // a restored fit (or none) applies now, not on the next launch
      await refresh();
      await reload();
    }
  };
  const differs = preview && here ? whoDiffers(preview.who, here) : [];
  const whoText = (w: BackupWho) => [w.name || 'no name', w.grade !== null ? `P${w.grade}` : null, w.device].filter(Boolean).join(' · ');
  const whose = (w: BackupWho) => `${w.name || 'no name'}'s${w.grade !== null ? ` (P${w.grade})` : ''}`;

  return (
    <>
      <section class="panel">
        <h2>Where his progress is kept</h2>
        {/* review 2026-10-17: on iOS only the Home Screen app escapes Safari's clearing of a site unused for 7 days */}
        <p class="storage-status">
          Installed on Home Screen: {isInstalled() ? 'yes' : 'no'} · Storage kept: {kept === undefined ? '…' : kept === null ? 'unknown' : kept ? 'yes' : 'no'} · Last backup:{' '}
          {settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleDateString() : 'never'}
        </p>
        {!isInstalled() && (
          <p class="hint">In Safari, an iPad can clear a website's data after 7 days unused. Add 字己 to the Home Screen (Share → Add to Home Screen) and open it from there: that copy is kept.</p>
        )}
      </section>
      <section class="panel">
        <h2>Back up</h2>
        <p>Saves progress, word lists, settings and (optionally) recordings and pictures to one file. On iPad choose "Save to Files" and keep it in iCloud Drive.</p>
        <label>
          <input type="checkbox" checked={includeMedia} onChange={(e) => setIncludeMedia(e.currentTarget.checked)} /> Include recordings and pictures (larger file)
        </label>
        <button type="button" class="btn btn--primary" onClick={() => void doExport()}>Save backup file</button>
        {status && <p role="status">{status}</p>}
      </section>
      <section class="panel">
        <h2>Restore</h2>
        <div class="field">
          <label for="bk-file">Choose a backup file (or an emergency copy)</label>
          <input id="bk-file" type="file" accept="application/json,.json" onChange={(e) => void pick(e.currentTarget.files?.[0])} />
        </div>
        {error && <p class="warning" role="alert">{error}</p>}
        {preview && (
          <div class="warning">
            <p><strong>For {whoText(preview.who)}</strong>, saved {new Date(preview.exportedAt).toLocaleString()}.</p>
            {differs.length > 0 && here && (
              <p class="backup-mismatch" role="alert">
                <strong>This backup is {whose(preview.who)}, not {whose(here)}.</strong> Restoring it replaces {here.name || 'this child'}'s progress on this device.
              </p>
            )}
            <p>
              {preview.counts.words} words, {preview.counts.cards} cards, {preview.counts.sessions} sessions,{' '}
              {preview.hasMedia ? `${preview.counts.recordings} recordings` : 'no recordings'}.
            </p>
            <p>Restoring replaces the current data of the same kinds. What is here now is kept on this device first, so the restore can be undone.</p>
            <button type="button" class={`btn ${differs.length ? 'btn--red' : 'btn--primary'}`} onClick={() => void restore()}>Replace with this backup</button>
          </div>
        )}
        {point && (
          <p>
            Restored {new Date(point.at).toLocaleString()} over {whoText(point.who)}.{' '}
            <button type="button" class="btn" onClick={() => void undo()}>Undo the last restore</button>
          </p>
        )}
      </section>
      <section class="panel">
        <h2>Error log</h2>
        <p>Up to 20 recent problems the app hit after starting (each time it showed your child a restart screen, or the microphone didn't start). Kept on this device only; save the file to send it on.</p>
        <LastMicFailure />
        {errorLog.length === 0 ? (
          <p>No errors recorded.</p>
        ) : (
          <>
            <ul class="error-log">
              {errorLog.map((e, i) => (
                <li key={i}>
                  {new Date(e.at).toLocaleString()} — {e.message}
                  {e.stack && <small> ({e.stack})</small>}
                </li>
              ))}
            </ul>
            <button type="button" class="btn" onClick={() => void saveLog()}>Save error log</button>
          </>
        )}
        {logStatus && <p role="status">{logStatus}</p>}
      </section>
    </>
  );
}
