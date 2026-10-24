import type { BuiltinChar, Passage, PassageQuestion, QuestionKind, TalkPrompt, TalkTheme } from '../src/types';
import { HSK_WORDS, MOE_TERMS, schoolTerm } from '../src/content';
import { BLOCK_REASON, BLOCKED } from '../src/content/blocked';
import { glossProblems, kidGloss } from '../src/content/kidGloss';
import { allowedChars } from '../src/content/understand';
import { isChildWord } from '../src/content/wordGate';
import { tiles } from '../src/content/zuju';
import { passageFit, passageTerm, termReadable } from '../src/langdu/level';
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
  for (const p of passages.filter((x) => x.source === 'ziji')) {
    if (ids.has(p.id)) problems.push(`duplicate passage ${p.id}`);
    ids.add(p.id);
    // the length and HSK 1–2 rules hold our own first twenty only: p21 on are held to checkOwnPassages' writing rules
    if (Number(p.id.slice(1)) >= NEW_FROM) continue;
    const han = Array.from(p.text).filter((ch) => HAN.test(ch));
    if (han.length < 30 || han.length > 80) problems.push(`${p.id}: ${han.length} characters, expected 30–80`);
    const outside = [...new Set(han.filter((ch) => !easy.has(ch)))];
    if (outside.length) problems.push(`${p.id}: uses ${outside.join('')} outside levels 1–2`);
  }
  return problems;
}

const ASKS = ['谁', '哪', '什么', '怎么'];
/** Characters a question may share with its answer (spec 2026-10-15 §6 rule 3, kept by 2026-10-24 §5): grammar and pronouns, never content. */
export const FUNCTION_CHARS: ReadonlySet<string> = new Set(Array.from('的了是在吗呢吧着过得地和也都很就还又我你他她它们个一不有'));
/** Spec 2026-10-24 §5: six a passage, at least one of each kind but `fact`, at most two `fact`, four choices within 3
 *  characters of each other, no answer position more than twice, a why/main answer sharing at most 60% with any one sentence. */
export const QUESTIONS_PER_PASSAGE = 6;
export const KINDS: readonly QuestionKind[] = ['why', 'word', 'order', 'main', 'fact'];
const NEEDED: readonly QuestionKind[] = ['why', 'word', 'order', 'main'];
export const MAX_FACT = 2;
export const CHOICE_SPREAD = 3;
export const MAX_AT_POSITION = 2;
export const COPY_SHARE = 0.6;
/** The questions are read by a child at 二下 or later (spec 2026-10-24: his class), whatever the passage's term; the frame words
 *  of a word or main question (意思, 题目) are always allowed: the pinyin fade shows them with pinyin. */
export const QUESTION_FLOOR = '二下';
export const FRAME_CHARS = '意思题';
/** The characters a question on `p` may use besides the passage's own. */
export const questionChars = (term: string): Set<string> => {
  const at = MOE_TERMS.indexOf(term) < MOE_TERMS.indexOf(QUESTION_FLOOR) ? QUESTION_FLOOR : term;
  return new Set([...allowedChars(at), ...Array.from(FRAME_CHARS)]);
};
const PUNCT_RE = /[，。！？、；：“”‘’「」『』…—]/g;
const PARTICLES_RE = /[了吗吧呢的得着过啊呀]+$/u;
const han = (s: string) => Array.from(s).filter((ch) => HAN.test(ch));
const content = (s: string) => han(s).filter((ch) => !FUNCTION_CHARS.has(ch));

/** The passage's most frequent word, when one word alone leads and occurs twice or more: an answer equal to it needs no reading
 *  (rule 4). A word is a tile of two characters or more, in the dictionary or not (婆婆), or two content characters side by side
 *  that the tiles split (炒面), unless it is only part of a longer word seen as often. A pair is only ever two one-character
 *  tiles side by side (纸飞 cuts 飞机, so it is no pair), and a tile wins a tie with a pair (船最 twice never breaks 妹妹's lead:
 *  a pair is a guess at a word, a tile is one). Otherwise a tie leads nothing (爸爸 and 妈妈 twice each: either may fairly be
 *  asked). */
