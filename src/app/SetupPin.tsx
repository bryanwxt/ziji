import { useState } from 'preact/hooks';
import { hashPin } from '../lib/hash';
import { updateSettings } from '../store/repo';
import { PinPad } from '../ui/PinPad';
import { useApp } from './AppContext';

export function SetupPin({ onDone }: { onDone?: () => void }) {
  const { db, go, refresh } = useApp();
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const complete = async (pin: string) => {
    if (first === null) {
      setFirst(pin);
      setError(null);
      return;
    }
    if (pin !== first) {
      setFirst(null);
      setError('The PINs did not match. Please start again.');
      return;
    }
    await updateSettings(db, { pinHash: await hashPin(pin) });
    await refresh();
    if (onDone) onDone();
    else go({ name: 'petSetup' });
  };

  return (
    <div class="screen screen--scroll parent">
      <div class="center">
        <h1>{first === null ? 'For parents: choose a 4-digit PIN' : 'Enter the same PIN again'}</h1>
        <p>The PIN keeps the parent area (progress, word lists, recordings) separate from your child's practice.</p>
        <PinPad key={first === null ? 'first' : 'confirm'} onComplete={(p) => void complete(p)} error={error} />
      </div>
    </div>
  );
}
