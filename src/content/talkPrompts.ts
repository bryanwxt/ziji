// The parent's conversation starters (parent loop spec §3, 2026-10-18 update): open questions about his own life across the PSLE
// conversation themes, each with follow-ups, one sentence pattern to nudge toward, and what a P2 answer could sound like. The
// parent is fluent: these are topics, not scripts; the English line is for a grandparent or helper. Singapore Mandarin, no 儿化.
// Characters: HSK 1–3 or his reading lists up to 二下, plus TALK_ALLOWED (scripts/check-content.ts checks it).
import type { TalkPrompt, TalkTheme } from '../types';

export const TALK_THEMES: readonly TalkTheme[] = ['family', 'school', 'friends', 'food', 'festivals', 'singapore', 'environment', 'technology', 'feelings'];

export const THEME_LABEL: Readonly<Record<TalkTheme, string>> = {
  family: '家庭', school: '学校', friends: '朋友', food: '食物', festivals: '节日', singapore: '新加坡', environment: '环境', technology: '科技', feelings: '心情与品德',
};
export const THEME_EN: Readonly<Record<TalkTheme, string>> = {
  family: 'family', school: 'school', friends: 'friends', food: 'food', festivals: 'festivals', singapore: 'Singapore', environment: 'the environment', technology: 'technology', feelings: 'feelings and values',
};

/** The sentence patterns the starters rotate through (spec §3). */
export const TALK_PATTERNS = ['我觉得…因为…', '先…然后…最后…', '如果…就…', '虽然…但是…', '有时候…有时候…', '我最喜欢…因为…'] as const;

/** Singapore theme words beyond his lists: 榴莲, 巴刹, 端午节, 粽子, 灯笼, 龙舟. */
export const TALK_ALLOWED = '榴莲刹端粽笼舟';