export function topWord(text: string): string | null {
  const words = new Set<string>();
  const pairs = new Set<string>();
  const cores = tiles(text).map((t) => t.replace(PUNCT_RE, '').replace(PARTICLES_RE, ''));
  for (const core of cores) if (Array.from(core).length > 1) words.add(core);
  // each character's tile, so a pair is taken only from two adjacent one-character tiles
  const tileOf: number[] = [];
  tiles(text).forEach((t, i) => Array.from(t).forEach(() => tileOf.push(i)));
  const single = (i: number) => Array.from(cores[tileOf[i]!]!).length === 1;
  const chars = Array.from(text);
  for (let i = 0; i + 1 < chars.length; i++) {
    const [a, b] = [chars[i]!, chars[i + 1]!];
    if (HAN.test(a) && HAN.test(b) && !FUNCTION_CHARS.has(a) && !FUNCTION_CHARS.has(b) && single(i) && single(i + 1) && !words.has(a + b)) pairs.add(a + b);
  }
  const seen = (w: string) => text.split(w).length - 1;
  const count = [...words, ...pairs]
    .map((w) => [w, seen(w), pairs.has(w)] as const)
    .filter(([w, n], _, all) => !all.some(([v, m]) => v.length > w.length && v.includes(w) && m === n));
  const [best, next] = count.sort((a, b) => b[1] - a[1] || Number(a[2]) - Number(b[2]));
  return best && best[1] >= 2 && (!next || next[1] < best[1] || (!best[2] && next[2])) ? best[0] : null;
}

/**
 * One question's problems (spec 2026-10-24 §5): its shape and kind, the sentence(s) a miss reads again, its characters, and the
 * guess-proof rules. Its characters are ones he knows: each is in the passage he has just read, or on his book's lists through
 * the later of the passage's term and 二下 (questionChars).
 */
