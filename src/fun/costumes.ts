import { mulberry32, seedFromString } from '../lib/random';
import type { KidState } from '../types';
import { accessoryById } from './accessories';
import { normalizeMeter } from './meter';
import { ACCESSORIES, CHEST_BONUS_STARS } from './pet';

import type { ZodiacId } from '../types';

export type { ZodiacId };
/** The new onesies (rewards spec 2026-10-15 §5.2): river creatures and his favourites. */
export type AnimalId = 'otter' | 'hornbill' | 'panda' | 'frog' | 'duck' | 'dragonfly' | 'babydino' | 'pterosaur' | 'koi' | 'crab' | 'parrot' | 'magpie' | 'penguin' | 'shark' | 'unicorn' | 'owl' | 'tigercub';
/** Jobs, drawn full-body. `football` keeps its id (owned ones stay owned) and is now 足球员. */
export type JobId = 'astronaut' | 'chef' | 'firefighter' | 'doctor' | 'pilot' | 'police' | 'football' | 'wizard' | 'pirate' | 'hawker' | 'soldier';
/** His robots (his ask, 2026-10-15): Truffle's own mecha and car-robot, not any show's. */
export type RobotId = 'mecha' | 'carbot';
export type ChineseId = 'wukong' | 'nezha' | 'change' | 'houyi' | 'caishen' | 'luckycat' | 'liondance';
/** Out of the chest (spec §5.2): kept, in their old art, for whoever owns them. */
export type GreekId =
  | 'zeus' | 'hera' | 'poseidon' | 'demeter' | 'athena' | 'apollo' | 'artemis' | 'ares' | 'aphrodite' | 'hephaestus' | 'hermes' | 'dionysus' | 'hades' | 'hestia'
  | 'heracles' | 'odysseus' | 'perseus' | 'achilles' | 'theseus' | 'jason' | 'medusa' | 'minotaur' | 'cerberus';
export type OldOutfitId = 'explorer' | 'hero' | 'pixel' | 'raincoat' | 'robot' | 'rook' | 'basketball' | 'gi';
export type CostumeId = ZodiacId | AnimalId | JobId | RobotId | ChineseId | GreekId | OldOutfitId;
/** His wardrobe's shelves: 生肖, 动物 (the new onesies), 职业, 机器人, 中国, and the two out of the chest, 希腊 and 以前的衣服. */
export type CostumeSet = 'zodiac' | 'animal' | 'job' | 'robot' | 'chinese' | 'greek' | 'old';

export interface Costume {
  id: CostumeId;
  kind: 'onesie' | 'outfit'; // how it's drawn: an animal hood, or clothes and things he holds
  set: CostumeSet;
  zh: string;
  py: string;
  color: string; // its one dominant colour (rewards spec §5.1)
}

const shelf = (set: CostumeSet, kind: Costume['kind']) => (id: CostumeId, zh: string, py: string, color: string, k: Costume['kind'] = kind): Costume => ({ id, kind: k, set, zh, py, color });
const o = shelf('zodiac', 'onesie');
const j = shelf('job', 'outfit');
const rb = shelf('robot', 'outfit');
const c = shelf('chinese', 'outfit');
const g = shelf('greek', 'outfit');
const old = shelf('old', 'outfit');
const an = shelf('animal', 'onesie');

/** The 12 生肖, in zodiac order. */
export const ONESIES: Costume[] = [
  // colours kept apart, so the lookalikes (ox/horse/monkey/dog, dragon/snake, rabbit/goat) never share one (parent, 2026-10-06)
  o('rat', '鼠', 'shǔ', '#9d9cad'), o('ox', '牛', 'niú', '#f7f4ee'), o('tiger', '虎', 'hǔ', '#ffa53d'),
  o('rabbit', '兔', 'tù', '#fffefa'), o('dragon', '龙', 'lóng', '#3fae66'), o('snake', '蛇', 'shé', '#b4cf4a'),
  o('horse', '马', 'mǎ', '#c77b3f'), o('goat', '羊', 'yáng', '#e6d3a3'), o('monkey', '猴', 'hóu', '#6b4a3a'),
  o('rooster', '鸡', 'jī', '#e0533c'), o('dog', '狗', 'gǒu', '#e8c27a'), o('pig', '猪', 'zhū', '#ffb3c7'),
];

