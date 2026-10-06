// The story's writing rules (spec 2026-10-06 3a §7): every problem as a line the writer can act on.
import { builtinWords } from '../content';
import { ladderWords } from '../content/ladder';
import { allowedChars, wordTerm } from '../content/understand';
import { plainText, slotsIn, type Chapter, type OutlineRow, type Page } from './format';

export const SEASON1_TERMS = ['一上', '一下', '二上'] as const;
export const MAX_PAGE_WORDS = 60;
export const MAX_SPEECH = 4;
export const BRANDS = /\b(mcdonald'?s?|kfc|starbucks|coca[- ]?cola|coke|pepsi|lego|disney|nike|adidas|pok[eé]mon|grab|ntuc|fairprice|toast box|ya kun|old chang kee|7[- ]?eleven|ikea|apple|samsung|nintendo)\b/i;

const isHan = (c: string) => /\p{Script=Han}/u.test(c);
let words: Set<string> | null = null;
/** Every word the app knows by text: single characters (b:) and ladder 词语 (w:). */
function wordTexts(): Set<string> {
  words ??= new Set([...builtinWords(0).map((w) => w.text), ...ladderWords().map((w) => w.text)]);
  return words;
}
const inSeason = (text: string) => (SEASON1_TERMS as readonly string[]).includes(wordTerm(text) ?? '');

function pageProblems(where: string, p: Page): string[] {
  const out: string[] = [];
  const english = p.lines.flatMap((l) => (l.kind === 'scene' ? [] : [plainText(l.text)])).join(' ').replace(/\p{Script=Han}+/gu, ' ');
  const count = english.split(/\s+/).filter((w) => /[A-Za-z]/.test(w)).length;
  if (count > MAX_PAGE_WORDS) out.push(`${where}: ${count} English words (at most ${MAX_PAGE_WORDS})`);
  // the English must be clean once the slots are taken out: no broken braces, no Chinese without a slot (final review I2)
  for (const l of p.lines) {
    if (l.kind === 'scene') continue;
    for (const sl of slotsIn(l.text)) if (sl.en.includes('|')) out.push(`${where}: slot {${sl.zh}|${sl.en}} has a stray | in its English`);
    const rest = l.text.replace(/\{([^|{}]+)\|([^{}]+)\}/g, ' ');
    if (/[{}]/.test(rest)) out.push(`${where}: a stray { or } in "${l.text}"`);
    if (/\p{Script=Han}/u.test(rest)) out.push(`${where}: Chinese outside a slot in "${l.text}"`);
  }
  const speech = p.lines.filter((l) => l.kind === 'speech').length;
  if (speech > MAX_SPEECH) out.push(`${where}: ${speech} speech lines (at most ${MAX_SPEECH})`);
  return out;
}

export function chapterProblems(c: Chapter, outline?: OutlineRow): string[] {
  const out: string[] = [];
  const ch = `ch${String(c.chapter).padStart(2, '0')}`;
  const allowed = allowedChars('二上');
  // Mandarin: Granny's lines, the 听一听 scene, its questions and answers
  const mandarin = [...c.granny.map((m) => m.zh), ...c.listen.lines.map((m) => m.zh), ...c.listen.questions.flatMap((q) => [q.zh, q.answer, ...q.wrong])];
  for (const zh of mandarin) {
    const bad = [...new Set(Array.from(zh).filter((x) => isHan(x) && !allowed.has(x)))];
    if (bad.length) out.push(`${ch}: "${zh}" uses ${bad.join('')} — not taught by 二上`);
  }
  // slots
  const texts = [...c.setup, ...c.payoff].flatMap((p) => p.lines.flatMap((l) => (l.kind === 'scene' ? [] : [l.text])));
  const used = texts.flatMap((t) => slotsIn(t).map((s) => s.zh));
  const distinct = [...new Set(used)];
  for (const w of distinct) {
    if (used.filter((x) => x === w).length > 1) out.push(`${ch}: slot ${w} used twice`);
    if (!wordTexts().has(w)) out.push(`${ch}: slot ${w} is not a word in the app`);
    else if (!inSeason(w)) out.push(`${ch}: slot ${w} is ${wordTerm(w) ?? 'beyond school order'}, not 一上–二上`);
  }
  if (distinct.length < 6 || distinct.length > 10) out.push(`${ch}: ${distinct.length} slot words (6–10)`);
  const listed = [...c.slots].sort().join(',');
  if (listed !== [...distinct].sort().join(',')) out.push(`${ch}: frontmatter slots [${c.slots.join(', ')}] ≠ slots used [${distinct.join(', ')}]`);
  if (outline && [...outline.slots].sort().join(',') !== [...distinct].sort().join(',')) out.push(`${ch}: slots [${distinct.join(', ')}] ≠ the outline's [${outline.slots.join(', ')}]`);
  // pages
  c.setup.forEach((p, i) => out.push(...pageProblems(`${ch} setup page ${i + 1}`, p)));
  c.payoff.forEach((p, i) => out.push(...pageProblems(`${ch} payoff page ${i + 1}`, p)));
  // Granny and 听一听
  if (c.granny.length < 1 || c.granny.length > 3) out.push(`${ch}: ${c.granny.length} Granny lines (1–3)`);
  const scene = c.listen.lines.map((m) => m.zh).join('');
  if (c.listen.lines.length < 3 || c.listen.lines.length > 5) out.push(`${ch}: 听一听 has ${c.listen.lines.length} lines (3–5 lines)`);
  if (c.listen.questions.length < 1 || c.listen.questions.length > 2) out.push(`${ch}: ${c.listen.questions.length} 听一听 questions (1–2)`);
  for (const q of c.listen.questions) {
    if (new Set([q.answer, ...q.wrong]).size !== 3 || q.wrong.length !== 2) out.push(`${ch}: "${q.zh}" needs 3 distinct choices`);
    if (!scene.includes(q.answer)) out.push(`${ch}: "${q.zh}" — its answer ${q.answer} is not in the scene`);
    if (q.zh.includes('为什么') && c.chapter < 10) out.push(`${ch}: 为什么 questions start from chapter 10`);
  }
  // [rescued]
  const rescuedIn = (ps: Page[]) => ps.flatMap((p) => p.lines).filter((l) => l.kind === 'rescued').length;
  if (rescuedIn(c.setup) > 0 || rescuedIn(c.payoff) !== 1) out.push(`${ch}: exactly one [rescued] line, in the payoff`);
  // brands
  const all = [...texts.map(plainText), ...c.granny.map((m) => m.en), ...c.listen.lines.map((m) => m.en)].join('\n');
  const brand = BRANDS.exec(all);
  if (brand) out.push(`${ch}: a real brand name (${brand[0]})`);
  return out;
}

export function outlineProblems(rows: OutlineRow[]): string[] {
  const out: string[] = [];
  if (rows.length !== 18) out.push(`the outline has ${rows.length} chapters (18)`);
  const first = new Map<string, number>();
  for (const r of rows) {
    for (const w of r.slots) {
      if (first.has(w)) out.push(`slot ${w} is planned in chapters ${first.get(w)} and ${r.chapter}`);
      else first.set(w, r.chapter);
      if (!wordTexts().has(w)) out.push(`ch${r.chapter}: slot ${w} is not a word in the app`);
      else if (!inSeason(w)) out.push(`ch${r.chapter}: slot ${w} is not 一上–二上`);
      else if (r.chapter <= 6 && wordTerm(w) === '二上') out.push(`ch${r.chapter}: slot ${w} is 二上 — chapters 1–6 use 一上/一下 words`);
    }
  }
  return out;
}

/** The app's words in a Chinese string, longest match first (门口, not 门 + 口); characters that aren't words are skipped. */
export function storyWords(text: string): string[] {
  const known = wordTexts();
  const cs = Array.from(text);
  const out: string[] = [];
  for (let i = 0; i < cs.length;) {
    let hit = '';
    for (let n = Math.min(4, cs.length - i); n >= 1; n--) {
      const w = cs.slice(i, i + n).join('');
      if (known.has(w)) { hit = w; break; }
    }
    if (hit) { out.push(hit); i += Array.from(hit).length; } else i++;
  }
  return out;
}

export function seasonReport(chapters: Chapter[], rows: OutlineRow[]): { slotWords: number; byTerm: Record<string, number>; mandarinWords: number } {
  const slots = new Set([...rows.flatMap((r) => r.slots), ...chapters.flatMap((c) => c.slots)]);
  const byTerm: Record<string, number> = {};
  for (const w of slots) { const t = wordTerm(w) ?? '?'; byTerm[t] = (byTerm[t] ?? 0) + 1; }
  const mandarin = new Set(chapters.flatMap((c) => [...c.granny, ...c.listen.lines].flatMap((m) => storyWords(m.zh))));
  return { slotWords: slots.size, byTerm, mandarinWords: mandarin.size };
}