export function questionProblems(p: Passage, q: PassageQuestion, known: ReadonlySet<string> = questionChars(p.term)): string[] {
  const out: string[] = [];
  const tag = `${p.id} "${q.q}"`;
  if (!KINDS.includes(q.kind)) out.push(`${tag}: kind ${String(q.kind)} is not one of ${KINDS.join(' ')}`);
  if (!ASKS.some((a) => q.q.includes(a))) out.push(`${tag}: asks none of 谁 哪 什么 为什么 怎么样`);
  if (q.choices.length !== 4 || new Set(q.choices).size !== 4) out.push(`${tag}: needs four different choices`);
  const right = q.choices[q.answer];
  if (right === undefined) return [...out, `${tag}: the right answer is not among the choices`];
  const sentences = splitSentences(p.text);
  const n = sentences.length;
  const real = (i: unknown): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < n;
  if (q.kind === 'why' || q.kind === 'main') {
    const [a, b] = q.sentences ?? [];
    if (!q.sentences || q.sentences.length !== 2 || !real(a) || !real(b) || a === b) out.push(`${tag}: a ${q.kind} question needs two different supporting sentences of its ${n}`);
  } else if (!real(q.sentence)) out.push(`${tag}: answering sentence ${q.sentence} is not one of its ${n} sentences`);
  const own = new Set(Array.from(p.text));
  const outside = [...new Set(han(q.q + q.choices.join('')).filter((ch) => !own.has(ch) && !known.has(ch)))];
  if (outside.length) out.push(`${tag}: uses ${outside.join('')} in neither the passage nor the lists through ${MOE_TERMS.indexOf(p.term) < MOE_TERMS.indexOf(QUESTION_FLOOR) ? QUESTION_FLOOR : p.term}`);
  // a word question quotes its word (“…”), which its answer explains and never repeats; the word's own characters may be shared
  const quoted = q.kind === 'word' ? /“([^”]+)”/.exec(q.q)?.[1] : undefined;
  if (q.kind === 'word' && (!quoted || !p.text.includes(quoted))) out.push(`${tag}: a word question quotes (“…”) a word of the passage`);
  if (quoted && right.includes(quoted)) out.push(`${tag}: the answer repeats the word it explains`);
  // every wrong choice names something in the passage, so matching characters to the text never singles out the answer
  const wrong = q.choices.filter((_, i) => i !== q.answer);
  for (const w of wrong) if (!p.text.includes(w) && !content(w).some((ch) => own.has(ch))) out.push(`${tag}: the wrong choice ${w} names nothing in the passage`);
  // ruling (fix round 2): one wrong choice found word for word is enough (was two) -- persons and places rarely give more
  if (p.text.includes(right) && !wrong.some((w) => p.text.includes(w))) out.push(`${tag}: the answer is in the passage word for word, and no wrong choice is`);
  const lengths = q.choices.map((c) => han(c).length);
  if (Math.max(...lengths) - Math.min(...lengths) > CHOICE_SPREAD) out.push(`${tag}: choice lengths ${lengths.join('/')} differ by more than ${CHOICE_SPREAD}`);
  const leak = [...new Set(content(right).filter((ch) => q.q.includes(ch) && !quoted?.includes(ch)))];
  if (leak.length) out.push(`${tag}: the question gives away ${leak.join('')} from its answer`);
  if (ERHUA.test(q.q + q.choices.join(''))) out.push(`${tag}: 儿化`);
  if (right === topWord(p.text)) out.push(`${tag}: the answer ${right} is the passage's most frequent word`);
  if (q.kind === 'why' || q.kind === 'main') {
    const chars = han(right);
    const share = (s: string) => chars.filter((ch) => s.includes(ch)).length / Math.max(1, chars.length);
    const closest = [...sentences].sort((a, b) => share(b) - share(a))[0];
    if (closest !== undefined && share(closest) > COPY_SHARE) out.push(`${tag}: the ${q.kind} answer copies "${closest}" (${Math.round(share(closest) * 100)}% of its characters)`);
  }
  // the answer is not the only choice that fits the question's grammar (counted with a measure word, 很…, 在…, …了, …的)
  for (const [name, has] of SHAPES) {
    const r = has(right);
    const w = wrong.map(has);
    if ((r && !w.some(Boolean)) || (!r && w.every(Boolean))) out.push(`${tag}: the answer alone is ${r ? '' : 'not '}${name}`);
  }
  const measures = q.choices.map(measureOf);
  const others = wrong.map(measureOf);
  if (measures.every(Boolean) && new Set(others).size === 1 && measures[q.answer] !== others[0]) out.push(`${tag}: the answer alone is counted with ${measures[q.answer]}`);
  return out;
}

const COUNTED_RE = /^[一二两三四五六七八九十几]+([个只本头条匹把张辆件次棵片朵杯位块双])/u;
const measureOf = (c: string): string | null => COUNTED_RE.exec(c)?.[1] ?? null;
/** The grammatical shapes a choice can have: an answer alone in one, or alone outside one, fits the question unread. */
const SHAPES: readonly [string, (c: string) => boolean][] = [
  ['counted (一本…)', (c) => measureOf(c) !== null],
  ['很…', (c) => c.startsWith('很')],
  ['在…', (c) => c.startsWith('在')],
  ['…了', (c) => c.endsWith('了')],
  ['…的', (c) => c.endsWith('的')],
];

/** A passage's six (spec 2026-10-24 §5): different questions, every kind but `fact` at least once, `fact` at most twice, no answer
 *  position more than twice, each passing questionProblems; and no questions for a passage that is not there. */
