import { pinyin } from 'pinyin-pro';
import { getCharInfo } from '../content';
import { toneless } from '../activities/flashcards/tones';

/** Could OCR or a reader have put `from` for `to`? They share a part or radical (织/识, 已/己), or sound the same (遍/边). */
export function lookAlike(from: string, to: string): boolean {
  if (toneless(pinyin(from)) === toneless(pinyin(to))) return true;
  const a = getCharInfo(from);
  const b = getCharInfo(to);
  if (!a || !b) return false;
  const partsA = new Set([a.radical, ...a.components, from]);
  return [b.radical, ...b.components, to].some((p) => partsA.has(p) && !(p === a.radical && p === b.radical && SHARED_EVERYWHERE.has(p)));
}

// Radicals so common that sharing only them says nothing about the shape (安/字 both 宀 is still a look-alike; 一 and 丨 are not).
const SHARED_EVERYWHERE = new Set(['一', '丨', '丶', '丿', '乙', '亅']);
