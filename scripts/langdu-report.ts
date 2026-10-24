// 朗读 content at a glance for the writer (spec 2026-10-24 §4–§5): each passage's sentences numbered (a question's `sentence`
// and `sentences` count from 0), its term, length, linking patterns and fits, then every problem the content checks find in it
// and its questions. Usage: npx tsx scripts/langdu-report.ts p74 p75 …   (no ids: every stretch passage; "gsb": the chunks)
import { BUILTIN, MOE_TERMS, PASSAGES } from '../src/content';
import { PASSAGE_QUESTIONS } from '../src/content/passageQuestions';
import { passageFit, passageTerm, termReadable } from '../src/langdu/level';
import { splitSentences } from '../src/langdu/sentences';
import { checkOwnPassages, checkPassageQuestions, checkStretchPassages, linksIn, STRETCH_FROM } from './check-content';

const args = process.argv.slice(2);
const chosen = PASSAGES.filter((p) =>
  args.length === 0 ? p.source === 'ziji' && Number(p.id.slice(1)) >= STRETCH_FROM : args.some((a) => (a === 'gsb' ? p.source === 'gsb' : p.id === a)),
);
const built = new Set(BUILTIN.map((c) => c.char));
const own = PASSAGES.filter((p) => p.source === 'ziji');
let bad = 0;
for (const p of chosen) {
  const han = Array.from(p.text).filter((c) => /\p{Script=Han}/u.test(c)).length;
  const prev = MOE_TERMS[MOE_TERMS.indexOf(p.term) - 1];
  console.log(`\n${p.id} ${p.term} 《${p.title}》 ${han} characters · levels at ${passageTerm(p.text, p.names) ?? 'none'} · fit ${passageFit(p.text, termReadable(p.term), p.names).toFixed(2)} at ${p.term}${prev ? `, ${passageFit(p.text, termReadable(prev), p.names).toFixed(2)} at ${prev}` : ''} · links ${linksIn(p.text).join(' ') || 'none'}`);
  const beyond = (t: string | undefined) => [...new Set(Array.from(p.text).filter((c) => /\p{Script=Han}/u.test(c) && !termReadable(t ?? '').has(c)))].join('');
  console.log(`  beyond ${p.term}: ${beyond(p.term) || '—'}${prev ? ` · beyond ${prev}: ${beyond(prev)}` : ''}`);
  splitSentences(p.text).forEach((s, i) => console.log(`  ${i}  ${s}`));
  const qs = PASSAGE_QUESTIONS[p.id];
  const problems = [
    ...(p.source === 'ziji' ? checkOwnPassages(own).filter((x) => x.startsWith(`${p.id}:`) || x.startsWith(`${p.id} `)) : []),
    ...checkStretchPassages([p], built),
    ...(qs ? checkPassageQuestions([p], { [p.id]: qs }) : [`${p.id}: no six questions yet`]),
  ];
  bad += problems.length;
  for (const x of problems) console.log(`  ✗ ${x}`);
}
console.log(`\n${chosen.length} passages, ${bad} problems`);
process.exitCode = bad ? 1 : 0;