export function checkPassageQuestions(passages: readonly Passage[], questions: Readonly<Record<string, readonly PassageQuestion[]>>): string[] {
  const problems: string[] = [];
  for (const p of passages) {
    const qs = questions[p.id];
    if (!qs) continue; // not written yet: checkQuestionCoverage says so
    if (qs.length !== QUESTIONS_PER_PASSAGE) problems.push(`${p.id}: ${qs.length} questions, expected ${QUESTIONS_PER_PASSAGE}`);
    if (new Set(qs.map((q) => q.q)).size !== qs.length) problems.push(`${p.id}: the same question twice`);
    const missing = NEEDED.filter((k) => !qs.some((q) => q.kind === k));
    if (missing.length) problems.push(`${p.id}: no ${missing.join(', ')} question`);
    const facts = qs.filter((q) => q.kind === 'fact').length;
    if (facts > MAX_FACT) problems.push(`${p.id}: ${facts} fact questions, at most ${MAX_FACT}`);
    for (const at of [0, 1, 2, 3]) {
      const n = qs.filter((q) => q.answer === at).length;
      if (n > MAX_AT_POSITION) problems.push(`${p.id}: the answer is choice ${at + 1} in ${n} questions, at most ${MAX_AT_POSITION}`);
    }
    for (const q of qs) problems.push(...questionProblems(p, q));
  }
  for (const id of Object.keys(questions)) if (!passages.some((p) => p.id === id)) problems.push(`${id}: questions for no passage`);
  return problems;
}

/** Every built-in passage has its six, or, until its batch is written, its two older ones (never both, never neither); and no
 *  passage's six come from two batch files. */
export function checkQuestionCoverage(passages: readonly Passage[], batches: readonly Readonly<Record<string, readonly PassageQuestion[]>>[], legacy: Readonly<Record<string, readonly unknown[]>>): string[] {
  const problems: string[] = [];
  const seen = new Map<string, number>();
  batches.forEach((b, i) => {
    for (const id of Object.keys(b)) {
      if (seen.has(id)) problems.push(`${id}: questions in batch ${seen.get(id)! + 1} and batch ${i + 1}`);
      seen.set(id, i);
    }
  });
  for (const p of passages) {
    if (seen.has(p.id) && legacy[p.id]) problems.push(`${p.id}: six new questions and its older ones (delete them from questions/legacy.ts)`);
    if (!seen.has(p.id) && !legacy[p.id]) problems.push(`${p.id}: no questions`);
  }
  return problems;
}

/** The words of a passage a P2 child may meet (spec 2026-10-15 §2.2, word gate): word by word as the content gate reads it, a
 *  blocked word never; a dictionary word of two characters or more only if the gate allows it or the passage teaches it (生词). */
export function wordProblems(text: string, taught: readonly string[] = []): string[] {
  const out: string[] = [];
  for (const s of splitSentences(text)) {
    for (const t of tiles(s)) {
      const bare = t.replace(PUNCT_RE, '');
      const core = bare.replace(PARTICLES_RE, '');
      if (BLOCKED.has(bare) || BLOCKED.has(core)) out.push(`${core}: blocked (${BLOCK_REASON.get(core) ?? BLOCK_REASON.get(bare)})`);
      else if (Array.from(core).length > 1 && HSK_WORDS.has(core) && !isChildWord(core) && !taught.includes(core)) out.push(`${core}: not a word for a P2 child (HSK ${HSK_WORDS.get(core)})`);
    }
  }
  return out;
}

/** Our new passages' terms and their numbers (spec 2026-10-15 §2.2, D4). */
export const OWN_TERMS = ['二上', '二下', '三上'];
export const NEW_FROM = 21; // p21 on: the 40 written for the library; p01–p20 keep checkContent's older rules
const OPENING = 8; // two sentences starting with the same 8 characters are near-duplicates

/**
 * Our passages (spec 2026-10-15 §2.2): each levels at its stored term; the word gate; no duplicate text or sentence opening.
 * The new ones (p21 on) also: 50–110 characters in 3–7 sentences, at 二上/二下/三上, ≥ 6 different characters first taught in
 * their term, ≥ 95% of characters taught by the term with ≤ 3 others, each from the next term, and 1–4 生词 from the term, each
 * with a kid gloss.
 */
