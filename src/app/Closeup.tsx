import { useEffect, useState } from 'preact/hooks';
import { visibleAccessory } from '../fun/costumes';
import type { KidState } from '../types';
import { Truffle } from '../ui/truffle/Truffle';

const RAYS = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2;
  const w = 0.07;
  const p = (r: number, t: number) => `${(200 + r * Math.cos(t)).toFixed(1)} ${(200 + r * Math.sin(t)).toFixed(1)}`;
  return `M200 200 L${p(400, a - w)} L${p(400, a + w)}Z`;
}).join(' ');

/** A short full-screen "咦！" close-up of Truffle's face on a soft green sunburst. Never blocks input. */
export function Closeup({ kid, ms = 900 }: { kid: KidState; ms?: number }) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShown(false), ms);
    return () => clearTimeout(t);
  }, []);
  if (!shown) return null;
  return (
    <div class="closeup" aria-hidden="true">
      <svg class="closeup__sun" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
        <rect width="400" height="400" fill="#fbf6ea" opacity="0.92" />
        <path d={RAYS} fill="#c9efc6" />
      </svg>
      <span class="closeup__face">{/* his face, close: the box crops him below the chin */}
      <Truffle
        mood="wow"
        size={360}
        label={null}
        accessory={visibleAccessory(kid)}
        outfit={kid.outfit}
        power={kid.activePower}
        powerTier={kid.activePower ? (kid.powerTiersSeen[kid.activePower] ?? 0) : 0}
      />
      </span>
    </div>
  );
}
