import type { Rng } from '../lib/random';

export { ACCESSORY_IDS as ACCESSORIES } from './accessories';
export const CHEERS = ['好棒！', '你真努力！', '答对了！', '太好了！', '真厉害！', '继续加油！'];
export const COMFORTS = ['没关系，再来！', '慢慢来！', '你可以的！'];
export const CHEST_BONUS_STARS = 3;

export function pickLine(lines: readonly string[], rng: Rng): string {
  return lines[Math.floor(rng() * lines.length)]!;
}