export function checkOwnPassages(passages: Passage[]): string[] {
  const problems: string[] = [];
  const own = passages.filter((p) => p.source === 'ziji');
  const texts = new Map<string, string>();
  const openings = new Map<string, string>();
  for (const p of own) {
    if (texts.has(p.text)) problems.push(`${p.id}: the same text as ${texts.get(p.text)}`);
    texts.set(p.text, p.id);
    const term = passageTerm(p.text, p.names);
    if (p.term !== term) problems.push(`${p.id}: stored term ${p.term}, levels at ${term ?? 'none'}`);
    for (const w of wordProblems(p.text, (p.words ?? []).map((x) => x.text))) problems.push(`${p.id}: ${w}`);
    for (const s of splitSentences(p.text)) {
      const open = han(s).slice(0, OPENING).join('');
      if (open.length < OPENING) continue;
      const other = openings.get(open);
      if (other && other !== p.id) problems.push(`${p.id}: "${s}" opens like a sentence of ${other}`);
      openings.set(open, p.id);
    }
    if (Number(p.id.slice(1)) < NEW_FROM || Number(p.id.slice(1)) >= STRETCH_FROM) continue; // p74 on: checkStretchPassages
    const chars = han(p.text);
    const n = splitSentences(p.text).length;
    if (chars.length < 50 || chars.length > 110) problems.push(`${p.id}: ${chars.length} characters, expected 50–110`);
    if (n < 3 || n > 7) problems.push(`${p.id}: ${n} sentences, expected 3–7`);
    if (!OWN_TERMS.includes(p.term)) {
      problems.push(`${p.id}: term ${p.term}, expected one of ${OWN_TERMS.join(' ')}`);
      continue;
    }
    const allowed = allowedChars(p.term);
    const outside = [...new Set(chars.filter((c) => !allowed.has(c)))];
    const covered = chars.filter((c) => allowed.has(c)).length / chars.length;
    if (covered < 0.95) problems.push(`${p.id}: ${Math.round(covered * 100)}% of its characters taught by ${p.term}, expected 95%`);
    if (outside.length > 3) problems.push(`${p.id}: ${outside.length} characters beyond ${p.term} (${outside.join('')}), at most 3`);
    const next = MOE_TERMS[MOE_TERMS.indexOf(p.term) + 1];
    const far = outside.filter((c) => schoolTerm(c) !== next);
    if (far.length) problems.push(`${p.id}: ${far.join('')} not taught by ${next}`);
    const termChars = [...new Set(chars.filter((c) => schoolTerm(c) === p.term))];
    if (termChars.length < 6) problems.push(`${p.id}: ${termChars.length} characters first taught in ${p.term} (${termChars.join('')}), expected 6`);
    const words = p.words ?? [];
    if (words.length < 1 || words.length > 4) problems.push(`${p.id}: ${words.length} 生词, expected 1–4`);
    for (const w of words) {
      if (!p.text.includes(w.text)) problems.push(`${p.id}: 生词 ${w.text} is not in the passage`);
      if (!han(w.text).some((c) => schoolTerm(c) === p.term)) problems.push(`${p.id}: 生词 ${w.text} has no character first taught in ${p.term}`);
      for (const g of glossProblems(w.gloss)) problems.push(`${p.id}: 生词 ${w.text} gloss "${w.gloss}": ${g}`);
      const known = kidGloss(w.text);
      if (known !== undefined && known !== w.gloss) problems.push(`${p.id}: 生词 ${w.text} gloss "${w.gloss}" differs from its kid gloss "${known}"`);
    }
  }
  return problems;
}

/** The stretch passages (spec 2026-10-24 §4): p74 on, 二下 15, 三上 25, 三下 20. */
export const STRETCH_FROM = 74;
export const STRETCH_TERMS: Readonly<Record<string, number>> = { 二下: 15, 三上: 25, 三下: 20 };
export const STRETCH_LENGTH = [80, 140] as const;
export const STRETCH_SENTENCES = [4, 8] as const;
/** A stretch passage's fit for a reader who has finished its term (termReadable) lies in this window. */
export const STRETCH_FIT = [0.8, 0.95] as const;
/** The linking patterns (spec 2026-10-24 §4); a passage uses at least two different ones. */
export const LINKS: readonly (readonly string[])[] = [['因为', '所以'], ['虽然', '但是'], ['先', '然后', '最后'], ['如果', '就'], ['一边', '一边'], ['不但', '而且']];
export const MIN_LINKS = 2;

