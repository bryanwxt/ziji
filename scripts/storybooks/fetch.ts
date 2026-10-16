// Vendors Global Storybooks Chinese at the pinned commits (spec 2026-10-15 §2.1). Run once, then the import is offline:
//   npx tsx scripts/storybooks/fetch.ts
// 1. sbc-source's zh/*.md at SBC_COMMIT → scripts/storybooks/zh/ (committed).
// 2. each included passage's first-page picture from gsn-imagebank at IMAGEBANK_COMMIT → scripts/.cache/storybooks/ (git-ignored:
//    scripts/import-storybooks.ts turns them into public/passages/*.webp, which are committed).
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IMAGE_CACHE, IMAGEBANK_COMMIT, importAll, SBC_COMMIT, type Manifest } from './lib';

const DIR = 'scripts/storybooks';

async function get(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const tmp = mkdtempSync(join(tmpdir(), 'sbc-'));
writeFileSync(join(tmp, 'sbc.tgz'), await get(`https://codeload.github.com/global-asp/sbc-source/tar.gz/${SBC_COMMIT}`));
execFileSync('tar', ['-xzf', join(tmp, 'sbc.tgz'), '-C', tmp]);
mkdirSync(`${DIR}/zh`, { recursive: true });
cpSync(join(tmp, `sbc-source-${SBC_COMMIT}`, 'zh'), `${DIR}/zh`, { recursive: true });
rmSync(tmp, { recursive: true, force: true });
const files = readdirSync(`${DIR}/zh`).filter((f) => f.endsWith('.md')).sort();
console.log(`${files.length} stories in ${DIR}/zh`);

const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, 'utf8')) as Manifest;
const images = importAll(manifest, files.map((file) => ({ file, md: readFileSync(`${DIR}/zh/${file}`, 'utf8') }))).flatMap((s) => s.images);
let fetched = 0;
for (const { page } of images) {
  const out = join(IMAGE_CACHE, page);
  if (existsSync(out)) continue;
  mkdirSync(join(out, '..'), { recursive: true });
  writeFileSync(out, await get(`https://raw.githubusercontent.com/global-asp/gsn-imagebank/${IMAGEBANK_COMMIT}/${page}`));
  fetched++;
}
console.log(`${images.length} pictures needed, ${fetched} fetched into ${IMAGE_CACHE}`);
