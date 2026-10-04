import type { ComponentChildren } from 'preact';
import { ChevronLeft } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { SetupPin } from '../app/SetupPin';
import { hashPin } from '../lib/hash';
import { PinPad } from '../ui/PinPad';

export function PinGate({ children }: { children: ComponentChildren }) {
  const { settings, go } = useApp();
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);

  if (unlocked) return <>{children}</>;
  if (forgot) return <ForgotPin onReset={() => { setForgot(false); setUnlocked(true); }} onCancel={() => setForgot(false)} />;

  const check = async (pin: string) => {
    if ((await hashPin(pin)) === settings.pinHash) setUnlocked(true);
    else setError('That PIN is not right. Try again.');
  };

  return (
    <div class="screen screen--scroll parent">
      <header class="topbar">
        <button type="button" class="btn btn--ghost" onClick={() => go({ name: 'home' })}><ChevronLeft size={22} strokeWidth={3} /> Back</button>
      </header>
      <div class="center">
        <h1>Parents only</h1>
        <p>Enter your 4-digit PIN.</p>
        <PinPad onComplete={(p) => void check(p)} error={error} />
        <button type="button" class="link" onClick={() => setForgot(true)}>Forgot PIN?</button>
      </div>
    </div>
  );
}

function ForgotPin({ onReset, onCancel }: { onReset: () => void; onCancel: () => void }) {
  const [q] = useState(() => ({ a: 12 + Math.floor(Math.random() * 87), b: 3 + Math.floor(Math.random() * 7) }));
  const [answer, setAnswer] = useState('');
  const [ok, setOk] = useState(false);
  const [wrong, setWrong] = useState(false);

  if (ok) return <SetupPin onDone={onReset} />;
  return (
    <div class="screen screen--scroll parent">
      <div class="center">
        <h1>Reset PIN</h1>
        <p>To check you're a grown-up: what is {q.a} × {q.b}?</p>
        <div class="field" style={{ width: '200px' }}>
          <input inputMode="numeric" aria-label="Answer" value={answer} onInput={(e) => setAnswer(e.currentTarget.value)} />
        </div>
        <button type="button" class="btn btn--primary" onClick={() => (Number(answer) === q.a * q.b ? setOk(true) : setWrong(true))}>Check</button>
        {wrong && <p class="warning">Not quite — try again.</p>}
        <button type="button" class="link" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
