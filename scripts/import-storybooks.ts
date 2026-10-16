// Builds src/content/storybooks.json and public/passages/*.webp from the vendored Global Storybooks stories (spec 2026-10-15
// §2.1). Deterministic and offline once scripts/storybooks/fetch.ts has filled the picture cache:
//   npx tsx scripts/import-storybooks.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { IMAGE_CACHE, importAll, SBC_COMMIT, type Manifest } from './storybooks/lib';

const DIR = 'scripts/storybooks';
/** One picture per passage (spec §7): at most 640 px wide (the imagebank's are 546, never enlarged), WebP quality 50 — about
 *  20 KB each as the spec planned, none over 60 KB, the set under 1.5 MB (lib.test.ts checks the budget). */
export const IMAGE_WIDTH = 640;
export const IMAGE_QUALITY = 50;

const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, 'utf8')) as Manifest;
const files = readdirSync(`${DIR}/zh`).filter((f) => f.endsWith('.md')).sort();
const stories = importAll(manifest, files.map((file) => ({ file, md: readFileSync(`${DIR}/zh/${file}`, 'utf8') })));
const passages = stories.flatMap((s) => s.passages);

rmSync('public/passages', { recursive: true, force: true }); // a passage dropped since the last run leaves no picture behind
mkdirSync('public/passages', { recursive: true });
for (const { out, page } of stories.flatMap((s) => s.images)) {
  const src = join(IMAGE_CACHE, page);
  if (!existsSync(src)) throw new Error(`missing ${src}: run npx tsx scripts/storybooks/fetch.ts`);
  writeFileSync(join('public', out), await sharp(src).resize({ width: IMAGE_WIDTH, withoutEnlargement: true }).webp({ quality: IMAGE_QUALITY }).toBuffer());
}

const about = `Global Storybooks Chinese (github.com/global-asp/sbc-source, zh/, commit ${SBC_COMMIT.slice(0, 7)}), built by scripts/import-storybooks.ts from scripts/storybooks/. Each passage carries its story's credit and licence (CC BY 3.0, CC BY 4.0 or CC BY-NC 3.0).`;
writeFileSync('src/content/storybooks.json', `{\n"about": ${JSON.stringify(about)},\n"passages": [\n${passages.map((p) => JSON.stringify(p)).join(',\n')}\n]\n}\n`);

const byTerm = new Map<string, number>();
for (const p of passages) byTerm.set(p.term, (byTerm.get(p.term) ?? 0) + 1);
for (const s of stories) console.log(`${s.id} ${s.title}: ${s.passages.length} of ${s.chunks} parts`);
console.log(`${passages.length} passages from ${stories.filter((s) => s.passages.length).length} stories: ${[...byTerm].map(([t, n]) => `${t} ${n}`).join(', ')}`);
