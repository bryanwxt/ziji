import type { Rng } from '../lib/random';

export { ACCESSORY_IDS as ACCESSORIES } from './accessories';
export const CHEERS = ['好棒！', '你真努力！', '答对了！', '太好了！', '真厉害！', '继续加油！'];
export const COMFORTS = ['没关系，再来！', '慢慢来！', '你可以的！'];
export const CHEST_BONUS_STARS = 3;

export function comboMilestone(combo: number): boolean {
  return combo === 3 || combo === 5 || (combo >= 10 && combo % 10 === 0);
}

export function pickLine(lines: readonly string[], rng: Rng): string {
  return lines[Math.floor(rng() * lines.length)]!;
}

/** What Truffle says at a run of right answers (parent, 2026-10-05): the count, then praise that grows with it. */
export function comboPraise(n: number): string {
  const praise = n >= 10 ? '你太厉害了！' : n >= 5 ? '真了不起！' : '真棒！';
  return `连对${n}个，${praise}`;
}
