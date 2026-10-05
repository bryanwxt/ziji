// 成语 (spec 2026-10-05 §4): about 150 common 成语 from the app's HSK list, each with an English meaning and short sentences
// written for this app. A 成语's level is its hardest character's (HSK files nearly all 成语 under 7–9).
import { pinyin } from 'pinyin-pro';
import { BUILTIN } from '.';
import { syllableTone } from '../activities/flashcards/tones';
import { shuffle, type Rng } from '../lib/random';
import type { Word } from '../types';

export interface Chengyu { text: string; meaning: string; sentences: string[] }

const c = (text: string, meaning: string, ...sentences: string[]): Chengyu => ({ text, meaning, sentences });

export const CHENGYU: readonly Chengyu[] = [
  // hardest character at level 1
  c('不知不觉', 'without noticing', '我们不知不觉玩到了晚上。'),
  c('从早到晚', 'from morning till night', '妈妈从早到晚都很忙。'),
  c('四面八方', 'from all directions', '人们从四面八方来了。'),
  c('五花八门', 'all sorts of things', '我们玩的东西五花八门。'),
  c('一动不动', 'perfectly still', '小猫坐在那里一动不动。'),
  c('一干二净', 'completely, all gone', '这碗饭弟弟吃得一干二净。'),
  c('一天到晚', 'all day long', '他一天到晚都在看书。'),
  c('半真半假', 'half true, half false', '他讲的故事半真半假。'),
  c('说干就干', 'start as soon as it is said', '他说干就干，马上去做。'),
  c('时好时坏', 'sometimes good, sometimes bad', '这几天天气时好时坏。'),
  c('难得一见', 'rarely seen', '这是难得一见的大雪。'),
  // level 2
  c('一路平安', 'have a safe trip', '爷爷，祝您一路平安！'),
  c('一路顺风', 'have a good journey', '我们祝他一路顺风。'),
  c('五颜六色', 'all kinds of bright colours', '公园里的花五颜六色。'),
  c('意想不到', 'unexpected', '今天发生了意想不到的事。'),
  c('自言自语', 'talk to oneself', '弟弟在房间里自言自语。'),
  c('必不可少', 'absolutely needed', '每天喝水是必不可少的。'),
  c('不相上下', 'about the same, evenly matched', '哥哥和弟弟跑得不相上下。'),
  c('不由自主', "can't help doing it", '他不由自主笑了起来。'),
  c('成千上万', 'tens of thousands', '天上有成千上万的星星。'),
  c('吃喝玩乐', 'eat, drink and have fun', '放假不能只吃喝玩乐。'),
  c('合情合理', 'fair and sensible', '老师的安排很合情合理。'),
  c('忽高忽低', 'now high, now low', '那只小鸟飞得忽高忽低。'),
  c('欢声笑语', 'happy voices and laughter', '教室里都是欢声笑语。'),
  c('或多或少', 'more or less', '大家或多或少都喜欢玩。'),
  c('可想而知', 'as you can imagine', '他没有复习，结果可想而知。'),
  c('哭笑不得', "not know whether to laugh or cry", '弟弟做的事让我哭笑不得。'),
  c('理所当然', 'only natural, of course', '帮助别人是理所当然的事。'),
  c('没完没了', 'endless, on and on', '外面的雨下得没完没了。'),
  c('千方百计', 'in every possible way', '他千方百计想赢比赛。'),
  c('全心全意', 'with all one\'s heart', '妈妈全心全意照顾我们。'),
  c('日复一日', 'day after day', '爷爷日复一日去公园跑步。'),
  c('实话实说', 'tell it as it is', '做错了事要实话实说。'),
  c('实事求是', 'stick to the facts', '我们做事要实事求是。'),
  c('顺其自然', 'let things take their course', '这件事就顺其自然吧。'),
  c('思前想后', 'think it over and over', '他思前想后，还是去了。'),
  c('随处可见', 'seen everywhere', '公园里的小鸟随处可见。'),
  c('随时随地', 'anytime, anywhere', '我们可以随时随地看书。'),
  c('天长地久', 'lasting forever', '我希望我们的友情天长地久。'),
  c('头头是道', 'clear and well put', '哥哥讲道理讲得头头是道。'),
  c('息息相关', 'closely linked', '天气和我们的生活息息相关。'),
  c('心想事成', 'may your wishes come true', '祝你新年心想事成！'),
  c('一不小心', 'by accident, in a careless moment', '他一不小心打破了杯子。'),
  c('一目了然', 'clear at a glance', '这张地图看起来一目了然。'),
  c('一成不变', 'never changing', '世界上没有一成不变的东西。'),
  c('一举一动', 'every move', '小猫的一举一动都很可爱。'),
  c('一年到头', 'all year round', '这里一年到头都很热。'),
  c('一心一意', 'with one\'s whole heart', '他一心一意学画画。'),
  c('一言不发', 'not say a word', '他坐在那里一言不发。'),
  c('一言一行', 'every word and deed', '我们的一言一行都很重要。'),
  c('有声有色', 'vivid and lively', '老师讲故事讲得有声有色。'),
  c('远近闻名', 'famous far and wide', '这家饭店的饺子远近闻名。'),
  c('自然而然', 'naturally, all by itself', '多读书，自然而然就会了。'),
  c('自以为是', 'think one is always right', '我们做事不能自以为是。'),
  c('自由自在', 'free and easy', '小鱼在水里自由自在。'),
  c('过意不去', 'feel sorry, feel bad', '麻烦你了，我真过意不去。'),
  c('力不从心', 'want to but not able to', '爷爷年纪大了，有点力不从心。'),
  // level 3
  c('不可思议', 'hard to believe', '这件事真是不可思议。'),
  c('不约而同', 'all at the same time', '大家不约而同笑了起来。'),
  c('成群结队', 'in groups and crowds', '小鸟成群结队飞走了。'),
  c('出口成章', 'speak beautifully', '他读书多，出口成章。'),
  c('东张西望', 'look around everywhere', '上课时不要东张西望。'),
  c('断断续续', 'on and off', '雨断断续续下了一天。'),
  c('丰富多彩', 'rich and colourful', '我们学校的活动丰富多彩。'),
  c('风和日丽', 'sunny with a gentle breeze', '今天风和日丽，我们去公园。'),
  c('各式各样', 'all kinds of', '商店里有各式各样的玩具。'),
  c('画龙点睛', 'the finishing touch', '这句话起了画龙点睛的作用。'),
  c('接二连三', 'one after another', '好消息接二连三传来。'),
  c('举世闻名', 'world-famous', '中国的长城是举世闻名的。'),
  c('举一反三', 'learn one thing, work out more', '学习要学会举一反三。'),
  c('力所能及', 'what one is able to do', '我们要做力所能及的事。'),
  c('美中不足', 'a small flaw in something good', '这次旅行美中不足的是下雨了。'),
  c('目不转睛', 'stare without blinking', '弟弟目不转睛看着电视。'),
  c('念念不忘', 'keep thinking about it', '他对那次旅行念念不忘。'),
  c('千变万化', 'always changing', '夏天天上的云千变万化。'),
  c('亲朋好友', 'family and friends', '过年时亲朋好友都来了。'),
  c('轻而易举', 'very easily', '他轻而易举就赢了比赛。'),
  c('水落石出', 'the truth comes out', '这件事终于水落石出了。'),
  c('讨价还价', 'bargain over the price', '妈妈在市场讨价还价。'),
  c('突如其来', 'sudden, out of nowhere', '突如其来的风吹走了他的帽子。'),
  c('土生土长', 'born and raised here', '他是土生土长的北京人。'),
  c('喜出望外', 'happier than expected', '收到礼物，他喜出望外。'),
  c('显而易见', 'plain to see, obvious', '这个答案是显而易见的。'),
  c('想方设法', 'try every way', '他想方设法帮助同学。'),
  c('形形色色', 'all sorts of', '街上有形形色色的人。'),
  c('形影不离', 'always together', '我和小猫形影不离。'),
  c('兴高采烈', 'very happy and excited', '孩子们兴高采烈去公园。'),
  c('应有尽有', 'has everything you need', '这家商店里的东西应有尽有。'),
  c('张灯结彩', 'hung with lanterns for a festival', '过年时街上张灯结彩。'),
  c('争先恐后', 'rush to be first', '同学们争先恐后回答问题。'),
  c('众所周知', 'as everyone knows', '众所周知，多运动对身体好。'),
  c('自始至终', 'from start to finish', '他自始至终都很认真。'),
  // level 4
  c('爱不释手', "love it, can't put it down", '他对这本书爱不释手。'),
  c('半信半疑', 'half believing', '对这个消息，我半信半疑。'),
  c('诚心诚意', 'sincerely', '他诚心诚意帮助我们。'),
  c('出人意料', 'surprising', '这次比赛的结果出人意料。'),
  c('粗心大意', 'careless', '做作业不能粗心大意。'),
  c('大吃一惊', 'very surprised', '这个消息让大家大吃一惊。'),
  c('大惊小怪', 'make a fuss about little things', '这点小事不要大惊小怪。'),
  c('独一无二', 'one of a kind', '每个人都是独一无二的。'),
  c('耳目一新', 'fresh and new', '新教室让人耳目一新。'),
  c('家家户户', 'every family', '过年时家家户户都很开心。'),
  c('见义勇为', 'bravely do what is right', '我们要学习见义勇为的精神。'),
  c('交头接耳', 'whisper to each other', '上课时不要交头接耳。'),
  c('惊天动地', 'earth-shaking', '外面传来惊天动地的声音。'),
  c('精打细算', 'plan spending carefully', '妈妈买东西总是精打细算。'),
  c('聚精会神', 'with full attention', '同学们聚精会神听老师讲课。'),
  c('千家万户', 'every home', '电视已经走进了千家万户。'),
  c('前所未有', 'never before', '这是前所未有的大雪。'),
  c('迫不及待', "can't wait", '他迫不及待打开了礼物。'),
  c('情不自禁', "can't help it", '听到笑话，他情不自禁笑了。'),
  c('脱口而出', 'say without thinking', '老师一问，他就脱口而出。'),
  c('万无一失', 'perfectly safe, sure to work', '我们这样做万无一失。'),
  c('微不足道', 'too small to matter', '这是一件微不足道的小事。'),
  c('无家可归', 'with no home to go to', '我们帮助无家可归的小猫。'),
  c('无精打采', 'tired and listless', '他没睡好，今天无精打采。'),
  c('无微不至', 'caring in every way', '妈妈对我们照顾得无微不至。'),
  c('一无所知', 'know nothing about it', '我对这件事一无所知。'),
  c('勇往直前', 'march bravely forward', '遇到困难也要勇往直前。'),
  c('与众不同', 'different from everyone', '他画的画与众不同。'),
  c('赞不绝口', 'full of praise', '大家对妈妈做的菜赞不绝口。'),
  c('引人注目', 'eye-catching', '她的红裙子很引人注目。'),
  c('一模一样', 'exactly alike', '这两本书一模一样。'),
  // level 5
  c('不假思索', 'without stopping to think', '他不假思索回答了问题。'),
  c('胡思乱想', 'let the mind run wild', '晚上不要胡思乱想，早点睡。'),
  c('记忆犹新', 'still fresh in the memory', '那次旅行我还记忆犹新。'),
  c('齐心协力', 'work together as one', '大家齐心协力打扫教室。'),
  c('乱七八糟', 'in a mess', '弟弟把房间弄得乱七八糟。'),
  c('依依不舍', "sad to say goodbye", '我们依依不舍离开了公园。'),
  c('一鼓作气', 'in one go', '他一鼓作气跑到了山上。'),
  c('胸有成竹', 'sure of oneself, with a plan ready', '考试前他胸有成竹。'),
  c('自相矛盾', 'contradict oneself', '他讲的故事自相矛盾。'),
  c('犹豫不决', 'unable to decide', '买哪一个，他犹豫不决。'),
  c('毫不犹豫', 'without a moment\'s doubt', '他毫不犹豫举起了手。'),
  c('朝夕相处', 'together day after day', '同学们朝夕相处，感情很好。'),
  c('得不偿失', 'not worth it', '不睡觉玩游戏得不偿失。'),
  c('惊慌失措', 'panic', '遇到危险不要惊慌失措。'),
  // level 6
  c('半途而废', 'give up halfway', '我们做事不能半途而废。'),
  c('大同小异', 'much the same', '这两个故事大同小异。'),
  c('东奔西走', 'rush here and there', '爸爸为了工作东奔西走。'),
  c('画蛇添足', 'spoil it by adding too much', '这样写就是画蛇添足了。'),
  c('灵机一动', 'have a bright idea', '他灵机一动，想出了办法。'),
  c('七嘴八舌', 'everyone talking at once', '大家七嘴八舌说个不停。'),
  c('亡羊补牢', 'fix it late rather than never', '亡羊补牢，现在学还不晚。'),
  c('无忧无虑', 'carefree', '小鸟在天上飞，无忧无虑。'),
  c('心灵手巧', 'clever with one\'s hands', '奶奶心灵手巧，会做衣服。'),
  c('异口同声', 'say together with one voice', '大家异口同声回答老师。'),
  c('争分夺秒', 'race against the clock', '他争分夺秒做作业。'),
  c('左顾右盼', 'look left and right', '他在门口左顾右盼。'),
  c('三番五次', 'again and again', '妈妈三番五次叫他起床。'),
  c('理直气壮', 'bold because one is right', '他没有做错，说话理直气壮。'),
  c('恰到好处', 'just right', '这道菜的味道恰到好处。'),
];

