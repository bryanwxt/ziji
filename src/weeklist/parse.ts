// src/weeklist/parse.ts
// A pasted weekly sheet (weekly list spec 2026-10-17 §3.2): the worksheet importer's cleanLines drops the page furniture and tags
// sections; this pass reads the 词语 grid and the 搭配 pairs, with their theme headings, and flags what the parent should check.
import { BUILTIN, HSK_WORDS } from '../content';
import { BLOCK_REASON } from '../content/blocked';
import { DAPEI } from '../content/dapei';
import { OutputFormat, segment } from 'pinyin-pro';
import { glossFor } from '../content/glossary';
import { ladderId, ladderWord } from '../content/ladder';
import { sentencesFor } from '../content/understand';
import { lookAlike } from '../importer/alike';
import { cleanLines, isFurniture, isSectionHeading, pageCode } from '../importer/clean';
import { joinTokens, type Token } from '../importer/parse';
import { suggestFix } from '../importer/suggest';
import { VERB_FAMILY } from './dapei';

export type ItemFlag = 'unknown' | 'phrase' | 'blocked' | 'checkPair';
export interface DraftItem { text: string; from: 'grid' | 'pair' | 'both'; flags: ItemFlag[]; suggestion?: string; reason?: string; parts?: string[] } // parts: the cells Live Text split it into (rule 3), for Split
export interface DraftPair { left: string; right: string; group?: string; check?: true }
export interface WeekDraft { title: string; items: DraftItem[]; pairs: DraftPair[]; unpaired: string[]; notes: string[] }

const MAX_LEN = 4;
const SENTENCE = /[，。！？]/;
const VERBS = new Set([...DAPEI.map((d) => d.verb), ...Object.keys(VERB_FAMILY)]);
export const isAdjPhrase = (t: string) => Array.from(t).length >= 2 && t.endsWith('的');
/** A half that leads its pair (§3.2 rule 9): an 「X的」, a single character or a known verb. Never a theme heading. */
const leads = (t: string) => isAdjPhrase(t) || Array.from(t).length === 1 || VERBS.has(t);

/** Which half leads; otherwise the page's order. */
function lead(a: string, b: string): [string, string] {
  return !leads(a) && leads(b) ? [b, a] : [a, b];
}

/** Han runs: numbers, brackets, dashes, colons and stops between cells all split (1.跑步 2.书包, 吃——面包, （帽子）). */
const hanTokens = (line: string): string[] => line.split(/[^\p{Script=Han}]+/u).filter(Boolean);

const CHARS = new Set(BUILTIN.map((c) => c.char));
/**
 * Is this a word ZiJi knows (spec §3.2 rule 12): HSK, a built-in character or a glossary word (面条, 青菜), or one the caller adds
 * (his stored words). The parent screen reads a paste with this.
 */
export const weekIsWord = (extra: (w: string) => boolean = () => false, dictionary?: ReadonlySet<string> | null) => (w: string): boolean =>
  HSK_WORDS.has(w) || CHARS.has(w) || glossFor(w) !== undefined || sentencesFor(w).length > 0 || !!ladderWord(ladderId(w)) || pinyinProWord(w)
  || !!dictionary?.has(w) || extra(w); // dictionary: CC-CEDICT's headwords (cedictWords.ts), once the parent panel has them

/**
 * A word in pinyin-pro's own dictionary (follow-up 2026-10-17): its segmenter keeps it whole. That dictionary holds only words it
 * needs for readings (银行, 行长), so it adds a few; the full CC-CEDICT isn't in the repo (glossary.json is its built-in 组词 only).
 */
function pinyinProWord(w: string): boolean {
  if (Array.from(w).length < 2) return false;
  const parts = segment(w, { format: OutputFormat.AllSegment }) as { origin: string }[];
  return parts.length === 1 && parts[0]!.origin === w;
}

/** The list's suggested name (§3.2 rule 1): the sheet's title line above its first heading and its page code, else the day's date. */
export function sheetTitle(text: string, now: Date): string {
  let title: string | null = null;
  let candidate: string | null = null;
  let code: string | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/[　\t]+/g, ' ').trim();
    if (!line) continue;
    const c = pageCode(line);
    if (c) { code ??= c; continue; }
    if (isSectionHeading(line)) { title = candidate; break; } // a title is only a title when a section heading follows it
    if (!candidate && /^\p{Script=Han}{2,10}$/u.test(line) && !isFurniture(line)) candidate = line;
  }
  const name = [title, code].filter(Boolean).join(' ');
  return name || `${now.getMonth() + 1}月${now.getDate()}日的词语`;
}

type Row = { tokens: string[]; line: string };

