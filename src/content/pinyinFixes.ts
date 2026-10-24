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
  排得: 'pái de', 学得: 'xué de', 妹妹选: 'mèi mei xuǎn', 漂亮: 'piào liang', 长着: 'zhǎng zhe',
  // Task 9's review: the neutral tone in 眼睛, 时候 and 星星 (they read yǎn jīng, shí hòu, xīng xīng)
  眼睛: 'yǎn jing', 时候: 'shí hou', 星星: 'xīng xing',
  // our 三上 passages (Task 10): 得 after a verb de, 地 after 好好 de, 种 (planting) zhòng, 长 (growing) zhǎng, 倒 (pouring) dào,
  // 一 in 一X一X before a fourth or third tone, 子 neutral in 裤子 裙子 箱子, 东西 (things) dōng xi, 意思 si, 只 (only) zhǐ
  玩得: 'wán de', 急得: 'jí de', 晒得: 'shài de', 好好地: 'hǎo hǎo de', 种了: 'zhòng le', 种好了: 'zhòng hǎo le', 种到: 'zhòng dào',
  越长越高: 'yuè zhǎng yuè gāo', 倒上水: 'dào shàng shuǐ', 一件一件: 'yí jiàn yí jiàn', 一本一本: 'yì běn yì běn',
  裤子: 'kù zi', 裙子: 'qún zi', 箱子: 'xiāng zi', 爸爸的: 'bà ba de', 妈妈打开: 'mā ma dǎ kāi', 东西: 'dōng xi', 有意思: 'yǒu yì si',
  只留下: 'zhǐ liú xià',
  // Task 10's review: 背 (carrying) bēi, 这种 (this kind) zhǒng, 妈妈 before 走 keeps its neutral tone
  背上书包: 'bēi shàng shū bāo', 这种: 'zhè zhǒng', 妈妈走: 'mā ma zǒu',
  // Task 11: the neutral tone 现代汉语词典 marks as required (and Singapore's textbooks print), for word cards and passages alike;
  // left toned where the dictionary marks it optional or usage varies: 这里 那里 哪里 心里 知道 照顾 关系 打扫
  朋友: 'péng you', 衣服: 'yī fu', 早上: 'zǎo shang', 晚上: 'wǎn shang', 护士: 'hù shi', 告诉: 'gào su', 明白: 'míng bai',
  地方: 'dì fang', 先生: 'xiān sheng', 客气: 'kè qi', 舒服: 'shū fu', 意思: 'yì si', 事情: 'shì qing', 学生: 'xué sheng',
  谢谢: 'xiè xie', 名字: 'míng zi', 月亮: 'yuè liang', 窗户: 'chuāng hu', 麻烦: 'má fan', 热闹: 'rè nao', 干净: 'gān jing',
  商量: 'shāng liang', 消息: 'xiāo xi', 打算: 'dǎ suan', 收拾: 'shōu shi', 招呼: 'zhāo hu', 葡萄: 'pú tao', 玻璃: 'bō li',
  当地方言: 'dāng dì fāng yán', // 地方 inside 当地 + 方言 keeps its tone
  // 子 as a noun suffix is zi (pinyin-pro read zǐ); 棋子 stays qí zǐ
  包子: 'bāo zi', 饺子: 'jiǎo zi', 橙子: 'chéng zi', 虫子: 'chóng zi', 果子: 'guǒ zi', 豆子: 'dòu zi', 刀子: 'dāo zi',
  法子: 'fǎ zi', 剪子: 'jiǎn zi', 窗子: 'chuāng zi', 步子: 'bù zi', 一下子: 'yí xià zi',
  炸鸡: 'zhá jī', 油炸: 'yóu zhá', 种植: 'zhòng zhí', 种花的: 'zhòng huā de', 勒紧: 'lēi jǐn', // 种花的: 写一写's piece (never 种花 alone)
  // 三上 and 三下 sentences (2026-10-18): 夹 is jiā (pinyin-pro read a lone 夹 jiá: 夹在, 夹菜, 夹到)
  夹: 'jiā', 夹子: 'jiā zi',
  // 得 after a verb or adjective is de (it read dé), 地 after an adverb de (it read dì), 子 as a noun suffix zi (it read zǐ)
  站得: 'zhàn de', 翻得: 'fān de', 吃得: 'chī de', 弹得: 'tán de', 踢得: 'tī de', 吹得: 'chuī de', 考得: 'kǎo de', 画得: 'huà de',
  说得: 'shuō de', 扔得: 'rēng de', 开得: 'kāi de', 溜得: 'liū de', 跳得: 'tiào de', 惊得: 'jīng de', 大得: 'dà de', 高得: 'gāo de',
  睡得: 'shuì de', 过得: 'guò de', 叫得: 'jiào de', 听得: 'tīng de', 冷得: 'lěng de', 怕得: 'pà de', 热得: 'rè de', 美得: 'měi de',
  算得: 'suàn de', 转得: 'zhuàn de', 兴奋得: 'xīng fèn de',
  自由地: 'zì yóu de', 七嘴八舌地: 'qī zuǐ bā shé de', 吃惊地: 'chī jīng de', 慢慢地: 'màn màn de', 分散地: 'fēn sàn de',
  笨手笨脚地: 'bèn shǒu bèn jiǎo de', 偷偷地: 'tōu tōu de', 哈哈地: 'hā hā de',
  李子: 'lǐ zi', 肚子: 'dù zi', 脑子: 'nǎo zi', 板子: 'bǎn zi', 蚊子: 'wén zi', 袋子: 'dài zi', 轮子: 'lún zi', 网子: 'wǎng zi',
  // 种 (planting) zhòng, 多重 (how heavy) zhòng, 粗心大意 yì (it read yi)
  种在: 'zhòng zài', 多重: 'duō zhòng', 粗心大意: 'cū xīn dà yì',
  猩猩: 'xīng xing', 脑袋: 'nǎo dai', 功夫: 'gōng fu', 睡不着: 'shuì bù zháo', 穿得: 'chuān de', 一加一: 'yī jiā yī',
  // a 多音字's other-reading words (zuciPicks.ts OTHER_READING_ZUCI): 背 carrying bēi, 数 counting shǔ, 系 tying jì, 刹车 shā
  背书包: 'bēi shū bāo', 背包: 'bēi bāo', 数一数: 'shǔ yi shǔ', 系鞋带: 'jì xié dài', 刹车: 'shā chē', 胡萝卜: 'hú luó bo',
  乌龟背着重重的壳: 'wū guī bēi zhe zhòng zhòng de ké', 蜗牛背着: 'wō niú bēi zhe', // carrying (bēi), heavy (zhòng)
  // 二下 stretch passages (2026-10-24 Task 13): 得 after a verb de, 地 after an adverb de, 数 (counting) shǔ, 一 neutral in 等一等
  慌得: 'huāng de', 洗得: 'xǐ de', 开心地: 'kāi xīn de', 静静地: 'jìng jìng de', 大声地: 'dà shēng de', 得意地: 'dé yì de',
  难过地: 'nán guò de', 平平安安地: 'píng píng ān ān de', 数了又数: 'shǔ le yòu shǔ', 等一等: 'děng yi děng', 爸爸说: 'bà ba shuō',
  一块一块: 'yí kuài yí kuài',
  // Task 13's review: 切 + 鸡 qiē, 巴刹 (pasar) bā shā in Singapore usage, 得 after 打扫 and 笑 de
  切鸡: 'qiē jī', 巴刹: 'bā shā', 打扫得: 'dǎ sǎo de', 笑得: 'xiào de',
  // 三上 stretch passages (2026-10-24 Task 14): 只 (only) zhǐ, 子 neutral in 棒子 罐子, 得 after a verb de, 一 before 片 yí,
  // 外婆家 jiā, 舍不得 shě bu de, 还书 (return) huán, 种起来 (planting) zhòng
  只好: 'zhǐ hǎo', 只喂: 'zhǐ wèi', 棒子: 'bàng zi', 罐子: 'guàn zi', 冲得: 'chōng de', 看得太入迷: 'kàn de tài rù mí',
  累得: 'lèi de', 吓得: 'xià de', 逗得: 'dòu de', 一片漆黑: 'yí piàn qī hēi', 外婆家: 'wài pó jiā', 舍不得: 'shě bu de',
  还书: 'huán shū', 种起来: 'zhòng qǐ lái',
  // 三上 stretch passages p101–p113 (2026-10-24 Task 15): 种 (planting) zhòng, 长 (growing) zhǎng, 得 after a verb de, 地 after
  // an adverb de, 教 (teaching) jiāo, 卷 (rolling) juǎn, 背 (carrying) bēi, 倒 (pouring) dào, 只 (only) zhǐ, 钻 (boring) zuān,
  // 空 (vacant) kòng, 爷爷 neutral after 老
  种一棵: 'zhòng yì kē', 能长多高: 'néng zhǎng duō gāo', 浇得: 'jiāo de', 整齐地: 'zhěng qí de', 教您: 'jiāo nín',
  一次又一次地: 'yí cì yòu yí cì de', 卷走: 'juǎn zǒu', 舔得: 'tiǎn de', 看得很远: 'kàn de hěn yuǎn', 牢牢地: 'láo láo de',
  扎得: 'zhā de', 背着很重: 'bēi zhe hěn zhòng', 倒掉: 'dào diào', 只会说一点: 'zhǐ huì shuō yì diǎn', 钻出: 'zuān chū',
  空座位: 'kòng zuò wèi', 妈妈的裤子: 'mā ma de kù zi', 位老爷爷: 'wèi lǎo yé ye',
});