const LEVEL = new Map(BUILTIN.map((ch) => [ch.char, ch.level as number]));
const BY_TEXT = new Map(CHENGYU.map((x) => [x.text, x]));
export const chengyuLevel = (text: string): number => Math.max(...Array.from(text).map((ch) => LEVEL.get(ch) ?? 7));
export const chengyuOf = (text: string): Chengyu | undefined => BY_TEXT.get(text);

/** Where the pinyin library reads a 成语 wrong (final review I2). */
const PINYIN_FIXES: Record<string, string> = {
  说干就干: 'shuō gàn jiù gàn', 一言一行: 'yì yán yì xíng', 粗心大意: 'cū xīn dà yì', 一动不动: 'yí dòng bù dòng',
};
export const chengyuPinyin = (text: string): string => PINYIN_FIXES[text] ?? pinyin(text);

/**
 * Characters that also make a real phrase in a 成语's gap (千门万户 for 千家万户; final review I5): never offered as wrong
 * in completing it. From CC-CEDICT's four-character entries, plus everyday variants it doesn't list.
 */
const NEAR_MISSES: Record<string, string> = {
  不相上下: '分', 天长地久: '日', 一举一动: '言', 一言不发: '语合', 一言一行: '动', 各式各样: '色', 力所能及: '不', 兴高采烈: '彩',
  争先恐后: '前', 出人意料: '外', 耳目一新: '面', 前所未有: '见闻', 情不自禁: '喜', 万无一失: '百', 无精打采: '没彩', 无微不至: '所',
  一无所知: '动长有闻', 勇往直前: '一', 引人注目: '意', 齐心协力: '同合', 胸有成竹: '算', 惊慌失措: '色', 七嘴八舌: '张', 无忧无虑: '思',
  异口同声: '众', 千家万户: '门', 全心全意: '力', 一路平安: '生', 成千上万: '百', 一年到头: '天', 一天到晚: '头',
};
export const nearMisses = (text: string): string => NEAR_MISSES[text] ?? '';

