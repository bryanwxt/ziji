// The passages sheet for the parent's spot check (spec 2026-10-15 §2.2): each new passage of ours with its term, 生词 and
// questions, next to the gloss CSV that build-kidgloss.ts writes. Usage: npx tsx scripts/review-passages.ts passages.csv
import { writeFileSync } from 'node:fs';
import { PASSAGES } from '../src/content';
import { PASSAGE_QUESTIONS } from '../src/content/passageQuestions';
import { NEW_FROM } from './check-content';

const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx scripts/review-passages.ts <out.csv>');
const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
const ask = (x: { q: string; choices: string[]; answer: number }) => `${x.q} ${x.choices.map((c, i) => (i === x.answer ? `[${c}]` : c)).join(' / ')}`;
const lines = ['id,term,title,text,生词,question 1,question 2'];
for (const p of PASSAGES.filter((x) => x.source === 'ziji' && Number(x.id.slice(1)) >= NEW_FROM)) {
  const qs = PASSAGE_QUESTIONS[p.id] ?? [];
  lines.push([p.id, p.term, p.title, p.text, (p.words ?? []).map((w) => `${w.text} = ${w.gloss}`).join('; '), qs[0] ? ask(qs[0]) : '', qs[1] ? ask(qs[1]) : ''].map(q).join(','));
}
writeFileSync(out, '\uFEFF' + lines.join('\n') + '\n'); // a BOM, so Excel and Numbers read the Chinese
console.log(`${lines.length - 1} passages written to ${out}`);
