// The words that must have a kid gloss (kidGloss.ts): every school character, every ladder 词语 made only of school characters
// (the words an English-meaning question can ask or offer), the 组词 the school cards show, and the 一家人 words made only of
// school characters. Used by the build script that flags gaps (scripts/build-kidgloss.ts) and by kidGloss.test.ts.
import { builtinWords, schoolTerm } from './index';
import { ladderWords } from './ladder';
import { wordTerm } from './understand';
import { dictionaryMeaning, dictionaryGloss } from './glossary';
import { wordsAround } from './family';
import { sameReading } from './wordGate';

export interface ScopeWord { text: string; reading: string; kind: 'char' | 'word' | 'shown' | 'family'; term: string | null; dictionary?: string }

export function kidGlossScope(): ScopeWord[] {
  const chars = builtinWords(0).filter((w) => schoolTerm(w.text)).sort((a, b) => a.rank! - b.rank!);
  const words = ladderWords().filter((w) => wordTerm(w.text));
  const ladder = new Set(ladderWords().map((w) => w.text));
  const out: ScopeWord[] = [
    ...chars.map((w): ScopeWord => ({ text: w.text, reading: w.pinyin, kind: 'char', term: schoolTerm(w.text)!, dictionary: dictionaryMeaning(w) })),
    ...words.map((w): ScopeWord => ({ text: w.text, reading: w.pinyin, kind: 'word', term: wordTerm(w.text), dictionary: dictionaryGloss(w.text) })),
  ];
  const seen = new Set(out.map((w) => w.text));
  for (const c of chars) for (const e of c.examples ?? []) {
    if (ladder.has(e.text) || seen.has(e.text)) continue;
    seen.add(e.text);
    out.push({ text: e.text, reading: e.pinyin, kind: 'shown', term: schoolTerm(c.text)!, dictionary: dictionaryGloss(e.text) });
  }
  // a 一家人 row or 找一家人 choice made only of school characters (family.ts): English he reads on the card
  const school = new Set(chars.map((c) => c.text));
  for (const c of chars) for (const f of wordsAround(c.text)) {
    if (seen.has(f.text) || !Array.from(f.text).every((x) => school.has(x)) || !dictionaryGloss(f.text)) continue;
    seen.add(f.text);
    out.push({ text: f.text, reading: f.pinyin, kind: 'family', term: schoolTerm(c.text)!, dictionary: dictionaryGloss(f.text) });
  }
  return out;
}

/**
 * What is wrong with a bound character's pair (empty when nothing is): it must contain the character, have a kid gloss of its
 * own written for a reading that gives the character its card's reading there (轻声 counts: 狐狸 hú li for 狸 lí), and the
 * character's gloss must be the pair's (the card and every English question read one gloss). `rows`: text → [reading, gloss].
 */
export function boundProblems(ch: string, pair: string, rows: ReadonlyMap<string, readonly [string, string]>): string[] {
  const out: string[] = [];
  const at = Array.from(pair).indexOf(ch);
  if (Array.from(ch).length !== 1) out.push('only a single character can be bound');
  if (at < 0) out.push(`${pair} doesn't contain ${ch}`);
  const own = rows.get(ch);
  const row = rows.get(pair);
  if (!own) out.push(`${ch} has no kid gloss`);
  if (!row) out.push(`${pair} has no kid gloss (add it to words.tsv)`);
  if (!own || !row || at < 0) return out;
  const syl = row[0].split(/\s+/);
  if (syl.length !== Array.from(pair).length) out.push(`${pair} is read "${row[0]}": not one syllable a character`);
  else if (!sameReading(ch, syl[at]!, own[0])) out.push(`${ch} is ${syl[at]} in ${pair}, its card reads ${own[0]}`);
  if (own[1] !== row[1]) out.push(`${ch}'s gloss "${own[1]}" isn't ${pair}'s "${row[1]}"`);
  return out;
}