/** 成语 used before a verb, like an adverb (他一心一意写字); the rest describe something (花五颜六色). */
const ADVERBIAL = new Set([
  '不知不觉', '从早到晚', '一天到晚', '说干就干', '不由自主', '千方百计', '全心全意', '日复一日', '思前想后', '一不小心', '一心一意', '一年到头',
  '随时随地', '自然而然', '不约而同', '成群结队', '断断续续', '接二连三', '目不转睛', '轻而易举', '想方设法', '兴高采烈', '争先恐后', '自始至终',
  '诚心诚意', '聚精会神', '迫不及待', '情不自禁', '不假思索', '齐心协力', '依依不舍', '一鼓作气', '毫不犹豫', '东奔西走', '异口同声', '争分夺秒', '三番五次',
]);
/** Near-synonyms: either could fill the other's sentence, so they're never offered against each other (final review I7). */
const SAME = [
  '一天到晚 从早到晚 一年到头 日复一日', '一心一意 全心全意 诚心诚意 聚精会神 目不转睛', '东张西望 左顾右盼 交头接耳', '千方百计 想方设法',
  '形形色色 各式各样 五花八门 五颜六色 丰富多彩 应有尽有 千变万化', '一言不发 一动不动', '不约而同 异口同声 不由自主 情不自禁',
  '意想不到 出人意料 不可思议 突如其来 大吃一惊 喜出望外', '前所未有 难得一见', '自由自在 无忧无虑', '一路平安 一路顺风 心想事成',
  '远近闻名 举世闻名 众所周知 引人注目', '一模一样 大同小异 不相上下', '独一无二 与众不同', '显而易见 一目了然', '理所当然 合情合理',
  '半信半疑 犹豫不决', '依依不舍 念念不忘', '家家户户 千家万户', '兴高采烈 喜出望外', '胸有成竹 理直气壮', '无精打采 力不从心',
  '胡思乱想 思前想后', '乱七八糟 一干二净', '不知不觉 自然而然',
].map((g) => new Set(g.split(' ')));
const sameAs = (a: string, b: string) => SAME.some((g) => g.has(a) && g.has(b));

