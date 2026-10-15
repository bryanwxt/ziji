// Global Storybooks' credit (spec 2026-10-15 §2.1): the one line under a passage on Listen, and the licence links behind it.
// Each story keeps its own licence: CC BY 3.0, CC BY 4.0 or CC BY-NC 3.0 (scripts/storybooks/SOURCE.md).
import type { PassageCredit } from '../types';

export const LICENCE_URL: Readonly<Record<PassageCredit['licence'], string>> = {
  'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC BY-NC 3.0': 'https://creativecommons.org/licenses/by-nc/3.0/',
};

/** 「故事：Global Storybooks · CC BY 3.0 · 有改动 · 文 … · 图 … · 译 …」: the licence and 有改动 first, so the one line's ellipsis
 *  never cuts them (the people are in the details and the parent's Credits). */
export function creditLine(c: PassageCredit): string {
  return ['故事：Global Storybooks', c.licence, ...(c.adapted ? ['有改动'] : []), `文 ${c.text}`, `图 ${c.illustration}`, `译 ${c.translation}`].join(' · ');
}
