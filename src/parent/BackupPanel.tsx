import { useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { localDateKey } from '../lib/date';
import { saveTextFile } from '../lib/files';
import { applyBackup, BackupError, exportBackup, readBackup, type BackupPreview } from '../store/backup';
import { getSettings, updateSettings } from '../store/repo';
import { setSfxEnabled } from '../audio/sfx';
import { setSpeechRate } from '../audio/speech';

export function BackupPanel() {
  const { db, now, refresh } = useApp();
  const [includeMedia, setIncludeMedia] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doExport = async () => {
    try {
      const text = await exportBackup(db, { includeMedia, now: now().getTime() });
      await saveTextFile(`ziji-backup-${localDateKey(now())}.json`, text);
      await updateSettings(db, { lastBackupAt: now().getTime() });
      await refresh();
      setStatus('Backup saved.');
    } catch (e) {
      setStatus(e instanceof DOMException && e.name === 'AbortError' ? 'Backup cancelled.' : `Backup failed: ${String(e)}`);
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
      await applyBackup(db, preview);
      const settings = await getSettings(db);
      setSpeechRate(settings.speechRate);
      setSfxEnabled(settings.soundEffects);
      setPreview(null);
      await refresh();
      setStatus('Backup restored.');
    } catch (e) {
      setStatus(`Restore failed: ${String(e)}. Your current data was not changed.`);
    }
  };

  return (
    <>
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
            <p>
              Backup from {new Date(preview.exportedAt).toLocaleString()}: {preview.counts.words} words, {preview.counts.cards} cards,{' '}
              {preview.counts.sessions} sessions, {preview.hasMedia ? `${preview.counts.recordings} recordings` : 'no recordings'}.
            </p>
            <p>Restoring replaces the current data of the same kinds. This cannot be undone.</p>
            <button type="button" class="btn btn--primary" onClick={() => void restore()}>Replace with this backup</button>
          </div>
        )}
      </section>
    </>
  );
}
