// One meaning question per built-in passage (spec 2026-10-12 §3): 谁 / 哪里 / 什么 / 为什么, three choices, `answer` the right
// one, `sentence` the passage's sentence (splitSentences) that answers it. Characters from the passage or HSK levels 1–2
// (scripts/check-content.ts checks it). The right choice's place varies; the step shows them in this order.
import type { PassageQuestion } from '../types';

export const PASSAGE_QUESTIONS: Readonly<Record<string, PassageQuestion>> = {
  p01: { q: '谁是老师？', choices: ['爸爸', '妈妈', '哥哥'], answer: 1, sentence: 1 },
  p02: { q: '我先做什么？', choices: ['吃早饭', '坐车', '洗手'], answer: 2, sentence: 1 },
  p03: { q: '我们为什么不能去外面玩？', choices: ['下雨了', '天黑了', '弟弟病了'], answer: 0, sentence: 0 },
  p04: { q: '我的好朋友叫什么？', choices: ['小红', '小明', '小马'], answer: 1, sentence: 0 },
  p05: { q: '爸爸送我什么？', choices: ['一本新书', '一个书包', '一个红包'], answer: 0, sentence: 1 },
  p06: { q: '谁病了？', choices: ['妈妈', '医生', '弟弟'], answer: 2, sentence: 0 },
  p07: { q: '我想要什么？', choices: ['水果', '新书包', '牛奶'], answer: 1, sentence: 3 },
  p08: { q: '我和爷爷在哪里看星星？', choices: ['门口', '学校', '车上'], answer: 0, sentence: 1 },
  p09: { q: '我写了哪两个字？', choices: ['小和月', '人和口', '大和天'], answer: 2, sentence: 2 },
  p10: { q: '小鸟先在哪里？', choices: ['房间里', '树上', '门口'], answer: 1, sentence: 0 }, // 先: it flies away later (final review M3)
  p11: { q: '桌子在哪里？', choices: ['床的旁边', '门的前面', '房间外面'], answer: 0, sentence: 2 },
  p12: { q: '谁做的菜最好吃？', choices: ['妈妈', '爸爸', '奶奶'], answer: 2, sentence: 2 },
  p13: { q: '我为什么喝了一大杯水？', choices: ['天很热', '我跑累了', '水很好喝'], answer: 1, sentence: 2 },
  p14: { q: '我为什么站着？', choices: ['找不到地方坐', '我喜欢站着', '车上很热'], answer: 0, sentence: 2 },
  p15: { q: '爷爷奶奶给我们什么？', choices: ['新衣服', '水果', '红包'], answer: 2, sentence: 2 },
  p16: { q: '我帮妈妈做什么？', choices: ['洗菜', '买东西', '写作业'], answer: 0, sentence: 1 },
  p17: { q: '谁找到了小马？', choices: ['小马', '牛爷爷', '牛奶奶'], answer: 1, sentence: 2 }, // who's in the story, not the sun or wind (final review M3)
  p18: { q: '人们为什么笑了？', choices: ['风大了', '下雨了', '天热了'], answer: 2, sentence: 2 },
  p19: { q: '妈妈说先做什么？', choices: ['做作业', '看电视', '唱歌'], answer: 0, sentence: 1 },
  p20: { q: '学校里有什么？', choices: ['一个大商店', '一个大球场', '一个医院'], answer: 1, sentence: 1 },
};
