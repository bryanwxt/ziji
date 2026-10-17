// src/weeklist/parse.ts
// A pasted weekly sheet (weekly list spec 2026-10-17 §3.2): the worksheet importer's cleanLines drops the page furniture and tags
// sections; this pass reads the 词语 grid and the 搭配 pairs, with their theme headings, and flags what the parent should check.
import { BLOCK_REASON } from '../content/blocked';
import { DAPEI } from '../content/dapei';
import { lookAlike } from '../importer/alike';
import { cleanLines, isFurniture, isSectionHeading, pageCode } from '../importer/clean';
import { joinTokens, type Token } from '../importer/parse';
import { suggestFix } from '../importer/suggest';

export type ItemFlag = 'unknown' | 'phrase' | 'blocked' | 'checkPair';
export interface DraftItem { text: string; from: 'grid' | 'pair' | 'both'; flags: ItemFlag[]; suggestion?: string; reason?: string; parts?: string[] } // parts: the cells Live Text split it into (rule 3), for Split
export interface DraftPair { left: string; right: string; group?: string; check?: true }
export interface WeekDraft { title: string; items: DraftItem[]; pairs: DraftPair[]; unpaired: string[]; notes: string[] }

const HAN = /^\p{Script=Han}{1,4}$/u;
const SPLIT = /[\s、,，/／\-—＋+|｜]+/;
const VERBS = new Set(DAPEI.map((d) => d.verb));
export const isAdjPhrase = (t: string) => Array.from(t).length >= 2 && t.endsWith('的');

/** Which half leads (§3.2 rule 9): an 「X的」, a single character or a known verb; otherwise the page's order. */
function lead(a: string, b: string): [string, string] {
  const leads = (t: string) => isAdjPhrase(t) || Array.from(t).length === 1 || VERBS.has(t);
  return !leads(a) && leads(b) ? [b, a] : [a, b];
}

/** The list's suggested name (§3.2 rule 1): the sheet's title line above its first heading and its page code, else the day's date. */
export function sheetTitle(text: string, now: Date): string {
  let title: string | null = null;
  let code: string | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/[\u3000\t]+/g, ' ').trim();
    if (!line) continue;
    const c = pageCode(line);
    if (c) { code ??= c; continue; }
    if (isSectionHeading(line)) break;
    if (!title && /^\p{Script=Han}{2,10}$/u.test(line) && !isFurniture(line)) title = line;
  }
  const name = [title, code].filter(Boolean).join(' ');
  return name || `${now.getMonth() + 1}月${now.getDate()}日的词语`;
}

export function parseWeekList(text: string, isWord: (w: string) => boolean, dict: Iterable<string> = [], now: Date = new Date()): WeekDraft {
  const draft: WeekDraft = { title: sheetTitle(text, now), items: [], pairs: [], unpaired: [], notes: [] };
  const lines = cleanLines(text, isWord);
  const grid: Token[] = [];
  // every half of a pairs line read across (two or more tokens): a lone token that is one of them is never a heading (rule 6)
  const halves = new Set(lines.filter((l) => l.section === 'pairs').map((l) => l.line.split(SPLIT).filter((t) => HAN.test(t))).filter((ts) => ts.length >= 2).flat());
  let group: string | undefined;
  let column: string[] = []; // pairs read one cell a line
  const flushColumn = () => {
    for (let i = 0; i + 1 < column.length; i += 2) {
      const [left, right] = lead(column[i]!, column[i + 1]!);
      draft.pairs.push({ left, right, ...(group ? { group } : {}), check: true });
    }
    if (column.length % 2) draft.unpaired.push(column.at(-1)!);
    column = [];
  };
  for (const [i, { line, section }] of lines.entries()) {
    if (section === 'sentences' || section === 'other' || section === 'idioms') {
      const note = section === 'idioms' ? 'idioms' : section === 'sentences' ? 'sentences' : 'passages';
      if (!/^第.+课$/.test(line) && !draft.notes.includes(note)) draft.notes.push(note);
      continue;
    }
    const tokens = line.split(SPLIT).filter((t) => HAN.test(t));
    if (section !== 'pairs') { grid.push(...tokens.map((t) => ({ text: t, joinable: section !== 'chars' }))); continue; }
    // a theme heading: one short token, between pair blocks (the column buffer is even), followed by pairs (§3.2 rule 6)
    if (tokens.length === 1 && Array.from(tokens[0]!).length <= 3 && column.length % 2 === 0 && !halves.has(tokens[0]!) && isHeading(tokens[0]!, lines.slice(i + 1).filter((l) => l.section === 'pairs').map((l) => l.line))) {
      flushColumn();
      group = tokens[0];
      continue;
    }
    if (tokens.length === 1) { column.push(tokens[0]!); continue; }
    flushColumn();
    if (tokens.length % 2) { draft.unpaired.push(line); continue; }
    for (let k = 0; k < tokens.length; k += 2) {
      const [left, right] = lead(tokens[k]!, tokens[k + 1]!);
      draft.pairs.push({ left, right, ...(group ? { group } : {}) });
    }
  }
  flushColumn();
  const seen = new Map<string, DraftItem>();
  const add = (t: string, from: 'grid' | 'pair', parts?: string[]) => {
    if (isAdjPhrase(t)) return; // 「X的」 lives on its pair only (decision 4)
    const had = seen.get(t);
    if (had) { if (had.from !== from) had.from = 'both'; return; }
    const item: DraftItem = { text: t, from, flags: [], ...(parts ? { parts } : {}) };
    const reason = BLOCK_REASON.get(t);
    if (reason) { item.flags.push('blocked'); item.reason = reason; }
    else if (!isWord(t)) {
      const chars = Array.from(t);
      if (chars.every((c) => isWord(c)) && chars.length >= 3) item.flags.push('phrase');
      else {
        item.flags.push('unknown');
        const fix = suggestFix(t, dict, lookAlike);
        if (fix) item.suggestion = fix;
      }
    }
    seen.set(t, item);
    draft.items.push(item);
  };
  for (const { text: t, parts } of joinTokens(grid, isWord)) add(t, 'grid', parts); // Live Text's split cells rejoined (rule 3)
  for (const p of draft.pairs) { add(p.left, 'pair'); add(p.right, 'pair'); }
  return draft;
}

/** A lone token is a heading when the lines after it, up to the next lone token, are pair lines (two or more tokens each). */
function isHeading(token: string, after: string[]): boolean {
  const following = after[0]?.split(SPLIT).filter((t) => HAN.test(t)) ?? [];
  if (following.length >= 2) return true;
  // column-wise: a heading is followed by an even run of single cells before the next heading or the end
  let run = 0;
  for (const l of after) {
    const ts = l.split(SPLIT).filter((t) => HAN.test(t));
    if (ts.length !== 1) break;
    run++;
  }
  return run >= 2 && run % 2 === 0 && token.length <= 3;
}
