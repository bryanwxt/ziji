import type { BuiltinChar, Passage, PassageQuestion } from '../src/types';
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
  for (const p of passages) {
    if (ids.has(p.id)) problems.push(`duplicate passage ${p.id}`);
    ids.add(p.id);
    const han = Array.from(p.text).filter((ch) => HAN.test(ch));
    if (han.length < 30 || han.length > 80) problems.push(`${p.id}: ${han.length} characters, expected 30–80`);
    const outside = [...new Set(han.filter((ch) => !easy.has(ch)))];
    if (outside.length) problems.push(`${p.id}: uses ${outside.join('')} outside levels 1–2`);
  }
  return problems;
}

const ASKS = ['谁', '哪', '什么', '为什么'];

/** The meaning questions (spec 2026-10-12 §3): one per passage, asking 谁/哪/什么/为什么, three different choices with the right
 *  one among them, a real answering sentence, characters from the passage or `easy` (levels 1–2). */
export function checkPassageQuestions(passages: Passage[], questions: Readonly<Record<string, PassageQuestion>>, easy: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  for (const p of passages) {
    const q = questions[p.id];
    if (!q) {
      problems.push(`${p.id}: no meaning question`);
      continue;
    }
    if (!ASKS.some((a) => q.q.includes(a))) problems.push(`${p.id}: the question asks none of 谁 哪 什么 为什么`);
    if (q.choices.length !== 3 || new Set(q.choices).size !== 3) problems.push(`${p.id}: needs three different choices`);
    if (q.choices[q.answer] === undefined) problems.push(`${p.id}: the right answer is not among the choices`);
    const n = splitSentences(p.text).length;
    if (q.sentence === undefined || !Number.isInteger(q.sentence) || q.sentence < 0 || q.sentence >= n) problems.push(`${p.id}: answering sentence ${q.sentence} is not one of its ${n} sentences`);
    const own = new Set(Array.from(p.text));
    const outside = [...new Set(Array.from(q.q + q.choices.join('')).filter((ch) => HAN.test(ch) && !own.has(ch) && !easy.has(ch)))];
    if (outside.length) problems.push(`${p.id}: question uses ${outside.join('')} in neither the passage nor levels 1–2`);
  }
  for (const id of Object.keys(questions)) if (!passages.some((p) => p.id === id)) problems.push(`${id}: a question for no passage`);
  return problems;
}
