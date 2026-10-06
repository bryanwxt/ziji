// Backgrounds for the story (spec 2026-10-07 3b §4): the parent's paintings, centre-cropped to 4:3, 1600×1200, WebP ≤ 300 KB.
import sharp from 'sharp';
import type { Chapter } from './format';

export const BG_WIDTH = 1600;
export const BG_HEIGHT = 1200;
export const BG_MAX_BYTES = 300_000;
export const BG_SEASON_MAX_BYTES = 2_500_000;
const QUALITY_START = 80;
const QUALITY_FLOOR = 50;

export async function prepareBackground(input: Buffer): Promise<{ webp: Buffer; quality: number; width: number; height: number }> {
  const meta = await sharp(input).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  // the 4:3 box that fits inside the original, centred
  const cw = Math.min(w, Math.round((h * 4) / 3));
  const ch = Math.round((cw * 3) / 4);
  if (cw < BG_WIDTH || ch < BG_HEIGHT) throw new Error(`too small: ${w}×${h} gives a ${cw}×${ch} 4:3 crop; at least ${BG_WIDTH}×${BG_HEIGHT} is needed`);
  const left = Math.floor((w - cw) / 2);
  const top = Math.floor((h - ch) / 2);
  for (let quality = QUALITY_START; quality >= QUALITY_FLOOR; quality -= 5) {
    const webp = await sharp(input).extract({ left, top, width: cw, height: ch }).resize(BG_WIDTH, BG_HEIGHT).webp({ quality }).toBuffer();
    if (webp.length <= BG_MAX_BYTES) return { webp, quality, width: BG_WIDTH, height: BG_HEIGHT };
  }
  throw new Error(`can't fit in 300 KB even at quality ${QUALITY_FLOOR}: simplify the painting or regenerate it`);
}

export function sceneIds(chapters: Chapter[]): string[] {
  const out: string[] = [];
  for (const c of chapters) for (const p of [...c.setup, ...c.payoff]) for (const l of p.lines) if (l.kind === 'scene' && !out.includes(l.id)) out.push(l.id);
  return out;
}

export const missingScenes = (ids: string[], have: ReadonlySet<string>): string[] => ids.filter((id) => !have.has(id));
