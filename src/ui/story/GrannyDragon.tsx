// Granny Dragon 龙奶奶 (spec 2026-10-07 3b §6; docs/story/bible.md): a small, round, jade-green dragon with white whiskers, round
// glasses, a flowered apron and a kopi pot, in the story's painted style — soft edges, never black ink, lit from the upper left.
import { useId } from 'preact/hooks';
import { reducedMotion } from '../motion';
import { cleanId, SWATCH } from '../truffle/paint';

export type GrannyPose = 'smile' | 'listen' | 'surprised' | 'laugh' | 'point' | 'worried';
export const GRANNY_POSES: GrannyPose[] = ['smile', 'listen', 'surprised', 'laugh', 'point', 'worried'];

const EDGE = '#3f7f63';
const PUPIL = '#2f2a36';
const RIM = '#c8a061';
const MOUTH = '#8a3d4c';

interface Props { pose?: GrannyPose; size?: number; mirror?: boolean; talking?: boolean; label?: string | null }

function defs(id: string): string {
  const g = (n: string) => `${id}-gd-${n}`;
  return [
    `<radialGradient id="${g('scale')}" gradientUnits="userSpaceOnUse" cx="92" cy="64" r="210"><stop offset="0" stop-color="#a6e0c2"/><stop offset="0.5" stop-color="${SWATCH.jade}"/><stop offset="1" stop-color="#4b9573"/></radialGradient>`,
    `<radialGradient id="${g('belly')}" gradientUnits="userSpaceOnUse" cx="104" cy="170" r="80"><stop offset="0" stop-color="#eef8f0"/><stop offset="1" stop-color="#c3e3cd"/></radialGradient>`,
    `<linearGradient id="${g('apron')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf3e2"/><stop offset="1" stop-color="${SWATCH.cream}"/></linearGradient>`,
    `<linearGradient id="${g('pot')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf3e2"/><stop offset="1" stop-color="#e2d3b4"/></linearGradient>`,
  ].join('');
}

/** Her eyes behind her round glasses, for each pose. */
function Eyes({ pose }: { pose: GrannyPose }) {
  const at = [100, 140];
  const lookX = pose === 'listen' ? 3 : pose === 'point' ? 4 : 0;
  const lookY = pose === 'listen' || pose === 'point' ? -3 : 0;
  return (
    <g class="granny__eyes">
      {at.map((x) =>
        pose === 'smile' || pose === 'laugh' ? (
          <path key={x} d={`M${x - 8} 90 Q${x} 81 ${x + 8} 90`} fill="none" stroke={PUPIL} stroke-width={3.2} stroke-linecap="round" />
        ) : (
          <g key={x}>
            <circle cx={x} cy={88} r={pose === 'surprised' ? 9 : 7} fill="#fffdf7" />
            <circle cx={x + lookX} cy={88 + lookY} r={pose === 'surprised' ? 4.5 : 4} fill={PUPIL} />
            <circle cx={x + lookX - 1.5} cy={86 + lookY} r={1.4} fill="#fff" />
          </g>
        ),
      )}
      {/* round glasses: brass rims, a light glint on each lens */}
      {at.map((x) => <circle key={`g${x}`} cx={x} cy={88} r={15} fill="#ffffff" fill-opacity={0.18} stroke={RIM} stroke-width={3} />)}
      <path d="M115 87 Q120 84 125 87" fill="none" stroke={RIM} stroke-width={3} stroke-linecap="round" />
      {at.map((x) => <path key={`s${x}`} d={`M${x - 9} 80 Q${x - 5} 76 ${x - 1} 76`} fill="none" stroke="#fff" stroke-width={2.2} stroke-linecap="round" opacity={0.7} />)}
      {/* white brows: lifted when surprised, slanted up in the middle when worried */}
      {pose === 'worried' ? (
        <path d="M88 70 L108 64 M152 70 L132 64" stroke="#ffffff" stroke-width={4} stroke-linecap="round" />
      ) : (
        <path d={pose === 'surprised' ? 'M88 64 Q99 58 110 64 M130 64 Q141 58 152 64' : 'M88 68 Q99 64 110 68 M130 68 Q141 64 152 68'} fill="none" stroke="#ffffff" stroke-width={4} stroke-linecap="round" />
      )}
    </g>
  );
}

