import type { JSX } from 'preact';
import { useRef } from 'preact/hooks';
import { blush, LINE, LW, LWI } from '../cel';
import { reducedMotion } from '../motion';
import { useRig } from './useRig';
import type { PawPose } from './timelines';
import { POWERS, type PowerId } from '../../fun/powers';
import { accessoryLayer } from './accessories';
import { costumeLayer } from './costumes';
import { CEL, EAR_IN_L, EAR_IN_R, EAR_L, EAR_R, HEAD_SHAPE, PAW_L, PAW_R, TAIL, TORSO, type TruffleMood } from './parts';
import { powerLayer } from './powers';
import { browTransform, EXTRAS, EYE_L, EYE_LINE, EYE_R, EYE_RX, EYE_RY, EYE_Y, FUR, lowerLid, MOOD_EXPRESSION, MOUTH_W, mouthPath, mouthW, PRESETS, upperLid, type Expression, type Face } from './rig';
import type { Reaction } from './timelines';

export type { TruffleMood } from './parts';
export type { Expression } from './rig';

interface Props {
  mood?: TruffleMood;
  accessory?: string | null;
  size?: number;
  lookAt?: number; // -1 (left) … 1 (right): tilts the head
  /** a still paw pose (the faces sheet draws each paw move at its peak); the live rig moves the paws itself */
  paws?: PawPose;
  label?: string | null; // null → decorative
  bounce?: boolean;
  power?: string | null;
  powerTier?: number;
  outfit?: string | null;
  /** an expression from the rig; overrides the mood's preset */
  expression?: Expression;
  /** animate (breathing, blinking, reactions): only Truffles that are the character on screen, never previews */
  alive?: boolean;
  /** a question is up: he only breathes, blinks and looks at the card (spec 2026-10-04 §4.3) */
  calm?: boolean;
  react?: Reaction | null;
  onPart?: (part: 'head' | 'body' | 'tail', e: PointerEvent) => void;
}

const INK = EYE_LINE;
const PUPIL = '#241e30';
const IRIS = '#93c25c';
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * One anime eye (spec 2026-10-13 §7): a taller white, an iris with a dark upper band and a pale lower crescent, a dark pupil and
 * two catch-lights, the outline and a heavy upper lash, then the fur lids over it. No clip-paths: the iris never leaves the white
 * (it moves at most 6 across and 5 down, inside the room the ellipse leaves), and each lid is drawn only inside the eye.
 */
function Eye({ side, cx, f }: { side: 'l' | 'r'; cx: number; f: Face }) {
  const up = upperLid(cx, f.lidTop, f.lidArc);
  const low = lowerLid(cx, f.lidBottom);
  const iy = EYE_Y + 2;
  const band = 14.3; // the iris's half-width 7 above its centre
  return (
    <g data-part={`eye-${side}`}>
      <ellipse cx={cx} cy={EYE_Y} rx={EYE_RX} ry={EYE_RY} fill="#fffdf7" />
      <g data-part={`iris-${side}`}>
        <ellipse cx={cx} cy={iy} rx={15.5} ry={18.5} fill={IRIS} />
        <path d={`M${cx - band} ${iy - 7} A15.5 18.5 0 0 1 ${cx + band} ${iy - 7} Q${cx} ${iy - 13} ${cx - band} ${iy - 7}Z`} fill="#4f7d3c" />
        <path d={`M${cx - 12} ${iy + 11} Q${cx} ${iy + 22} ${cx + 12} ${iy + 11} Q${cx} ${iy + 16} ${cx - 12} ${iy + 11}Z`} fill="#d3ec97" />
        <ellipse cx={cx} cy={iy} rx={15.5} ry={18.5} fill="none" stroke="#3d5f2f" stroke-width={1.4} />
        <ellipse data-part={`pupil-${side}`} cx={cx} cy={121} rx={7 * f.pupil} ry={11 * f.pupil} fill={PUPIL} />
        <ellipse cx={cx + 6} cy={110} rx={5.6} ry={6.4} fill="#fff" />
        <circle cx={cx - 6} cy={130} r={2.6} fill="#fff" />
      </g>
      <path data-part={`lid-top-${side}`} d={up.fill} fill={CEL.fur} />
      <path data-part={`lid-bottom-${side}`} d={low.fill} fill={CEL.fur} />
      <ellipse data-part={`eye-ring-${side}`} cx={cx} cy={EYE_Y} rx={EYE_RX} ry={EYE_RY} fill="none" stroke={INK} stroke-width={LWI} opacity={String(1 - up.closedOn)} />
      <path data-part={`lash-${side}`} d={`M${cx - 22} ${EYE_Y - 2} C${cx - 20} ${EYE_Y - 22} ${cx + 20} ${EYE_Y - 22} ${cx + 22} ${EYE_Y - 2}`} fill="none" stroke={INK} stroke-width={LW * 1.25} stroke-linecap="round" opacity={String(1 - up.closedOn)} />
      <path data-part={`lid-edge-${side}`} d={up.edge} fill="none" stroke={INK} stroke-width={2.8} stroke-linecap="round" opacity={up.edgeOn ? 1 : 0} />
      <path data-part={`lid-bedge-${side}`} d={low.edge} fill="none" stroke={INK} stroke-width={2.2} stroke-linecap="round" opacity={low.edgeOn ? 1 : 0} />
      <path data-part={`lid-closed-${side}`} d={up.closed} fill="none" stroke={INK} stroke-width={3.6} stroke-linecap="round" opacity={String(up.closedOn)} />
    </g>
  );
}