/**
 * Wrong choices for "which 成语 fits" (final review I7): his own 成语 first, then built-in ones used the other way (an adverb-like
 * 成语 against a describing one, so only one fits the sentence), near its level; never a near-synonym.
 */
export function idiomWrongs(text: string, rng: Rng, own: string[] = []): string[] {
  const known = BY_TEXT.has(text);
  const adverb = ADVERBIAL.has(text);
  const fits = (t: string) => t !== text && !sameAs(text, t) && (!known || !BY_TEXT.has(t) || ADVERBIAL.has(t) !== adverb);
  const level = chengyuLevel(text);
  const mine = [...new Set(own)].filter(fits);
  const others = CHENGYU.map((x) => x.text).filter((t) => fits(t) && !mine.includes(t));
  const near = others.filter((t) => Math.abs(chengyuLevel(t) - level) <= 1);
  const rest = others.filter((t) => !near.includes(t) && chengyuLevel(t) <= level + 1);
  return [...shuffle(mine, rng), ...shuffle(near, rng), ...shuffle(rest, rng)].slice(0, 3);
}

/** A 成语 to use with a word: built-in, or one of his school 成语 (on the iPad only). */
export interface Idiom { text: string; pinyin: string; meaning?: string; sentences: string[]; school: boolean }

const once = (text: string, part: string) => { const at = text.indexOf(part); return at >= 0 && text.indexOf(part, at + 1) < 0; };

