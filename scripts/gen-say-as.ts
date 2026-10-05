// Generates src/audio/sayAs.json: how to say a lone character so the iPad's voice gives the reading the card teaches
// (parent, 2026-10-05: 调 on its 空调 card was said diào). A common 多音字 on its own is said as a common character with
// that one reading (调 tiáo → 条), so the voice can't pick the other reading.
import { writeFileSync } from 'node:fs';
import { pinyin } from 'pinyin-pro';
import { builtinWords } from '../src/content';

/** Common 多音字 a primary-school child meets, whose lone reading on a speech voice can be the other one. */
const POLYPHONES = [...new Set(Array.from(
  '调长行重还了得地着都乐好少数为发种只场中便差处传当朝间教觉角解卷空量难宁强曲散省盛似弹相兴应背薄藏称冲担倒奔恶分缝干更供冠号和横划会几假将降结尽劲看落没模磨泊铺片撒塞扇舍系吓鲜血要晕载扎涨正挣转作钻参曾大的给哪喝漂便宜什么觉睡乘处创答当钉冻斗恶法佛服盖杆搁个给更供勾估骨观广哈汗巷合核横哄糊华划还晃混几济挤夹假间监渐将降教结禁尽劲据卡看壳空拉喇蓝落了累愣量撩淋笼露论抹磨没闷蒙眯模难宁弄挪排胖炮喷片漂撇屏仆铺奇骑起切亲曲圈任撒色煞扇上少折舍什识似数刷率说思宿踏台提挑帖通吐拓瓦为委尾系吓鲜相削兴宿压亚咽要叶应佣与语晕扎粘占涨着正症只种轴属转赚追仔综钻作勒呵',
))];

const syllables = (ch: string) => [...new Set(pinyin(ch, { multiple: true, type: 'array' }))];
const singles = builtinWords(0).filter((w) => [...w.text].length === 1).sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9));
const poly: Record<string, string> = {}; // a common 多音字 → the reading the app teaches
for (const w of singles) if (POLYPHONES.includes(w.text) && syllables(w.text).length > 1) poly[w.text] = w.pinyin;
const plain: Record<string, string> = {}; // toned syllable → the most common character read that way and not a 多音字 above
for (const w of singles) if (!POLYPHONES.includes(w.text) && pinyin(w.text) === w.pinyin && !plain[w.pinyin]) plain[w.pinyin] = w.text;
const sayAs: Record<string, string> = {};
for (const [ch, r] of Object.entries(poly)) if (plain[r]) sayAs[ch] = plain[r];
writeFileSync(new URL('../src/audio/sayAs.json', import.meta.url), JSON.stringify({ sayAs, poly, plain }) + '\n');
const missing = Object.entries(poly).filter(([, r]) => !plain[r]);
console.log(`polyphones ${Object.keys(poly).length}, said as a twin ${Object.keys(sayAs).length}; no twin: ${missing.map(([c, r]) => c + r).join(' ')}`);
console.log(Object.entries(sayAs).map(([c, t]) => `${c}${poly[c]}→${t}`).join(' '));
