// @vitest-environment node
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { parseChapter } from './format';
import { BG_HEIGHT, BG_MAX_BYTES, BG_WIDTH, missingScenes, prepareBackground, sceneIds } from './art';

const flat = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 120, g: 180, b: 210 } } }).png().toBuffer();
/** Random pixels: the worst case for compression. */
const noise = (w: number, h: number) => {
  const raw = Buffer.alloc(w * h * 3);
  let x = 12345;
  for (let i = 0; i < raw.length; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; raw[i] = x & 255; }
  return sharp(raw, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
};

describe('backgrounds (spec 3b §4)', () => {
  it('a landscape original becomes a 1600×1200 WebP under 300 KB', async () => {
    const r = await prepareBackground(await flat(2400, 1600));
    const meta = await sharp(r.webp).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['webp', BG_WIDTH, BG_HEIGHT]);
    expect(r.webp.length).toBeLessThanOrEqual(BG_MAX_BYTES);
  });
  it('a portrait original is centre-cropped to 4:3', async () => {
    const r = await prepareBackground(await flat(1800, 2700));
    expect([r.width, r.height]).toEqual([BG_WIDTH, BG_HEIGHT]);
  });
  it('an original smaller than 1600×1200 is refused', async () => {
    await expect(prepareBackground(await flat(1200, 900))).rejects.toThrow(/too small/);
  });
  it('steps quality down to fit 300 KB, refuses below 50', async () => {
    await expect(prepareBackground(await noise(1600, 1200))).rejects.toThrow(/300 KB/);
  }, 30_000);
  it('lists each @scene once, in order, and what has no image yet', () => {
    const md = (n: number, scenes: string[]) => `---\nchapter: ${n}\ntitle: T\nplace: hdb\nslots: []\n---\n## Setup\n${scenes.map((s, i) => `### Page ${i + 1}\n@scene ${s}\nText.`).join('\n')}\n`;
    const ids = sceneIds([parseChapter(md(1, ['hdb-morning', 'hdb-voiddeck'])), parseChapter(md(2, ['hdb-voiddeck', 'hawker-noon']))]);
    expect(ids).toEqual(['hdb-morning', 'hdb-voiddeck', 'hawker-noon']);
    expect(missingScenes(ids, new Set(['hdb-voiddeck']))).toEqual(['hdb-morning', 'hawker-noon']);
  });
});
