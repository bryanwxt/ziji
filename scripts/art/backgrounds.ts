// The parent's paintings → story backgrounds (spec 3b §4): npx tsx scripts/art/backgrounds.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { BG_SEASON_MAX_BYTES, missingScenes, prepareBackground, sceneIds } from '../../src/story/art';
import { parseChapter } from '../../src/story/format';

const SRC = 'art/backgrounds';
const OUT = 'public/story/bg';
mkdirSync(OUT, { recursive: true });
let failed = 0;
for (const f of readdirSync(SRC).filter((x) => /\.(png|jpe?g|webp)$/i.test(x))) {
  const id = f.replace(/\.[^.]+$/, '');
  const src = `${SRC}/${f}`;
  const out = `${OUT}/${id}.webp`;
  if (existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) continue; // already made from this original
  try {
    const r = await prepareBackground(readFileSync(src));
    writeFileSync(out, r.webp);
    console.log(`${id}: ${Math.round(r.webp.length / 1000)} KB at quality ${r.quality}`);
  } catch (e) { failed++; console.log(`${id}: ${(e as Error).message}`); }
}
const have = new Set(readdirSync(OUT).filter((x) => x.endsWith('.webp')).map((x) => x.replace(/\.webp$/, '')));
const total = [...have].reduce((n, id) => n + statSync(`${OUT}/${id}.webp`).size, 0);
const chapters = readdirSync('docs/story').filter((d) => d.startsWith('season-')).flatMap((d) =>
  readdirSync(`docs/story/${d}`).filter((x) => /^ch\d+\.md$/.test(x)).map((x) => parseChapter(readFileSync(`docs/story/${d}/${x}`, 'utf8'))));
const pending = missingScenes(sceneIds(chapters), have);
console.log(`${have.size} backgrounds, ${Math.round(total / 1000)} KB in all${total > BG_SEASON_MAX_BYTES ? ' — OVER the 2.5 MB budget' : ''}`);
console.log(pending.length ? `pending (no painting yet): ${pending.join(', ')}` : 'every scene has a painting');
process.exit(failed || total > BG_SEASON_MAX_BYTES ? 1 : 0);
