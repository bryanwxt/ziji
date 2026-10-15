// Kid glosses (parent 2026-10-15): the English a P2 child reads, at most four everyday words in the sense his lessons and 组词
// use (河水 "river water", 上网 "go online", 只 "one (for animals)"), for every school character and every 词语 an English
// question can ask. Written by hand in scripts/kidgloss/*.tsv and built into kidGloss.json by scripts/build-kidgloss.ts,
// which flags any gap. The dictionary's English (glossary.ts) stays for words beyond his school lists and as parent detail.
import data from './kidGloss.json';

/** text → [the reading the gloss was written for, the gloss]. */
const ENTRIES = (data as unknown as { entries: Record<string, [string, string]> }).entries;

/** The kid gloss for a character or 词语, if it has one. */
export const kidGloss = (text: string): string | undefined => ENTRIES[text]?.[1];
/** The reading a kid gloss was written for (a changed reading can mean a changed sense). */
export const kidGlossReading = (text: string): string | undefined => ENTRIES[text]?.[0];
export const kidGlossTexts = (): string[] => Object.keys(ENTRIES);

export const MAX_GLOSS_WORDS = 4;
/** Dictionary words a child can't use (parent 2026-10-15): never in a kid gloss. */
const JARGON: [string, RegExp][] = [
  ['particle', /\bparticles?\b/i], ['classifier', /\bclassifiers?\b/i], ['measure word', /\bmeasure words?\b/i],
  ['sth', /\bsth\b/i], ['sb', /\bsb\b/i], ['variant', /\bvariant/i], ['surname', /\bsurname/i], ['used in', /\bused in\b/i],
  ['literary', /\bliterary\b/i], ['abbr', /\babbr/i], ['CL:', /\bCL:/], ['pr.', /\bpr\./i], ['archaic', /\barchaic\b/i],
];

/** What is wrong with a gloss for a 7-year-old (empty when nothing is). */
export function glossProblems(gloss: string): string[] {
  const out: string[] = [];
  const words = gloss.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ['empty'];
  if (words.length > MAX_GLOSS_WORDS) out.push(`${words.length} words (at most ${MAX_GLOSS_WORDS})`);
  for (const [name, re] of JARGON) if (re.test(gloss)) out.push(`jargon "${name}"`);
  if (/\p{Script=Han}/u.test(gloss)) out.push('Chinese in the English (it gives answers away)');
  if (gloss.includes(';')) out.push('a semicolon (one sense only)');
  if (gloss !== gloss.trim() || /\s{2}/.test(gloss)) out.push('stray spaces');
  return out;
}
