// Kid glosses (parent 2026-10-15): the English a P2 child reads, at most four everyday words in the sense his lessons and 组词
// use (河水 "river water", 上网 "go online", 只 "one (for animals)"), for every school character and every 词语 an English
// question can ask. Written by hand in scripts/kidgloss/*.tsv and built into kidGloss.json by scripts/build-kidgloss.ts,
// which flags any gap. The dictionary's English (glossary.ts) stays for words beyond his school lists and as parent detail.
import data from './kidGloss.json';

/** text → [the reading the gloss was written for, the gloss]. */
const ENTRIES = (data as unknown as { entries: Record<string, [string, string]> }).entries;
/** bound character → the pair it is taught and asked through (chars.tsv's fourth column). */
const BOUND = (data as unknown as { bound?: Record<string, string> }).bound ?? {};

/** The kid gloss for a character or 词语, if it has one. */
export const kidGloss = (text: string): string | undefined => ENTRIES[text]?.[1];
/** The reading a kid gloss was written for (a changed reading can mean a changed sense). */
export const kidGlossReading = (text: string): string | undefined => ENTRIES[text]?.[0];
export const kidGlossTexts = (): string[] => Object.keys(ENTRIES);

export const MAX_GLOSS_WORDS = 4;
/** Dictionary words a child can't use (parent 2026-10-15): never in a kid gloss. */
const JARGON: [string, RegExp][] = [
  ['particle', /\bparticles?\b/i], ['classifier', /\bclassifiers?\b/i], ['measure word', /\bmeasure words?\b/i],
  ['sth', /\bsth\b/i], ['sb', /\bsb\b/i], ['variant', /\bvariant/i], ['surname', /\bsurname/i], ['used in', /\bused in\b/i],
  ['literary', /\bliterary\b/i], ['abbr', /\babbr/i], ['CL:', /\bCL:/], ['pr.', /\bpr\./i], ['archaic', /\barchaic\b/i],
];

/** What is wrong with a gloss for a 7-year-old (empty when nothing is). */
export function glossProblems(gloss: string): string[] {
  const out: string[] = [];
  const words = gloss.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ['empty'];
  if (words.length > MAX_GLOSS_WORDS) out.push(`${words.length} words (at most ${MAX_GLOSS_WORDS})`);
  for (const [name, re] of JARGON) if (re.test(gloss)) out.push(`jargon "${name}"`);
  if (/\p{Script=Han}/u.test(gloss)) out.push('Chinese in the English (it gives answers away)');
  if (gloss.includes(';')) out.push('a semicolon (one sense only)');
  if (gloss !== gloss.trim() || /\s{2}/.test(gloss)) out.push('stray spaces');
  return out;
}

/**
 * Bound characters (parent 2026-10-15): a character he meets only inside a word (番 only in 番茄, 司 in 司机, 啡 in 咖啡) is
 * taught and asked through that pair, at the card's reading. Its 认新字 card leads with the pair, its kid gloss is the pair's
 * ("tomato"), Truffle says the pair (speech.ts loneSpoken), and an English question shows or says the pair, never the lone
 * character. 写一写 still asks for the character alone.
 */
export const boundPair = (char: string): string | undefined => BOUND[char];
export const isBound = (char: string): boolean => char in BOUND;
export const boundChars = (): string[] => Object.keys(BOUND);
/** What an English-meaning question shows or says for a word: a bound character's pair, else the word itself. */
export const askedAs = (text: string): string => BOUND[text] ?? text;

/**
 * 组词 in a bound character's pair sense that don't contain the pair (parent 2026-10-15: 番's card showed 一番 "a round of"
 * right under "tomato"). A bound character's card, collection tile and 写一写 cue show only 组词 that contain its pair or are
 * listed here; its other senses (公司 for 司, 一番 for 番) never show beside it. Reviewable: add a word that keeps the pair's
 * sense, with nothing else to change.
 */
export const BOUND_SAME_SENSE: Readonly<Record<string, readonly string[]>> = {
  巴: ['大巴'], 师: ['教师'], 阳: ['阳光'], 今: ['今年', '今后'], 华: ['华人', '中华'], 巾: ['围巾'], 怎: ['怎样'],
  乐: ['欢乐', '吃喝玩乐'], 孩: ['男孩儿', '女孩儿'], 校: ['校园', '校长'], 习: ['学习', '复习'], 伴: ['陪伴'], 吉: ['吉祥'],
  婆: ['婆婆'], 卷: ['卷子'], 戏: ['马戏'], 特: ['特点', '特色'], 医: ['医院', '中医', '西医'], 贩: ['商贩'],
  健: ['健身'], 幸: ['不幸'], 觉: ['午觉'], 厌: ['厌烦'], 英: ['英语'], 迎: ['迎接'], 静: ['冷静', '平静'],
  趣: ['乐趣', '兴趣'], 旅: ['旅客', '旅游'], 艺: ['工艺', '文艺'], 误: ['失误'], 歉: ['道歉'], 赛: ['决赛', '参赛'],
  裤: ['短裤'], 猴: ['小猴'], 蚊: ['蚊帐'], 厨: ['厨师'], 滩: ['沙滩'], 虽: ['虽说'], 仍: ['仍旧'], 勤: ['勤快'],
  检: ['体检'], 永: ['永久', '永不'], 植: ['种植'], 视: ['影视'], 谅: ['体谅'], 彩: ['色彩', '丰富多彩'], 颜: ['五颜六色'],
  互: ['相互'], 已: ['早已'], 丽: ['亮丽', '华丽', '风和日丽'], 助: ['助手'], 需: ['必需'], 或: ['或是'],
  // 成语 in the pair's sense (the card's 成语 row)
  耳: ['耳目一新'], 朋: ['亲朋好友'], 兴: ['兴高采烈'], 应: ['应有尽有'], 易: ['轻易', '轻而易举'], 始: ['自始至终'],
  知: ['众所周知'], 突: ['突如其来'], 世: ['举世闻名'], 必: ['必不可少'],
};
/** May `text` (a 组词 or usage line) show beside `char`? Always for an unbound character; for a bound one only in its pair's
 *  sense: it contains the pair, or BOUND_SAME_SENSE lists it. */
export function inBoundSense(char: string, text: string): boolean {
  const pair = BOUND[char];
  return !pair || text.includes(pair) || (BOUND_SAME_SENSE[char] ?? []).includes(text);
}
