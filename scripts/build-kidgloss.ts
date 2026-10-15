// Builds src/content/kidGloss.json from the hand-written kid glosses in scripts/kidgloss/*.tsv (text, reading, gloss) and
// flags every gap: a school character, ladder 词语 or shown 组词 with no gloss, a gloss written for another reading, a gloss a
// child can't use (glossProblems), a bound character whose pair is wrong (boundProblems). Exits 1 on any of them.
// Usage: npx tsx scripts/build-kidgloss.ts [--csv out.csv] [--bound-csv bound.csv]   (the CSV lists every school character's
// old and new English; the bound CSV each bound character's pair and the pair's gloss)
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { boundProblems, kidGlossScope } from '../src/content/kidGlossScope';
import { glossProblems } from '../src/content/kidGloss';
import { NO_ENGLISH, NO_ENGLISH_GROUPS } from '../src/content/grammarWords';
import { builtinWords } from '../src/content/index';
import { ladderWords } from '../src/content/ladder';

const dir = new URL('./kidgloss/', import.meta.url);
const rows = new Map<string, [string, string]>();
/** bound character → the pair it is taught and asked through (chars.tsv's fourth column) */
const bound = new Map<string, string>();
const problems: string[] = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith('.tsv')).sort()) {
  readFileSync(new URL(file, dir), 'utf8').split('\n').forEach((line, i) => {
    if (!line.trim() || line.startsWith('#')) return;
    const [text, reading, gloss, pair, ...rest] = line.split('\t');
    if (!text || !reading || !gloss || rest.length || pair === '') return void problems.push(`${file}:${i + 1}: needs text, reading, gloss (and a bound pair, or nothing)`);
    if (rows.has(text)) problems.push(`${file}:${i + 1}: ${text} twice`);
    rows.set(text, [reading, gloss]);
    if (pair) bound.set(text, pair);
  });
}

const scope = kidGlossScope();
const inScope = new Set(scope.map((w) => w.text));
for (const w of scope) {
  const row = rows.get(w.text);
  if (!row) { problems.push(`gap: ${w.kind} ${w.text} ${w.reading} (${w.term}) — dictionary: ${w.dictionary ?? '—'}`); continue; }
  if (row[0] !== w.reading) problems.push(`${w.text}: written for ${row[0]}, his lessons read ${w.reading}`);
  for (const p of glossProblems(row[1])) problems.push(`${w.text} "${row[1]}": ${p}`);
}
for (const [ch, pair] of bound) for (const p of boundProblems(ch, pair, rows)) problems.push(`bound ${ch} → ${pair}: ${p}`);
// a bound pair keeps its gloss even when nothing else asks for it: the card and the questions read it
const kept = (t: string) => inScope.has(t) || [...bound.values()].includes(t);
const stale = [...rows.keys()].filter((t) => !kept(t));

const out = {
  about: 'Kid glosses: hand-written in scripts/kidgloss/*.tsv, built by scripts/build-kidgloss.ts. text → [reading, gloss]; bound: a character he meets only inside a word → that pair.',
  license: 'Adapted from CC-CEDICT (MDBG and contributors), CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/); shared under the same licence',
  entries: Object.fromEntries([...rows].filter(([t]) => kept(t))),
};
// one entry a line, so a review diff shows each change
const json = JSON.stringify(out, null, 0).replace(/\],"/g, '],\n"').replace(/\}\}$/, '}');
const boundJson = [...bound].map(([c, p]) => `${JSON.stringify(c)}:${JSON.stringify(p)}`).join(',\n');
writeFileSync(new URL('../src/content/kidGloss.json', import.meta.url), `${json},\n"bound":{${boundJson}}}\n`);

const csvAt = process.argv.indexOf('--csv');
if (csvAt > 0) {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const group = (t: string) => Object.entries(NO_ENGLISH_GROUPS).find(([, ws]) => ws.includes(t))?.[0] ?? '';
  // glosses kept as written that follow a 组词 more than the character (parent to look over): a note above the table
  const CHECK = '巴 bus, 番 tomato, 负 bully, 欺 bully, 司 driver, 志 magazine, 案 answer, 刹 moment';
  const lines = [q(`check these: ${CHECK} (each follows the 组词 his lessons use)`), '', 'term,char,reading,old meaning,kid gloss,no English question,bound pair'];
  for (const w of scope.filter((x) => x.kind === 'char')) lines.push([w.term!, w.text, w.reading, w.dictionary ?? '', rows.get(w.text)?.[1] ?? '', group(w.text), bound.get(w.text) ?? ''].map(q).join(','));
  writeFileSync(process.argv[csvAt + 1]!, '﻿' + lines.join('\n') + '\n');
}
// the bound characters to look over: each with the pair it is taught through and the pair's gloss (its card's English)
const boundAt = process.argv.indexOf('--bound-csv');
if (boundAt > 0) {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const term = new Map(scope.filter((x) => x.kind === 'char').map((w) => [w.text, w.term ?? '']));
  const lines = ['term,char,pair,pair reading,pair gloss', ...[...bound].map(([c, p]) => [term.get(c) ?? '', c, p, rows.get(p)?.[0] ?? '', rows.get(p)?.[1] ?? ''].map(q).join(','))];
  writeFileSync(process.argv[boundAt + 1]!, '﻿' + lines.join('\n') + '\n');
}

const beyond = [...builtinWords(0), ...ladderWords()].filter((w) => !inScope.has(w.text)).length;
for (const p of problems) console.log(p);
console.log(`${rows.size} glosses written (${scope.filter((w) => w.kind === 'char').length} school characters, ${scope.filter((w) => w.kind === 'word').length} ladder 词语, ${scope.filter((w) => w.kind === "shown").length} shown 组词, ${scope.filter((w) => w.kind === "family").length} family words); ${NO_ENGLISH.size} words never asked in English`);
console.log(`${bound.size} bound characters, each taught and asked through its pair`);
console.log(`${problems.length} problems; ${stale.length} glosses for words no longer in scope${stale.length ? `: ${stale.join(' ')}` : ''}`);
console.log(`${beyond} built-in words beyond his school lists have no kid gloss: they take no English question until one is written`);
process.exit(problems.length ? 1 : 0);
