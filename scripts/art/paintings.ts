// The One River paintings → the app's worlds (spec 2026-10-13 §4): trim any uniform border, crop to a square, encode WebP
// under 300 KB (the story's encoder), and a 240 px thumbnail for 松露's room and the arrival card.
import sharp from 'sharp';
import { webpUnder } from '../../src/story/art';

export const WORLD_MAX_BYTES = 300_000;
export const WORLD_SET_MAX_BYTES = 2_400_000;
export const WORLD_MIN_SIZE = 960;
export const WORLD_MAX_SIZE = 1024;
export const THUMB_SIZE = 240;
export const THUMB_MAX_BYTES = 30_000;
/** A line of pixels is border when its mean distance from its own average colour (summed over R, G, B) is at most this. */
const UNIFORM = 16;
/** A frame is at most this share of a side; past it the "border" is part of the painting (a flat sky, say). */
const MAX_BORDER = 0.08;

export interface Border { top: number; right: number; bottom: number; left: number }

/** How many pixel rows or columns at each edge are a flat frame (Gemini drew one round 2-rainforest.jpg). */
export async function findBorder(input: Buffer): Promise<Border> {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const spread = (n: number, at: (i: number) => number) => {
    const m = [0, 0, 0];
    for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) m[c]! += data[at(i) + c]!;
    for (let c = 0; c < 3; c++) m[c]! /= n;
    let s = 0;
    for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) s += Math.abs(data[at(i) + c]! - m[c]!);
    return s / n;
  };
  const row = (y: number) => spread(W, (x) => (y * W + x) * 3);
  const col = (x: number) => spread(H, (y) => (y * W + x) * 3);
  const depth = (n: number, flat: (i: number) => boolean) => {
    let d = 0;
    while (d < n * MAX_BORDER && flat(d)) d++;
    return d >= n * MAX_BORDER ? 0 : d && d + 1; // and one more: the soft line where the frame meets the paint
  };
  return {
    top: depth(H, (i) => row(i) <= UNIFORM),
    bottom: depth(H, (i) => row(H - 1 - i) <= UNIFORM),
    left: depth(W, (i) => col(i) <= UNIFORM),
    right: depth(W, (i) => col(W - 1 - i) <= UNIFORM),
  };
}

/** One painting, ready for the app: border trimmed, centre-cropped square, at most 1024 px, WebP ≤ 300 KB; and its thumbnail. */
export async function prepareWorld(input: Buffer): Promise<{ webp: Buffer; thumb: Buffer; size: number; quality: number; border: Border }> {
  const meta = await sharp(input).metadata();
  const b = await findBorder(input);
  const w = (meta.width ?? 0) - b.left - b.right;
  const h = (meta.height ?? 0) - b.top - b.bottom;
  const side = Math.min(w, h);
  if (side < WORLD_MIN_SIZE) throw new Error(`too small: ${side} px square after trimming; at least ${WORLD_MIN_SIZE} px is needed`);
  const square = sharp(input).extract({ left: b.left + Math.floor((w - side) / 2), top: b.top + Math.floor((h - side) / 2), width: side, height: side });
  const size = Math.min(side, WORLD_MAX_SIZE);
  const fit = await webpUnder(square.clone().resize(size, size), WORLD_MAX_BYTES);
  if (!fit) throw new Error("can't fit in 300 KB even at quality 50: simplify the painting or repaint it");
  const thumb = await webpUnder(square.clone().resize(THUMB_SIZE, THUMB_SIZE), THUMB_MAX_BYTES);
  if (!thumb) throw new Error("the thumbnail can't fit in 30 KB");
  return { webp: fit.webp, thumb: thumb.webp, size, quality: fit.quality, border: b };
}
