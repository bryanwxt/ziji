import { cleanLines, type Section } from './clean';
import { suggestFix } from './suggest';

export interface DraftItem { text: string; known: boolean; suggestion?: string; parts?: string[] } // parts: the cells it was joined from
export interface ImportDraft {
  title: string | null;
  words: DraftItem[];
  idioms: DraftItem[];
  pairs: [string, string][];
  sentences: string[];
  passages: string[];
}

const SENT_END = /[。！？!?”"」]$/;
const HAN_ONLY = /^\p{Script=Han}{1,4}$/u;

interface Token { text: string; joinable: boolean } // a 生字 cell is never joined to its neighbour

/** Greedy join: consecutive joinable tokens that together make a known word (up to 4 characters) become that word. */
function joinTokens(tokens: Token[], isWord: (w: string) => boolean): { text: string; parts?: string[] }[] {
  const out: { text: string; parts?: string[] }[] = [];
  for (let i = 0; i < tokens.length; ) {
    let taken = 1;
    for (let n = Math.min(4, tokens.length - i); n >= 2; n--) {
      const run = tokens.slice(i, i + n);
      const joined = run.map((t) => t.text).join('');
      if (Array.from(joined).length <= 4 && run.every((t) => t.joinable && HAN_ONLY.test(t.text)) && isWord(joined)) {
        taken = n;
        break;
      }
    }
    const run = tokens.slice(i, i + taken).map((t) => t.text);
    out.push(taken > 1 ? { text: run.join(''), parts: run } : { text: run[0]! });
    i += taken;
  }
  return out;
}

export function parseWorksheet(text: string, isWord: (w: string) => boolean, dict: Iterable<string> = [], alike?: (from: string, to: string) => boolean): ImportDraft {
  const lines = cleanLines(text, isWord);
  const draft: ImportDraft = { title: null, words: [], idioms: [], pairs: [], sentences: [], passages: [] };
  const seen = new Set<string>();
  const item = (t: string, parts?: string[]): DraftItem => {
    const withParts = (d: DraftItem): DraftItem => (parts ? { ...d, parts } : d);
    if (isWord(t)) return withParts({ text: t, known: true });
    // A short phrase of characters the app knows (一句, 两遍) is fine, unless it's one look-alike away from a word (自已 → 自己).
    if (Array.from(t).length <= 3 && Array.from(t).every((ch) => isWord(ch))) {
      const fix = alike ? suggestFix(t, dict, alike, true) : undefined;
      return withParts(fix ? { text: t, known: false, suggestion: fix } : { text: t, known: true });
    }
    const suggestion = suggestFix(t, dict, alike);
    return withParts(suggestion ? { text: t, known: false, suggestion } : { text: t, known: false });
  };
  const wordTokens: Token[] = [];
  let para = '';
  let paraSection: Section | null = null;
  const flushPara = () => {
    if (!para) return;
    const sentences = para.match(/[^。！？!?]+[。！？!?]+[”"」]?/g) ?? [para];
    if (sentences.length >= 3) draft.passages.push(para);
    else draft.sentences.push(...sentences.map((s) => s.trim()));
    para = '';
    paraSection = null;
  };
  for (const { line, section } of lines) {
    if (/^第.+课$/.test(line)) { draft.title ??= line; continue; }
    if (para && section !== paraSection) flushPara();
    const isProse = /[，。！？；“”]/.test(line) || Array.from(line).length > 12;
    // A passage runs on until a non-prose line; inside a reading text, or mid-sentence, a short wrapped line (去动物园) continues it.
    const continues = para !== '' && (section === 'other' || !SENT_END.test(para));
    if (isProse || continues) { para += line; paraSection = section; continue; }
    flushPara();
    const tokens = line.split(/[\s、,，/／\-—＋+]+/).map((t) => t.replace(/[：:。]+$/, '')).filter(Boolean);
    if (section === 'pairs' && tokens.length === 2 && tokens.every((t) => HAN_ONLY.test(t))) { draft.pairs.push([tokens[0]!, tokens[1]!]); continue; }
    if (section === 'idioms') {
      // a 成语 heading claims four-character words only; the rest of an OCR'd table stays words
      for (const t of tokens) {
        if (!HAN_ONLY.test(t)) continue;
        if (Array.from(t).length === 4) { if (!seen.has(t)) { seen.add(t); draft.idioms.push(item(t)); } } else wordTokens.push({ text: t, joinable: true });
      }
      continue;
    }
    wordTokens.push(...tokens.filter((t) => HAN_ONLY.test(t)).map((t) => ({ text: t, joinable: section !== 'chars' })));
  }
  flushPara();
  for (const { text: t, parts } of joinTokens(wordTokens, isWord)) {
    if (seen.has(t)) continue;
    seen.add(t);
    if (Array.from(t).length === 4 && isWord(t)) draft.idioms.push(item(t, parts)); // a known four-character word is a 成语; 一排排的 stays a word
    else draft.words.push(item(t, parts));
  }
  return draft;
}