/** A school 成语: a four-character word the parent or a worksheet tagged 成语. */
export const isIdiomWord = (w: Word): boolean => !!w.tags?.includes('成语') && Array.from(w.text).length === 4;

/** A school 成语 word as a 成语: his class sentences first, then the list's; the parent's meaning, else the list's. */
export function idiomOf(w: Word): Idiom | null {
  if (!isIdiomWord(w)) return null;
  const built = chengyuOf(w.text);
  const own = (w.sentences ?? []).map((s) => s.text).filter((s) => once(s, w.text));
  return { text: w.text, pinyin: built ? chengyuPinyin(w.text) : w.pinyin, meaning: w.meaning ?? built?.meaning, sentences: [...own, ...(built?.sentences ?? [])], school: true };
}

/**
 * The 成语 that use a word once (spec §4): his school 成语 first (any level), then built-in ones at his level, one level up,
 * then easier ones, the nearest first; never above one level up. Once only: a second copy would give a completion away.
 */
/** A built-in 成语 as an Idiom. */
export function builtinIdiom(text: string): Idiom | undefined {
  const x = chengyuOf(text);
  return x && { text: x.text, pinyin: chengyuPinyin(x.text), meaning: x.meaning, sentences: [...x.sentences], school: false };
}

/** Tone changes that don't make another reading (一 yí/yì, 不 bú, 七 qí, 八 bá). */
const SANDHI = new Set([...'一不七八']);
/** The 成语 reads the word the way its card does (final review I1: spec §2.1, one reading per card); a 轻声 counts. */
function readsAs(idiom: Idiom, word: Word): boolean {
  const at = Array.from(idiom.text.slice(0, idiom.text.indexOf(word.text))).length;
  const chars = Array.from(word.text);
  const own = word.pinyin.split(' ');
  const got = idiom.pinyin.split(' ').slice(at, at + chars.length);
  return got.length === own.length && got.every((s, i) => {
    const a = syllableTone(s), b = syllableTone(own[i]!);
    return s === own[i] || (a.base === b.base && (a.tone === 5 || b.tone === 5 || SANDHI.has(chars[i]!)));
  });
}

export function idiomsFor(word: Word, level: number, pool: Word[]): Idiom[] {
  const school = pool.filter((w) => !w.paused && w.text !== word.text && isIdiomWord(w) && once(w.text, word.text)).map((w) => idiomOf(w)!).filter((i) => readsAs(i, word));
  const taken = new Set(school.map((i) => i.text));
  const rank = (l: number) => (l === level ? 0 : l === level + 1 ? 1 : 2 + (level - l));
  const built = CHENGYU.filter((x) => x.text !== word.text && !taken.has(x.text) && once(x.text, word.text) && chengyuLevel(x.text) <= level + 1)
    .map((x) => ({ x, r: rank(chengyuLevel(x.text)) }))
    .sort((a, b) => a.r - b.r)
    .map(({ x }) => builtinIdiom(x.text)!)
    .filter((i) => readsAs(i, word));
  return [...school, ...built];
}

/** His level (spec §4): the level of the next built-in word he hasn't started, in rank order; 7 when he has started them all. */
export function learnerLevel(words: Word[], started: ReadonlySet<string>): number {
  const next = words.filter((w) => w.source === 'builtin' && !w.paused && !started.has(w.id)).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))[0];
  if (next) return next.level ?? 1;
  return words.some((w) => w.source === 'builtin') ? 7 : 1;
}
