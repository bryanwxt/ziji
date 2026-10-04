import { pinyin } from 'pinyin-pro';
import { BUILTIN, getCharInfo, hanChars } from '../../content';
import type { Word } from '../../types';
import { syllableTone, withTone } from './tones';

/** Radical side forms that never stand alone as words (扌 isn't read shǒu): never offered as a reading. */
const SIDE_FORMS = new Set([...'扌氵亻讠忄纟钅饣衤礻犭阝刂冫冖宀廴辶艹⺮尸彳攵丬牜疒罒覀耂⺌⺈⻊⻏⻖⺗⺼']);

/** Single strokes and enclosure parts: their dictionary names (piě, jiōng…) are not readings a child would confuse. */
const STROKES = new Set([...'丿乀丶丨亅乙乚冂冖凵匚匸亠丷乛丨𠃌𠃊']);

const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];
const INITIAL_SWAPS: Record<string, string[]> = { j: ['z', 'zh'], q: ['c', 'ch'], x: ['s', 'sh'], z: ['j', 'zh'], c: ['q', 'ch'], s: ['x', 'sh'], zh: ['z', 'j'], ch: ['c', 'q'], sh: ['s', 'x'] };
const FINAL_SWAPS: [string, string][] = [['ie', 'ia'], ['uo', 'ou'], ['in', 'ing'], ['an', 'ang'], ['en', 'eng'], ['ian', 'iang'], ['un', 'ong']];
/** Every toneless syllable the app knows: a swap must land on a real syllable. */
const VALID = new Set(BUILTIN.flatMap((c) => c.pinyin.split(' ').map((s) => syllableTone(s).base)));

function split(base: string): [string, string] {
  const ini = INITIALS.find((i) => base.startsWith(i) && base.length > i.length) ?? '';
  return [ini, base.slice(ini.length)];
}

function swaps(syl: string): string[] {
  const { base, tone } = syllableTone(syl);
  const [ini, fin] = split(base);
  const out: string[] = [];
  for (const i of INITIAL_SWAPS[ini] ?? []) {
    // j/q/x take ü written as u; after z/c/s the u is a real u: only keep real syllables
    if (VALID.has(i + fin)) out.push(withTone(i + fin, tone));
  }
  for (const [a, b] of FINAL_SWAPS) {
    for (const [from, to] of [[a, b], [b, a]] as const) {
      if (fin.endsWith(from) && VALID.has(ini + fin.slice(0, -from.length) + to)) out.push(withTone(ini + fin.slice(0, -from.length) + to, tone));
    }
  }
  return out;
}

/** 轻声 words whose full-tone reading is another real word (东西 dōng xī, east and west): that reading is never a trap. */
const FULL_TONE_IS_A_WORD = new Set(['东西', '大意', '地道', '地方', '兄弟', '买卖', '人家', '对头', '精神', '自然', '实在', '大夫', '照应', '下水', '多少']);

/** His worksheet traps, in priority order: the phonetic part's reading, initial swaps, final swaps, 轻声 given full tone. */
export function trapReadings(word: Word): string[] {
  const syllables = word.pinyin.split(' ');
  const out: string[] = [];
  const chars = hanChars(word.text);
  if (chars.length === 1) {
    const info = getCharInfo(chars[0]!);
    for (const part of info?.components ?? []) {
      if (part === chars[0] || SIDE_FORMS.has(part) || !/\p{Script=Han}/u.test(part)) continue; // a radical side form (扌, 氵…) is never what he misreads; the sounding part is
      if (STROKES.has(part)) continue; // strokes and enclosures (丿 冂 丨…) have dictionary names, not readings he'd say
      const p = pinyin(part);
      if (p && p !== word.pinyin && VALID.has(syllableTone(p).base)) out.push(p); // a real syllable, never a glyph pinyin-pro passes through
    }
  }
  syllables.forEach((s, i) => {
    for (const alt of swaps(s)) out.push(syllables.map((x, j) => (j === i ? alt : x)).join(' '));
    if (syllableTone(s).tone === 5 && chars[i] && !FULL_TONE_IS_A_WORD.has(word.text)) {
      const full = pinyin(chars[i]!);
      if (full && full !== s) out.push(syllables.map((x, j) => (j === i ? full : x)).join(' '));
    }
  });
  return [...new Set(out)].filter((p) => p !== word.pinyin);
}
