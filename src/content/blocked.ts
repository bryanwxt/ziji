// Words a P2 child never meets, on any surface (content audit 2026-10-15). Data only, so the content index can use it
// without importing the word gate (src/content/wordGate.ts), which builds on the index.
import blocklist from './blocklist.json';

/** 组词 a child shouldn't meet on a card (content sweeps, 2026-10-05): unsuitable or too obscure to teach anything. */
export const EXAMPLE_DROPS: ReadonlySet<string> = new Set<string>([
  '自杀', '谋害', '绯闻', '暗杀', '抽烟', '笨蛋', '收买', '风流', // unsuitable
  '板块', '新兴', '风度', '第一手', '卖弄', '饱和', '雷同', '哭笑不得', // obscure, or adult words a child can't use
  '心脏', '心脏病', // zàng, on 脏's zāng ("dirty") card
  // second sweep (HSK 5–9)
  '开枪', '酒鬼', '傻瓜', '凶手', '肿瘤', '暴力', '艾滋病', '茅台', '枪毙', '屠杀', '绑架', '忽悠', '偷窥',
  '纲领', '吊销', '回扣', '炒股', '伊斯兰教', '禅杖', '哗变', '怠工', '抚恤', '血栓',
]);

/** Why each word is blocked: the audit's blocklist (blocklist.json), then the sweeps' drops. */
export const BLOCK_REASON: ReadonlyMap<string, string> = new Map([
  ...Object.entries((blocklist as { words: Record<string, string> }).words),
  ...[...EXAMPLE_DROPS].map((w) => [w, 'content sweep drop'] as [string, string]),
]);

/** Every blocked word: never a 组词, a family word, a 连一连 pair or decoy, a ladder 词语, a choice or a collection example. */
export const BLOCKED: ReadonlySet<string> = new Set(BLOCK_REASON.keys());
