// Candidate slot words for the writer: npx tsx scripts/story/words.ts 一上 [filter]   (words already in the outline are left out)
import { existsSync, readFileSync } from 'node:fs';
import { inScopeWords } from '../../src/content/understand';
import { cardMeaning } from '../../src/content/glossary';
import { parseOutline } from '../../src/story/format';

const term = process.argv[2] as '一上' | '一下' | '二上';
const filter = process.argv[3];
const planned = new Set(existsSync('docs/story/season-1/outline.md') ? parseOutline(readFileSync('docs/story/season-1/outline.md', 'utf8')).flatMap((r) => r.slots) : []);
for (const w of inScopeWords(term)) {
  const en = cardMeaning(w) ?? '';
  if (planned.has(w.text) || (filter && !w.text.includes(filter) && !en.includes(filter))) continue;
  console.log(`${w.text}\t${w.pinyin}\t${en}`);
}
