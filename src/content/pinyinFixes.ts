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
  炸鸡: 'zhá jī', 油炸: 'yóu zhá', 种植: 'zhòng zhí', 种花的: 'zhòng huā de', 勒紧: 'lēi jǐn', // 种花的: 写一写's piece (never 种花 alone)
});
