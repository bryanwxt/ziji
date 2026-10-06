// A writer checks its own batch before handing it back: npx tsx scripts/sentences/check-file.ts <batch.json>
import { readFileSync } from 'node:fs';
import { sentenceProblems, type Sentence } from '../../src/content/understand';
const rows = JSON.parse(readFileSync(process.argv[2]!, 'utf8')) as { word: string; s: Sentence[] }[];
const seen = new Map<string, string>();
let n = 0;
for (const r of rows) {
  const ps = sentenceProblems(r.word, r.s);
  for (const x of r.s) { if (seen.has(x.zh)) ps.push(`${r.word}: "${x.zh}" is also ${seen.get(x.zh)}'s`); seen.set(x.zh, r.word); }
  for (const p of ps) { console.log(p); n++; }
}
console.log(`${n} problems in ${rows.length} words`);
process.exit(n ? 1 : 0);