/** The linking patterns a text uses, as 「因为…所以」: each part in order, a two-part pattern within one sentence; 先…然后…最后
 *  may run across sentences. */
export function linksIn(text: string): string[] {
  const inOrder = (t: string, parts: readonly string[]) => {
    let at = 0;
    for (const part of parts) {
      const i = t.indexOf(part, at);
      if (i < 0) return false;
      at = i + part.length;
    }
    return true;
  };
  return LINKS.filter((parts) => (parts.length > 2 ? inOrder(text, parts) : splitSentences(text).some((s) => inOrder(s, parts)))).map((parts) => parts.join('…'));
}

/**
 * The stretch passages (spec 2026-10-24 §4), p74 on: at 二下, 三上 or 三下, levelling at it (checkOwnPassages); 80–140 characters
 * in 4–8 sentences; at least two linking patterns; a fit of 0.80–0.95 for a reader who has finished its term; 1–4 生词, each in
 * the passage with a kid gloss and a character a reader starting the term can't read; every character a built-in one (`built`).
 * The word gate and duplicates are checkOwnPassages'.
 */
export function checkStretchPassages(passages: readonly Passage[], built: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  for (const p of passages.filter((x) => x.source === 'ziji' && Number(x.id.slice(1)) >= STRETCH_FROM)) {
    if (!(p.term in STRETCH_TERMS)) problems.push(`${p.id}: term ${p.term}, expected one of ${Object.keys(STRETCH_TERMS).join(' ')}`);
    const chars = han(p.text);
    const n = splitSentences(p.text).length;
    if (chars.length < STRETCH_LENGTH[0] || chars.length > STRETCH_LENGTH[1]) problems.push(`${p.id}: ${chars.length} characters, expected ${STRETCH_LENGTH.join('–')}`);
    if (n < STRETCH_SENTENCES[0] || n > STRETCH_SENTENCES[1]) problems.push(`${p.id}: ${n} sentences, expected ${STRETCH_SENTENCES.join('–')}`);
    if (ERHUA.test(p.text)) problems.push(`${p.id}: 儿化`);
    const links = linksIn(p.text);
    if (links.length < MIN_LINKS) problems.push(`${p.id}: linking patterns ${links.join(' ') || 'none'}, expected at least ${MIN_LINKS} of ${LINKS.map((l) => l.join('…')).join(' ')}`);
    const fit = passageFit(p.text, termReadable(p.term), p.names);
    if (fit < STRETCH_FIT[0] || fit > STRETCH_FIT[1]) problems.push(`${p.id}: fit ${fit.toFixed(2)} at ${p.term}, expected ${STRETCH_FIT.join('–')}`);
    const unbuilt = [...new Set(chars.filter((c) => !built.has(c)))];
    if (unbuilt.length) problems.push(`${p.id}: ${unbuilt.join('')} not built in`);
    const before = termReadable(MOE_TERMS[MOE_TERMS.indexOf(p.term) - 1] ?? '');
    const words = p.words ?? [];
    if (words.length < 1 || words.length > 4) problems.push(`${p.id}: ${words.length} 生词, expected 1–4`);
    for (const w of words) {
      if (!p.text.includes(w.text)) problems.push(`${p.id}: 生词 ${w.text} is not in the passage`);
      if (!han(w.text).some((c) => !before.has(c))) problems.push(`${p.id}: 生词 ${w.text} has no character new at ${p.term}`);
      for (const g of glossProblems(w.gloss)) problems.push(`${p.id}: 生词 ${w.text} gloss "${w.gloss}": ${g}`);
      const known = kidGloss(w.text);
      if (known !== undefined && known !== w.gloss) problems.push(`${p.id}: 生词 ${w.text} gloss "${w.gloss}" differs from its kid gloss "${known}"`);
    }
  }
  return problems;
}