/** The 17 new onesies, added with their art (Tasks 8–9); the bunny became the zodiac 兔 (parent 2026-10-15). */
export const ANIMALS: Costume[] = [
  // the river creatures (Task 8)
  an('otter', '水獭', 'shuǐ tǎ', '#93643f'), an('panda', '熊猫', 'xióng māo', '#fbfaf6'), an('hornbill', '犀鸟', 'xī niǎo', '#3d3845'),
  an('frog', '青蛙', 'qīng wā', '#7cc84a'), an('duck', '鸭子', 'yā zi', '#ffd84a'), an('dragonfly', '蜻蜓', 'qīng tíng', '#3fb6c8'),
  an('koi', '锦鲤', 'jǐn lǐ', '#fffaf2'), an('crab', '螃蟹', 'páng xiè', '#d8382e'), an('parrot', '鹦鹉', 'yīng wǔ', '#2f8fd6'),
  // his favourites (Task 9)
  an('babydino', '小恐龙', 'xiǎo kǒng lóng', '#8f6fd6'), an('pterosaur', '翼龙', 'yì lóng', '#c96f9a'), an('magpie', '喜鹊', 'xǐ què', '#2a4f8f'),
  an('penguin', '企鹅', 'qǐ é', '#c7ccd6'), an('shark', '鲨鱼', 'shā yú', '#4f7fb8'), an('unicorn', '独角兽', 'dú jiǎo shòu', '#cdb0f2'),
  an('owl', '猫头鹰', 'māo tóu yīng', '#7a6a9a'), an('tigercub', '小老虎', 'xiǎo lǎo hǔ', '#f2f0fa'),
];

/** Jobs, drawn full-body (spec §5.2). `football` keeps its id and is now 足球员, in a yellow jersey. */
export const JOBS: Costume[] = [
  j('astronaut', '宇航员', 'yǔ háng yuán', '#f2f4f8'), j('chef', '厨师', 'chú shī', '#fffdf7'), j('firefighter', '消防员', 'xiāo fáng yuán', '#d8302a'),
  j('doctor', '医生', 'yī shēng', '#49b8a8'), j('pilot', '飞行员', 'fēi xíng yuán', '#9a6338'), j('police', '警察', 'jǐng chá', '#2a3f7a'),
  j('football', '足球员', 'zú qiú yuán', '#ffcc2e'), j('wizard', '魔法师', 'mó fǎ shī', '#7b5cd6'), j('pirate', '海盗', 'hǎi dào', '#2d2a33'),
  j('hawker', '小贩', 'xiǎo fàn', '#2f74c9'),
  // his ask (2026-10-15): a Singapore-army soldier in pixel camo, a flag in his paw (no weapons)
  j('soldier', '军人', 'jūn rén', '#82803a'),
];

/** His robots (his ask, 2026-10-15): an orange armoured mecha and a red car-robot, Truffle's own designs. */
export const ROBOTS: Costume[] = [
  rb('mecha', '机甲', 'jī jiǎ', '#ee6a12'), rb('carbot', '变形机器人', 'biàn xíng jī qì rén', '#e0283a'),
];

/** Chinese myths, and the fortune cat and the lion dance (redrawn to v3, spec §5.2). */
export const CHINESE: Costume[] = [
  c('wukong', '孙悟空', 'sūn wù kōng', '#f5b82e'), c('nezha', '哪吒', 'né zhā', '#ef6f8a'), c('change', '嫦娥', 'cháng é', '#f8cfe0'),
  c('houyi', '后羿', 'hòu yì', '#3d7a5a'), c('caishen', '财神', 'cái shén', '#9e1b32'), c('luckycat', '招财猫', 'zhāo cái māo', '#fff7ec', 'onesie'),
  c('liondance', '舞狮', 'wǔ shī', '#e0362c', 'onesie'),
];

/** Every Greek god, the heroes and the creatures (parent, 2026-10-06), out of the chest since 2026-10-15. */
export const GREEK: Costume[] = [
  g('zeus', '宙斯', 'zhòu sī', '#fbfaf6'), g('hera', '赫拉', 'hè lā', '#5b6fd6'), g('poseidon', '波塞冬', 'bō sài dōng', '#2fa3a0'),
  g('demeter', '得墨忒耳', 'dé mò tè ěr', '#8fb84a'), g('athena', '雅典娜', 'yǎ diǎn nà', '#e9eef6'), g('apollo', '阿波罗', 'ā bō luó', '#ffd54a'),
  g('artemis', '阿耳忒弥斯', 'ā ěr tè mí sī', '#4f9a6a'), g('ares', '阿瑞斯', 'ā ruì sī', '#b3261e'), g('aphrodite', '阿佛洛狄忒', 'ā fó luò dí tè', '#ffb3c7'),
  g('hephaestus', '赫菲斯托斯', 'hè fēi sī tuō sī', '#8a5a3c'), g('hermes', '赫尔墨斯', 'hè ěr mò sī', '#f2a03d'), g('dionysus', '狄俄尼索斯', 'dí é ní suǒ sī', '#7b4fa6'),
  g('hades', '哈迪斯', 'hā dí sī', '#3b3049'), g('hestia', '赫斯提亚', 'hè sī tí yà', '#e8743b'),
  g('heracles', '赫拉克勒斯', 'hè lā kè lè sī', '#d9a441'), g('odysseus', '奥德修斯', 'ào dé xiū sī', '#3f6fb5'), g('perseus', '珀耳修斯', 'pò ěr xiū sī', '#6d8fb3'),
  g('achilles', '阿喀琉斯', 'ā kā liú sī', '#e0b13a'), g('theseus', '忒修斯', 'tè xiū sī', '#9c4f2c'), g('jason', '伊阿宋', 'yī ā sòng', '#2f4a7a'),
  g('medusa', '美杜莎', 'měi dù shā', '#6fae5a'), g('minotaur', '米诺陶洛斯', 'mǐ nuò táo luò sī', '#7a4a2a', 'onesie'),
  g('cerberus', '刻耳柏洛斯', 'kè ěr bó luò sī', '#4a4550', 'onesie'),
];

