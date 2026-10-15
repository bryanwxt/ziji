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
    { q: '我家有什么人？', choices: ['哥哥和弟弟', '姐姐和妹妹', '哥哥和妹妹'], answer: 2, sentence: 0 },
  ],
  p02: [
    { q: '我先做什么？', choices: ['吃早饭', '坐车', '洗手'], answer: 2, sentence: 1 },
    { q: '早上七点，我做什么？', choices: ['坐车', '起床', '吃早饭'], answer: 1, sentence: 0 },
  ],
  p03: [
    { q: '下午，我们去做什么？', choices: ['打球', '看书', '听歌'], answer: 0, sentence: 2 },
    { q: '我和弟弟在家里做什么？', choices: ['打球跑步', '看书听歌', '吃饭写字'], answer: 1, sentence: 1 },
  ],
  p04: [
    { q: '小明很喜欢笑，也很喜欢做什么？', choices: ['一起玩', '帮别人', '做作业'], answer: 1, sentence: 2 },
    { q: '我们常常一起做什么？', choices: ['玩', '笑', '帮别人'], answer: 0, sentence: 3 },
  ],
  p05: [
    { q: '爸爸送我什么？', choices: ['好吃的菜', '新书', '生日歌'], answer: 1, sentence: 1 },
    { q: '谁给我唱生日歌？', choices: ['妈妈', '哥哥', '爸爸'], answer: 1, sentence: 2 },
  ],
  p06: [
    { q: '弟弟听了医生的话，怎么了？', choices: ['病了', '好了', '笑了'], answer: 2, sentence: 3 },
    { q: '谁说“没关系”？', choices: ['妈妈', '弟弟', '医生'], answer: 2, sentence: 2 },
  ],
  p07: [
    { q: '我想要什么？', choices: ['水果', '新书包', '牛奶'], answer: 1, sentence: 3 },
    { q: '我们买了什么？', choices: ['水果和牛奶', '牛奶和书包', '书包和水果'], answer: 0, sentence: 1 },
  ],
  p08: [
    { q: '我和爷爷坐在什么地方看星星？', choices: ['天上', '飞机', '门口'], answer: 2, sentence: 1 },
    { q: '我长大了要怎么去看星星？', choices: ['坐上火车', '坐上飞机', '坐上大车'], answer: 1, sentence: 3 },
  ],
  p09: [
    { q: '我写了哪两个字？', choices: ['天和地', '大和天', '大和小'], answer: 1, sentence: 2 },
    { q: '老师说了什么？', choices: ['你写得很快', '你写得很大', '你写得很好'], answer: 2, sentence: 3 },
  ],
  p10: [
    { q: '我想跟小鸟做什么？', choices: ['唱歌', '一起玩', '飞走'], answer: 1, sentence: 2 },
    { q: '我想问小鸟什么？', choices: ['你会唱歌吗', '你会写字吗', '明天还会来吗'], answer: 2, sentence: 3 },
  ],
  p11: [
    { q: '床的旁边有什么？', choices: ['桌子', '书', '作业'], answer: 0, sentence: 2 },
    { q: '我坐在桌子前面做什么？', choices: ['画画唱歌', '看书写字', '看书画画'], answer: 1, sentence: 3 },
  ],
  p12: [
    { q: '奶奶笑着说什么？', choices: ['少吃点', '多吃点', '快点吃'], answer: 1, sentence: 3 },
    { q: '桌上有什么？', choices: ['鸡蛋和鱼', '米饭和肉', '菜和水果'], answer: 1, sentence: 1 },
  ],
  p13: [
    { q: '我喝了水，又做什么？', choices: ['又去打球', '又去上课', '又去跑步'], answer: 0, sentence: 3 },
    { q: '下课了，同学们都去做什么？', choices: ['打球、跑步', '上课、写字', '吃饭、喝水'], answer: 0, sentence: 1 },
  ],
  p14: [
    { q: '我在车上为什么站着？', choices: ['我喜欢站着', '没有地方坐', '车上很热'], answer: 1, sentence: 2 },
    { q: '同学在哪里等我？', choices: ['车上', '我家', '门口'], answer: 2, sentence: 3 },
  ],
  p15: [
    { q: '我们穿上了什么？', choices: ['新的衣服', '红的衣服', '奶奶的衣服'], answer: 0, sentence: 1 },
    { q: '谁给我们红包？', choices: ['爷爷和爸爸', '爷爷和奶奶', '奶奶和妈妈'], answer: 1, sentence: 2 },
  ],
  p16: [
    { q: '我帮了妈妈什么忙？', choices: ['洗衣服', '买东西', '洗菜做饭'], answer: 2, sentence: 1 },
    { q: '星期天，妈妈怎么了？', choices: ['很忙', '很开心', '长大了'], answer: 0, sentence: 0 },
  ],
  p17: [
    { q: '小马为什么找不到家了？', choices: ['跑得很快', '在外面玩', '跑得很远'], answer: 2, sentence: 1 },
    { q: '牛爷爷做了什么？', choices: ['找到了小马', '带小马跑步', '给小马吃饭'], answer: 0, sentence: 2 },
  ],
  p18: [
    { q: '人们为什么高兴地笑了？', choices: ['风变大了', '天变热了', '天变冷了'], answer: 1, sentence: 2 },
    { q: '风大大地吹，人们怎么了？', choices: ['热得很', '冷得很', '高兴得很'], answer: 1, sentence: 1 },
  ],
  p19: [
    { q: '妈妈要我先干什么？', choices: ['看电视', '唱歌', '做作业'], answer: 2, sentence: 1 },
    { q: '电视里的小马在做什么？', choices: ['唱歌', '做作业', '看电视'], answer: 0, sentence: 3 },
  ],
  p20: [
    { q: '学校里有什么？', choices: ['看花的地方', '打球的地方', '看书的地方'], answer: 1, sentence: 1 },
    { q: '我很喜欢谁？', choices: ['同学和老师', '同学和妈妈', '爸爸和老师'], answer: 0, sentence: 3 },
  ],

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
  p21: [
    { q: '谁很亲切？', choices: ['新老师', '新朋友', '同学'], answer: 0, sentence: 2 },
    { q: '第一天，老师帮我们找什么？', choices: ['座位', '课文', '朋友'], answer: 0, sentence: 3 },
  ],
  p22: [
    { q: '舞狮在哪里？', choices: ['楼下', '门上', '婆婆家'], answer: 0, sentence: 3 },
    { q: '我在门上贴什么？', choices: ['福字', '红包', '舞狮'], answer: 0, sentence: 1 },
  ],
  p23: [
    { q: '我把什么放到桌上？', choices: ['碗和筷子', '茶和杯子', '鸡和青菜'], answer: 0, sentence: 1 },
    { q: '谁尝了妈妈做的鸡？', choices: ['王叔叔', '王阿姨', '我'], answer: 0, sentence: 3 },
  ],
  p24: [
    { q: '大树下开着什么颜色的花？', choices: ['红的和黄的', '白的和蓝的', '绿的和白的'], answer: 0, sentence: 3 },
    { q: '小鸟是什么颜色的？', choices: ['黑的', '白的', '黄的'], answer: 0, sentence: 5 },
  ],
  p25: [
    { q: '音乐室在哪里？', choices: ['三楼', '二楼', '一楼'], answer: 0, sentence: 3 },
    { q: '我们问谁音乐室在哪里？', choices: ['班长', '老师', '好朋友'], answer: 0, sentence: 2 },
  ],
  p26: [
    { q: '谁骑在最前面？', choices: ['哥哥', '姐姐', '我'], answer: 0, sentence: 1 },
    { q: '我们最后骑到了哪里？', choices: ['公园', '小桥', '路口'], answer: 0, sentence: 4 },
  ],
  p27: [
    { q: '我去买了什么？', choices: ['冰水', '炒面', '鸡蛋'], answer: 0, sentence: 2 },
    { q: '到了那里，我们先做什么？', choices: ['找座位', '买冰水', '吃炒面'], answer: 0, sentence: 1 },
  ],
  p28: [
    { q: '火灾的时候，我们要怎么做？', choices: ['走楼梯', '坐电梯', '坐上消防车'], answer: 0, sentence: 2 },
    { q: '叔叔还让我们做什么？', choices: ['坐上消防车', '坐电梯', '走楼梯'], answer: 0, sentence: 3 },
  ],
  p29: [
    { q: '我忘了带什么？', choices: ['雨伞', '雨鞋', '雨衣'], answer: 0, sentence: 1 },
    { q: '谁和我一起在门口等？', choices: ['老师', '妈妈', '同学'], answer: 0, sentence: 3 },
  ],
  p30: [
    { q: '小蚂蚁怎么回到池边？', choices: ['爬上叶子', '飞过来', '喝水'], answer: 0, sentence: 2 },
    { q: '下大雨了，小蚂蚁请蜜蜂去什么地方？', choices: ['它的窝', '池子', '花丛'], answer: 0, sentence: 4 },
  ],
  p31: [
    { q: '我为什么想尝一尝？', choices: ['咖啡很香', '我很饿了', '爷爷要我喝'], answer: 0, sentence: 2 },
    { q: '爷爷给我买了什么？', choices: ['一杯牛奶', '一杯黑咖啡', '一杯糖水'], answer: 0, sentence: 5 },
  ],
  p32: [
    { q: '谁对我说“别怕”？', choices: ['护士阿姨', '医生', '妈妈'], answer: 0, sentence: 2 },
    { q: '回家后，谁每天照顾我？', choices: ['爸爸', '妈妈', '护士阿姨'], answer: 0, sentence: 4 },
  ],
  p33: [
    { q: '谁得了第二？', choices: ['黄队', '红队', '蓝队'], answer: 0, sentence: 4 },
    { q: '最后，谁得了第一？', choices: ['蓝队', '红队', '黄队'], answer: 0, sentence: 5 },
  ],
  p34: [
    { q: '我把绿豆放在什么上？', choices: ['纸巾', '杯子', '叶子'], answer: 0, sentence: 1 },
    { q: '过了三天，绿豆长出了什么？', choices: ['小芽', '绿叶', '红花'], answer: 0, sentence: 2 },
  ],
  p35: [
    { q: '我的风筝是什么？', choices: ['一只大老鹰', '一只大公鸡', '一只大白兔'], answer: 0, sentence: 1 },
    { q: '大家说我的风筝怎么样？', choices: ['很好看', '很好玩', '很有趣'], answer: 0, sentence: 4 },
  ],
  p36: [
    { q: '小文搭什么？', choices: ['船头', '船尾', '大海'], answer: 0, sentence: 2 },
    { q: '谁说这条船可以开到大海去？', choices: ['妈妈', '小文', '我'], answer: 0, sentence: 5 },
  ],
  p37: [
    { q: '生日卡上画了什么？', choices: ['花', '蛋糕', '菜'], answer: 0, sentence: 1 },
    { q: '谁买来一个大蛋糕？', choices: ['爸爸', '妈妈', '奶奶'], answer: 0, sentence: 2 },
  ],
  p38: [
    { q: '洗完澡，豆豆在哪里睡着了？', choices: ['沙发上', '床下', '水里'], answer: 0, sentence: 3 },
    { q: '豆豆醒了以后，做了什么？', choices: ['抢走袜子', '跳进水里', '跑到床上'], answer: 0, sentence: 4 },
  ],
  p39: [
    { q: '纸飞机破了，谁哭了？', choices: ['弟弟', '我', '妈妈'], answer: 0, sentence: 3 },
    { q: '谁说“吵来吵去，有什么用呢”？', choices: ['妈妈', '弟弟', '我'], answer: 0, sentence: 4 },
  ],
  p40: [
    { q: '小芽长高了，开出了什么？', choices: ['黄色的花', '红色的花', '白色的花'], answer: 0, sentence: 3 },
    { q: '奶奶用番茄做了什么？', choices: ['一大碗汤', '一大盘菜', '一大碗面'], answer: 0, sentence: 5 },
  ],
  p41: [
    { q: '妹妹选了讲什么的书？', choices: ['大海', '小狗', '星星'], answer: 0, sentence: 3 },
    { q: '妹妹还想做什么？', choices: ['再看一遍', '再选一本', '快点回家'], answer: 0, sentence: 4 },
  ],
  p42: [
    { q: '爸爸买了什么？', choices: ['烤鸡翅', '香肠', '饮料'], answer: 0, sentence: 4 },
    { q: '谁最喜欢香肠？', choices: ['我', '爸爸', '妈妈'], answer: 0, sentence: 5 },
  ],
  p43: [
    { q: '谁带我们去海里游泳？', choices: ['爸爸', '哥哥', '妈妈'], answer: 0, sentence: 4 },
    { q: '我把最好看的贝壳送给了谁？', choices: ['妈妈', '哥哥', '爸爸'], answer: 0, sentence: 5 },
  ],
  p44: [
    { q: '谁把水关上了？', choices: ['爸爸', '妈妈', '我'], answer: 0, sentence: 1 },
    { q: '从那天起，我洗脸时怎么做？', choices: ['把水关小', '把水关上', '拿去浇花'], answer: 0, sentence: 3 },
  ],
  p45: [
    { q: '种萝卜的爷爷先叫谁来帮忙？', choices: ['老奶奶', '小猪', '小老鼠'], answer: 0, sentence: 1 },
    { q: '最后，谁跑来帮忙？', choices: ['小老鼠', '小猪', '小猫'], answer: 0, sentence: 4 },
  ],
  p46: [
    { q: '那只动物的耳朵怎么样？', choices: ['很大', '很小', '很长'], answer: 0, sentence: 2 },
    { q: '谁说想要一只会说话的动物？', choices: ['妹妹', '妈妈', '我'], answer: 0, sentence: 4 },
  ],
  p47: [
    { q: '什么亮晶晶的？', choices: ['小水滴', '小星星', '彩虹'], answer: 0, sentence: 3 },
    { q: '谁说彩虹像一座桥？', choices: ['妈妈', '妹妹', '我'], answer: 0, sentence: 4 },
  ],
  p48: [
    { q: '在岛上，我们借了什么？', choices: ['脚踏车', '小船', '巴士'], answer: 0, sentence: 2 },
    { q: '我梦见自己变成了什么？', choices: ['小鸟', '野猪', '大树'], answer: 0, sentence: 4 },
  ],
  p49: [
    { q: '老鹰住在哪里？', choices: ['大山上', '树上', '山下'], answer: 0, sentence: 0 },
    { q: '一个星期后，小鸟飞过了什么？', choices: ['高楼', '大树', '大山'], answer: 0, sentence: 5 },
  ],
  p50: [
    { q: '我们先去了哪里？', choices: ['花园', '河边', '大树'], answer: 0, sentence: 2 },
    { q: '我们在哪里吃午饭？', choices: ['河边', '花园', '大树'], answer: 0, sentence: 5 },
  ],
  p51: [
    { q: '谁的衣服上有金色的花？', choices: ['拉吉', '阿里', '我'], answer: 0, sentence: 2 },
    { q: '谁说“我们都是好朋友”？', choices: ['老师', '阿里', '拉吉'], answer: 0, sentence: 4 },
  ],
  p52: [
    { q: '谁折的船最漂亮？', choices: ['妹妹', '小华', '爷爷'], answer: 0, sentence: 3 },
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
};
