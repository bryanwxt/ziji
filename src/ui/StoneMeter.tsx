import { celPath, LINE, mix, shadeOf } from './cel';
import { METER_FULL } from '../fun/meter';
import { reducedMotion } from './motion';
import { chestMark } from './RiverTrack';

/** The stones' centres and the chest's ground point in the meter's 120 × 32 box: ●┄○┄[chest]. */
const STONE_X = [14, 50];
const STONE_Y = 22;
const CHEST_X = 98;
const GROUND = 30;
/** A flat, rounded stepping stone round its centre, and its hard shadow on the lower right. */
const STONE = 'M-11 1 Q-11.5 -5.5 -3 -6.5 Q8 -7.5 11 -2 Q12.5 4.5 3 6 Q-10.5 7.5 -11 1 Z';
const STONE_SHADE = 'M11.4 0 Q12.5 4.5 3 6 Q-7 7.2 -10.2 3.5 Q0 5 11.4 0 Z';
/** An unreached stone: pale grey-beige, like the path's stones; a reached one: warm gold with a small white tick. */
const PALE = '#ece5d8';
const GOLD = '#ffc845';
const TICK = '<path d="M-4 -0.5 L-1 2.2 L4.2 -3" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
const stone = (reached: boolean) =>
  celPath(STONE, reached ? GOLD : PALE, STONE_SHADE, { w: 2, shade: shadeOf(reached ? GOLD : PALE, reached ? 0.35 : 0.22) }) + (reached ? TICK : '');
/** The dotted way between them. */
const WAY = mix(LINE, '#ffffff', 0.35);
const SAID = ['还没开始', '走到一半了', '到宝箱了'];

/** Home's reward meter (parent 2026-10-26: "something more subtle", stepping stones): two small stones and the chest, a line's
 *  height. A reached stone is gold with a tick; the chest sparkles once both are (still under reduced motion). A stone reached
 *  since `from` (halves, 0–2) pops in; none with reduced motion. Celebration keeps the river (RiverTrack). */
export function StoneMeter({ halves, from = halves }: { halves: number; from?: number }) {
  const still = reducedMotion();
  const to = Math.min(Math.max(halves, 0), METER_FULL);
  const full = to >= METER_FULL;
  return (
    <svg class={`stones${full ? ' stones--full' : ''}${still ? ' stones--still' : ''}`} viewBox="0 0 120 32" data-halves={to} role="img" aria-label={SAID[to]}>
      <path d={`M${STONE_X[0] + 14} ${STONE_Y} H${STONE_X[1] - 14} M${STONE_X[1] + 14} ${STONE_Y} H${CHEST_X - 16}`} fill="none" stroke={WAY} stroke-width="2.4" stroke-linecap="round" stroke-dasharray="0.1 5" class="stones__way" />
      {STONE_X.map((x, i) => {
        const reached = to >= i + 1;
        const fresh = reached && !still && from < i + 1;
        return (
          <g key={i} transform={`translate(${x} ${STONE_Y})`}>
            <g class={`stones__stone${reached ? ' is-reached' : ''}${fresh ? ' is-new' : ''}`} dangerouslySetInnerHTML={{ __html: stone(reached) }} />
          </g>
        );
      })}
      <g class="stones__chest" transform={`translate(${CHEST_X} ${GROUND}) scale(0.62)`} dangerouslySetInnerHTML={{ __html: chestMark(full) }} />
    </svg>
  );
}
