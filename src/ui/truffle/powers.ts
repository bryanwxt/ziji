import { powerDef, type PowerId } from '../../fun/powers';
import { iconMarkup, type IconName } from '../icons/icons';
import { celShade, S, s2 } from './costumeKit';

/** The cape's hard shadow (baked like his body's, spec 2026-10-13 §7). */
const CAPE_SH = 'M73 282.3 L76 288 L244 288 L247 282.3 L249.9 272.8 L250.6 265.9 L250 255 L247.4 243.3 L244.5 235.1 L238.4 222.5 L233.2 213.8 L227 205 L220 196 L212.8 196 L221.2 207.8 L228.6 220.7 L234 233.2 L237.4 245.2 L238.7 256.4 L237.9 266.8 L235 276.3 L232 282Z';

/** Where a power's mark sits: above the left ear; the heart on the cheek. */
function markAt(mark: IconName): { x: number; y: number; size: number } {
  if (mark === 'heart') return { x: 226, y: 150, size: 24 }; // a drop on the cheek would read as a tear
  return { x: 84, y: 64, size: 36 }; // left ear: held items (balloon, kite…) live on the right
}

/**
 * Power art in Truffle's viewBox (30 20 260 270): tier 1 = the power's mark, tier 2 adds an aura,
 * tier 3 adds a cape behind him and an emblem with the power's character on his chest.
 */
export function powerLayer(id: PowerId, tier: 1 | 2 | 3): { back: string; head: string; front: string } {
  const p = powerDef(id)!;
  const m = markAt(p.mark);
  const mark = iconMarkup(p.mark, m.x - m.size / 2, m.y - m.size / 2, m.size);
  const aura =
    `<circle cx="160" cy="170" r="128" fill="${p.color}" opacity=".18"/>` +
    `<circle cx="160" cy="170" r="112" fill="none" stroke="${p.color}" stroke-width="5" stroke-dasharray="4 14" stroke-linecap="round" opacity=".7"/>`;
  const CAPE = 'M100 196 C70 232 62 266 76 288 L244 288 C258 266 250 232 220 196 Z';
  const cape =
    `<g class="truffle__cape"><path d="${CAPE}" fill="${p.color}"/><path d="${CAPE_SH}" fill="${celShade(p.color)}"/>` +
    `<path d="${CAPE}" fill="none" ${S}/></g>`;
  const emblem =
    `<circle cx="160" cy="249" r="17" fill="${p.color}" ${s2}/>` +
    `<text class="truffle__emblem" x="160" y="250" font-family="WenKai, serif" font-size="21" text-anchor="middle" dominant-baseline="middle" fill="#fffdf7">${p.name}</text>`;
  return {
    back: (tier >= 2 ? aura : '') + (tier === 3 ? cape : ''),
    head: mark, // on his ear or cheek: it turns with his head
    front: tier === 3 ? emblem : '',
  };
}
