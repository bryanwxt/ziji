// Dumps every school character's card for a sense review (review 2026-10-17: 士 "soldier" over 巴士, 青 "green" over 青年):
// lesson, the lesson's other characters, the card's reading, kid gloss, bound pair, the 组词 its card shows first, the rest of
// its 组词, and its Understand sentences. Judge each by hand: does the gloss match the lesson's word, is the first 组词 his?
// Usage: npx tsx scripts/kidgloss/dump-cards.ts [term] > cards.tsv   (term: 一上 … 三下; all when left out)
import { builtinWords } from '../../src/content/index';
import { LESSONS } from '../../src/content/curriculum';
import { boundPair, inBoundSense, kidGloss } from '../../src/content/kidGloss';
import s1a from '../../src/content/sentences/一上.json';
import s1b from '../../src/content/sentences/一下.json';
import s2a from '../../src/content/sentences/二上.json';
import s2b from '../../src/content/sentences/二下.json';
import s3a from '../../src/content/sentences/三上.json';
import s3b from '../../src/content/sentences/三下.json';

const only = process.argv[2];
const words = new Map(builtinWords(0, 'both').map((w) => [w.text, w]));
const sentences = new Map<string, string[]>();
for (const r of [s1a, s1b, s2a, s2b, s3a, s3b].flat() as { word: string; s: { zh: string }[] }[]) sentences.set(r.word, r.s.map((s) => s.zh));
const seen = new Set<string>();
console.log(['lesson', 'char', 'reading', 'gloss', 'bound', 'lesson chars', 'card 组词', 'more 组词', 'sentences'].join('\t'));
for (const l of LESSONS) {
  if (only && l.term !== only) continue;
  for (const ch of Array.from(l.read)) {
    if (seen.has(ch)) continue;
    seen.add(ch);
    const w = words.get(ch);
    const ex = (w?.examples ?? []).filter((e) => inBoundSense(ch, e.text) && e.text !== boundPair(ch)).map((e) => e.text);
    console.log([`${l.term}·${l.lesson}`, ch, w?.pinyin ?? '?', kidGloss(ch) ?? '—', boundPair(ch) ?? '', l.read, ex.slice(0, 2).join(' '), ex.slice(2, 8).join(' '),
      (sentences.get(ch) ?? []).join(' / ')].join('\t'));
  }
}
