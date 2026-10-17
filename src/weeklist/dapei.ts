// src/weeklist/dapei.ts
// Wrong partners for a list's 搭配 (weekly list spec 2026-10-17 §7.4): proposed here, confirmed by the parent. Never an object
// another verb of the same family takes (煮/炒/炸/烤 all cook), a DAPEI or HSK pairing, or a blocked word.
import { BLOCKED } from '../content/blocked';
import { DAPEI, isDapei } from '../content/dapei';
import { dictionaryGloss } from '../content/glossary';
import { HSK_WORDS } from '../content';
import type { DraftPair } from './parse';

/** Verbs that take the same objects: an object one of them takes counts as fitting them all. Extend as lists bring new verbs. */
export const VERB_FAMILY: Readonly<Record<string, string>> = {
  煮: 'cook', 炒: 'cook', 炸: 'cook', 烤: 'cook', 蒸: 'cook', 煎: 'cook', 做: 'cook',
  摘: 'harvest', 拔: 'harvest', 挖: 'harvest', 采: 'harvest', 种: 'harvest',
  玩: 'play', 套: 'play', 射: 'play', 打: 'play', 踢: 'play', 拍: 'play', 放: 'play',
  吃: 'eat', 喝: 'eat', 尝: 'eat',
};

const fits = (left: string, right: string, pairs: DraftPair[]): boolean => {
  if (pairs.some((p) => p.left === left && p.right === right)) return true;
  if (isDapei(left, right) || HSK_WORDS.has(left + right) || dictionaryGloss(left + right) !== undefined) return true;
  const fam = VERB_FAMILY[left];
  return !!fam && pairs.some((p) => p.right === right && VERB_FAMILY[p.left] === fam);
};

export function proposeWrong(pair: DraftPair, pairs: DraftPair[], skip: ReadonlySet<string> = new Set()): string[] {
  const objects = [...new Set(pairs.map((p) => p.right))].filter((o) => o !== pair.right && !skip.has(o) && !BLOCKED.has(o) && !fits(pair.left, o, pairs));
  // another theme first (摘 → 番茄汤 before 摘 → 豆芽), then the page's order
  const ranked = [...objects.filter((o) => pairs.find((p) => p.right === o)?.group !== pair.group), ...objects.filter((o) => pairs.find((p) => p.right === o)?.group === pair.group)];
  const out = ranked.slice(0, 3);
  for (const d of DAPEI) {
    if (out.length >= 3) break;
    if (d.noun !== pair.right && !out.includes(d.noun) && !skip.has(d.noun) && !BLOCKED.has(d.noun) && !fits(pair.left, d.noun, pairs)) out.push(d.noun);
  }
  return out;
}
