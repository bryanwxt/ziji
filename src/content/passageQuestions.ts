// Two meaning questions per built-in passage (spec 2026-10-15 §6), asked in turn (`history.q`), so a revisit asks the other.
// Each asks 谁 / 哪里 / 什么 / 为什么 / 怎么样 with three choices; `answer` is the right one in the stored order (the step shuffles
// them at each showing); `sentence` is the passage's sentence (splitSentences) that answers it, read again after a miss. Its
// characters are from the passage or his book's lists through the passage's term. scripts/check-content.ts enforces the
// guess-proofing: all three choices in the passage or none, choice lengths within 2 characters, no content character of the answer
// in the question, the answer never the passage's most frequent word, and the two questions answered by different sentences.
import type { PassageQuestion } from '../types';

export const PASSAGE_QUESTIONS: Readonly<Record<string, readonly PassageQuestion[]>> = {
  p01: [
    { q: '谁是老师？', choices: ['爸爸', '妈妈', '哥哥'], answer: 1, sentence: 1 },
    { q: '我家有什么人？', choices: ['姐姐和弟弟', '奶奶和爷爷', '哥哥和妹妹'], answer: 2, sentence: 0 },
  ],
  p02: [
    { q: '我先做什么？', choices: ['吃早饭', '坐车', '洗手'], answer: 2, sentence: 1 },
    { q: '早上七点，我做什么？', choices: ['坐车', '起床', '吃早饭'], answer: 1, sentence: 0 },
  ],
  p03: [
    { q: '我们为什么不能去外面玩？', choices: ['在下雨', '弟弟病了', '天黑了'], answer: 0, sentence: 0 },
    { q: '我和弟弟在家里做什么？', choices: ['打球跑步', '看书听歌', '吃饭写字'], answer: 1, sentence: 1 },
  ],
  p04: [
    { q: '小明是我的什么人？', choices: ['哥哥', '弟弟', '好友'], answer: 2, sentence: 0 },
    { q: '我们常常一起做什么？', choices: ['玩', '笑', '帮别人'], answer: 0, sentence: 3 },
  ],
  p05: [
    { q: '爸爸送我什么？', choices: ['一个球', '一只鸟', '一本书'], answer: 2, sentence: 1 },
    { q: '谁给我唱生日歌？', choices: ['妈妈', '哥哥', '爸爸'], answer: 1, sentence: 2 },
  ],
  p06: [
    { q: '弟弟为什么去医院？', choices: ['笑了', '病了', '好了'], answer: 1, sentence: 0 },
    { q: '谁说“没关系”？', choices: ['妈妈', '弟弟', '医生'], answer: 2, sentence: 2 },
  ],
  p07: [
    { q: '我想要什么？', choices: ['水果', '新书包', '牛奶'], answer: 1, sentence: 3 },
    { q: '我们买了什么？', choices: ['米和鸡蛋', '鱼和肉', '饭和菜'], answer: 0, sentence: 1 },
  ],
  p08: [
    { q: '我和爷爷坐在什么地方看星星？', choices: ['天上', '飞机', '门口'], answer: 2, sentence: 1 },
    { q: '我长大了要怎么去看星星？', choices: ['坐上火车', '坐上飞机', '坐上大车'], answer: 1, sentence: 3 },
  ],
  p09: [
    { q: '我写了哪两个字？', choices: ['小和月', '人和口', '大和天'], answer: 2, sentence: 2 },
    { q: '写字的时候，要怎么做？', choices: ['好好地坐', '快快地跑', '高高地跳'], answer: 0, sentence: 1 },
  ],
  p10: [
    { q: '我想跟小鸟做什么？', choices: ['唱歌', '一起玩', '飞走'], answer: 1, sentence: 2 },
    { q: '我想问小鸟什么？', choices: ['你会唱歌吗', '你会写字吗', '明天还会来吗'], answer: 2, sentence: 3 },
  ],
  p11: [
    { q: '床的旁边有什么？', choices: ['桌子', '书', '作业'], answer: 0, sentence: 2 },
    { q: '我坐在桌子前面做什么？', choices: ['吃饭喝水', '看书写字', '打球跑步'], answer: 1, sentence: 3 },
  ],
  p12: [
    { q: '奶奶笑着说什么？', choices: ['少吃点', '不吃了', '多吃点'], answer: 2, sentence: 3 },
    { q: '桌上有什么？', choices: ['水果和鱼', '米饭和肉', '牛奶和水'], answer: 1, sentence: 1 },
  ],
  p13: [
    { q: '我为什么喝了一大杯水？', choices: ['天很好', '我跑累了', '水很好喝'], answer: 1, sentence: 2 },
    { q: '下课了，同学们都去做什么？', choices: ['打球、跑步', '上课、写字', '吃饭、喝水'], answer: 0, sentence: 1 },
  ],
  p14: [
    { q: '我在车上为什么站着？', choices: ['我喜欢站着', '没有地方坐', '车上很热'], answer: 1, sentence: 2 },
    { q: '谁在门口等我？', choices: ['我的老师', '我的妈妈', '我的同学'], answer: 2, sentence: 3 },
  ],
  p15: [
    { q: '我们穿上了什么？', choices: ['新的衣服', '爸爸的衣服', '哥哥的衣服'], answer: 0, sentence: 1 },
    { q: '我对爷爷奶奶说什么？', choices: ['你们好', '谢谢你们', '再见了'], answer: 1, sentence: 2 },
  ],
  p16: [
    { q: '我帮了妈妈什么忙？', choices: ['洗衣服', '买东西', '洗菜做饭'], answer: 2, sentence: 1 },
    { q: '星期天，妈妈怎么了？', choices: ['很忙', '很开心', '长大了'], answer: 0, sentence: 0 },
  ],
  p17: [
    { q: '小马为什么找不到家了？', choices: ['天黑了', '跑得很远', '下雨了'], answer: 1, sentence: 1 },
    { q: '小马对牛爷爷说什么？', choices: ['对不起', '你好吗', '谢谢你'], answer: 2, sentence: 2 },
  ],
  p18: [
    { q: '人们为什么高兴地笑了？', choices: ['太阳出来了', '风大大地吹', '人们都很冷'], answer: 0, sentence: 2 },
    { q: '风大大地吹，人们怎么了？', choices: ['笑了', '很冷', '高兴'], answer: 1, sentence: 1 },
  ],
  p19: [
    { q: '妈妈说先做什么？', choices: ['电视', '唱歌', '作业'], answer: 2, sentence: 1 },
    { q: '电视里的小马在做什么？', choices: ['唱歌', '做作业', '看电视'], answer: 0, sentence: 3 },
  ],
  p20: [
    { q: '学校里有一个什么？', choices: ['树和花', '大球场', '三十个同学'], answer: 1, sentence: 1 },
    { q: '我很喜欢谁？', choices: ['爸爸和妈妈', '同学和老师', '哥哥和姐姐'], answer: 1, sentence: 3 },
  ],

  // Global Storybooks (src/content/storybooks.json)
  'gsb:0001-1': [
    { q: '他的什么太低了？', choices: ['床', '门口', '自行车'], answer: 1, sentence: 1 },
    { q: '他用什么吃饭？', choices: ['很高的椅子', '很长的锄柄', '很长的叉子'], answer: 2, sentence: 10 },
  ],
  'gsb:0008-1': [
    { q: '我在做什么？', choices: ['挥手', '唱歌', '聆听'], answer: 1, sentence: 0 },
    { q: '他在做什么？', choices: ['叫喊', '唱歌', '拍手'], answer: 0, sentence: 4 },
  ],
  'gsb:0009-1': [
    { q: '我在什么上面找小猫猫？', choices: ['床', '碗柜', '篮子'], answer: 1, sentence: 2 },
    { q: '我在什么后面找小猫猫？', choices: ['篮子', '碗柜', '沙发'], answer: 2, sentence: 3 },
  ],
  'gsb:0030-1': [
    { q: '谁说故事的时候，我很高兴？', choices: ['爸爸', '奶奶', '妈妈'], answer: 1, sentence: 1 },
    { q: '我什么时候感到很难过？', choices: ['奶奶说故事', '妈妈抱着我', '爸爸没有钱'], answer: 2, sentence: 3 },
  ],
  'gsb:0087-1': [
    { q: '谁正在熟睡？', choices: ['妈妈', '小妹妹', '爷爷'], answer: 1, sentence: 2 },
    { q: '最后我念给谁听？', choices: ['奶奶', '爸爸', '自己'], answer: 2, sentence: 8 },
  ],
  'gsb:0089-1': [
    { q: '卡莱早上醒来，跟什么说话？', choices: ['一棵树', '一片草', '一朵花'], answer: 0, sentence: 3 },
    { q: '“卡莱”是什么意思？', choices: ['又大又甜', '美好事物', '绿油油的'], answer: 1, sentence: 2 },
  ],
  'gsb:0089-2': [
    { q: '卡莱想把野花夹在什么地方？', choices: ['树荫里', '操场中间', '头发里'], answer: 2, sentence: 0 },
    { q: '卡莱想在树荫里做什么？', choices: ['读书', '开放', '长出枝叶'], answer: 0, sentence: 1 },
  ],
  'gsb:0089-3': [
    { q: '卡莱为什么要灌木长得壮壮的？', choices: ['可以结橙子', '不让坏人进来', '好看又好玩'], answer: 1, sentence: 0 },
    { q: '卡莱回家看橙子树，橙子怎么样？', choices: ['已经红了', '已经黄了', '还是绿的'], answer: 2, sentence: 2 },
  ],
  'gsb:0095-1': [
    { q: '谁睡过头了？', choices: ['弟弟', '妈妈', '爷爷'], answer: 0, sentence: 0 },
    { q: '妈妈提醒我别忘了什么？', choices: ['洗澡', '刷牙', '问好'], answer: 1, sentence: 7 },
  ],
  'gsb:0095-2': [
    { q: '上学的路上，我跟谁说话？', choices: ['我的妈妈', '我的弟弟', '我的老师'], answer: 1, sentence: 3 },
    { q: '我最喜欢做什么？', choices: ['学习', '好事', '玩'], answer: 2, sentence: 6 },
  ],
  'gsb:0120-1': [
    { q: '谁的头发最长？', choices: ['安娜', '图丽', '凯茜'], answer: 2, sentence: 2 },
    { q: '谁留着胡子？', choices: ['巴巴', '塔波', '腾巴'], answer: 0, sentence: 4 },
  ],
  'gsb:0231-1': [
    { q: '什么很热？', choices: ['天气', '太阳', '大风'], answer: 1, sentence: 1 },
    { q: '我看到了什么？', choices: ['打雷', '大风', '彩虹'], answer: 2, sentence: 7 },
  ],
  'gsb:0271-1': [
    { q: '两只脚用来做什么？', choices: ['踢踢球', '看看', '听听'], answer: 0, sentence: 1 },
    { q: '还有什么用来抱抱？', choices: ['两只小手', '两只眼睛', '两只脚'], answer: 0, sentence: 4 },
  ],
  'gsb:0302-1': [
    { q: '火可以用来做什么？', choices: ['让人变冷', '让人变暖', '让人变高'], answer: 1, sentence: 3 },
    { q: '火可以带来什么？', choices: ['雨水', '冷风', '亮光'], answer: 2, sentence: 4 },
  ],
  'gsb:0327-1': [
    { q: '水中有什么？', choices: ['斑马和鸟', '青蛙和鱼', '水牛和象'], answer: 1, sentence: 5 },
    { q: '谁和狮子一起喝水？', choices: ['大象', '斑马', '水牛'], answer: 0, sentence: 9 },
  ],
};