/** The face rig drawn for one expression's values; the live loop (useRig) repaints the same parts. */
function FaceRig({ f, expr }: { f: Face; expr: Expression }) {
  const m = mouthPath(f.smile, f.mouthOpen);
  const w = mouthW(f.smile, f.mouthOpen);
  return (
    <>
      <g data-part="blush-l" opacity={f.blush * 0.6} dangerouslySetInnerHTML={{ __html: blush(96, 151, 16, 8, LWI * 0.8) }} />
      <g data-part="blush-r" opacity={f.blush * 0.6} dangerouslySetInnerHTML={{ __html: blush(224, 151, 16, 8, LWI * 0.8) }} />
      <Eye side="l" cx={EYE_L} f={f} />
      <Eye side="r" cx={EYE_R} f={f} />
      <path data-part="brow-l" d="M100 90 Q116 83 132 89" fill="none" stroke={INK} stroke-width={4} stroke-linecap="round" transform={browTransform('L', f)} opacity={f.browShow} />
      <path data-part="brow-r" d="M188 89 Q204 83 220 90" fill="none" stroke={INK} stroke-width={4} stroke-linecap="round" transform={browTransform('R', f)} opacity={f.browShow} />
      <path data-part="mouth" d={m.d} fill="#7d3348" fill-opacity={m.fillOpacity} stroke={LINE} stroke-width={LWI} stroke-linejoin="round" stroke-linecap="round" opacity={String(1 - w)} />
      <path data-part="mouth-w" d={MOUTH_W} fill="none" stroke={LINE} stroke-width={LWI} stroke-linejoin="round" stroke-linecap="round" opacity={String(w)} />
      {Object.entries(EXTRAS).map(([e, art]) => (
        <g key={e} data-part={`extra-${e}`} opacity={e === expr ? '1' : '0'} dangerouslySetInnerHTML={{ __html: art! }} />
      ))}
    </>
  );
}

