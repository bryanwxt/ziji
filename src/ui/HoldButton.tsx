import { useEffect, useRef, useState } from 'preact/hooks';
import { Label } from './Label';

export const HOLD_MS = 1200;

interface Props {
  label: string;
  onComplete: () => void;
  disabled?: boolean;
  holdMs?: number;
  /** let go before the hold finished: a tap, not a hold (the chest wiggles a hint) */
  onTooShort?: () => void;
}

/** Press and hold to confirm: the ring fills over holdMs; letting go early cancels. Fires once. */
export function HoldButton({ label, onComplete, disabled = false, holdMs = HOLD_MS, onTooShort }: Props) {
  const [phase, setPhase] = useState<'idle' | 'holding' | 'done'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const owner = useRef<number | undefined>(undefined); // the finger holding it: another finger lifting doesn't cancel
  const cancel = (early = false) => {
    const wasHolding = !!timer.current;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!fired.current) setPhase('idle');
    if (early && wasHolding && !fired.current) onTooShort?.();
  };
  const release = (e: PointerEvent) => {
    if (timer.current && e.pointerId !== owner.current) return;
    cancel(true);
  };
  const start = (pointerId?: number) => {
    if (disabled || fired.current || timer.current) return;
    owner.current = pointerId;
    setPhase('holding');
    timer.current = setTimeout(() => {
      timer.current = null;
      fired.current = true;
      setPhase('done');
      onComplete();
    }, holdMs);
  };
  useEffect(() => () => cancel(), []);
  const isKey = (k: string) => k === ' ' || k === 'Enter';
  return (
    <button
      type="button"
      class={`hold${phase === 'holding' ? ' is-holding' : ''}${phase === 'done' ? ' is-done' : ''}`}
      aria-label={label}
      disabled={disabled}
      style={`--hold-ms:${holdMs}ms`}
      onPointerDown={(e) => start(e.pointerId)}
      onPointerUp={release}
      onPointerCancel={() => cancel()}
      onPointerLeave={release}
      onBlur={() => cancel()}
      onKeyDown={(e) => {
        if (!isKey(e.key)) return;
        e.preventDefault();
        start();
      }}
      onKeyUp={(e) => {
        if (isKey(e.key)) cancel(true);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg class="hold__ring" viewBox="0 0 112 112" aria-hidden="true">
        <circle cx="56" cy="56" r="52" />
      </svg>
      <span class="hold__label">
        <Label zh="按住" />
        <b>HOLD</b>
      </span>
    </button>
  );
}
