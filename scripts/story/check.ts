// Checks the story before the parent sees it (spec 3a §7): npx tsx scripts/story/check.ts
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { chapterProblems, outlineProblems, seasonReport } from '../../src/story/check';
import { parseChapter, parseOutline, type Chapter } from '../../src/story/format';

const dir = 'docs/story/season-1';
const rows = existsSync(`${dir}/outline.md`) ? parseOutline(readFileSync(`${dir}/outline.md`, 'utf8')) : [];
const problems = rows.length ? outlineProblems(rows) : ['no outline yet'];
const chapters: Chapter[] = [];
for (const f of existsSync(dir) ? readdirSync(dir).filter((x) => /^ch\d+\.md$/.test(x)).sort() : []) {
  try {
    const c = parseChapter(readFileSync(`${dir}/${f}`, 'utf8'));
    chapters.push(c);
    problems.push(...chapterProblems(c, rows.find((r) => r.chapter === c.chapter)));
  } catch (e) { problems.push(`${f}: ${(e as Error).message}`); }
}
for (const p of problems) console.log(p);
const r = seasonReport(chapters, rows);
console.log(`${problems.length} problems · ${chapters.length} chapters · ${r.slotWords} slot words ${JSON.stringify(r.byTerm)} · ${r.mandarinWords} words in Granny + 听一听`);
process.exit(problems.length ? 1 : 0);
