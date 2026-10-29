import { useState } from 'preact/hooks';
import { queuedReports, report, reportsOn, reportTarget, setReportsOn } from '../report/outbox';

/**
 * Settings → Help & feedback (beta, 2026-10-29): the getting-started guide a new family needs without us beside them,
 * what stays on the iPad and what is sent, the switch for sending, and a box for a note to us.
 */
export function HelpPanel() {
  const [on, setOn] = useState(reportsOn());
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const [waiting, setWaiting] = useState(queuedReports().length);
  const connected = reportTarget() !== null;
  const toggle = (v: boolean) => { setReportsOn(v); setOn(v); setWaiting(queuedReports().length); };
  const send = () => {
    const text = note.trim();
    if (!text) return;
    report('note', { text });
    setNote('');
    setSent(true);
    setWaiting(queuedReports().length);
  };
  return (
    <section class="panel help">
      <h2>Help &amp; feedback</h2>
      <details class="field" open>
        <summary>Getting started</summary>
        <ol class="help__steps">
          <li><b>Add it to the Home Screen.</b> In Safari tap Share → Add to Home Screen, and always open 字己 from there. A website left unused for 7 days can lose its data; the Home Screen app keeps it.</li>
          <li><b>One child per iPad.</b> Progress belongs to the device; a brother or sister on the same iPad would mix into it.</li>
          <li><b>One lesson a day, about 15 minutes.</b> Truffle leads the way: new words, practice, writing, then reading aloud. Little and often beats a long weekend session.</li>
          <li><b>This week's spelling list.</b> Content → This week: copy the school sheet's text with Live Text (long-press a photo of it → Select All → Copy) and paste it in, with the test day. The lessons fit every word in before then.</li>
          <li><b>Listen to the recordings.</b> Today → Listen &amp; confirm: a tick for each word read right moves it on.</li>
          <li><b>Back up now and then.</b> Settings → Backup saves everything to one file; keep it in iCloud Drive.</li>
          <li><b>Something wrong with a question?</b> Tap the small flag in the card's corner and pick what's wrong. It sends us that question.</li>
        </ol>
      </details>
      <details class="field">
        <summary>Privacy: what stays here and what is sent</summary>
        <p>Your child's progress, word lists, recordings, pictures, name and school stay on this iPad. There is no account, and nothing about who your child is ever leaves it.</p>
        <p>
          To help fix 字己 during the beta it sends, with sharing on: errors from the app, questions flagged with the corner flag,
          one line per finished lesson (minutes, stars, how many new words) and notes you write below. Each carries a random
          number made on this iPad, the app version and the device type (iPad, iPhone), nothing else. Recordings never leave the iPad.
        </p>
        <label>
          <input type="checkbox" checked={on} onChange={(e) => toggle(e.currentTarget.checked)} /> Send anonymous reports to help fix 字己
        </label>
        <p class="hint">
          {!on ? 'Sharing is off: nothing is sent or kept to send.' : connected ? `${waiting === 0 ? 'Nothing' : waiting} waiting to send.` : `Not connected yet: ${waiting} kept on this iPad until it is.`}
        </p>
      </details>
      <div class="field">
        <label for="help-note">A note to the 字己 team (a bug, an idea, a word that's wrong)</label>
        <textarea id="help-note" rows={3} maxLength={500} value={note} disabled={!on} onInput={(e) => { setNote(e.currentTarget.value); setSent(false); }} />
        <div class="row" style={{ justifyContent: 'flex-start' }}>
          <button type="button" class="btn" disabled={!on || !note.trim()} onClick={send}>Send note</button>
          {sent && <span class="hint" role="status">Thanks, it's on its way.</span>}
        </div>
      </div>
    </section>
  );
}
