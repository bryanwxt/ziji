// Deletes passages' older questions from src/content/questions/legacy.ts once their six are written (plan 2026-10-24, content
// tasks). Usage: npx tsx scripts/drop-legacy.ts p26 p27 …   or a range: npx tsx scripts/drop-legacy.ts p26-p50   or: gsb
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/content/questions/legacy.ts';
const ids = process.argv.slice(2).flatMap((a) => {
  const m = /^p(\d+)-p(\d+)$/.exec(a);
  return m ? Array.from({ length: Number(m[2]) - Number(m[1]) + 1 }, (_, i) => `p${String(Number(m[1]) + i).padStart(2, '0')}`) : [a];
});
let s = readFileSync(FILE, 'utf8');
let dropped = 0;
// one entry: its key line (p01: [ or 'gsb:0001-1': [), its question lines, and its closing "  ],"
s = s.replace(/\n  ('?)([\w:-]+)\1: \[\n(?: {4}.*\n)*? {2}\],/g, (entry, _q: string, id: string) => {
  const hit = ids.includes(id) || (ids.includes('gsb') && id.startsWith('gsb:'));
  if (hit) dropped++;
  return hit ? '' : entry;
});
writeFileSync(FILE, s);
console.log(`${dropped} passages' older questions dropped`);
