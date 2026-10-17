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

/**
 * 儿化 words and the plain word his book and Singapore speech use instead (review 2026-10-17): 一点 not 一点儿, 好玩 not
 * 好玩儿, 哪里 not 哪儿. The 儿化 form is never shown; the plain one is a 组词 (zuciPicks.ts) or already a word of his.
 */
export const ERHUA: Readonly<Record<string, string>> = {
  一点儿: '一点', 快点儿: '快点', 一会儿: '一会', 玩儿: '玩', 好玩儿: '好玩', 贪玩儿: '贪玩', 面条儿: '面条',
  女孩儿: '女孩', 男孩儿: '男孩', 画儿: '画', 哪儿: '哪里', 这儿: '这里', 那儿: '那里', 一块儿: '一起', 鸟儿: '小鸟',
  味儿: '味道', 空儿: '空', 有空儿: '有空', 干活儿: '干活', 聊天儿: '聊天', 打盹儿: '打盹', 兜儿: '口袋', 馅儿: '馅',
  冰棍儿: '冰棍', 大腕儿: '大腕', 离谱儿: '离谱', 花儿: '花',
};

/** Why each word is blocked: the audit's blocklist (blocklist.json), then the sweeps' drops, then 儿化. */
export const BLOCK_REASON: ReadonlyMap<string, string> = new Map([
  ...Object.entries((blocklist as { words: Record<string, string> }).words),
  ...[...EXAMPLE_DROPS].map((w) => [w, 'content sweep drop'] as [string, string]),
  ...Object.entries(ERHUA).map(([w, plain]) => [w, `儿化: his book says ${plain}`] as [string, string]),
]);

/** Every blocked word: never a 组词, a family word, a 连一连 pair or decoy, a ladder 词语, a choice or a collection example. */
export const BLOCKED: ReadonlySet<string> = new Set(BLOCK_REASON.keys());
