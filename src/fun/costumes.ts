import { mulberry32, seedFromString } from '../lib/random';
import type { KidState } from '../types';
import { accessoryById } from './accessories';
import { ACCESSORIES, CHEST_BONUS_STARS } from './pet';

import type { ZodiacId } from '../types';

export type { ZodiacId };
export type OutfitId = 'astronaut' | 'chef' | 'wizard' | 'explorer' | 'pirate' | 'hero' | 'pixel' | 'raincoat' | 'robot' | 'rook' | 'football' | 'basketball' | 'gi';

export interface Costume {
  id: ZodiacId | OutfitId;
  kind: 'onesie' | 'outfit';
  zh: string;
  py: string;
  color: string;
}

const o = (id: ZodiacId, zh: string, py: string, color: string): Costume => ({ id, kind: 'onesie', zh, py, color });
const f = (id: OutfitId, zh: string, py: string, color: string): Costume => ({ id, kind: 'outfit', zh, py, color });

/** The 12 生肖, in zodiac order. */
export const ONESIES: Costume[] = [
  // colours kept apart, so the lookalikes (ox/horse/monkey/dog, dragon/snake, rabbit/goat) never share one (parent, 2026-10-06)
  o('rat', '鼠', 'shǔ', '#9d9cad'), o('ox', '牛', 'niú', '#f7f4ee'), o('tiger', '虎', 'hǔ', '#ffa53d'),
  o('rabbit', '兔', 'tù', '#fdf6f9'), o('dragon', '龙', 'lóng', '#3fae66'), o('snake', '蛇', 'shé', '#b4cf4a'),
  o('horse', '马', 'mǎ', '#c77b3f'), o('goat', '羊', 'yáng', '#e6d3a3'), o('monkey', '猴', 'hóu', '#6b4a3a'),
  o('rooster', '鸡', 'jī', '#e0533c'), o('dog', '狗', 'gǒu', '#e8c27a'), o('pig', '猪', 'zhū', '#ffb3c7'),
];

export const OUTFITS: Costume[] = [
  f('astronaut', '宇航员', 'yǔ háng yuán', '#f2f4f8'), f('chef', '厨师', 'chú shī', '#fffdf7'),
  f('wizard', '魔法师', 'mó fǎ shī', '#7b5cd6'), f('explorer', '探险家', 'tàn xiǎn jiā', '#c9a86a'),
  f('pirate', '海盗', 'hǎi dào', '#2f4a7a'), f('hero', '超人', 'chāo rén', '#ff4a3d'),
  f('pixel', '像素', 'xiàng sù', '#5ccf7a'), f('raincoat', '雨衣', 'yǔ yī', '#ffd23f'),
  // the parent's additions (2026-10-06)
  f('robot', '机器人', 'jī qì rén', '#c9d1dc'), f('rook', '城堡', 'chéng bǎo', '#efe4cc'),
  f('football', '足球服', 'zú qiú fú', '#d8262e'), f('basketball', '篮球服', 'lán qiú fú', '#2f6fd6'),
  f('gi', '柔术服', 'róu shù fú', '#fbfaf6'),
];

export const COSTUMES: Costume[] = [...ONESIES, ...OUTFITS];

export const costumeById = (id: string | null | undefined): Costume | undefined => COSTUMES.find((c) => c.id === id);

/** Accessories are add-ons (face, neck, paw, back), so they show with any costume; unknown values show nothing. */
export function visibleAccessory(kid: KidState): string | null {
  return accessoryById(kid.wearing) ? kid.wearing : null;
}

export type ChestResult = { kind: 'costume'; id: ZodiacId | OutfitId } | { kind: 'accessory'; item: string } | { kind: 'stars'; amount: number };

/** Call only after today's daily (not free-play) session is complete. */
export function canOpenChest(kid: KidState, today: string): boolean {
  return kid.lastChestDate !== today;
}

/** First chest ever: the child's own zodiac onesie. Then a seeded pick from everything not yet owned, then stars. */
export function openChest(kid: KidState, today: string, zodiac: ZodiacId | null): { kid: KidState; result: ChestResult } {
  if (!kid.ownedCostumes.some((id) => costumeById(id))) {
    const id = costumeById(zodiac)?.kind === 'onesie' ? zodiac! : 'dragon';
    return { kid: { ...kid, ownedCostumes: [id], lastChestDate: today }, result: { kind: 'costume', id } };
  }
  const pool = [
    ...COSTUMES.filter((c) => !kid.ownedCostumes.includes(c.id)).map((c) => ({ kind: 'costume' as const, id: c.id })),
    ...ACCESSORIES.filter((a) => !kid.ownedAccessories.includes(a)).map((item) => ({ kind: 'accessory' as const, item })),
  ];
  if (!pool.length) {
    return { kid: { ...kid, bonusStars: kid.bonusStars + CHEST_BONUS_STARS, lastChestDate: today }, result: { kind: 'stars', amount: CHEST_BONUS_STARS } };
  }
  const pick = pool[Math.floor(mulberry32(seedFromString(today))() * pool.length)]!;
  if (pick.kind === 'costume') return { kid: { ...kid, ownedCostumes: [...kid.ownedCostumes, pick.id], lastChestDate: today }, result: pick };
  return { kid: { ...kid, ownedAccessories: [...kid.ownedAccessories, pick.item], lastChestDate: today }, result: pick };
}
