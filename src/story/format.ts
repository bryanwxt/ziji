// The story's chapter format (spec 2026-10-06 3a §6): Markdown with a small fixed vocabulary. The parent reads these files; the 3c
// engine loads the same ones. Pure: no app imports.
export interface Slot { zh: string; en: string }
export type Line =
  | { kind: 'scene'; id: string }
  | { kind: 'text'; text: string }
  | { kind: 'speech'; who: string; text: string }
  | { kind: 'rescued'; text: string }
  | { kind: 'cast'; ids: string[] }; // who stands in the scene (3c §4); else the page's speakers
export interface Page { lines: Line[] }
export interface Mandarin { who: string; zh: string; en: string }
export interface Question { zh: string; en: string; answer: string; wrong: string[] }
export interface Chapter {
  chapter: number; title: string; place: string; slots: string[];
  setup: Page[]; granny: Mandarin[]; listen: { lines: Mandarin[]; questions: Question[] }; payoff: Page[];
}
export interface OutlineRow { chapter: number; place: string; slots: string[] }

const SLOT = /\{([^|{}]+)\|([^{}]+)\}/g;
export const slotsIn = (text: string): Slot[] => [...text.matchAll(SLOT)].map((m) => ({ zh: m[1]!.trim(), en: m[2]!.trim() }));
export const plainText = (text: string): string => text.replace(SLOT, (_, _zh, en: string) => en.trim());

function mandarin(s: string, n: number): Mandarin {
  const m = /^([^:：]+)[:：]\s*(.+?)\s+\|\s+(.+)$/.exec(s);
  if (!m) throw new Error(`line ${n}: a Mandarin line is "Name: 中文 | English"`);
  return { who: m[1]!.trim(), zh: m[2]!.trim(), en: m[3]!.trim() };
}
function question(s: string, n: number): Question {
  const m = /^\?\s*(.+?)\s+\|\s+(.+?)\s+=\s+(.+)$/.exec(s);
  const choices = m?.[3]!.split('|').map((x) => x.trim()).filter(Boolean) ?? [];
  if (!m || choices.length < 2) throw new Error(`line ${n}: a question is "? 中文 | English = right | wrong | wrong"`);
  return { zh: m[1]!.trim(), en: m[2]!.trim(), answer: choices[0]!, wrong: choices.slice(1) };
}

export function parseChapter(md: string): Chapter {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  if (lines[0]?.trim() !== '---') throw new Error('line 1: a chapter starts with --- frontmatter');
  const end = lines.indexOf('---', 1);
  if (end < 0) throw new Error('line 1: the frontmatter never closes with ---');
  const meta = new Map<string, string>();
  for (let i = 1; i < end; i++) {
    const m = /^(\w+):\s*(.*)$/.exec(lines[i]!.trim());
    if (!m) throw new Error(`line ${i + 1}: frontmatter is "key: value"`);
    meta.set(m[1]!, m[2]!);
  }
  const slots = (meta.get('slots') ?? '').replace(/^\[|\]$/g, '').split(',').map((x) => x.trim()).filter(Boolean);
  const c: Chapter = {
    chapter: Number(meta.get('chapter')), title: meta.get('title') ?? '', place: meta.get('place') ?? '', slots,
    setup: [], granny: [], listen: { lines: [], questions: [] }, payoff: [],
  };
  if (!Number.isInteger(c.chapter) || c.chapter < 1) throw new Error('line 2: chapter must be a whole number from 1');
  let section = '';
  let page: Page | null = null;
  for (let i = end + 1; i < lines.length; i++) {
    const n = i + 1;
    const s = lines[i]!.trim();
    if (!s) continue;
    if (s.startsWith('## ')) { section = s.slice(3).trim().toLowerCase(); page = null; continue; }
    if (s.startsWith('### ')) {
      if (section !== 'setup' && section !== 'payoff') throw new Error(`line ${n}: pages belong in Setup or Payoff`);
      page = { lines: [] };
      c[section].push(page);
      continue;
    }
    if (section === 'granny') { c.granny.push(mandarin(s, n)); continue; }
    if (section === 'listen') { if (s.startsWith('?')) c.listen.questions.push(question(s, n)); else c.listen.lines.push(mandarin(s, n)); continue; }
    if (!page) throw new Error(`line ${n}: text outside a page`);
    if (s.startsWith('@cast ')) page.lines.push({ kind: 'cast', ids: s.slice(6).trim().split(/\s+/) });
    else if (s.startsWith('@scene ')) page.lines.push({ kind: 'scene', id: s.slice(7).trim() });
    else if (s.startsWith('[rescued]')) page.lines.push({ kind: 'rescued', text: s.slice(9).trim() });
    else if (s.startsWith('>')) {
      const m = /^>\s*([^:]+):\s*(.+)$/.exec(s);
      if (!m) throw new Error(`line ${n}: speech is "> Name: line"`);
      page.lines.push({ kind: 'speech', who: m[1]!.trim(), text: m[2]!.trim() });
    } else page.lines.push({ kind: 'text', text: s });
  }
  return c;
}

/** The outline's table rows: | Ch | Place | Problem | Rule / gag | Slots | Hint |. */
export function parseOutline(md: string): OutlineRow[] {
  return md.replace(/\r\n?/g, '\n').split('\n')
    .map((l) => l.trim())
    .filter((l) => /^\|\s*\d+\s*\|/.test(l))
    .map((l) => {
      const cells = l.split('|').slice(1, -1).map((x) => x.trim());
      return { chapter: Number(cells[0]), place: cells[1]!, slots: cells[4]!.split(/[,，、]/).map((x) => x.trim()).filter((x) => x && x !== '—') };
    });
}