/** How many stretch passages each term has, against STRETCH_TERMS; [] when every term is full (the last content task). */
export function stretchCounts(passages: readonly Passage[]): string[] {
  const own = passages.filter((x) => x.source === 'ziji' && Number(x.id.slice(1)) >= STRETCH_FROM);
  return Object.entries(STRETCH_TERMS).flatMap(([t, want]) => {
    const n = own.filter((p) => p.term === t).length;
    return n === want ? [] : [`${t}: ${n} stretch passages, expected ${want}`];
  });
}

/** 儿化 the app never says (src/noErhua.test.ts): Singapore usage. */
const ERHUA = /哪儿|一会儿|玩儿|点儿|这儿|那儿/;

/**
 * The talk prompts (parent loop spec §3): unique ids; every field there; 2–3 follow-ups; one of the six patterns, with its
 * first part in the sample; a known theme, at least 6 starters each; an opening that isn't a yes/no question (…吗？); an English
 * line without Chinese; no 儿化 and no blocked word (src/content/blocked.ts); a sample that passes the passage word gate (wordProblems, its
 * hooks taught: it is what he could say); at least one hook; every Han character one a P2 child reads (`readable`).
 */
export function checkTalkPrompts(prompts: readonly TalkPrompt[], themes: readonly TalkTheme[], patterns: readonly string[], readable: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const p of prompts) {
    if (ids.has(p.id)) problems.push(`duplicate talk prompt ${p.id}`);
    ids.add(p.id);
    if (!p.open.trim() || !p.en.trim() || !p.sample.trim()) problems.push(`${p.id}: missing open, en or sample`);
    if (p.followUps.length < 2 || p.followUps.length > 3 || p.followUps.some((f) => !f.trim())) problems.push(`${p.id}: needs 2–3 follow-ups`);
    if (!patterns.includes(p.pattern)) problems.push(`${p.id}: pattern ${p.pattern} is not one of the six`);
    else if (!p.sample.includes(p.pattern.split('…')[0]!)) problems.push(`${p.id}: the sample does not use ${p.pattern}`);
    if (!themes.includes(p.theme)) problems.push(`${p.id}: unknown theme ${p.theme}`);
    if (/吗？$/.test(p.open)) problems.push(`${p.id}: a yes/no opening`);
    if (HAN.test(p.en)) problems.push(`${p.id}: the English line holds Chinese`);
    if (!p.hooks.length) problems.push(`${p.id}: no hooks`);
    const text = [p.open, ...p.followUps, p.sample, ...p.hooks].join('');
    if (ERHUA.test(text)) problems.push(`${p.id}: 儿化`);
    for (const w of BLOCKED) if (text.includes(w)) problems.push(`${p.id}: blocked word ${w}`);
    // his answer: the passage word gate, with the starter's own topic words (its hooks) taught, as a passage's 生词 are
    for (const w of wordProblems(p.sample, p.hooks)) problems.push(`${p.id}: sample: ${w}`);
    const outside = [...new Set(Array.from(text).filter((ch) => HAN.test(ch) && !readable.has(ch)))];
    if (outside.length) problems.push(`${p.id}: uses ${outside.join('')} beyond P2`);
  }
  for (const t of themes) {
    const n = prompts.filter((p) => p.theme === t).length;
    if (n < 6) problems.push(`theme ${t} has ${n} starters, expected at least 6`);
  }
  return problems;
}

/** The characters a P2 child reads, for the talk prompts: HSK 1–3, his reading lists up to 二下, and `allowed`. */
export function p2Readable(chars: readonly BuiltinChar[], lessons: readonly { term: string; read: string }[], allowed = ''): Set<string> {
  const terms = ['一上', '一下', '二上', '二下'];
  return new Set([...chars.filter((c) => c.level <= 3).map((c) => c.char), ...lessons.filter((l) => terms.includes(l.term)).flatMap((l) => Array.from(l.read)), ...Array.from(allowed)]);
}
