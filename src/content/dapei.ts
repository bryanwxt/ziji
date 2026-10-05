/**
 * 搭配: words that go together (spec 2026-10-05 §3.2 rung 2, §6), each with three wrong partners written for it — never
 * generated — so a right answer can never be marked wrong (final review, phase B). Everyday verb + object (and two
 * adverb + verb) pairs a P2 child meets, in characters up to about HSK 3. Verbs that go with almost anything (看, 买, 做…)
 * aren't here: no partner is surely wrong for them. Written for this app; never from class material.
 */
export interface Dapei { verb: string; noun: string; wrong: [string, string, string] }

const d = (verb: string, noun: string, wrong: string): Dapei => ({ verb, noun, wrong: wrong.split(' ') as [string, string, string] });

export const DAPEI: readonly Dapei[] = [
  d('穿', '衣服', '牙 饭 歌'), d('穿', '鞋', '水 书 舞'), d('戴', '帽子', '饭 牙 球'), d('戴', '眼镜', '水 歌 饭'),
  d('吃', '饭', '歌 舞 鞋'), d('吃', '水果', '歌 舞 鞋'), d('吃', '药', '歌 舞 鞋'), d('喝', '水', '歌 鞋 舞'),
  d('喝', '牛奶', '歌 鞋 舞'), d('喝', '茶', '歌 鞋 门'), d('读', '书', '饭 鞋 牙'), d('读', '课文', '饭 鞋 牙'),
  d('写', '字', '饭 牙 鞋'), d('写', '作业', '饭 牙 鞋'), d('唱', '歌', '饭 鞋 牙'), d('跳', '舞', '饭 书 牙'),
  d('打', '电话', '歌 舞 茶'), d('打', '篮球', '歌 舞 茶'), d('骑', '自行车', '饭 歌 书'), d('坐', '飞机', '歌 牙 饭'),
  d('坐', '公共汽车', '歌 牙 饭'), d('坐', '船', '歌 牙 饭'), d('开', '车', '歌 牙 字'), d('开', '门', '歌 牙 字'),
  d('关', '门', '歌 牙 饭'), d('开', '灯', '歌 牙 字'), d('关', '灯', '歌 牙 饭'), d('洗', '手', '歌 字 饭'),
  d('洗', '脸', '歌 字 舞'), d('洗', '衣服', '歌 字 舞'), d('刷', '牙', '歌 饭 字'), d('上', '课', '牙 鞋 歌'),
  d('下', '雨', '牙 鞋 歌'), d('听', '音乐', '牙 鞋 饭'), d('说', '话', '牙 鞋 饭'), d('讲', '故事', '牙 鞋 饭'),
  d('回', '家', '牙 歌 饭'), d('过', '马路', '牙 歌 鞋'), d('拍', '照片', '牙 歌 饭'), d('种', '花', '牙 歌 鞋'),
  d('种', '树', '牙 歌 雨'), d('送', '礼物', '牙 雨 舞'), d('照顾', '妹妹', '作业 雨 歌'), d('帮助', '别人', '雨 歌 牙'),
  d('学习', '汉语', '雨 牙 鞋'), d('认真', '学习', '下雨 生病 发烧'), d('努力', '学习', '下雨 生病 发烧'), d('准备', '考试', '雨 牙 鞋'),
  d('参加', '比赛', '雨 牙 鞋'), d('完成', '作业', '雨 牙 鞋'), d('回答', '问题', '雨 牙 鞋'), d('打开', '书', '雨 歌 舞'),
  d('用', '筷子', '雨 歌 舞'), d('爬', '山', '牙 歌 饭'), d('借', '书', '雨 牙 舞'), d('还', '书', '雨 牙 舞'),
  d('交', '朋友', '雨 牙 舞'), d('问', '问题', '雨 牙 鞋'), d('整理', '书包', '雨 歌 舞'), d('打扫', '房间', '雨 歌 舞'),
  d('擦', '桌子', '雨 歌 舞'), d('包', '饺子', '雨 歌 舞'), d('过', '生日', '雨 牙 舞'), d('举', '手', '雨 歌 饭'),
  d('喂', '小猫', '雨 歌 字'), d('寄', '信', '雨 歌 牙'), d('接', '电话', '雨 歌 牙'), d('玩', '游戏', '雨 牙 饭'),
];

const SET = new Set(DAPEI.map((x) => `${x.verb}|${x.noun}`));
export const isDapei = (verb: string, noun: string) => SET.has(`${verb}|${noun}`);
