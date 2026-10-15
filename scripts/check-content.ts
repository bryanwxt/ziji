import type { BuiltinChar, Passage, PassageQuestion } from '../src/types';
import { HSK_WORDS } from '../src/content';
import { allowedChars } from '../src/content/understand';
import { tiles } from '../src/content/zuju';
import { splitSentences } from '../src/langdu/sentences';

const HAN = /\p{Script=Han}/u;

/** `listed`: every character his school lists ask for (spec 2026-10-11 §7); each must be built in. */
export function checkContent(chars: BuiltinChar[], passages: Passage[], hasStrokeFile: (char: string) => boolean, listed = ''): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const c of chars) {
    if (seen.has(c.char)) problems.push(`duplicate ${c.char}`);
    seen.add(c.char);
    if (!c.pinyin.trim()) problems.push(`${c.char}: no pinyin`);
    if (!c.meaning.trim()) problems.push(`${c.char}: no meaning`);
    if (!c.radical) problems.push(`${c.char}: no radical`);
    if (!hasStrokeFile(c.char)) problems.push(`${c.char}: no stroke data`);
  }
  for (const level of [1, 2, 3, 4, 5, 6, 7] as const) {
    const n = chars.filter((c) => c.level === level && !c.school).length; // HSK's own; the book's extra characters aren't HSK's
    const expected = level === 7 ? 1200 : 300; // HSK 3.0: 300 per level for 1–6, 1,200 for 七—九级
    if (n !== expected) problems.push(`level ${level} has ${n} characters, expected ${expected}`);
  }

  for (const ch of new Set(Array.from(listed))) if (HAN.test(ch) && !seen.has(ch)) problems.push(`${ch}: on his school list but not built in`);
  const easy = new Set(chars.filter((c) => c.level <= 2).map((c) => c.char));
  const ids = new Set<string>();
  // our own passages only: the Global Storybooks chunks are levelled by the import (scripts/storybooks/lib.ts)
  for (const p of passages.filter((x) => x.source === 'ziji')) {
    if (ids.has(p.id)) problems.push(`duplicate passage ${p.id}`);
    ids.add(p.id);
    const han = Array.from(p.text).filter((ch) => HAN.test(ch));
    if (han.length < 30 || han.length > 80) problems.push(`${p.id}: ${han.length} characters, expected 30–80`);
    const outside = [...new Set(han.filter((ch) => !easy.has(ch)))];
    if (outside.length) problems.push(`${p.id}: uses ${outside.join('')} outside levels 1–2`);
  }
  return problems;
}

const ASKS = ['谁', '哪', '什么', '怎么'];
/** Characters a question may share with its answer (spec 2026-10-15 §6 rule 3): grammar and pronouns, never content. */
export const FUNCTION_CHARS: ReadonlySet<string> = new Set(Array.from('的了是在吗呢吧着过得地和也都很就还又我你他她它们个一不有'));
export const QUESTIONS_PER_PASSAGE = 2;
const PUNCT_RE = /[，。！？、；：“”‘’「」『』…—]/g;
const PARTICLES_RE = /[了吗吧呢的得着过啊呀]+$/u;
const han = (s: string) => Array.from(s).filter((ch) => HAN.test(ch));

/** The passage's most frequent dictionary word, when one word alone leads and occurs twice or more: an answer equal to it needs
 *  no reading (rule 4). A tie leads nothing (爸爸 and 妈妈 twice each: either may fairly be asked). */
export function topWord(text: string): string | null {
  const count = new Map<string, number>();
  for (const t of tiles(text)) {
    const core = t.replace(PUNCT_RE, '').replace(PARTICLES_RE, '');
    if (Array.from(core).length > 1 && HSK_WORDS.has(core)) count.set(core, (count.get(core) ?? 0) + 1);
  }
  const [best, next] = [...count].sort((a, b) => b[1] - a[1]);
  return best && best[1] >= 2 && (!next || next[1] < best[1]) ? best[0] : null;
}

/**
 * One question's problems (spec 2026-10-15 §6): its shape, its sentence, its characters, and the guess-proofing rules 1–4.
 * Its characters are ones he knows: each is in the passage he has just read or on his book's lists through the passage's term
 * (`allowedChars`, the lists the passage itself is levelled by).
 */
export function questionProblems(p: Passage, q: PassageQuestion, known: ReadonlySet<string> = allowedChars(p.term)): string[] {
  const out: string[] = [];
  const tag = `${p.id} "${q.q}"`;
  if (!ASKS.some((a) => q.q.includes(a))) out.push(`${tag}: asks none of 谁 哪 什么 为什么 怎么样`);
  if (q.choices.length !== 3 || new Set(q.choices).size !== 3) out.push(`${tag}: needs three different choices`);
  const right = q.choices[q.answer];
  if (right === undefined) return [...out, `${tag}: the right answer is not among the choices`];
  const n = splitSentences(p.text).length;
  if (q.sentence === undefined || !Number.isInteger(q.sentence) || q.sentence < 0 || q.sentence >= n) out.push(`${tag}: answering sentence ${q.sentence} is not one of its ${n} sentences`);
  const own = new Set(Array.from(p.text));
  const outside = [...new Set(han(q.q + q.choices.join('')).filter((ch) => !own.has(ch) && !known.has(ch)))];
  if (outside.length) out.push(`${tag}: uses ${outside.join('')} in neither the passage nor the lists through ${p.term}`);
  const inText = q.choices.map((c) => p.text.includes(c));
  if (inText.some(Boolean) && !inText.every(Boolean)) out.push(`${tag}: some choices are in the passage and some not (all or none)`);
  const lengths = q.choices.map((c) => han(c).length);
  if (Math.max(...lengths) - Math.min(...lengths) > 2) out.push(`${tag}: choice lengths ${lengths.join('/')} differ by more than 2`);
  const leak = [...new Set(han(right).filter((ch) => !FUNCTION_CHARS.has(ch) && q.q.includes(ch)))];
  if (leak.length) out.push(`${tag}: the question gives away ${leak.join('')} from its answer`);
  if (right === topWord(p.text)) out.push(`${tag}: the answer ${right} is the passage's most frequent word`);
  return out;
}

/** The meaning questions (spec 2026-10-15 §6): two different ones per passage, answered by different sentences, each passing
 *  questionProblems. */
export function checkPassageQuestions(passages: Passage[], questions: Readonly<Record<string, readonly PassageQuestion[]>>): string[] {
  const problems: string[] = [];
  for (const p of passages) {
    const qs = questions[p.id] ?? [];
    if (qs.length !== QUESTIONS_PER_PASSAGE) problems.push(`${p.id}: ${qs.length} meaning questions, expected ${QUESTIONS_PER_PASSAGE}`);
    if (new Set(qs.map((q) => q.q)).size !== qs.length) problems.push(`${p.id}: the same question twice`);
    else if (qs.length > 1 && new Set(qs.map((q) => q.sentence)).size === 1) problems.push(`${p.id}: both questions are answered by sentence ${qs[0]!.sentence}`);
    for (const q of qs) problems.push(...questionProblems(p, q));
  }
  for (const id of Object.keys(questions)) if (!passages.some((p) => p.id === id)) problems.push(`${id}: questions for no passage`);
  return problems;
}
