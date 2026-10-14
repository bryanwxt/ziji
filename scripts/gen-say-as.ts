// Generates src/audio/sayAs.json: how to say a lone character so the iPad's voice gives the reading the card teaches
// (parent, 2026-10-05: 调 on its 空调 card was said diào). A 多音字 on its own is said as a common character with that one
// reading (调 tiáo → 条), so the voice can't pick the other reading.
//   npx tsx scripts/gen-say-as.ts   (after npm run content, which leaves Make Me a Hanzi's dictionary in scripts/.cache)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pinyin } from 'pinyin-pro';
import { builtinWords, schoolTerm } from '../src/content';

/** Common 多音字 a primary-school child meets, whose lone reading on a speech voice can be the other one (hand list, 2026-10-05). */
const HAND = [...new Set(Array.from(
  '调长行重还了得地着都乐好少数为发种只场中便差处传当朝间教觉角解卷空量难宁强曲散省盛似弹相兴应背薄藏称冲担倒奔恶分缝干更供冠号和横划会几假将降结尽劲看落没模磨泊铺片撒塞扇舍系吓鲜血要晕载扎涨正挣转作钻参曾大的给哪喝漂便宜什么觉睡乘处创答当钉冻斗恶法佛服盖杆搁个给更供勾估骨观广哈汗巷合核横哄糊华划还晃混几济挤夹假间监渐将降教结禁尽劲据卡看壳空拉喇蓝落了累愣量撩淋笼露论抹磨没闷蒙眯模难宁弄挪排胖炮喷片漂撇屏仆铺奇骑起切亲曲圈任撒色煞扇上少折舍什识似数刷率说思宿踏台提挑帖通吐拓瓦为委尾系吓鲜相削兴宿压亚咽要叶应佣与语晕扎粘占涨着正症只种轴属转赚追仔综钻作勒呵',
))];

const syllables = (ch: string) => [...new Set(pinyin(ch, { multiple: true, type: 'array' }))];
/**
 * Characters whose everyday reading two dictionaries disagree on: pinyin-pro's first reading against Make Me a Hanzi's (Unihan's).
 * A voice's own front end can side with either (content audit 2026-10-15: 爪 is zhuǎ to pinyin-pro and zhǎo to the iPad), so
 * none of these is ever another character's twin.
 */
const dictionaryFile = new URL('./.cache/dictionary.txt', import.meta.url);
if (!existsSync(dictionaryFile)) throw new Error('scripts/.cache/dictionary.txt is missing: run npm run content first');
const firstReading = new Map<string, string>();
for (const line of readFileSync(dictionaryFile, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const e = JSON.parse(line) as { character: string; pinyin: string[] };
  if (e.pinyin[0]) firstReading.set(e.character, e.pinyin[0]);
}
const disputed = (ch: string) => firstReading.has(ch) && firstReading.get(ch) !== pinyin(ch);

const singles = builtinWords(0).filter((w) => [...w.text].length === 1).sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9));
/**
 * Steered (content audit 2026-10-15): every school character and every hand-listed 多音字 with more than one reading in
 * pinyin-pro → the reading the app teaches. Not a hand list alone: 爪, 吗 and 36 more school characters were said unsteered.
 */
const poly: Record<string, string> = {};
for (const w of singles) if ((HAND.includes(w.text) || schoolTerm(w.text)) && syllables(w.text).length > 1) poly[w.text] = w.pinyin;
/**
 * toned syllable → a common character read that way, which can stand in for another (its twin): read that way on its
 * own by both dictionaries, and not a hand-listed 多音字. A steered character may be its own twin (条 tiáo): its reading is the
 * one every voice gives it alone.
 */
const plain: Record<string, string> = {};
const twinable = singles.filter((w) => !HAND.includes(w.text) && !disputed(w.text) && pinyin(w.text) === w.pinyin);
const canTwin = new Map(twinable.map((w) => [w.text, w.pinyin]));
// a twin already in use stays while it still may be one, so its clips never change (a clip is named by what the voice is
// given); a syllable without one takes the first in school order
const before = new URL('../src/audio/sayAs.json', import.meta.url);
const kept = existsSync(before) ? (JSON.parse(readFileSync(before, 'utf8')) as { plain: Record<string, string> }).plain : {};
for (const [r, ch] of Object.entries(kept)) if (canTwin.get(ch) === r) plain[r] = ch;
for (const w of twinable) if (!plain[w.pinyin]) plain[w.pinyin] = w.text;
const sayAs: Record<string, string> = {};
for (const [ch, r] of Object.entries(poly)) if (plain[r]) sayAs[ch] = plain[r];
/** Steered characters with no twin whose taught reading isn't the one every dictionary gives it alone (爪 zhuǎ, 切 qiē): a voice
 *  may say them the other way, and no stand-in can stop it (the clip pipeline's spot-listen list). */
const unsure = Object.entries(poly).filter(([ch, r]) => !sayAs[ch] && (disputed(ch) || pinyin(ch) !== r)).map(([ch]) => ch);
/** An unsure character said on its own is said as its card's first 组词 instead (爪 → 爪子): every card's 组词 say it as taught. */
const byText = new Map(singles.map((w) => [w.text, w]));
const words: Record<string, string[]> = {}; // first the 组词 it is said as, then others for when that one would give an answer away
for (const ch of unsure) {
  const found = (byText.get(ch)?.examples ?? []).filter((x) => Array.from(x.text).length > 1 && x.text.includes(ch)).map((x) => x.text);
  if (found.length) words[ch] = found;
}
const wordless = unsure.filter((ch) => !words[ch]);
if (wordless.length) throw new Error(`unsure characters with no 组词 to be said as: ${wordless.join('')} (add one to extraExamples.ts)`);
writeFileSync(new URL('../src/audio/sayAs.json', import.meta.url), JSON.stringify({ sayAs, poly, plain, unsure, words }) + '\n');
const missing = Object.entries(poly).filter(([ch]) => !sayAs[ch]);
console.log(`polyphones ${Object.keys(poly).length}, said as a twin ${Object.keys(sayAs).length} (as themselves ${Object.entries(sayAs).filter(([c, t]) => c === t).length}); no twin: ${missing.map(([c, r]) => c + r).join(' ')}; unsure: ${unsure.join('')}`);
