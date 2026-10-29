import { Flag } from 'lucide-preact';
import { createPortal } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';
import { Label } from '../ui/Label';
import { report } from './outbox';

/** What can be wrong with a question: one tap each, so the child or a parent can flag it without typing. */
export const REASONS: [string, string][] = [
  ['answer', '答案不对'],
  ['sound', '读音不对'],
  ['meaning', '意思不对'],
  ['other', '别的'],
];
const THANKS_MS = 1200;

/**
 * The small flag in a question's corner (beta, 2026-10-29): it sends what the card showed, the activity, a reason and an
 * optional note, so a wrong question reaches us without anyone writing it down. `card` reads the card's text when tapped.
 */
export function ReportFlag({ activity, card }: { activity: string; card: () => string }) {
  const [open, setOpen] = useState<{ text: string } | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => { setOpen(null); setSent(false); }, THANKS_MS);
    return () => clearTimeout(t);
  }, [sent]);
  const start = () => { setReason(null); setNote(''); setSent(false); setOpen({ text: card().replace(/\s+/g, ' ').trim() }); };
  const send = () => {
    if (!open || !reason) return;
    report('mistake', { activity, reason, note: note.trim(), card: open.text, screen: location.hash });
    setSent(true);
  };
  return (
    <>
      <button type="button" class="report-flag" aria-label="这题有问题" onClick={start}>
        <Flag size={18} strokeWidth={2.5} />
      </button>
      {open && createPortal(
        <div class="report-sheet__backdrop" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
          <div class="report-sheet" role="dialog" aria-modal="true" aria-label="这题有问题">
            {sent ? (
              <p class="report-sheet__thanks"><Label zh="谢谢！" /></p>
            ) : (
              <>
                <h2><Label zh="这题有问题？" /></h2>
                <div class="report-sheet__reasons">
                  {REASONS.map(([id, zh]) => (
                    <button key={id} type="button" class={`choice press${reason === id ? ' is-picked' : ''}`} aria-pressed={reason === id} onClick={() => setReason(id)}>
                      <Label zh={zh} />
                    </button>
                  ))}
                </div>
                <textarea class="report-sheet__note" rows={2} maxLength={300} placeholder="Note for the ZiJi team (optional, parent)" value={note} onInput={(e) => setNote(e.currentTarget.value)} />
                <div class="report-sheet__actions">
                  <button type="button" class="btn btn--ghost" onClick={() => setOpen(null)}><Label zh="取消" /></button>
                  <button type="button" class="btn btn--primary" disabled={!reason} onClick={send}><Label zh="发送" /></button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
