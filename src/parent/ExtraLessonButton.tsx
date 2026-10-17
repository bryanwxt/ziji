// A review lesson now, from the parent area (learning rules 2026-10-17): Home offers 再学一课 only 2 hours after the day's lesson,
// so a second lesson is spaced out; a parent who wants one sooner starts it here. Shown once today's lesson is done.
import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { primeSpeech } from '../audio/speech';
import { localDateKey } from '../lib/date';
import { getSession } from '../store/repo';

export function ExtraLessonButton() {
  const { db, go, now } = useApp();
  const [done, setDone] = useState(false);
  useEffect(() => {
    void getSession(db, localDateKey(now())).then((s) => setDone(!!s?.completed && !s.free)).catch(() => {});
  }, []);
  if (!done) return null;
  return (
    <div class="parent__extra" style={{ marginTop: 12 }}>
      <button type="button" class="btn btn--secondary" onClick={() => { primeSpeech(); go({ name: 'session', free: false, extra: true }); }}>Start a review lesson now</button>
      <p class="hint">Extra lessons are review only, with no new words. Home offers one 2 hours after the day's lesson.</p>
    </div>
  );
}