export function parseWeekList(text: string, isWord: (w: string) => boolean, dict: Iterable<string> = [], now: Date = new Date()): WeekDraft {
  const draft: WeekDraft = { title: sheetTitle(text, now), items: [], pairs: [], unpaired: [], notes: [] };
  const note = (n: string) => { if (!draft.notes.includes(n)) draft.notes.push(n); };
  const grid: Token[] = [];
  const rows: Row[] = [];
  const checkTokens: string[] = []; // tokens of a pairs line left unpaired: items, for the parent to check
  for (const { line, section } of cleanLines(text, isWord, { keepNumbered: true })) {
    if (section === 'sentences' || section === 'other' || section === 'idioms') {
      if (!/^第.+课$/.test(line)) note(section === 'idioms' ? 'idioms' : section === 'sentences' ? 'sentences' : 'passages');
      continue;
    }
    const all = hanTokens(line);
    const long = all.filter((t) => Array.from(t).length > MAX_LEN);
    if (long.length && SENTENCE.test(line)) { note('sentences'); continue; } // a sentence inside a table: From a worksheet's job
    for (const t of long) note(`too long: ${t}`);
    const tokens = all.filter((t) => Array.from(t).length <= MAX_LEN);
    if (!tokens.length) continue;
    if (section === 'pairs') rows.push({ tokens, line });
    else grid.push(...tokens.map((t) => ({ text: t, joinable: section !== 'chars' })));
  }

  // every half of a pairs line read across: a lone token that is one of them is never a heading (rule 6)
  const halves = new Set(rows.filter((r) => r.tokens.length >= 2).flatMap((r) => r.tokens));
  const isCandidate = (t: string) => Array.from(t).length <= 3 && !leads(t) && !halves.has(t);
  const seenPairs = new Set<string>();
  let group: string | undefined;
  const pushPair = (a: string, b: string, check: boolean) => {
    const [left, right] = lead(a, b);
    if (seenPairs.has(`${left}|${right}`)) return;
    seenPairs.add(`${left}|${right}`);
    draft.pairs.push({ left, right, ...(group ? { group } : {}), ...(check ? { check: true as const } : {}) });
  };

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]!;
    if (row.tokens.length === 1) {
      // a run of lone cells: Live Text reading a table one cell a line, or a heading over the rows that follow
      let end = r;
      while (end < rows.length && rows[end]!.tokens.length === 1) end++;
      readCells(rows.slice(r, end).map((x) => x.tokens[0]!), end < rows.length);
      r = end - 1;
      continue;
    }
    let tokens = row.tokens;
    let check = false;
    // a row split across lines (吃 面包 喝 / 牛奶): an odd line takes the lone cell after it, unless that cell heads the rows after it
    const next = rows[r + 1];
    if (tokens.length % 2 && next?.tokens.length === 1) {
      const after = rows[r + 2];
      const heads = isCandidate(next.tokens[0]!) && !!after && after.tokens.length >= 2;
      if (leads(tokens.at(-1)!) || !heads) { tokens = [...tokens, next.tokens[0]!]; check = true; r++; }
    }
    if (tokens.length % 2) { draft.unpaired.push(row.line); checkTokens.push(...tokens); continue; }
    for (let k = 0; k < tokens.length; k += 2) pushPair(tokens[k]!, tokens[k + 1]!, check);
  }

  /**
   * Lone cells, read in pairs, with theme headings among them (rule 6). A heading sits where a pair would start, is a short
   * non-leading token, and leaves an even run of cells after it up to the next heading (or, last in the run, heads the rows that
   * follow). Headings are taken wherever the rest still reads cleanly, so 食物/煮/面条/炒/青菜/夜市/套/圈圈/吃/鸡翅 is two groups.
   */
  function readCells(cells: string[], rowsFollow: boolean) {
    const n = cells.length;
    const memo = new Map<number, boolean>();
    // can cells[j..] be read as pairs and headings?
    const ok = (j: number): boolean => {
      if (j >= n) return j === n;
      const hit = memo.get(j);
      if (hit !== undefined) return hit;
      const v = (isCandidate(cells[j]!) && headed(j + 1)) || ok(j + 2);
      memo.set(j, v);
      return v;
    };
    // after a heading at k − 1: at least one pair, or the end of the run when rows follow it
    const headed = (k: number): boolean => (k === n && rowsFollow) || (k + 1 < n && ok(k + 2));
    let j = 0;
    while (j < n) {
      if (isCandidate(cells[j]!) && headed(j + 1)) { group = cells[j]; j++; continue; }
      if (j + 1 < n) { pushPair(cells[j]!, cells[j + 1]!, true); j += 2; continue; }
      draft.unpaired.push(cells[j]!);
      checkTokens.push(cells[j]!);
      j++;
    }
  }

  const seen = new Map<string, DraftItem>();
  const add = (t: string, from: 'grid' | 'pair', parts?: string[], flag?: ItemFlag) => {
    if (isAdjPhrase(t)) return; // 「X的」 lives on its pair only (decision 4)
    const had = seen.get(t);
    if (had) {
      if (had.from !== from) had.from = 'both';
      if (flag && !had.flags.includes(flag)) had.flags.push(flag);
      return;
    }
    const item: DraftItem = { text: t, from, flags: [], ...(parts ? { parts } : {}) };
    const reason = BLOCK_REASON.get(t);
    if (reason) { item.flags.push('blocked'); item.reason = reason; }
    else if (!isWord(t)) {
      const chars = Array.from(t);
      const known = chars.every((c) => isWord(c));
      if (known && chars.length >= 3) item.flags.push('phrase');
      else {
        item.flags.push('unknown');
        // real characters: only a look-alike fix (鸡翅 is never "did you mean 鸡蛋"); a misread character: the nearest word
        const fix = suggestFix(t, dict, lookAlike, known);
        if (fix) item.suggestion = fix;
      }
    }
    if (flag) item.flags.push(flag);
    seen.set(t, item);
    draft.items.push(item);
  };
  for (const { text: t, parts } of joinTokens(grid, isWord)) add(t, 'grid', parts); // Live Text's split cells rejoined (rule 3)
  for (const p of draft.pairs) { add(p.left, 'pair'); add(p.right, 'pair'); }
  for (const t of checkTokens) add(t, 'pair', undefined, 'checkPair');
  return draft;
}
