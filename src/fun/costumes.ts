import { mulberry32, seedFromString } from '../lib/random';
import type { KidState } from '../types';
import { accessoryById } from './accessories';
import { ACCESSORIES, CHEST_BONUS_STARS } from './pet';

import type { ZodiacId } from '../types';

export type { ZodiacId };
export type OutfitId = 'astronaut' | 'chef' | 'wizard' | 'explorer' | 'pirate' | 'hero' | 'pixel' | 'raincoat' | 'robot' | 'rook' | 'football' | 'basketball' | 'gi';
export type MythId =
  | 'zeus' | 'hera' | 'poseidon' | 'demeter' | 'athena' | 'apollo' | 'artemis' | 'ares' | 'aphrodite' | 'hephaestus' | 'hermes' | 'dionysus' | 'hades' | 'hestia'
  | 'heracles' | 'odysseus' | 'perseus' | 'achilles' | 'theseus' | 'jason' | 'medusa' | 'minotaur' | 'pegasus' | 'cerberus'
  | 'wukong' | 'nezha' | 'change' | 'houyi' | 'caishen' | 'luckycat' | 'liondance';
export type CostumeId = ZodiacId | OutfitId | MythId;
/** Where a costume sits in his wardrobe: 生肖, 衣服, 希腊 (Greek myths), 中国 (Chinese myths and customs). */
export type CostumeSet = 'zodiac' | 'outfit' | 'greek' | 'chinese';

export interface Costume {
  id: CostumeId;
  kind: 'onesie' | 'outfit'; // how it's drawn: an animal hood, or clothes and things he holds
  set: CostumeSet;
  zh: string;
  py: string;
  color: string;
}

const o = (id: ZodiacId, zh: string, py: string, color: string): Costume => ({ id, kind: 'onesie', set: 'zodiac', zh, py, color });
const f = (id: OutfitId, zh: string, py: string, color: string): Costume => ({ id, kind: 'outfit', set: 'outfit', zh, py, color });
const g = (id: MythId, zh: string, py: string, color: string, kind: Costume['kind'] = 'outfit'): Costume => ({ id, kind, set: 'greek', zh, py, color });
const c = (id: MythId, zh: string, py: string, color: string, kind: Costume['kind'] = 'outfit'): Costume => ({ id, kind, set: 'chinese', zh, py, color });

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

/** Every Greek god, the heroes and the creatures (parent, 2026-10-06: he is really into them). */
export const GREEK: Costume[] = [
  g('zeus', '宙斯', 'zhòu sī', '#fbfaf6'), g('hera', '赫拉', 'hè lā', '#5b6fd6'), g('poseidon', '波塞冬', 'bō sài dōng', '#2fa3a0'),
  g('demeter', '得墨忒耳', 'dé mò tè ěr', '#8fb84a'), g('athena', '雅典娜', 'yǎ diǎn nà', '#e9eef6'), g('apollo', '阿波罗', 'ā bō luó', '#ffd54a'),
  g('artemis', '阿耳忒弥斯', 'ā ěr tè mí sī', '#4f9a6a'), g('ares', '阿瑞斯', 'ā ruì sī', '#b3261e'), g('aphrodite', '阿佛洛狄忒', 'ā fó luò dí tè', '#ffb3c7'),
  g('hephaestus', '赫菲斯托斯', 'hè fēi sī tuō sī', '#8a5a3c'), g('hermes', '赫尔墨斯', 'hè ěr mò sī', '#f2a03d'), g('dionysus', '狄俄尼索斯', 'dí é ní suǒ sī', '#7b4fa6'),
  g('hades', '哈迪斯', 'hā dí sī', '#3b3049'), g('hestia', '赫斯提亚', 'hè sī tí yà', '#e8743b'),
  g('heracles', '赫拉克勒斯', 'hè lā kè lè sī', '#d9a441'), g('odysseus', '奥德修斯', 'ào dé xiū sī', '#3f6fb5'), g('perseus', '珀耳修斯', 'pò ěr xiū sī', '#6d8fb3'),
  g('achilles', '阿喀琉斯', 'ā kā liú sī', '#e0b13a'), g('theseus', '忒修斯', 'tè xiū sī', '#9c4f2c'), g('jason', '伊阿宋', 'yī ā sòng', '#2f4a7a'),
  g('medusa', '美杜莎', 'měi dù shā', '#6fae5a'), g('minotaur', '米诺陶洛斯', 'mǐ nuò táo luò sī', '#7a4a2a', 'onesie'),
  g('pegasus', '飞马', 'fēi mǎ', '#f6f7fb', 'onesie'), g('cerberus', '刻耳柏洛斯', 'kè ěr bó luò sī', '#4a4550', 'onesie'),
];
/** Chinese myths, and the fortune cat and the lion dance. */
export const CHINESE: Costume[] = [
  c('wukong', '孙悟空', 'sūn wù kōng', '#f2a03d'), c('nezha', '哪吒', 'né zhā', '#e0533c'), c('change', '嫦娥', 'cháng é', '#f6e7f0'),
  c('houyi', '后羿', 'hòu yì', '#8a5a3c'), c('caishen', '财神', 'cái shén', '#c8102e'), c('luckycat', '招财猫', 'zhāo cái māo', '#c8102e'),
  c('liondance', '舞狮', 'wǔ shī', '#e0362c', 'onesie'),
];

export const COSTUMES: Costume[] = [...ONESIES, ...OUTFITS, ...GREEK, ...CHINESE];

export const costumeById = (id: string | null | undefined): Costume | undefined => COSTUMES.find((c) => c.id === id);

/** Accessories are add-ons (face, neck, paw, back), so they show with any costume; unknown values show nothing. */
export function visibleAccessory(kid: KidState): string | null {
  return accessoryById(kid.wearing) ? kid.wearing : null;
}

export type ChestResult = { kind: 'costume'; id: CostumeId } | { kind: 'accessory'; item: string } | { kind: 'stars'; amount: number };

/** Call only after today's daily (not free-play) session is complete. */
export function canOpenChest(kid: KidState, today: string): boolean {
  return kid.lastChestDate !== today;
}

/** First chest ever: the child's own zodiac onesie. Then a seeded pick from everything not yet owned, then stars. */
export function openChest(kid: KidState, today: string, zodiac: ZodiacId | null): { kid: KidState; result: ChestResult } {
  if (!kid.ownedCostumes.some((id) => costumeById(id))) {
    const id = costumeById(zodiac)?.set === 'zodiac' ? zodiac! : 'dragon';
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
