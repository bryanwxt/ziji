import { useEffect, useState } from 'preact/hooks';
import { celPath, LINE, line, mix, shadeOf, sparkle } from './cel';
import { METER_FULL } from '../fun/meter';
import { reducedMotion } from './motion';
import { BOAT, RIPPLE } from './worlds/creatures/boat';

/** How long the boat takes from its old spot to its new one. */
export const SAIL_MS = 900;
/** The boat's x at an empty and at a full meter, in the track's 320 × 84 box (the chest stands on its sand bank just past the end). */
const START = 40;
const END = 250;
const SPAN = END - START;
/** The waterline the boat floats on, and the water's bottom bank. */
const WATER_Y = 40;
const BOTTOM = 78;
/** The water's colours (parent 2026-10-25: a river with body, in the app's cel): light water, a deeper lower band, the sailed current. */
const WATER = '#a9ddf8';
const DEEP = mix(WATER, '#5a86c8', 0.28);
const SAILED = '#5fb4ea';
/** The river: a gently wavy top, round ends. */
const RIVER =
  `M8 ${WATER_Y + 1} C40 ${WATER_Y - 3} 72 ${WATER_Y + 4} 104 ${WATER_Y + 1} C136 ${WATER_Y - 3} 168 ${WATER_Y + 4} 200 ${WATER_Y + 1} ` +
  `C232 ${WATER_Y - 3} 264 ${WATER_Y + 4} 296 ${WATER_Y + 1} L306 ${WATER_Y + 1} Q316 ${WATER_Y + 1} 316 ${WATER_Y + 10} L316 ${BOTTOM - 12} ` +
  `Q316 ${BOTTOM} 300 ${BOTTOM} C220 ${BOTTOM + 2} 100 ${BOTTOM - 2} 20 ${BOTTOM} Q4 ${BOTTOM} 4 ${BOTTOM - 12} L4 ${WATER_Y + 10} Q4 ${WATER_Y + 1} 14 ${WATER_Y + 1} Z`;
/** Its deeper lower band, inside the outline. */
const DEEP_BAND =
  `M4 ${BOTTOM - 14} C60 ${BOTTOM - 17} 110 ${BOTTOM - 11} 160 ${BOTTOM - 14} C210 ${BOTTOM - 17} 260 ${BOTTOM - 11} 316 ${BOTTOM - 14} ` +
  `L316 ${BOTTOM - 12} Q316 ${BOTTOM} 300 ${BOTTOM} C220 ${BOTTOM + 2} 100 ${BOTTOM - 2} 20 ${BOTTOM} Q4 ${BOTTOM} 4 ${BOTTOM - 12} Z`;
/** The light along the top of the water. */
const SHINE = `M14 ${WATER_Y + 6} C44 ${WATER_Y + 2} 74 ${WATER_Y + 9} 104 ${WATER_Y + 6} C136 ${WATER_Y + 2} 168 ${WATER_Y + 9} 200 ${WATER_Y + 6} C232 ${WATER_Y + 2} 262 ${WATER_Y + 9} 290 ${WATER_Y + 6}`;
/** The sand bank at the river's end the chest stands on. */
const BANK_X = 297;
const BANK = `M272 ${WATER_Y + 12} Q274 ${WATER_Y - 3} 290 ${WATER_Y - 5} L304 ${WATER_Y - 5} Q318 ${WATER_Y - 4} 318 ${WATER_Y + 8} Q318 ${WATER_Y + 14} 300 ${WATER_Y + 14} L282 ${WATER_Y + 14} Q272 ${WATER_Y + 14} 272 ${WATER_Y + 12} Z`;
const BANK_SHADE = `M318 ${WATER_Y + 4} Q318 ${WATER_Y + 14} 300 ${WATER_Y + 14} L282 ${WATER_Y + 14} Q274 ${WATER_Y + 14} 273 ${WATER_Y + 9} Q296 ${WATER_Y + 10} 318 ${WATER_Y + 4} Z`;
const SAND = '#f3d9a1';
/** The chest in cel (outline, lid, gold band and lock), drawn round its ground point; `glint`: sparkles round it, the lid still
 *  shut (Celebration's chest is the one that opens). */
