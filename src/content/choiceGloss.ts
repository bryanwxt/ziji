// English for the choices a 练一练 question can offer that have none anywhere else (parent 2026-10-16: the miss sheet showed no
// English beside some wrong picks): a 连一连 board's other 词语, a sentence-bank or 搭配 wrong choice, a look-alike character.
// Kid glosses in kidGloss.json's style (glossProblems: at most four everyday words, one sense, no jargon). Only the miss sheet
// and the 连一连 summary read these: they never make a word take an English question (questionMeaning reads kidGloss only).
// missNote.test.ts sweeps the content and lists any choice still without English.
export const CHOICE_GLOSS: Readonly<Record<string, string>> = {
  // sentence-bank and 搭配 choices
  对不起: 'sorry', 不客气: "you're welcome", 星期天: 'Sunday', 小朋友: 'little kids', 自行车: 'bicycle', 公共汽车: 'bus',
  出租车: 'taxi', 整理: 'tidy up', 只有: 'only', 其实: 'actually', 新鲜: 'fresh', 担心: 'worry', 失望: 'disappointed',
  理发: 'get a haircut', 华文: 'Chinese language', 面条: 'noodles', 日记: 'diary', 儿歌: "children's song", 网球: 'tennis',
  气球: 'balloon', 写字: 'write words',
  // 连一连: the other 词语 a board can hold
  东部: 'the east', 西部: 'the west', 南部: 'the south', 西南: 'southwest', 主意: 'idea', 乐观: 'cheerful', 乐队: 'band',
  事业: 'career', 事实: 'fact', 亲自: 'yourself', 从事: 'work as', 以前: 'before', 以外: 'apart from', 住院: 'stay in hospital',
  体现: 'show', 体验: 'try out', 作文: 'composition', 作用: 'use', 作者: 'writer', 做客: 'visit as a guest',
  全场: 'the whole place', 全年: 'the whole year', 全球: 'the whole world', 全面: 'all-round', 分组: 'split into groups',
  创作: 'create', 制作: 'make', 前年: 'two years ago', 前进: 'go forward', 前面: 'in front', 发动: 'start up',
  发明: 'invent', 发生: 'happen', 发表: 'publish', 发达: 'well developed', 合作: 'work together', 合理: 'fair',
  同意: 'agree', 后年: 'in two years', 后果: 'result', 后面: 'behind', 听力: 'listening', 员工: 'worker',
  周年: 'anniversary', 回国: 'go back home', 声明: 'announce', 处理: 'deal with', 外地: 'another place',
  外文: 'foreign language', 外面: 'outside', 学生: 'student', 学费: 'school fees', 实力: 'strength', 实行: 'carry out',
  客观: 'fair-minded', 对手: 'opponent', 干吗: 'why', 年初: 'start of the year', 应当: 'should', 应用: 'use',
  得分: 'score', 情感: 'feelings', 感情: 'feelings', 意外: 'accident', 感受: 'feel', 成果: 'result', 打听: 'ask about',
  报到: 'check in', 报道: 'news report', 排名: 'ranking', 提前: 'early', 提问: 'ask a question', 收听: 'listen in',
  放到: 'put in', 数量: 'number', 整体: 'the whole', 文学: 'stories and poems', 文明: 'polite', 日常: 'everyday',
  时代: 'times', 消息: 'news', 演员: 'actor', 现代: 'modern', 现场: 'on the spot', 现实: 'real life', 班级: 'class',
  生动: 'lively', 生意: 'business', 目前: 'now', 直到: 'until', 直播: 'live show', 相关: 'related', 相当: 'quite',
  真实: 'true', 确保: 'make sure', 确定: 'sure', 确实: 'really', 票价: 'ticket price', 自主: 'on your own', 自从: 'since',
  自动: 'by itself', 表现: 'behave', 西餐: 'Western food', 见到: 'see', 见过: 'have seen', 认得: 'know', 设立: 'set up',
  证明: 'prove', 试验: 'test', 请教: 'ask for advice', 路边: 'roadside', 身边: 'by your side', 这么: 'so', 这些: 'these',
  这样: 'like this', 通信: 'write letters', 通常: 'usually', 那么: 'so', 面对: 'face', 预习: 'prepare a lesson',
  题目: 'question',
  // 钓鱼 look-alike characters beyond his lists (a bound one by the word it lives in: 玻 in 玻璃)
  矣: 'old sentence ending', 兹: 'this', 凰: 'phoenix', 邓: 'a family name', 智: 'wise', 阎: 'a family name', 姆: 'nanny',
  杭: 'Hangzhou city', 氓: 'rascal', 徊: 'walk up and down', 徘: 'walk up and down', 诱: 'tempt', 攘: 'push away',
  胧: 'hazy', 秩: 'order', 朦: 'hazy', 玻: 'glass', 萄: 'grape', 菩: 'Buddha', 萨: 'Buddha', 悦: 'happy',
  浙: 'Zhejiang province', 嫦: 'moon lady', 嬉: 'play', 痪: 'cannot move', 霍: 'suddenly', 峙: 'stand tall', 尴: 'awkward',
  瞅: 'look at', 馒: 'steamed bun', 慷: 'generous', 吩: 'tell someone to', 魄: 'spirit', 哆: 'shiver', 缤: 'colourful',
  碌: 'busy', 俱: 'all', 咐: 'tell someone to', 咙: 'throat',
};
