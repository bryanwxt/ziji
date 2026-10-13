// The parent's One River paintings → public/worlds/ (spec 2026-10-13 §4): npx tsx scripts/art/worlds.ts
// docs/worlds/paintings/<n>-<id>.jpg → public/worlds/<id>.webp and <id>-thumb.webp. Exits 1 if one is missing or over budget.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { WORLDS } from '../../src/fun/worlds';
import { prepareWorld, WORLD_SET_MAX_BYTES } from './paintings';

const SRC = 'docs/worlds/paintings';
const OUT = 'public/worlds';
mkdirSync(OUT, { recursive: true });
const files = readdirSync(SRC).filter((f) => /^\d-[a-z]+\.(jpe?g|png|webp)$/i.test(f));
let total = 0;
let failed = 0;
for (const w of WORLDS) {
  const f = files.find((x) => x.replace(/^\d-|\.[^.]+$/g, '') === w.id);
  if (!f) { failed++; console.log(`${w.id}: no painting in ${SRC}`); continue; }
  try {
    const r = await prepareWorld(readFileSync(`${SRC}/${f}`));
    writeFileSync(`${OUT}/${w.id}.webp`, r.webp);
    writeFileSync(`${OUT}/${w.id}-thumb.webp`, r.thumb);
    total += r.webp.length + r.thumb.length;
    const b = r.border;
    console.log(`${w.id}: ${r.size} px, ${Math.round(r.webp.length / 1000)} KB at quality ${r.quality}${b.top + b.right + b.bottom + b.left ? `, border trimmed ${b.top}/${b.right}/${b.bottom}/${b.left}` : ''}`);
  } catch (e) { failed++; console.log(`${w.id}: ${(e as Error).message}`); }
}
console.log(`${Math.round(total / 1000)} KB in all${total > WORLD_SET_MAX_BYTES ? ' — OVER the 2.4 MB budget' : ''}`);
process.exit(failed || total > WORLD_SET_MAX_BYTES ? 1 : 0);