export const TALK_PROMPTS: readonly TalkPrompt[] = [
  // 家庭 family
  { id: 't01', theme: 'family', open: '你最喜欢和家里的谁一起玩？你们常常玩什么？', en: 'Who at home do you most like playing with? What do you usually play?', followUps: ['你们常常在哪里玩？', '为什么最喜欢和他一起玩？', '下次你想和他玩什么新的？'], pattern: '我最喜欢…因为…', sample: '我最喜欢和哥哥一起玩，因为他会和我踢球。', hooks: ['玩', '一起'] },
  { id: 't02', theme: 'family', open: '周末的时候，我们一家人常常做什么？', en: 'What does our family usually do at the weekend?', followUps: ['你最喜欢哪一个周末？为什么？', '如果这个周末由你来安排，你想去哪里？'], pattern: '先…然后…最后…', sample: '我们先去公园跑步，然后去小贩中心吃早餐，最后回家看书。', hooks: ['周末', '一家人'] },
  { id: 't03', theme: 'family', open: '你在家里会帮忙做什么家务？', en: 'What chores do you help with at home?', followUps: ['你是怎么做的？一步一步说给我听。', '做完以后，你觉得怎么样？', '你还想学做什么？'], pattern: '先…然后…最后…', sample: '我会帮妈妈洗碗。我先把碗放进水里，然后洗干净，最后放回去。', hooks: ['帮忙', '家务', '洗'] },
  { id: 't04', theme: 'family', open: '说说爷爷奶奶，或者外公外婆。你和他们一起做过什么？', en: 'Tell me about your grandparents. What have you done with them?', followUps: ['他们最喜欢做什么？', '下次见到他们，你想和他们说什么？'], pattern: '有时候…有时候…', sample: '有时候我和奶奶去巴刹买菜，有时候她教我唱歌。', hooks: ['爷爷', '奶奶', '外公', '外婆'] },
  { id: 't05', theme: 'family', open: '你觉得家里谁最好笑？他做过什么好笑的事？', en: 'Who in the family is the funniest? What funny thing have they done?', followUps: ['大家是怎么笑的？', '你做过什么让家人笑的事？'], pattern: '我觉得…因为…', sample: '我觉得爸爸最好笑，因为他会学小狗叫。', hooks: ['笑', '有趣'] },
  { id: 't06', theme: 'family', open: '如果你可以带全家去一个地方玩一天，你想去哪里？', en: 'If you could take the whole family anywhere for a day, where would you go?', followUps: ['我们要怎么去？', '到了那里，我们先做什么？', '谁会最高兴？为什么？'], pattern: '如果…就…', sample: '如果可以，我就带全家去动物园看大象。', hooks: ['如果', '带'] },
  { id: 't07', theme: 'family', open: '每天早上，家里的人都在忙什么？', en: 'What is everyone at home busy with in the morning?', followUps: ['谁最早起床？', '你早上要做哪些事？'], pattern: '先…然后…最后…', sample: '我先刷牙洗脸，然后吃早餐，最后背书包去上学。', hooks: ['早上', '起床', '刷牙'] },
  { id: 't08', theme: 'family', open: '你生病的时候，家里的人是怎么照顾你的？', en: 'When you are ill, how does the family look after you?', followUps: ['那时候你最想吃什么？', '如果家里有人生病了，你会怎么帮他？'], pattern: '如果…就…', sample: '妈妈给我喝水，还给我讲故事。如果妈妈生病，我就给她倒水。', hooks: ['生病', '照顾', '医生'] },
  { id: 't09', theme: 'family', open: '你长大以后想做什么工作？为什么？', en: 'What job do you want when you grow up? Why?', followUps: ['那个工作每天要做什么？', '家里的人做什么工作？你觉得他们的工作怎么样？'], pattern: '我觉得…因为…', sample: '我长大想当医生。我觉得医生很了不起，因为他们帮助生病的人。', hooks: ['工作', '长大'] },

  // 学校 school
  { id: 't10', theme: 'school', open: '今天在学校，什么事让你最开心？', en: 'What made you happiest at school today?', followUps: ['那时候你在做什么？', '谁和你在一起？', '明天你最想做什么？'], pattern: '我最喜欢…因为…', sample: '我最喜欢今天的体育课，因为我们玩了球。', hooks: ['学校', '开心'] },
  { id: 't11', theme: 'school', open: '你最喜欢上什么课？为什么？', en: 'Which lesson do you like best? Why?', followUps: ['上这个课的时候，你们常常做什么？', '什么课你觉得比较难？难在哪里？'], pattern: '我最喜欢…因为…', sample: '我最喜欢美术课，因为我可以用很多颜色画画。', hooks: ['课', '美术', '华文'] },
  { id: 't12', theme: 'school', open: '休息的时候，你在食堂买什么吃？和谁一起吃？', en: 'At recess, what do you buy at the canteen, and who do you eat with?', followUps: ['食堂里，你最喜欢哪一家？', '如果钱不够，你会怎么办？'], pattern: '有时候…有时候…', sample: '有时候我买面，有时候我买鸡饭。我常常和小明一起吃。', hooks: ['食堂', '买', '休息'] },
  { id: 't13', theme: 'school', open: '你们班最近有什么好玩的事？', en: 'Has anything fun or funny happened in your class lately?', followUps: ['后来怎么样了？', '大家是怎么说的？'], pattern: '先…然后…最后…', sample: '一只小鸟先飞进课室，然后停在窗边，最后又飞走了。', hooks: ['班', '课室', '同学'] },
  { id: 't14', theme: 'school', open: '如果你当一天老师，你会教同学什么？', en: 'If you were the teacher for a day, what would you teach the class?', followUps: ['你会怎么教？', '同学们做得好，你会怎么说？'], pattern: '如果…就…', sample: '如果我当老师，我就教大家折纸船。', hooks: ['老师', '教'] },
  { id: 't15', theme: 'school', open: '上学的路上，你会看到什么？', en: 'What do you see on the way to school?', followUps: ['你是怎么去学校的？', '路上你最喜欢看什么？'], pattern: '有时候…有时候…', sample: '有时候我看到小狗，有时候我看到很多小鸟在树上。', hooks: ['路上', '上学', '校车'] },
  { id: 't16', theme: 'school', open: '在学校里，什么事让你觉得很难？你是怎么做的？', en: 'What has felt hard at school? What did you do about it?', followUps: ['谁帮了你？', '下次再这样，你会怎么做？'], pattern: '虽然…但是…', sample: '虽然听写很难，但是我每天多写几次，就记住了。', hooks: ['难', '听写', '帮'] },
  { id: 't17', theme: 'school', open: '今天你学了什么新东西？教一教我吧。', en: 'What new thing did you learn today? Teach me.', followUps: ['你是怎么学会的？', '你觉得难不难？为什么？'], pattern: '先…然后…最后…', sample: '今天我学了画小猫。先画一个大圆，然后画两只耳朵，最后画上眼睛和嘴巴。', hooks: ['学', '新'] },
  { id: 't18', theme: 'school', open: '在班上，你想当什么小帮手？为什么？', en: 'What helper job would you like in class? Why?', followUps: ['那个工作要做些什么？', '你们班的班长是谁？他是怎么帮大家的？'], pattern: '我觉得…因为…', sample: '我想帮老师管班上的书。我觉得很有意思，因为我可以先看新书。', hooks: ['班长', '帮'] },

  // 朋友 friends
  { id: 't19', theme: 'friends', open: '你最好的朋友是谁？他是一个怎么样的人？', en: 'Who is your best friend? What is he or she like?', followUps: ['你们是怎么认识的？', '你们在一起常常做什么？'], pattern: '我最喜欢…因为…', sample: '我最好的朋友是小明。我最喜欢和他玩，因为他很会讲笑话。', hooks: ['朋友', '好朋友'] },
  { id: 't20', theme: 'friends', open: '你和好朋友有时候也会不开心。后来你们是怎么和好的？', en: 'Even good friends fall out sometimes. How did you make up afterwards?', followUps: ['上次是为了什么事？', '你先说了什么？'], pattern: '虽然…但是…', sample: '虽然我们有时候会生气，但是第二天又一起玩了。', hooks: ['生气', '不高兴'] },
  { id: 't21', theme: 'friends', open: '如果班上来了一个新同学，你会怎么帮他？', en: 'If a new pupil joined your class, how would you help?', followUps: ['他心里可能觉得怎么样？', '你会先和他说什么？'], pattern: '如果…就…', sample: '如果有新同学来，我就带他去看学校，告诉他食堂在哪里。', hooks: ['同学', '新', '帮助'] },
  { id: 't22', theme: 'friends', open: '你和朋友最喜欢玩什么游戏？怎么玩？', en: 'What game do you and your friends like most? How is it played?', followUps: ['谁常常赢？', '有人输了不开心，你们怎么办？'], pattern: '先…然后…最后…', sample: '我们玩跳绳。先两个人拿着绳子，然后大家一个一个跳，最后看谁跳得多。', hooks: ['游戏', '跳绳', '玩'] },
  { id: 't23', theme: 'friends', open: '你觉得好朋友应该是怎么样的？', en: 'What makes a good friend?', followUps: ['你是这样的朋友吗？说一说。', '你的朋友帮过你什么？'], pattern: '我觉得…因为…', sample: '我觉得好朋友要说真话，因为这样大家才会相信他。', hooks: ['朋友', '好朋友', '真话'] },
  { id: 't24', theme: 'friends', open: '你帮过朋友什么忙？那时候发生了什么事？', en: 'How have you helped a friend? What happened?', followUps: ['他对你说了什么？', '那时候你心里觉得怎么样？'], pattern: '先…然后…最后…', sample: '小红跑步的时候不小心倒在地上。我先扶她起来，然后带她去找老师，最后她对我说谢谢。', hooks: ['帮忙', '谢谢'] },
  { id: 't25', theme: 'friends', open: '如果请朋友来家里玩，你们会做什么？', en: 'If you invited a friend over, what would you do together?', followUps: ['你会请谁？', '你会请他吃什么？'], pattern: '如果…就…', sample: '如果朋友来我家，我就和他一起画画，还请他吃饼干。', hooks: ['请', '客人'] },
  { id: 't26', theme: 'friends', open: '你想玩的和朋友想玩的不一样，你们会怎么办？', en: 'When you and a friend want to play different things, what do you do?', followUps: ['最后大家玩了什么？', '怎么做才能让大家都开心？'], pattern: '有时候…有时候…', sample: '有时候我们玩他想玩的，有时候我们玩我想玩的。', hooks: ['一样', '不一样'] },
  { id: 't27', theme: 'friends', open: '你的朋友有什么地方和你不一样？', en: 'How is your friend different from you?', followUps: ['你喜欢他哪一点？', '你们有什么一样的地方？'], pattern: '虽然…但是…', sample: '虽然他喜欢画画，我喜欢踢球，但是我们都喜欢吃西瓜。', hooks: ['不一样', '喜欢'] },

  // 食物 food
  { id: 't28', theme: 'food', open: '你最喜欢吃什么？那是什么味道的？', en: 'What do you like to eat best? What does it taste like?', followUps: ['你第一次是在哪里吃的？', '如果天天吃，你会觉得怎么样？'], pattern: '我最喜欢…因为…', sample: '我最喜欢吃鸡饭，因为鸡肉很香，饭也很好吃。', hooks: ['吃', '味道', '香'] },
  { id: 't29', theme: 'food', open: '去小贩中心的时候，你最喜欢吃哪一样？', en: 'At the hawker centre, what do you like to eat most?', followUps: ['你会自己去买吗？要怎么说？', '你还想试试什么新的东西？'], pattern: '有时候…有时候…', sample: '有时候我吃面，有时候我吃炒饭，我还喜欢喝果汁。', hooks: ['小贩中心', '饭', '面'] },
  { id: 't30', theme: 'food', open: '你会做什么吃的？是怎么做的？', en: 'What food can you make? How do you make it?', followUps: ['是谁教你的？', '做好以后，谁吃了？'], pattern: '先…然后…最后…', sample: '我会做鸡蛋面包。先拿一片面包，然后放上鸡蛋，最后再放一片面包。', hooks: ['做', '鸡蛋', '面包'] },
  { id: 't31', theme: 'food', open: '有什么东西你不喜欢吃？为什么？', en: "What don't you like to eat? Why?", followUps: ['如果妈妈做了这道菜，你会怎么办？', '你觉得多吃青菜有什么好处？'], pattern: '虽然…但是…', sample: '虽然我不喜欢吃青菜，但是我知道青菜对身体好。', hooks: ['青菜', '菜', '身体'] },
  { id: 't32', theme: 'food', open: '如果你可以开一家小店，你想卖什么好吃的？', en: 'If you could open a little shop, what tasty things would you sell?', followUps: ['你的店叫什么名字？', '一样东西卖多少钱？'], pattern: '如果…就…', sample: '如果我开小店，我就卖各种颜色的果汁。', hooks: ['卖', '店', '钱'] },
  { id: 't33', theme: 'food', open: '说到榴莲，你会想到什么？', en: 'Durian — what comes to mind?', followUps: ['它是什么味道的？', '家里谁最爱吃？谁最怕它？为什么？'], pattern: '我觉得…因为…', sample: '我觉得榴莲很好吃，因为它又香又甜。', hooks: ['榴莲', '水果', '甜'] },
  { id: 't34', theme: 'food', open: '你饿的时候最想吃什么？吃饱了是什么感觉？', en: 'When you are hungry, what do you want most? How does being full feel?', followUps: ['什么时候你最容易饿？', '吃太多会怎么样？'], pattern: '有时候…有时候…', sample: '有时候我饿了想吃面包，有时候想吃水果。吃饱了我就想睡觉。', hooks: ['饿', '饱'] },
  { id: 't35', theme: 'food', open: '我们家的早餐常常吃什么？你最喜欢哪一种？', en: 'What do we usually have for breakfast? Which do you like best?', followUps: ['早上你喜欢喝什么？', '为什么一定要吃早餐？'], pattern: '我最喜欢…因为…', sample: '我最喜欢吃面包和鸡蛋，因为吃了上课就不会饿。', hooks: ['早餐', '早饭', '喝'] },
  { id: 't36', theme: 'food', open: '和家人一起吃饭的时候，我们会说些什么？', en: 'When we eat together as a family, what do we talk about?', followUps: ['你最喜欢在哪里吃饭？', '吃饭的时候要注意什么？'], pattern: '虽然…但是…', sample: '虽然大家都很忙，但是吃饭的时候我们会说学校和工作的事。', hooks: ['一起', '吃饭'] },

  // 节日 festivals
  { id: 't37', theme: 'festivals', open: '过新年的时候，你最喜欢做什么？', en: 'At Chinese New Year, what do you like doing most?', followUps: ['我们会去谁家拜年？', '拿到红包的时候，你会说什么？'], pattern: '我最喜欢…因为…', sample: '我最喜欢过新年，因为可以穿新衣服，还可以拿红包。', hooks: ['新年', '红包', '拜年'] },
  { id: 't38', theme: 'festivals', open: '中秋节的时候，我们一家人常常做什么？', en: 'What does our family usually do at Mid-Autumn?', followUps: ['你喜欢什么样的灯笼？', '你最喜欢什么口味的月饼？'], pattern: '先…然后…最后…', sample: '我们先吃月饼，然后提着灯笼去楼下玩，最后一起看月亮。', hooks: ['中秋', '月饼', '月亮', '灯笼'] },
  { id: 't39', theme: 'festivals', open: '你的生日是怎么过的？', en: 'How do you spend your birthday?', followUps: ['你最想要什么生日礼物？为什么？', '下一个生日，你想怎么过？'], pattern: '如果…就…', sample: '如果可以，我生日那天就请朋友来家里吃蛋糕。', hooks: ['生日', '礼物', '蛋糕'] },
  { id: 't40', theme: 'festivals', open: '新加坡有很多节日。你知道哪些？', en: 'Singapore has many festivals. Which ones do you know?', followUps: ['过那个节日的时候，大家会做什么？', '你的同学过什么节日？'], pattern: '我觉得…因为…', sample: '我觉得新年最热闹，因为大家都回家一起吃团圆饭。', hooks: ['节日'] },
  { id: 't41', theme: 'festivals', open: '国庆日的时候，你在电视上或者外面看到了什么？', en: 'On National Day, what did you see on TV or outside?', followUps: ['你最喜欢看哪一个节目？', '你想对新加坡说什么？'], pattern: '先…然后…最后…', sample: '我们先看飞机飞过，然后看大家唱歌跳舞，最后看烟花。', hooks: ['国庆', '飞机', '烟花'] },
  { id: 't42', theme: 'festivals', open: '端午节的时候，你吃过什么样的粽子？', en: 'At the Dragon Boat Festival, what kinds of rice dumplings have you had?', followUps: ['你知道端午节的故事吗？说给我听。', '如果你在龙舟上，你会怎么做？'], pattern: '如果…就…', sample: '如果我在龙舟上，我就和大家一起划，想第一个到。', hooks: ['端午节', '粽子', '龙舟'] },
  { id: 't43', theme: 'festivals', open: '教师节的时候，你想对老师说什么？', en: "On Teachers' Day, what would you like to say to your teacher?", followUps: ['你会送老师什么？', '为什么你想谢谢这位老师？'], pattern: '我觉得…因为…', sample: '我想对老师说谢谢。我觉得她很好，因为她教我们认很多字。', hooks: ['老师', '教师节', '谢谢'] },
  { id: 't44', theme: 'festivals', open: '过新年以前，我们家要做哪些准备？', en: 'Before Chinese New Year, how do we get the home ready?', followUps: ['你帮了什么忙？', '家里会放哪些红色的东西？'], pattern: '先…然后…最后…', sample: '我们先把家里打扫干净，然后去买新衣服，最后在门上贴春联。', hooks: ['新年', '准备', '打扫'] },
  { id: 't45', theme: 'festivals', open: '儿童节的时候，你最想做什么？', en: "On Children's Day, what would you most like to do?", followUps: ['今年儿童节，学校做了什么？', '你想和谁一起过？'], pattern: '虽然…但是…', sample: '虽然儿童节不用上学，但是前一天学校有很多好玩的活动。', hooks: ['儿童节'] },

  // 新加坡 Singapore
  { id: 't46', theme: 'singapore', open: '坐地铁或巴士的时候，你会看到什么？', en: 'What do you see when we ride the MRT or the bus?', followUps: ['我们常常坐几个站？', '车上人多的时候，我们要注意什么？'], pattern: '有时候…有时候…', sample: '有时候车上人很多，有时候有地方坐。有老人上车，我会让座。', hooks: ['地铁', '巴士', '让座'] },
  { id: 't47', theme: 'singapore', open: '我们家楼下有什么？你最喜欢去哪里？', en: 'What is there around our block? Where do you like going most?', followUps: ['你在那里常常做什么？', '如果楼下可以多一个地方，你想要什么？'], pattern: '我最喜欢…因为…', sample: '楼下有游乐场和小店。我最喜欢游乐场，因为可以和朋友玩。', hooks: ['楼下', '游乐场', '组屋'] },
  { id: 't48', theme: 'singapore', open: '如果有朋友从外国来新加坡，你会带他去哪里？', en: 'If a friend came to Singapore from abroad, where would you take them?', followUps: ['你会请他吃什么？', '你会教他说哪一句华语？'], pattern: '如果…就…', sample: '如果有朋友来，我就带他去看鱼尾狮，再请他吃鸡饭。', hooks: ['外国', '新加坡', '鱼尾狮'] },
  { id: 't49', theme: 'singapore', open: '下雨天，你最喜欢做什么？', en: 'What do you like doing on a rainy day?', followUps: ['下雨的时候出门，要带什么？', '你喜欢下雨天，还是晴天？为什么？'], pattern: '我觉得…因为…', sample: '我喜欢下雨天。我觉得很舒服，因为下雨以后就不热了。', hooks: ['下雨', '雨伞', '天气'] },
  { id: 't50', theme: 'singapore', open: '在家里和学校，你会说哪些语言？', en: 'Which languages do you speak at home and at school?', followUps: ['什么时候你会说华语？', '会说几种语言，有什么好处？'], pattern: '有时候…有时候…', sample: '有时候我说英语，有时候我说华语。我和奶奶说华语。', hooks: ['华语', '语言', '说'] },
  { id: 't51', theme: 'singapore', open: '去动物园的时候，你最喜欢看什么动物？', en: 'At the zoo, which animal do you like watching most?', followUps: ['那只动物在做什么？', '如果可以带一只回家，你想要哪一只？为什么？'], pattern: '我最喜欢…因为…', sample: '我最喜欢看大象，因为它很大，耳朵也很大。', hooks: ['动物园', '动物', '大象'] },
  { id: 't52', theme: 'singapore', open: '你喜欢新加坡的什么？', en: 'What do you like about Singapore?', followUps: ['如果你去了别的国家，你会想念新加坡的什么？', '你觉得新加坡哪里可以更好？'], pattern: '我觉得…因为…', sample: '我觉得新加坡很干净，因为大家不乱丢东西。', hooks: ['新加坡', '干净'] },
  { id: 't53', theme: 'singapore', open: '我们去巴刹或超市买东西的时候，你最喜欢看什么？', en: 'At the wet market or the supermarket, what do you like looking at?', followUps: ['你会帮忙拿什么？', '如果给你十块钱，你会买什么？'], pattern: '如果…就…', sample: '如果有十块钱，我就买水果和一本小书。', hooks: ['巴刹', '超市', '买'] },
  { id: 't54', theme: 'singapore', open: '去海边或公园的时候，你最喜欢做什么？', en: 'At the beach or the park, what do you like doing most?', followUps: ['你和谁一起去？', '在海边要注意什么？'], pattern: '先…然后…最后…', sample: '我先在沙子上画画，然后在水里走一走，最后和爸爸一起吃东西。', hooks: ['海边', '公园'] },

  // 环境 environment
  { id: 't55', theme: 'environment', open: '在家里，我们可以怎么节约用水？', en: 'How can we save water at home?', followUps: ['如果没有水，我们会怎么样？', '我们还可以怎么节约用电？'], pattern: '如果…就…', sample: '刷牙的时候，我会把水关上。如果不关，水就浪费了。', hooks: ['节约', '水', '用电'] },
  { id: 't56', theme: 'environment', open: '你在公园里看到过什么小动物和花草？', en: 'What small animals and plants have you seen in the park?', followUps: ['你最喜欢的那个长什么样子？', '我们可以怎么保护它们？'], pattern: '有时候…有时候…', sample: '有时候我看到小鸟，有时候我看到小猫在树下睡觉。', hooks: ['公园', '花草', '树'] },
  { id: 't57', theme: 'environment', open: '看到地上有别人丢的纸，你会怎么做？', en: 'If you see litter on the ground, what do you do?', followUps: ['为什么不能乱丢东西？', '你觉得大家应该怎么做？'], pattern: '我觉得…因为…', sample: '我会把纸捡起来丢掉。我觉得这样很好，因为地上就干净了。', hooks: ['干净', '丢'] },
  { id: 't58', theme: 'environment', open: '天气很热的时候，你会怎么让自己凉快一点？', en: 'When it is very hot, how do you cool down?', followUps: ['热的时候要多喝什么？', '你觉得天气为什么越来越热？'], pattern: '有时候…有时候…', sample: '有时候我去游泳，有时候我在树下休息。我还会多喝水。', hooks: ['热', '天气', '凉快'] },
  { id: 't59', theme: 'environment', open: '如果你可以种一棵树，你想种在哪里？', en: 'If you could plant a tree, where would you plant it?', followUps: ['你会怎么照顾它？', '树对我们有什么好处？'], pattern: '如果…就…', sample: '如果可以种树，我就种在楼下，每天给它浇水。', hooks: ['树', '种'] },
  { id: 't60', theme: 'environment', open: '家里的旧东西，可以用来做什么？', en: 'What can we make out of old things at home?', followUps: ['你想用旧盒子做什么？', '为什么旧东西不要马上丢掉？'], pattern: '先…然后…最后…', sample: '我用旧盒子做一辆车。先画车门和车窗，然后剪下来，最后在下面贴四个圆。', hooks: ['旧', '盒子', '回收'] },
  { id: 't61', theme: 'environment', open: '下雨以后，外面变成了什么样子？', en: 'After the rain, what is it like outside?', followUps: ['你看到了什么？听到了什么？', '下雨以后，你最想去哪里玩？'], pattern: '虽然…但是…', sample: '虽然地上有很多水，但是天很蓝，树也更绿了。', hooks: ['下雨', '空气'] },
  { id: 't62', theme: 'environment', open: '你最喜欢什么动物？它住在什么地方？', en: 'What is your favourite animal? Where does it live?', followUps: ['它吃什么？', '我们可以怎么帮助它？'], pattern: '我最喜欢…因为…', sample: '我最喜欢小鱼，因为它游来游去很好看。小鱼要住在干净的水里。', hooks: ['动物', '鱼'] },

  // 科技 technology
  { id: 't63', theme: 'technology', open: '你用平板电脑做什么？', en: 'What do you use the iPad for?', followUps: ['你最喜欢用它做哪一件事？为什么？', '你觉得一天用多久比较好？'], pattern: '有时候…有时候…', sample: '有时候我用它学华文，有时候我用它看动画片。', hooks: ['平板', '电脑'] },
  { id: 't64', theme: 'technology', open: '如果你有一个机器人，你想让它帮你做什么？', en: 'If you had a robot, what would you have it do for you?', followUps: ['你会给它取什么名字？', '有什么事你想自己做，不要它帮？'], pattern: '如果…就…', sample: '如果我有一个机器人，我就让它帮我收拾玩具。', hooks: ['机器人'] },
  { id: 't65', theme: 'technology', open: '看电视或者玩游戏太久，会怎么样？', en: 'What happens if you watch TV or play games for too long?', followUps: ['你最喜欢看什么节目？', '不看电视的时候，你可以做什么？'], pattern: '我觉得…因为…', sample: '我觉得看太久不好，因为眼睛会很累。', hooks: ['电视', '眼睛', '游戏'] },
  { id: 't66', theme: 'technology', open: '你用手机和谁打过电话？你们说了什么？', en: 'Who have you called on the phone? What did you talk about?', followUps: ['你喜欢打电话，还是见面说话？为什么？', '下次你想打电话给谁？'], pattern: '虽然…但是…', sample: '虽然外婆住得很远，但是我们常常打电话。', hooks: ['手机', '电话'] },
  { id: 't67', theme: 'technology', open: '如果家里一个晚上都没有电，我们可以做什么？', en: 'If the home had no electricity for an evening, what could we do?', followUps: ['你会觉得怎么样？', '你觉得家里哪一样电器最有用？'], pattern: '如果…就…', sample: '如果没有电，我们就坐在一起讲故事。', hooks: ['电', '晚上'] },
  { id: 't68', theme: 'technology', open: '你想发明一个什么新东西？它有什么用？', en: 'What new thing would you like to invent? What would it do?', followUps: ['它长什么样子？', '你会先给谁用？'], pattern: '我觉得…因为…', sample: '我想做一个会飞的书包。我觉得它很有用，因为上学就很快了。', hooks: ['发明', '新', '飞'] },
  { id: 't69', theme: 'technology', open: '我们家里有哪些机器帮我们做事？', en: 'Which machines at home do jobs for us?', followUps: ['你会用哪一个？怎么用？', '如果它坏了，我们会怎么办？'], pattern: '先…然后…最后…', sample: '洗衣机帮我们洗衣服。先放衣服，然后关好门，最后按开始。', hooks: ['洗衣机', '机器'] },
  { id: 't70', theme: 'technology', open: '上网的时候，要注意什么？', en: 'What should we be careful about online?', followUps: ['如果看到不好的东西，你会怎么做？', '你会告诉谁？'], pattern: '虽然…但是…', sample: '虽然上网很好玩，但是不能随便告诉别人我家住在哪里。', hooks: ['上网', '网'] },

  // 心情与品德 feelings and values
  { id: 't71', theme: 'feelings', open: '最近你做了什么事，让你觉得自己很了不起？', en: 'What have you done lately that made you proud of yourself?', followUps: ['你是怎么做到的？', '谁看到了？他说了什么？'], pattern: '先…然后…最后…', sample: '我先在家读了很多次，然后在班上读课文，最后大家都为我拍手。', hooks: ['了不起'] },
  { id: 't72', theme: 'feelings', open: '你生气的时候会怎么做？', en: 'What do you do when you are angry?', followUps: ['什么事最让你生气？', '做什么可以让你快一点开心起来？'], pattern: '有时候…有时候…', sample: '有时候我会哭，有时候我会去房间里安静地坐一下。', hooks: ['生气', '哭'] },
  { id: 't73', theme: 'feelings', open: '你做错事的时候，会怎么说对不起？', en: 'When you do something wrong, how do you say sorry?', followUps: ['那时候你心里觉得怎么样？', '说了以后，事情变得怎么样？'], pattern: '虽然…但是…', sample: '虽然说对不起很难，但是说了以后我心里就舒服了。', hooks: ['对不起', '错'] },
  { id: 't74', theme: 'feelings', open: '你怕什么？怕的时候你会怎么办？', en: 'What are you afraid of? What do you do when you are scared?', followUps: ['你为什么怕它？', '谁会帮你，让你不怕？'], pattern: '如果…就…', sample: '我怕黑。如果房间很黑，我就开小灯。', hooks: ['怕', '害怕', '黑'] },
  { id: 't75', theme: 'feelings', open: '如果看到同学一个人在哭，你会怎么做？', en: 'If you saw a classmate crying alone, what would you do?', followUps: ['你会对他说什么？', '你难过的时候，希望别人怎么做？'], pattern: '如果…就…', sample: '如果同学在哭，我就问他怎么了，再和他坐一下。', hooks: ['哭', '难过', '同学'] },
  { id: 't76', theme: 'feelings', open: '你觉得一个好孩子要怎么做？', en: 'What do you think a good child does?', followUps: ['在家里呢？', '在巴士上呢？'], pattern: '我觉得…因为…', sample: '我觉得好孩子要说请和谢谢，因为别人听了会很开心。', hooks: ['请', '谢谢'] },
  { id: 't77', theme: 'feelings', open: '你什么时候觉得很累？累的时候你想做什么？', en: 'When do you feel really tired? What do you want to do then?', followUps: ['今天什么事让你累了？', '休息以后，你觉得怎么样？'], pattern: '有时候…有时候…', sample: '有时候踢完球我很累，有时候写字写多了也很累。累了我就想睡觉。', hooks: ['累', '休息'] },
  { id: 't78', theme: 'feelings', open: '这个星期你帮助了谁？他是怎么谢谢你的？', en: 'Whom did you help this week? How did they thank you?', followUps: ['你为什么想帮他？', '帮了别人以后，你的心情怎么样？'], pattern: '我觉得…因为…', sample: '我帮奶奶提东西。我觉得很开心，因为奶奶笑了。', hooks: ['帮助', '心情'] },
  { id: 't79', theme: 'feelings', open: '如果你在地上捡到别人的钱，你会怎么做？', en: 'If you found money someone had dropped, what would you do?', followUps: ['如果是你丢了东西，你会觉得怎么样？', '你会把它交给谁？'], pattern: '如果…就…', sample: '如果我在学校捡到钱，我就交给老师。', hooks: ['捡', '钱'] },
  { id: 't80', theme: 'feelings', open: '有什么事你一开始不会，后来学会了？', en: "What couldn't you do at first, but learned later?", followUps: ['那时候你是怎么练习的？', '你想对还在学的人说什么？'], pattern: '虽然…但是…', sample: '虽然我一开始不会骑脚车，但是我天天练，后来就会了。', hooks: ['学会', '练习'] },
];
