import { useEffect, useState } from 'preact/hooks';
import { LINE } from './cel';
import { METER_FULL } from '../fun/meter';
import { reducedMotion } from './motion';
import { BOAT, RIPPLE } from './worlds/creatures/boat';

/** How long the boat takes from its old spot to its new one. */
export const SAIL_MS = 900;
/** The boat's x at an empty and at a full meter, in the track's 320 × 64 box (the chest stands just past the end). */
const START = 26;
const END = 270;
/** The chest at the river's end, small, in his light cel. */
const CHEST_MARK =
  `<rect x="-14" y="-18" width="28" height="18" rx="4" fill="#c77b30" stroke="${LINE}" stroke-width="2"/>` +
  `<path d="M-14 -18 V-24 Q-14 -32 0 -32 Q14 -32 14 -24 V-18 Z" fill="#d98a3d" stroke="${LINE}" stroke-width="2" stroke-linejoin="round"/>` +
  `<rect x="-3" y="-32" width="6" height="32" fill="#f6c343"/>`;
const SAID = ['小船在起点', '小船走到一半了', '小船到宝箱了'];

/** The river meter (rewards spec §3): a short river, the One River paper boat on it, the chest at its end. The boat sails from
 *  `from` to `to` (halves, 0–2) and calls onArrive when it gets there (at once with reduced motion). */
export function RiverTrack({ from, to, mini = false, onArrive }: { from: number; to: number; mini?: boolean; onArrive?: () => void }) {
  const still = reducedMotion();
  const [at, setAt] = useState(still ? to : from);
  useEffect(() => {
    if (still || from === to) {
      setAt(to);
      onArrive?.();
      return;
    }
    const raf = requestAnimationFrame(() => setAt(to)); // after the first paint, so the move is a transition
    const t = setTimeout(() => onArrive?.(), SAIL_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, []);
  const x = (h: number) => ((END - START) * Math.min(Math.max(h, 0), METER_FULL)) / METER_FULL;
  return (
    <svg class={`river${mini ? ' river--mini' : ''}`} viewBox="0 0 320 64" data-halves={to} role="img" aria-label={SAID[Math.min(Math.max(to, 0), METER_FULL)]}>
      <path d="M8 46 C60 38 110 54 160 46 C210 38 260 54 312 46 L312 60 L8 60 Z" fill="#bfe6ff" stroke={LINE} stroke-width="2" stroke-linejoin="round" />
      <path d={`M${START} 52 L${END} 52`} stroke="#ffffff" stroke-width="2.4" stroke-dasharray="2 8" stroke-linecap="round" />
      <g transform={`translate(${END + 26} 50)`} dangerouslySetInnerHTML={{ __html: CHEST_MARK }} />
      <g class="river__boat" style={{ transform: `translateX(${x(at)}px)`, transition: still ? 'none' : `transform ${SAIL_MS}ms ease-in-out` }}>
        <g transform={`translate(${START} 50) scale(0.42)`} dangerouslySetInnerHTML={{ __html: RIPPLE + BOAT }} />
      </g>
    </svg>
  );
}
