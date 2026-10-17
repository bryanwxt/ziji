// What a Share button says after it ran (parent loop, Tasks 6–7): "Copied…", or, when neither the sheet nor the clipboard took
// it, the text itself read-only and already selected so the parent can copy it by hand. Nothing after a share or a closed sheet.
import { useEffect, useRef } from 'preact/hooks';
import { shareNote, type ShareResult } from '../talk/share';

export function ShareNote({ result, text, label }: { result: ShareResult | null; text: string; label: string }) {
  const box = useRef<HTMLTextAreaElement>(null);
  const manual = result === 'manual';
  useEffect(() => {
    const el = box.current;
    if (!manual || !el) return;
    el.focus();
    el.select();
    el.setSelectionRange(0, el.value.length); // iOS Safari ignores select() alone
  }, [manual, text]);
  const note = result ? shareNote(result) : null;
  if (!note) return null;
  return (
    <div class="share-note">
      <p role="status">{note}</p>
      {manual && <textarea ref={box} class="share-note__text" readOnly aria-label={label} rows={6} value={text} lang="zh-CN" />}
    </div>
  );
}
