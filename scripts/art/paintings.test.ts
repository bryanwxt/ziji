// @vitest-environment node
import { readFileSync, statSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { WORLDS } from '../../src/fun/worlds';
import { findBorder, prepareWorld, THUMB_SIZE, WORLD_MAX_BYTES, WORLD_MIN_SIZE, WORLD_SET_MAX_BYTES } from './paintings';

const painting = (f: string) => readFileSync(`docs/worlds/paintings/${f}`);

describe('One River paintings → the app (spec 2026-10-13 §4)', () => {
  it("trims the rainforest's white frame to a clean square of at least 960 px", async () => {
    const r = await prepareWorld(painting('2-rainforest.jpg'));
    for (const side of Object.values(r.border)) expect(side).toBeGreaterThanOrEqual(28);
    const meta = await sharp(r.webp).metadata();
    expect([meta.format, meta.width === meta.height]).toEqual(['webp', true]);
    expect(meta.width).toBeGreaterThanOrEqual(WORLD_MIN_SIZE);
    expect(r.webp.length).toBeLessThanOrEqual(WORLD_MAX_BYTES);
    expect((await sharp(r.thumb).metadata()).width).toBe(THUMB_SIZE);
  }, 20_000);
  it('leaves a painting with no frame alone (a sky is not a border)', async () => {
    expect(await findBorder(painting('1-home.jpg'))).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    expect(await findBorder(painting('8-milkyway.jpg'))).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });
  it('a too-small painting is refused', async () => {
    const small = await sharp({ create: { width: 800, height: 800, channels: 3, background: { r: 200, g: 120, b: 90 } } }).png().toBuffer();
    await expect(prepareWorld(small)).rejects.toThrow(/too small/);
  });
  it('every world has its painting and thumbnail in public/worlds, within the budgets (300 KB each, 2.4 MB in all)', () => {
    let total = 0;
    for (const w of WORLDS) {
      const size = statSync(`public/worlds/${w.id}.webp`).size;
      expect(size, w.id).toBeLessThanOrEqual(WORLD_MAX_BYTES);
      total += size + statSync(`public/worlds/${w.id}-thumb.webp`).size;
    }
    expect(total).toBeLessThanOrEqual(WORLD_SET_MAX_BYTES);
  });
});
