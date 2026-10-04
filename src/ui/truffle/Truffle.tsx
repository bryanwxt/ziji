import type { JSX } from 'preact';
import { useId, useRef } from 'preact/hooks';
import { reducedMotion } from '../motion';
import { useRig } from './useRig';
import { POWERS, type PowerId } from '../../fun/powers';
import { accessoryLayer } from './accessories';
import { costumeLayer } from './costumes';
import { BODY, EAR_IN_L, EAR_IN_R, EAR_L, EAR_R, HEAD_SHAPE, TAIL, type TruffleMood } from './parts';
import { powerLayer } from './powers';
import { browTransform, EXTRAS, EYE_L, EYE_R, EYE_Y, FUR, lowerLid, MOOD_EXPRESSION, mouthPath, PRESETS, upperLid, type Expression, type Face } from './rig';
import type { Reaction } from './timelines';

export type { TruffleMood } from './parts';
export type { Expression } from './rig';

interface Props {
  mood?: TruffleMood;
  accessory?: string | null;
  size?: number;
  lookAt?: number; // -1 (left) … 1 (right): tilts the head
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

const INK = '#2a2630';
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** One eye: white, iris and pupil (clipped to the eye), outline, then the lids over it (spec 2026-10-04 §4.1). */
function Eye({ side, cx, f, id }: { side: 'l' | 'r'; cx: number; f: Face; id: string }) {
  const up = upperLid(cx, f.lidTop, f.lidArc);
  const low = lowerLid(cx, f.lidBottom);
  return (
    <g data-part={`eye-${side}`}>
      <clipPath id={`${id}-in-${side}`}><circle cx={cx} cy={EYE_Y} r={21} /></clipPath>
      <clipPath id={`${id}-lid-${side}`}><circle cx={cx} cy={EYE_Y} r={23.8} /></clipPath>
      <circle cx={cx} cy={EYE_Y} r={22} fill="#fffdf7" />
      <g clip-path={`url(#${id}-in-${side})`}>
        <g data-part={`iris-${side}`}>
          <circle cx={cx} cy={120} r={17} fill="#a9c96a" />
          <ellipse data-part={`pupil-${side}`} cx={cx} cy={121} rx={7 * f.pupil} ry={11 * f.pupil} fill={INK} />
          <circle cx={cx + 6} cy={113} r={4} fill="#fff" />
        </g>
      </g>
      <circle cx={cx} cy={EYE_Y} r={22} fill="none" stroke={INK} stroke-width={2.6} />
      <g clip-path={`url(#${id}-lid-${side})`}>
        <path data-part={`lid-top-${side}`} d={up.fill} fill={FUR} />
        <path data-part={`lid-bottom-${side}`} d={low.fill} fill={FUR} />
      </g>
      <g clip-path={`url(#${id}-in-${side})`}>
        <path data-part={`lid-edge-${side}`} d={up.edge} fill="none" stroke={INK} stroke-width={2.8} stroke-linecap="round" opacity={up.edgeOn ? 1 : 0} />
        <path data-part={`lid-bedge-${side}`} d={low.edge} fill="none" stroke={INK} stroke-width={2.4} stroke-linecap="round" opacity={low.edgeOn ? 1 : 0} />
      </g>
      <path data-part={`lid-closed-${side}`} d={up.closed} fill="none" stroke={INK} stroke-width={3.6} stroke-linecap="round" opacity={String(up.closedOn)} />
    </g>
  );
}

/** The face rig drawn for one expression's values; the live loop (useRig) repaints the same parts. */
function FaceRig({ f, expr, id }: { f: Face; expr: Expression; id: string }) {
  const m = mouthPath(f.smile, f.mouthOpen);
  return (
    <>
      <ellipse data-part="blush-l" cx={96} cy={150} rx={18} ry={10} fill="#ff9d8a" opacity={f.blush * 0.6} />
      <ellipse data-part="blush-r" cx={224} cy={150} rx={18} ry={10} fill="#ff9d8a" opacity={f.blush * 0.6} />
      <Eye side="l" cx={EYE_L} f={f} id={id} />
      <Eye side="r" cx={EYE_R} f={f} id={id} />
      <path data-part="brow-l" d="M100 90 Q116 83 132 89" fill="none" stroke={INK} stroke-width={4} stroke-linecap="round" transform={browTransform('L', f)} opacity={f.browShow} />
      <path data-part="brow-r" d="M188 89 Q204 83 220 90" fill="none" stroke={INK} stroke-width={4} stroke-linecap="round" transform={browTransform('R', f)} opacity={f.browShow} />
      <path data-part="mouth" d={m.d} fill="#8a3d4c" fill-opacity={m.fillOpacity} stroke={INK} stroke-width={2.6} stroke-linejoin="round" stroke-linecap="round" />
      {Object.entries(EXTRAS).map(([e, art]) => (
        <g key={e} data-part={`extra-${e}`} opacity={e === expr ? '1' : '0'} dangerouslySetInnerHTML={{ __html: art! }} />
      ))}
    </>
  );
}

/** Truffle 松露: his drawing cut into parts and posed by the face rig (spec 2026-10-04 §4.1). */
export function Truffle({ mood = 'sulk', accessory = null, size = 160, lookAt = 0, label = '松露', bounce = false, power = null, powerTier = 0, outfit = null, expression, alive = false, calm = false, onPart }: Props) {
  const id = `truffle-${useId()}`;
  const a11y = label === null ? { 'aria-hidden': 'true' as const } : { role: 'img' as const, 'aria-label': label };
  const expr = expression ?? MOOD_EXPRESSION[mood];
  const svgRef = useRef<SVGSVGElement>(null);
  // a live Truffle is drawn once in his first pose; from then on the loop springs every part (a re-render must not snap him)
  const first = useRef(expr);
  const drawnExpr = alive ? first.current : expr;
  const f = PRESETS[drawnExpr];
  useRig(svgRef, { alive, target: PRESETS[expr], expr, reduced: reducedMotion() });
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
      data-calm={calm ? 'true' : undefined}
      data-alive={alive ? 'true' : undefined}
      data-power={layer ? power! : undefined}
      data-tier={String(layer ? tier : 0)}
      data-outfit={wear ? outfit! : undefined}
      data-accessory={acc ? accessory! : undefined}
      {...a11y}
    >
      <g class="truffle__rig" data-part="rig">
        {layer && <g class="truffle__power-back" dangerouslySetInnerHTML={{ __html: layer.back }} />}
        {wear?.back && <g class="truffle__outfit-back" dangerouslySetInnerHTML={{ __html: wear.back }} />}
        {acc?.back && <g class="truffle__accessory truffle__accessory--back" dangerouslySetInnerHTML={{ __html: acc.back }} />}
        <g class="truffle__tail" data-part="tail" style="transform-origin:214px 246px" {...part('tail')} dangerouslySetInnerHTML={{ __html: TAIL }} />
        <g class="truffle__body" data-part="body" style="transform-origin:160px 276px" {...part('body')} dangerouslySetInnerHTML={{ __html: BODY }} />
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
              <FaceRig f={f} expr={drawnExpr} id={id} />
            </g>
            {wear && <g class="truffle__outfit-head" dangerouslySetInnerHTML={{ __html: wear.head }} />}
            {acc?.face && <g class="truffle__accessory truffle__accessory--face" dangerouslySetInnerHTML={{ __html: acc.face }} />}
            {layer?.head && <g class="truffle__power-head" dangerouslySetInnerHTML={{ __html: layer.head }} />}
          </g>
        </g>
        {layer?.front && <g class="truffle__power-front" dangerouslySetInnerHTML={{ __html: layer.front }} />}
        {acc?.over && <g class="truffle__accessory truffle__accessory--over" dangerouslySetInnerHTML={{ __html: acc.over }} />}
      </g>
    </svg>
  );
}

const isPower = (id: string): id is PowerId => POWERS.some((p) => p.id === id);
