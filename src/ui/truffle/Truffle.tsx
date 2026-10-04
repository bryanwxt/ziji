import { useId } from 'preact/hooks';
import { POWERS, type PowerId } from '../../fun/powers';
import { accessoryLayer } from './accessories';
import { BODY, FACES, HEAD, HEAD_EARLESS, type TruffleMood } from './parts';
import { costumeLayer } from './costumes';
import { powerLayer } from './powers';

export type { TruffleMood } from './parts';

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
}

/** Truffle 松露, drawn in layers; the face layer is swapped per mood. */
export function Truffle({ mood = 'sulk', accessory = null, size = 160, lookAt = 0, label = '松露', bounce = false, power = null, powerTier = 0, outfit = null }: Props) {
  const grain = `truffle-grain-${useId()}`;
  const a11y = label === null ? { 'aria-hidden': 'true' as const } : { role: 'img' as const, 'aria-label': label };
  const tilt = Math.max(-1, Math.min(1, lookAt)) * 4;
  const acc = accessoryLayer(accessory);
  const wear = costumeLayer(outfit);
  const tier = Math.max(0, Math.min(3, Math.floor(powerTier))) as 0 | 1 | 2 | 3;
  const layer = power && tier > 0 && isPower(power) ? powerLayer(power, tier as 1 | 2 | 3) : null;
  return (
    <svg
      class={`truffle${bounce ? ' truffle--bounce' : ''}`}
      viewBox="30 20 260 270"
      width={size}
      height={Math.round((size * 270) / 260)}
      data-mood={mood}
      data-power={layer ? power! : undefined}
      data-tier={String(layer ? tier : 0)}
      data-outfit={wear ? outfit! : undefined}
      data-accessory={acc ? accessory! : undefined}
      {...a11y}
    >
      <defs>
        <filter id={grain} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves={1} seed={2} result="n" />
          <feColorMatrix in="n" type="saturate" values="0" result="g" />
          <feComponentTransfer in="g" result="l">
            <feFuncR type="linear" slope={0.3} intercept={0.76} />
            <feFuncG type="linear" slope={0.3} intercept={0.76} />
            <feFuncB type="linear" slope={0.3} intercept={0.76} />
          </feComponentTransfer>
          <feComposite in="l" in2="SourceGraphic" operator="in" result="m" />
          <feBlend in="SourceGraphic" in2="m" mode="multiply" />
        </filter>
      </defs>
      <g filter={`url(#${grain})`}>
        {layer && <g class="truffle__power-back" dangerouslySetInnerHTML={{ __html: layer.back }} />}
        {wear?.back && <g class="truffle__outfit-back" dangerouslySetInnerHTML={{ __html: wear.back }} />}
        {acc?.back && <g class="truffle__accessory truffle__accessory--back" dangerouslySetInnerHTML={{ __html: acc.back }} />}
        <g class="truffle__body" dangerouslySetInnerHTML={{ __html: BODY }} />
        {wear && <g class="truffle__outfit-body" dangerouslySetInnerHTML={{ __html: wear.body }} />}
        {acc?.under && <g class="truffle__accessory truffle__accessory--under" dangerouslySetInnerHTML={{ __html: acc.under }} />}
        <g transform={`rotate(${tilt} 160 120)`}>
          <g class="truffle__head" dangerouslySetInnerHTML={{ __html: wear?.hidesEars ? HEAD_EARLESS : HEAD }} />
          <g class={`truffle__face truffle__face--${mood}`} dangerouslySetInnerHTML={{ __html: FACES[mood] }} />
          {wear && <g class="truffle__outfit-head" dangerouslySetInnerHTML={{ __html: wear.head }} />}
          {acc?.face && <g class="truffle__accessory truffle__accessory--face" dangerouslySetInnerHTML={{ __html: acc.face }} />}
          {layer?.head && <g class="truffle__power-head" dangerouslySetInnerHTML={{ __html: layer.head }} />}
        </g>
        {layer?.front && <g class="truffle__power-front" dangerouslySetInnerHTML={{ __html: layer.front }} />}
        {acc?.over && <g class="truffle__accessory truffle__accessory--over" dangerouslySetInnerHTML={{ __html: acc.over }} />}
      </g>
    </svg>
  );
}

const isPower = (id: string): id is PowerId => POWERS.some((p) => p.id === id);
