import { customPinyin } from 'pinyin-pro';

/**
 * Readings pinyin-pro gets wrong in the app's own sentences. Exact phrases only: a broad rule like 心地 → xīn de
 * would break 心地善良 (xīn dì).
 */
customPinyin({
  还给: 'huán gěi',
  做得: 'zuò de',
  走得: 'zǒu de',
  做错了: 'zuò cuò le',
  小心地: 'xiǎo xīn de',
  不好意思地: 'bù hǎo yì si de',
  有礼貌地: 'yǒu lǐ mào de',
  // content audit 2026-10-15: 教 + a person or 书 is jiāo (it read jiào), 切 + food is qiē (qiè), 好好 is hǎo hǎo (hào)
  教我: 'jiāo wǒ', 教你: 'jiāo nǐ', 教他: 'jiāo tā', 教她: 'jiāo tā', 教书: 'jiāo shū', 教给: 'jiāo gěi', 教了: 'jiāo le',
  切肉: 'qiē ròu', 切菜: 'qiē cài', 切开: 'qiē kāi', 切了: 'qiē le', 切成: 'qiē chéng', 切黄瓜: 'qiē huáng guā',
  好好: 'hǎo hǎo', 做错了事: 'zuò cuò le shì', 看家具: 'kàn jiā jù', 一言一行: 'yì yán yì xíng', 夹住: 'jiā zhù',
  // the readings his lessons use (READING_FIXES): 炸鸡 zhá (not 种花: 这种花 is zhǒng — the 组词 carry zhòng themselves)
  // 朗读's passages (spec 2026-10-15 §2.2, reviewed when they joined the snapshot): 得 after a verb is de, 地 after an adverb de,
  // 长 + 得/高/出/在 (growing) zhǎng, 干 (doing) gàn, 以为 wéi, 我得 (must) děi, and 头发 before 放 is not 发放
  写得: 'xiě de', 跑得: 'pǎo de', 长得: 'zhǎng de', 长高: 'zhǎng gāo', 长出: 'zhǎng chū', 长在: 'zhǎng zài', 我得出差: 'wǒ děi chū chāi',
  干嘛: 'gàn má', 干农活: 'gàn nóng huó', 以为: 'yǐ wéi', 头发放: 'tóu fa fàng',
  高高兴兴地: 'gāo gāo xìng xìng de', 大大地: 'dà dà de', 高兴地: 'gāo xìng de', 很快地: 'hěn kuài de', 仔细地: 'zǐ xì de',
  远远地: 'yuǎn yuǎn de', 紧紧地: 'jǐn jǐn de', 尽情地: 'jìn qíng de', 伤心地: 'shāng xīn de', 快乐地: 'kuài lè de',
  // our 二上 passages (Task 8): 婆婆家 jiā (it read pó pó jia), 子 neutral in 鞋子 and 池子, 高兴得 de, 一个一个 yí gè yí gè
  婆婆家: 'pó po jiā', 鞋子: 'xié zi', 池子: 'chí zi', 高兴得: 'gāo xìng de', 一个一个: 'yí gè yí gè',
  // our 二下 passages (Task 9): 得 after a verb is de, 地 after 一块一块 de, 一 before a fourth or first tone in 一X一X, 衣服 fu,
  // 长着 (growing) zhǎng, 漂亮 piào liang (it read piāo liàng after 一条)
  一块一块地: 'yí kuài yí kuài de', 一滴一滴: 'yì dī yì dī', 一条一条: 'yì tiáo yì tiáo', 弄得: 'nòng de', 飞得: 'fēi de',
  排得: 'pái de', 学得: 'xué de', 妹妹选: 'mèi mei xuǎn', 中国衣服: 'zhōng guó yī fu', 漂亮: 'piào liang', 长着: 'zhǎng zhe',
  // Task 9's review: the neutral tone in 眼睛, 时候 and 星星 (they read yǎn jīng, shí hòu, xīng xīng)
  眼睛: 'yǎn jing', 时候: 'shí hou', 星星: 'xīng xing',
  // our 三上 passages (Task 10): 得 after a verb de, 地 after 好好 de, 种 (planting) zhòng, 长 (growing) zhǎng, 倒 (pouring) dào,
  // 一 in 一X一X before a fourth or third tone, 子 neutral in 裤子 裙子 箱子, 东西 (things) dōng xi, 意思 si, 只 (only) zhǐ
  玩得: 'wán de', 急得: 'jí de', 晒得: 'shài de', 好好地: 'hǎo hǎo de', 种了: 'zhòng le', 种好了: 'zhòng hǎo le', 种到: 'zhòng dào',
  越长越高: 'yuè zhǎng yuè gāo', 倒上水: 'dào shàng shuǐ', 一件一件: 'yí jiàn yí jiàn', 一本一本: 'yì běn yì běn',
  裤子: 'kù zi', 裙子: 'qún zi', 箱子: 'xiāng zi', 爸爸的: 'bà ba de', 妈妈打开: 'mā ma dǎ kāi', 东西: 'dōng xi', 有意思: 'yǒu yì si',
  只留下: 'zhǐ liú xià',
  炸鸡: 'zhá jī', 油炸: 'yóu zhá', 种植: 'zhòng zhí', 种花的: 'zhòng huā de', 勒紧: 'lēi jǐn', // 种花的: 写一写's piece (never 种花 alone)
});