const WOOD = '#c77b30';
const LID = '#d98a3d';
const GOLD = '#f6c343';
export const chestMark = (glint: boolean) => {
  const w = 2.4;
  return (
    celPath('M-18 -20 H18 V-3 Q18 0 15 0 H-15 Q-18 0 -18 -3 Z', WOOD, 'M6 -20 H18 V-3 Q18 0 15 0 H-4 Q4 -9 6 -20 Z', { w }) +
    `<rect x="-3.5" y="-20" width="7" height="20" fill="${GOLD}" ${line(1.6)}/>` +
    `<g>` +
    celPath('M-19 -20 V-27 Q-19 -36 0 -36 Q19 -36 19 -27 V-20 Z', LID, 'M8 -35 Q19 -34 19 -27 V-20 H10 Q13 -28 8 -35 Z', { w }) +
    `<rect x="-3.5" y="-35.6" width="7" height="15.6" fill="${GOLD}" ${line(1.6)}/>` +
    `<path d="M-13 -29 Q-8 -33 -2 -33.5" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>` +
    `</g>` +
    `<rect x="-5" y="-23" width="10" height="9" rx="2.5" fill="${GOLD}" ${line(1.8)}/><circle cx="0" cy="-18.5" r="1.4" fill="${LINE}"/>` +
    (glint ? `<g class="river__glint">${sparkle(19, -42, 8, '#ffd23f', 1.8)}${sparkle(-24, -30, 5, '#ffd23f', 1.6)}${sparkle(6, -50, 4, '#fff3b0', 1.4)}</g>` : '')
  );
};
/** The halfway flag stone on the near bank: a round stone and a little pennant. */
const HALF_X = START + SPAN / 2;
const FLAG =
  `<path d="M0 0 V-15" stroke="${LINE}" stroke-width="2" stroke-linecap="round"/>` +
  celPath('M1 -15 L11 -12 L1 -8.5 Z', '#ff8a6b', '', { w: 1.6 }) +
  celPath('M-8 2 Q-8 -4 0 -4 Q8 -4 8 2 Q8 5 0 5 Q-8 5 -8 2 Z', '#d9d3e4', 'M8 1 Q8 5 0 5 Q-5 5 -7 3 Q0 3 8 1 Z', { w: 2, shade: shadeOf('#d9d3e4', 0.3) });
/** The boat's size on the track: larger on Home's small one, so it reads as the One River boat at a card's size. */
const BOAT_SIZE = { full: 0.7, mini: 0.8 };
const SAID = ['小船在起点', '小船走到一半了', '小船到宝箱了'];

/** The river meter (rewards spec §3; redrawn 2026-10-25 in the app's cel): a short river with body, the One River paper boat
 *  on it, the water it has sailed a deeper blue, a flag stone at halfway and the chest on a sand bank at its end (glinting once
 *  the meter is full). The boat sails from `from` to `to` (halves, 0–2) and calls onArrive when it gets there (at once with
 *  reduced motion). */
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
  }, [from, to]); // a new meter sails again (Home after a lesson)
  const share = (h: number) => Math.min(Math.max(h, 0), METER_FULL) / METER_FULL;
  const move = still ? 'none' : `transform ${SAIL_MS}ms ease-in-out`;
  const full = to >= METER_FULL;
  return (
    <svg class={`river${mini ? ' river--mini' : ''}${full ? ' river--full' : ''}${still ? ' river--still' : ''}`} viewBox="0 0 320 84" data-halves={to} role="img" aria-label={SAID[Math.min(Math.max(to, 0), METER_FULL)]}>
      <path d={RIVER} fill={WATER} />
      <path d={DEEP_BAND} fill={DEEP} />
      <path d={SHINE} fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-dasharray="34 9 7 9" opacity=".85" />
      {/* the way still to go, then the water already sailed, growing with the boat */}
      <path d={`M${START} ${WATER_Y + 16} L${END} ${WATER_Y + 16}`} stroke="#ffffff" stroke-width="2.6" stroke-dasharray="2 8" stroke-linecap="round" opacity=".9" />
      <rect class="river__sailed" x={START - 22} y={WATER_Y + 11} width={SPAN + 22} height={10} rx={5} fill={SAILED}
        style={{ transform: `scaleX(${share(at) ? (22 + SPAN * share(at)) / (SPAN + 22) : 0})`, transformOrigin: `${START - 22}px 0`, transition: move }} />
      <path d={RIVER} fill="none" stroke={LINE} stroke-width="3" stroke-linejoin="round" />
      <g transform={`translate(${HALF_X} ${BOTTOM - 1})`} dangerouslySetInnerHTML={{ __html: FLAG }} />
      <path d={BANK} fill={SAND} />
      <path d={BANK_SHADE} fill={shadeOf(SAND, 0.3)} />
      <path d={BANK} fill="none" stroke={LINE} stroke-width="2.4" stroke-linejoin="round" />
      <g class="river__boat" style={{ transform: `translateX(${SPAN * share(at)}px)`, transition: move }}>
        <g transform={`translate(${START} ${WATER_Y}) scale(${mini ? BOAT_SIZE.mini : BOAT_SIZE.full})`} dangerouslySetInnerHTML={{ __html: RIPPLE + BOAT }} />
      </g>
      <g class="river__chest" transform={`translate(${BANK_X} ${WATER_Y - 3}) scale(0.9)`} dangerouslySetInnerHTML={{ __html: chestMark(full) }} />
    </svg>
  );
}