function mouthFor(pose: GrannyPose) {
  switch (pose) {
    case 'laugh': return <path d="M106 118 Q120 118 134 118 Q130 136 120 136 Q110 136 106 118Z" fill={MOUTH} stroke={EDGE} stroke-width={2} stroke-linejoin="round" />;
    case 'surprised': return <ellipse cx={120} cy={124} rx={5} ry={6} fill={MOUTH} stroke={EDGE} stroke-width={2} />;
    case 'worried': return <path d="M108 126 Q114 121 120 126 Q126 131 132 126" fill="none" stroke={EDGE} stroke-width={2.8} stroke-linecap="round" />;
    default: return <path d="M108 121 Q120 130 132 121" fill="none" stroke={EDGE} stroke-width={2.8} stroke-linecap="round" />;
  }
}

/** Granny Dragon, in one of her poses. talking opens and closes her mouth (never under reduced motion). */
export function GrannyDragon({ pose = 'smile', size = 200, mirror = false, talking = false, label = '龙奶奶' }: Props) {
  const id = cleanId(`granny-${useId()}`);
  const u = (n: string) => `url(#${id}-gd-${n})`;
  const talk = talking && !reducedMotion();
  const a11y = label === null ? { 'aria-hidden': 'true' as const } : { role: 'img' as const, 'aria-label': label };
  const tilt = pose === 'listen' ? -7 : pose === 'worried' ? 4 : 0;
  return (
    <svg
      class={`granny granny--${pose}${mirror ? ' granny--mirror' : ''}`}
      viewBox="0 0 240 260"
      width={size}
      height={Math.round((size * 260) / 240)}
      data-pose={pose}
      {...a11y}
    >
      <defs dangerouslySetInnerHTML={{ __html: defs(id) }} />
      <ellipse cx={120} cy={250} rx={74} ry={8} fill={SWATCH.shadow} opacity={0.25} />
      {/* her tail curls behind her on the right, soft spines along it */}
      <path d="M168 214 C206 222 228 200 220 176 C214 160 196 162 198 176 C200 188 210 186 208 178" fill="none" stroke={EDGE} stroke-width={20} stroke-linecap="round" />
      <path d="M168 214 C206 222 228 200 220 176 C214 160 196 162 198 176 C200 188 210 186 208 178" fill="none" stroke={u('scale')} stroke-width={16} stroke-linecap="round" />
      <path d="M214 192 l9 -2 l-4 8 Z M222 170 l8 -6 l0 9 Z" fill="#f4c66b" stroke={EDGE} stroke-width={1.4} stroke-linejoin="round" />
      {/* body, belly and feet */}
      <ellipse cx={120} cy={186} rx={62} ry={58} fill={u('scale')} stroke={EDGE} stroke-width={2.2} />
      <ellipse cx={92} cy={240} rx={16} ry={9} fill={u('scale')} stroke={EDGE} stroke-width={2} />
      <ellipse cx={148} cy={240} rx={16} ry={9} fill={u('scale')} stroke={EDGE} stroke-width={2} />
      <ellipse cx={118} cy={194} rx={40} ry={42} fill={u('belly')} />
      {/* her flowered apron */}
      <path d="M86 156 L152 156 L162 226 Q120 238 78 226 Z" fill={u('apron')} stroke="#cdbb98" stroke-width={2} stroke-linejoin="round" />
      <path d="M90 156 Q104 136 112 132 M148 156 Q136 136 128 132" fill="none" stroke="#cdbb98" stroke-width={3} stroke-linecap="round" />
      {[[100, 176, SWATCH.terracotta], [130, 172, SWATCH.sun], [116, 198, SWATCH.terracotta], [144, 206, SWATCH.sun], [92, 210, SWATCH.sun], [120, 222, SWATCH.terracotta]].map(([x, y, c]) => (
        <g key={`${x}-${y}`} fill={c as string}><circle cx={x as number} cy={(y as number) - 3} r={2.6} /><circle cx={(x as number) + 3} cy={y as number} r={2.6} /><circle cx={x as number} cy={(y as number) + 3} r={2.6} /><circle cx={(x as number) - 3} cy={y as number} r={2.6} /><circle cx={x as number} cy={y as number} r={1.6} fill="#fbf3e2" /></g>
      ))}
      {/* left hand holds her kopi pot */}
      <g class="granny__pot">
        <path d="M30 168 C30 152 66 152 66 168 L64 196 C62 204 34 204 32 196 Z" fill={u('pot')} stroke="#b7a37c" stroke-width={2} stroke-linejoin="round" />
        <path d="M30 172 C18 168 14 160 10 152" fill="none" stroke="#b7a37c" stroke-width={5} stroke-linecap="round" />
        <path d="M66 166 C76 166 78 186 66 188" fill="none" stroke="#b7a37c" stroke-width={3.5} />
        <ellipse cx={48} cy={156} rx={14} ry={4} fill="#e2d3b4" stroke="#b7a37c" stroke-width={1.6} />
        <path d="M48 140 q4 -6 0 -12 M40 144 q4 -6 0 -12" fill="none" stroke="#ffffff" stroke-width={2.4} stroke-linecap="round" opacity={0.75} />
        <ellipse cx={72} cy={178} rx={13} ry={17} fill={u('scale')} stroke={EDGE} stroke-width={2} transform="rotate(25 72 178)" />
      </g>
      {/* right arm: resting, or raised and pointing up and to the right */}
      {pose === 'point' ? (
        <g class="granny__arm">
          <path d="M170 168 C186 150 196 130 204 112" fill="none" stroke={EDGE} stroke-width={22} stroke-linecap="round" />
          <path d="M170 168 C186 150 196 130 204 112" fill="none" stroke={u('scale')} stroke-width={18} stroke-linecap="round" />
          <path d="M202 108 L214 92" stroke={EDGE} stroke-width={8} stroke-linecap="round" />
          <path d="M202 108 L214 92" stroke={u('scale')} stroke-width={5} stroke-linecap="round" />
        </g>
      ) : (
        <ellipse class="granny__arm" cx={170} cy={184} rx={13} ry={18} fill={u('scale')} stroke={EDGE} stroke-width={2} transform="rotate(-20 170 184)" />
      )}
      {/* head: horns, face, snout, glasses, whiskers */}
      <g class="granny__head" transform={`rotate(${tilt} 120 120)`}>
        <path d="M92 58 C86 40 92 28 98 24 C102 36 104 46 104 54 Z M148 58 C154 40 148 28 142 24 C138 36 136 46 136 54 Z" fill="#f2d48c" stroke="#b08a4a" stroke-width={2} stroke-linejoin="round" />
        <ellipse cx={120} cy={92} rx={54} ry={46} fill={u('scale')} stroke={EDGE} stroke-width={2.2} />
        <path d="M84 62 C96 48 116 44 132 46" fill="none" stroke="#ffffff" stroke-width={5} stroke-linecap="round" opacity={0.3} />
        <path d="M120 46 l-6 -10 l6 4 l6 -4 Z" fill="#f4c66b" stroke={EDGE} stroke-width={1.4} stroke-linejoin="round" />
        <ellipse cx={120} cy={116} rx={30} ry={20} fill="#9ad3b4" stroke={EDGE} stroke-width={2} />
        <circle cx={111} cy={108} r={2.6} fill={EDGE} />
        <circle cx={129} cy={108} r={2.6} fill={EDGE} />
        <ellipse cx={86} cy={108} rx={9} ry={5} fill="#ff9d8a" opacity={0.4} />
        <ellipse cx={154} cy={108} rx={9} ry={5} fill="#ff9d8a" opacity={0.4} />
        <Eyes pose={pose} />
        {/* long white whiskers drooping from her snout */}
        <path d="M92 116 C72 118 60 132 58 152 M148 116 C168 118 180 132 182 152" fill="none" stroke="#ffffff" stroke-width={4} stroke-linecap="round" />
        {talk ? (
          <g class="granny__mouth granny__mouth--talking">
            <path class="granny__mouth-shut" d="M108 121 Q120 130 132 121" fill="none" stroke={EDGE} stroke-width={2.8} stroke-linecap="round" />
            <path class="granny__mouth-open" d="M108 119 Q120 119 132 119 Q128 133 120 133 Q112 133 108 119Z" fill={MOUTH} stroke={EDGE} stroke-width={2} stroke-linejoin="round" />
          </g>
        ) : (
          <g class="granny__mouth">{mouthFor(pose)}</g>
        )}
      </g>
    </svg>
  );
}
