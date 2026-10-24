// The two 3-choice questions each built-in passage had before 2026-10-24 (spec 2026-10-15 §6), kept only until its six new
// questions are written (spec 2026-10-24 §5): a passage with no new questions yet is asked these, as a parent text's are. Each
// content task deletes the entries it replaces; the last one deletes this file.
import type { ParentQuestion } from '../../types';

export const LEGACY_QUESTIONS: Readonly<Record<string, readonly ParentQuestion[]>> = {

  // Global Storybooks (src/content/storybooks.json)
  'gsb:0001-1': [
    { q: '他的什么太低了？', choices: ['床', '门口', '自行车'], answer: 1, sentence: 1 },
    { q: '他买了什么？', choices: ['很长的床', '很高的门框', '很高的自行车'], answer: 2, sentence: 8 },
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
    { q: '我和谁一起玩，觉得很有趣？', choices: ['奶奶', '朋友', '爸爸'], answer: 1, sentence: 2 },
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
    { q: '卡莱在学校里对什么说话？', choices: ['野花', '小树', '树荫'], answer: 1, sentence: 1 },
  ],
  'gsb:0089-3': [
    { q: '卡莱为什么要灌木长得壮壮的？', choices: ['可以结橙子', '不让坏人进来', '好看又好玩'], answer: 1, sentence: 0 },
    { q: '卡莱回家看橙子树，橙子怎么样？', choices: ['又大又甜的', '长得壮壮的', '还是绿色的'], answer: 2, sentence: 2 },
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
    { q: '下雨以后，天气怎么了？', choices: ['多云了', '打雷了', '干燥了'], answer: 1, sentence: 6 },
    { q: '我看到了什么？', choices: ['打雷', '大风', '彩虹'], answer: 2, sentence: 7 },
  ],
  'gsb:0271-1': [
    { q: '两只什么是“小”的？', choices: ['眼睛', '耳朵', '脚'], answer: 1, sentence: 3 },
    { q: '还有什么用来抱抱？', choices: ['两只小手', '两只眼睛', '两只脚'], answer: 0, sentence: 4 },
  ],
  'gsb:0302-1': [
    { q: '火很神奇，也很有什么？', choices: ['光亮', '取暖', '力量'], answer: 2, sentence: 7 },
    { q: '火可以带来什么？', choices: ['力量', '光亮', '取暖'], answer: 1, sentence: 4 },
  ],
  'gsb:0327-1': [
    { q: '水中有八只什么？', choices: ['斑马', '青蛙', '水牛'], answer: 1, sentence: 5 },
    { q: '谁和狮子一起喝水？', choices: ['大象', '斑马', '水牛'], answer: 0, sentence: 9 },
  ],

  // our own 二上 passages (spec 2026-10-15 §2.2, Task 8)
};