/** The old outfits not among the jobs (spec §5.2): out of the chest, kept for owners. */
export const OLD_OUTFITS: Costume[] = [
  old('explorer', '探险家', 'tàn xiǎn jiā', '#c9a86a'), old('hero', '超人', 'chāo rén', '#ff4a3d'), old('pixel', '像素', 'xiàng sù', '#5ccf7a'),
  old('raincoat', '雨衣', 'yǔ yī', '#ffd23f'), old('robot', '机器人', 'jī qì rén', '#c9d1dc'), old('rook', '城堡', 'chéng bǎo', '#efe4cc'),
  old('basketball', '篮球服', 'lán qiú fú', '#2f6fd6'), old('gi', '柔术服', 'róu shù fú', '#fbfaf6'),
];

export const COSTUMES: Costume[] = [...ONESIES, ...ANIMALS, ...JOBS, ...ROBOTS, ...CHINESE, ...GREEK, ...OLD_OUTFITS];

export const costumeById = (id: string | null | undefined): Costume | undefined => COSTUMES.find((x) => x.id === id);

const CHEST_SETS: ReadonlySet<CostumeSet> = new Set(['zodiac', 'animal', 'job', 'robot', 'chinese']);
/** In the chest (spec §5.2): the zodiac and new onesies, the jobs, the robots, the Chinese myths. */
export const inChest = (x: Costume): boolean => CHEST_SETS.has(x.set);
export const CHEST_COSTUMES: Costume[] = COSTUMES.filter(inChest);

/** Accessories are add-ons (face, neck, paw, back), so they show with any costume; unknown values show nothing. */
export function visibleAccessory(kid: KidState): string | null {
  return accessoryById(kid.wearing) ? kid.wearing : null;
}

export type ChestResult = { kind: 'costume'; id: CostumeId } | { kind: 'accessory'; item: string } | { kind: 'stars'; amount: number };

/** The chest's groups, in the order a round gives them (spec §5.3): a onesie, then a job, robot or myth ("story"), then an accessory. */
export type PrizeGroup = 'onesie' | 'story' | 'accessory';
const ROUND: PrizeGroup[] = ['onesie', 'story', 'accessory'];
export const prizeGroup = (x: Costume): Exclude<PrizeGroup, 'accessory'> => (x.set === 'zodiac' || x.set === 'animal' ? 'onesie' : 'story');

/** New clothes still in the chest (the chest goal, spec §4). */
export const costumesLeft = (kid: KidState): number => CHEST_COSTUMES.filter((x) => !kid.ownedCostumes.includes(x.id)).length;

type Prize = Exclude<ChestResult, { kind: 'stars' }>;

/**
 * One chest (spec §5.3): the group furthest behind in its round comes next (ties in round order), and a seeded pick within it
 * from what he doesn't own; everything owned gives 3 bonus stars. Opening takes one owed chest and marks the day.
 */
export function openChest(kid: KidState, today: string): { kid: KidState; result: ChestResult } {
  const meter = normalizeMeter(kid.meter); // an old or hand-edited save: owed is always a safe count
  const opened = { lastChestDate: today, meter: { ...meter, owed: Math.max(0, meter.owed - 1) } };
  const owned = (grp: PrizeGroup) =>
    grp === 'accessory' ? ACCESSORIES.filter((a) => kid.ownedAccessories.includes(a)).length : CHEST_COSTUMES.filter((x) => prizeGroup(x) === grp && kid.ownedCostumes.includes(x.id)).length;
  const left = (grp: PrizeGroup): Prize[] =>
    grp === 'accessory'
      ? ACCESSORIES.filter((a) => !kid.ownedAccessories.includes(a)).map((item) => ({ kind: 'accessory' as const, item }))
      : CHEST_COSTUMES.filter((x) => prizeGroup(x) === grp && !kid.ownedCostumes.includes(x.id)).map((x) => ({ kind: 'costume' as const, id: x.id }));
  const open = ROUND.filter((grp) => left(grp).length > 0);
  if (!open.length) {
    return { kid: { ...kid, ...opened, bonusStars: kid.bonusStars + CHEST_BONUS_STARS }, result: { kind: 'stars', amount: CHEST_BONUS_STARS } };
  }
  const group = open.reduce((best, grp) => (owned(grp) < owned(best) ? grp : best));
  const pool = left(group);
  const pick = pool[Math.floor(mulberry32(seedFromString(`${today}#${kid.ownedCostumes.length + kid.ownedAccessories.length}`))() * pool.length)]!;
  if (pick.kind === 'costume') return { kid: { ...kid, ...opened, ownedCostumes: [...kid.ownedCostumes, pick.id] }, result: pick };
  return { kid: { ...kid, ...opened, ownedAccessories: [...kid.ownedAccessories, pick.item] }, result: pick };
}
