export type AccessorySlot = 'face' | 'neck' | 'held' | 'back';

export interface AccessoryDef {
  id: string;
  zh: string;
  py: string; // one syllable per character, for Label
  slot: AccessorySlot;
}

const a = (id: string, zh: string, py: string, slot: AccessorySlot): AccessoryDef => ({ id, zh, py, slot });

/** Add-ons that go with any onesie or outfit (each costume brings its own hat). */
export const ACCESSORY_DEFS: AccessoryDef[] = [
  a('sunglasses', '墨镜', 'mò jìng', 'face'),
  a('starglasses', '星星眼镜', 'xīng xing yǎn jìng', 'face'),
  a('heartglasses', '爱心眼镜', 'ài xīn yǎn jìng', 'face'),
  a('moustache', '小胡子', 'xiǎo hú zi', 'face'),
  a('scarf', '围巾', 'wéi jīn', 'neck'),
  a('bowtie', '领结', 'lǐng jié', 'neck'),
  a('medal', '金牌', 'jīn pái', 'neck'),
  a('headphones', '耳机', 'ěr jī', 'neck'),
  a('brush', '毛笔', 'máo bǐ', 'held'),
  a('lantern', '红灯笼', 'hóng dēng long', 'held'),
  a('kite', '风筝', 'fēng zheng', 'held'),
  a('balloon', '气球', 'qì qiú', 'held'),
  a('wand', '魔法棒', 'mó fǎ bàng', 'held'),
  a('backpack', '书包', 'shū bāo', 'back'),
  a('wings', '翅膀', 'chì bǎng', 'back'),
  a('jetpack', '喷气背包', 'pēn qì bēi bāo', 'back'),
];

export const ACCESSORY_IDS: string[] = ACCESSORY_DEFS.map((d) => d.id);

/** The dragon-era emoji accessories, one-to-one onto the new ones, so nothing earned is lost. */
export const LEGACY_ACCESSORY: Record<string, string> = {
  '🎩': 'moustache', '👑': 'medal', '🕶️': 'sunglasses', '🎀': 'bowtie',
  '🧢': 'backpack', '🎓': 'brush', '⛑️': 'jetpack', '🌸': 'heartglasses',
  '⭐': 'starglasses', '🎈': 'balloon', '🍀': 'lantern', '🦋': 'wings',
  '🌈': 'wand', '🎧': 'headphones', '🧣': 'scarf', '🪁': 'kite',
};

export const accessoryById = (id: string | null | undefined): AccessoryDef | undefined => ACCESSORY_DEFS.find((d) => d.id === id);

export function migrateAccessory(v: string | null | undefined): string | null {
  if (!v) return null;
  if (accessoryById(v)) return v;
  return LEGACY_ACCESSORY[v] ?? null;
}
