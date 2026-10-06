import { inScopeWords, sentenceProblems, sentencesFor, SENTENCE_TERMS } from '../../src/content/understand';
const only = process.argv[2];
const seen = new Map<string, string>();
let n = 0;
let written = 0;
let total = 0;
for (const term of SENTENCE_TERMS) {
  for (const w of inScopeWords(term)) {
    const s = sentencesFor(w.text);
    if (term === only || !only) total++;
    if (!s.length) continue;
    if (term === only || !only) written++;
    const ps = sentenceProblems(w.text, s);
    for (const x of s) { if (seen.has(x.zh)) ps.push(`${w.text}: "${x.zh}" is also ${seen.get(x.zh)}'s`); seen.set(x.zh, w.text); }
    if (only && term !== only) continue;
    for (const p of ps) { console.log(p); n++; }
  }
}
console.log(`${n} problems; ${written}/${total} words written${only ? ` in ${only}` : ''}`);
process.exit(n ? 1 : 0);