/** Truffle 松露: his drawing cut into parts and posed by the face rig (spec 2026-10-04 §4.1). */
export function Truffle({ paws = undefined, mood = 'sulk', accessory = null, size = 160, lookAt = 0, label = '松露', bounce = false, power = null, powerTier = 0, outfit = null, expression, alive = false, calm = false, react = null, onPart }: Props) {
  const a11y = label === null ? { 'aria-hidden': 'true' as const } : { role: 'img' as const, 'aria-label': label };
  const expr = expression ?? MOOD_EXPRESSION[mood];
  const svgRef = useRef<SVGSVGElement>(null);
  // a live Truffle is drawn once in his first pose; from then on the loop springs every part (a re-render must not snap him)
  const first = useRef(expr);
  const drawnExpr = alive ? first.current : expr;
  const f = PRESETS[drawnExpr];
  useRig(svgRef, { alive, expr, reduced: reducedMotion(), react, calm, lookAt });
  const tilt = clamp(f.tilt + clamp(lookAt, -1, 1) * 4, -8, 8);
  const acc = accessoryLayer(accessory);
  const wear = costumeLayer(outfit);
  const tier = Math.max(0, Math.min(3, Math.floor(powerTier))) as 0 | 1 | 2 | 3;
  const layer = power && tier > 0 && isPower(power) ? powerLayer(power, tier as 1 | 2 | 3) : null;
  const ears = !wear?.hidesEars;
  const part = (p: 'head' | 'body' | 'tail') => (onPart ? { onPointerDown: (e: JSX.TargetedPointerEvent<SVGGElement>) => onPart(p, e as unknown as PointerEvent) } : {});
  return (
    <svg
      ref={svgRef}
      class={`truffle${bounce ? ' truffle--bounce' : ''}${onPart ? ' truffle--touchable' : ''}`}
      viewBox="30 20 260 270"
      width={size}
      height={Math.round((size * 270) / 260)}
      data-mood={mood}
      data-expression={expr}
      data-react={react?.kind}
      data-react-key={react?.key}
      data-calm={calm ? 'true' : undefined}
      data-alive={alive ? 'true' : undefined}
      data-power={layer ? power! : undefined}
      data-tier={String(layer ? tier : 0)}
      data-outfit={wear ? outfit! : undefined}
      data-accessory={acc ? accessory! : undefined}
      {...a11y}
    >
      {/* his ground shadow stays on the ground and shrinks as he goes up (spec §4.1) */}
      <ellipse data-part="shadow" cx="160" cy="279" rx="66" ry="7.5" fill="#5d5585" opacity="0.32" />
      <g class="truffle__rig" data-part="rig">
        {layer && <g class="truffle__power-back" dangerouslySetInnerHTML={{ __html: layer.back }} />}
        {wear?.back && <g class="truffle__outfit-back" dangerouslySetInnerHTML={{ __html: wear.back }} />}
        {acc?.back && <g class="truffle__accessory truffle__accessory--back" dangerouslySetInnerHTML={{ __html: acc.back }} />}
        <g class="truffle__tail" data-part="tail" style="transform-origin:214px 246px" {...part('tail')} dangerouslySetInnerHTML={{ __html: wear?.tail ?? TAIL }} />
        <g class="truffle__body" data-part="body" style="transform-origin:160px 276px" {...part('body')} dangerouslySetInnerHTML={{ __html: TORSO }} />
        {wear && <g class="truffle__outfit-body" dangerouslySetInnerHTML={{ __html: wear.body }} />}
        {acc?.under && <g class="truffle__accessory truffle__accessory--under" dangerouslySetInnerHTML={{ __html: acc.under }} />}
        <g class="truffle__headpos" data-part="headpos" {...part('head')}>
          <g transform={`rotate(${tilt} 160 190)`} data-part="headrot">
            <g class="truffle__head">
              {ears && <g data-part="ear-l" style={`transform-origin:100px 78px;transform:rotate(${-f.earL}deg)`} dangerouslySetInnerHTML={{ __html: EAR_L }} />}
              {ears && <g data-part="ear-r" style={`transform-origin:220px 78px;transform:rotate(${f.earR}deg)`} dangerouslySetInnerHTML={{ __html: EAR_R }} />}
              <g dangerouslySetInnerHTML={{ __html: HEAD_SHAPE }} />
              {ears && <g data-part="ear-in-l" style={`transform-origin:100px 78px;transform:rotate(${-f.earL}deg)`} dangerouslySetInnerHTML={{ __html: EAR_IN_L }} />}
              {ears && <g data-part="ear-in-r" style={`transform-origin:220px 78px;transform:rotate(${f.earR}deg)`} dangerouslySetInnerHTML={{ __html: EAR_IN_R }} />}
            </g>
            <g class={`truffle__face truffle__face--${mood}`}>
              <FaceRig f={f} expr={drawnExpr} />
            </g>
            {wear && <g class="truffle__outfit-head" dangerouslySetInnerHTML={{ __html: wear.head }} />}
            {acc?.face && <g class="truffle__accessory truffle__accessory--face" dangerouslySetInnerHTML={{ __html: acc.face }} />}
            {layer?.head && <g class="truffle__power-head" dangerouslySetInnerHTML={{ __html: layer.head }} />}
          </g>
        </g>
        {/* his front paws, in front of his head (spec 2026-10-04 §4.6): at rest at his feet; they wave, knead and cover his eyes */}
        <g class="truffle__paw" data-part="paw-l" transform={paws ? `translate(${paws.lx} ${paws.ly}) rotate(${paws.lr} 138 266)` : undefined} {...part('body')} dangerouslySetInnerHTML={{ __html: PAW_L }} />
        <g class="truffle__paw" data-part="paw-r" transform={paws ? `translate(${paws.rx} ${paws.ry}) rotate(${paws.rr} 182 266)` : undefined} {...part('body')}>
          <g dangerouslySetInnerHTML={{ __html: PAW_R }} />
          {/* a held item (brush, lantern, kite, balloon, wand) is in this paw: it moves with it, so a raised paw never leaves another behind */}
          {acc?.over && <g class="truffle__accessory truffle__accessory--over" dangerouslySetInnerHTML={{ __html: acc.over }} />}
        </g>
        {layer?.front && <g class="truffle__power-front" dangerouslySetInnerHTML={{ __html: layer.front }} />}
      </g>
    </svg>
  );
}

const isPower = (id: string): id is PowerId => POWERS.some((p) => p.id === id);
