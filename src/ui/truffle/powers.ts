import { powerDef, type PowerId } from '../../fun/powers';
import { iconMarkup, type IconName } from '../icons/icons';

const INK = '#2a2630';

/** Where a power's mark sits: most above the left ear; the heart on the cheek; dash streaks behind. */
function markAt(mark: IconName): { x: number; y: number; size: number } {
  if (mark === 'heart') return { x: 226, y: 150, size: 24 }; // a drop on the cheek would read as a tear
  if (mark === 'wind') return { x: 72, y: 214, size: 36 };
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
  const cape = `<path class="truffle__cape" d="M100 196 C70 232 62 266 76 288 L244 288 C258 266 250 232 220 196 Z" fill="${p.color}" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>`;
  const emblem =
    `<circle cx="160" cy="249" r="17" fill="${p.color}" stroke="${INK}" stroke-width="2.6"/>` +
    `<text class="truffle__emblem" x="160" y="250" font-family="WenKai, serif" font-size="21" text-anchor="middle" dominant-baseline="middle" fill="#fffdf7">${p.name}</text>`;
  const onHead = p.mark !== 'wind'; // a mark on his ear or cheek turns with his head; the dash streaks trail his body
  return {
    back: (tier >= 2 ? aura : '') + (tier === 3 ? cape : ''),
    head: onHead ? mark : '',
    front: (onHead ? '' : mark) + (tier === 3 ? emblem : ''),
  };
}
