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
  p51: [
    { q: '谁的衣服上有金色的花？', choices: ['拉吉', '阿里', '我'], answer: 0, sentence: 2 },
    { q: '第二天，班上怎么样？', choices: ['很热闹', '很漂亮', '很好玩'], answer: 0, sentence: 1 },
  ],
  p52: [
    { q: '谁折的船最小？', choices: ['爷爷', '小华', '妹妹'], answer: 0, sentence: 3 },
    { q: '谁坐在窗前，一点也不开心？', choices: ['小华', '妹妹', '爷爷'], answer: 0, sentence: 1 },
  ],
  p53: [
    { q: '妹妹说的动物是什么？', choices: ['小白兔', '大象', '小狗'], answer: 0, sentence: 2 },
    { q: '我说的动物是什么？', choices: ['大象', '小狗', '小猫'], answer: 0, sentence: 5 },
  ],
  p54: [
    { q: '第二次，我学会了什么？', choices: ['用脚踢水', '用手推水', '走进水里'], answer: 0, sentence: 3 },
    { q: '谁说“别怕，我在你身边”？', choices: ['爸爸', '妈妈', '我'], answer: 0, sentence: 2 },
  ],
  p55: [
    { q: '我跑到车站的时候，巴士怎么样了？', choices: ['已经开走', '还没有来', '停在那里'], answer: 0, sentence: 2 },
    { q: '从那天起，我每天晚上做什么？', choices: ['准备好书包', '穿好衣服', '背上书包'], answer: 0, sentence: 6 },
  ],
  p56: [
    { q: '回家以后，我对着什么喊？', choices: ['镜子', '老师', '同学'], answer: 0, sentence: 4 },
    { q: '放学后，班长要做什么？', choices: ['关好门窗', '收作业本', '喊“起立”'], answer: 0, sentence: 3 },
  ],
  p57: [
    { q: '老师让新同学坐在哪里？', choices: ['我的旁边', '老师旁边', '窗户旁边'], answer: 0, sentence: 3 },
    { q: '谁先说“你好”？', choices: ['我', '李小云', '老师'], answer: 0, sentence: 4 },
  ],
  p58: [
    { q: '车上，谁站起来让奶奶坐？', choices: ['大哥哥', '我', '司机'], answer: 0, sentence: 2 },
    { q: '快到站了，奶奶让我做什么？', choices: ['按一下铃', '把门打开', '拿好篮子'], answer: 0, sentence: 4 },
  ],
  p59: [
    { q: '小树刚种下的时候，比谁还矮？', choices: ['我', '爸爸', '朋友们'], answer: 0, sentence: 1 },
    { q: '叶子后来变成了什么颜色？', choices: ['深绿的', '浅绿的', '黄黄的'], answer: 0, sentence: 2 },
  ],
  p60: [
    { q: '我最喜欢哪一张画？', choices: ['大熊猫', '大海', '高楼'], answer: 0, sentence: 2 },
    { q: '看完画，妈妈看什么？', choices: ['杂志', '故事书', '画'], answer: 0, sentence: 3 },
  ],
  p61: [
    { q: '谁跌倒了？', choices: ['小华', '小文', '我'], answer: 0, sentence: 3 },
    { q: '小华站起来以后，说了什么？', choices: ['没关系', '对不起', '是我的错'], answer: 0, sentence: 5 },
  ],
  p62: [
    { q: '我在哪里拍球？', choices: ['家门口', '楼下', '学校'], answer: 0, sentence: 0 },
    { q: '陈奶奶让我帮她做什么？', choices: ['把花种好', '把盆买来', '把地扫好'], answer: 0, sentence: 4 },
  ],
  p63: [
    { q: '姐姐为什么在纸上开小洞？', choices: ['让光照出来', '让风吹进来', '让纸好看点'], answer: 0, sentence: 2 },
    { q: '谁把灯笼吊在窗前？', choices: ['爸爸', '姐姐', '我'], answer: 0, sentence: 3 },
  ],
  p64: [
    { q: '谁先看见水坑里的月亮？', choices: ['小猴子', '大猴子', '老猴子'], answer: 0, sentence: 0 },
    { q: '谁往天上一看，笑了？', choices: ['老猴子', '小猴子', '大猴子'], answer: 0, sentence: 5 },
  ],
  p65: [
    { q: '谁的裙子短短的？', choices: ['妹妹', '小美', '妈妈'], answer: 0, sentence: 2 },
    { q: '什么挂歪了？', choices: ['裤子', '裙子', '袜子'], answer: 0, sentence: 3 },
  ],
  p66: [
    { q: '我本来想做什么？', choices: ['看电视', '去游泳', '去画画'], answer: 0, sentence: 2 },
    { q: '做好的架子有一点歪，我怎么做？', choices: ['放一本小书', '把书架搬走', '请爸爸再做'], answer: 0, sentence: 5 },
  ],
  p67: [
    { q: '老师说，我的什么越来越好了？', choices: ['字', '画', '身体'], answer: 0, sentence: 2 },
    { q: '我画了什么送给外婆？', choices: ['一棵大树', '一朵大花', '一只小狗'], answer: 0, sentence: 4 },
  ],
  p68: [
    { q: '种豆芽的时候，哪一件事不用做？', choices: ['晒太阳', '浇一点水', '泡一个晚上'], answer: 0, sentence: 5 },
    { q: '什么时候，豆芽就长出来了？', choices: ['三四天后', '一个晚上', '第二天'], answer: 0, sentence: 6 },
  ],
  p69: [
    { q: '小猴送了什么？', choices: ['饼干', '鲜花', '蛋糕'], answer: 0, sentence: 1 },
    { q: '谁什么也没带？', choices: ['小狗', '小兔', '小猴'], answer: 0, sentence: 3 },
  ],
  p70: [
    { q: '球为什么总是扔不进篮里？', choices: ['我太矮了', '球太重了', '风太大了'], answer: 0, sentence: 1 },
    { q: '球进了，爸爸做了什么？', choices: ['把我举起来', '拍拍我的头', '跟我拍手'], answer: 0, sentence: 5 },
  ],
  p71: [
    { q: '我先说什么会沉下去？', choices: ['西瓜和石头', '木块和石头', '木块和西瓜'], answer: 0, sentence: 2 },
    { q: '最后，西瓜怎么样？', choices: ['没有沉下去', '马上沉了下去', '会沉下去'], answer: 0, sentence: 5 },
  ],
  p72: [
    { q: '箱子为什么盖不上？', choices: ['装得太多', '箱子太小', '箱子坏了'], answer: 0, sentence: 3 },
    { q: '我拿出了什么？', choices: ['足球', '小熊', '衣服'], answer: 0, sentence: 5 },
  ],
  p73: [
    { q: '牙松了，我只能吃什么？', choices: ['软软的东西', '硬的东西', '一口面包'], answer: 0, sentence: 1 },
    { q: '我在镜子里看见了什么？', choices: ['一个小洞', '一个小盒子', '一口面包'], answer: 0, sentence: 4 },
  ],
};
