/** CC-CEDICT → a short English gloss for each 组词 the app shows (the 认字 card, parent 2026-10-04). */

export interface CedictEntry {
  simplified: string;
  pinyin: string; // numbered, e.g. "da4 ren2"
  senses: string[];
}

export function parseCedict(text: string): Map<string, CedictEntry[]> {
  const out = new Map<string, CedictEntry[]>();
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const m = /^(\S+) (\S+) \[([^\]]*)\] \/(.*)\/\s*$/.exec(line);
    if (!m) continue;
    const entry = { simplified: m[2]!, pinyin: m[3]!, senses: m[4]!.split('/') };
    const list = out.get(entry.simplified) ?? [];
    list.push(entry);
    out.set(entry.simplified, list);
  }
  return out;
}

/** Tone numbers per syllable: "bā ba" and "ba1 ba5" both become "15" (no mark = 5, the neutral tone). */
export function tones(py: string): string {
  const marked = py.trim().split(/\s+/).map((syl) => {
    if (/\d$/.test(syl)) return syl.slice(-1);
    const d = syl.normalize('NFD');
    return d.includes('\u0304') ? '1' : d.includes('\u0301') ? '2' : d.includes('\u030c') ? '3' : d.includes('\u0300') ? '4' : '5';
  });
  return marked.join('');
}

/** "dà rén" and "da4 ren2" both become "daren"; ü and u: become u. */
export function plainSyllables(py: string): string {
  return py.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/u:/gi, 'u').replace(/[0-9\s'·-]/g, '').toLowerCase();
}

const SKIP = /^(CL:|variant of|old variant|surname |abbr\. for|see |also written|used in |Taiwan pr\.|erhua variant|\(old\)|\(archaic\)|\(Tw\)|\(dialect\)|\(literary\))/i;
const BOUND = /^\(bound form\)/i; // a word-building sense: used only when the character has no other

/** A sense without its usage notes: "(third-person singular) he; him" → "he; him". A sense that is all note keeps the note's words. */
function plainSense(sense: string): string {
  const t = sense.replace(/\[[^\]]*\]/g, '').replace(/\S*\|\S*/g, '').replace(/"/g, ''); // [pin1 yin1], 繁|简 references, quotes
  const outside = t.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  if (outside) return outside;
  return t.replace(/[()]/g, '').replace(/,? as in .*$/, '').replace(/[\u3400-\u9fff]+/g, '').replace(/\s+/g, ' ').trim();
}

/** The first one or two everyday senses, without cross-references, at most `max` characters. */
export function cleanGloss(senses: string[], max = 40): string | null {
  const usable = (list: string[]) =>
    list
      .filter((s) => !SKIP.test(s)) // "(literary) …", "CL:…", "variant of …"
      .map(plainSense)
      .filter((s) => s && !/[\u3400-\u9fff]/.test(s) && !/\p{Extended_Pictographic}|[:;][)(DP]/u.test(s)); // no emoji or emoticons on a child screen
  const free = usable(senses.filter((s) => !BOUND.test(s)));
  const kept = free.length ? free : usable(senses);
  if (!kept.length) return null;
  // whole meanings while they fit ("adult; grownup"), never half of one; a single long meaning is cut at a word
  const parts = kept.slice(0, 2).flatMap((s) => s.split(/;\s*/)).filter(Boolean);
  let gloss = parts[0]!;
  for (const p of parts.slice(1)) {
    if (gloss.length + p.length + 2 > max) break;
    gloss += `; ${p}`;
  }
  if (gloss.length > max) gloss = `${gloss.slice(0, max - 1).replace(/[\s,;]+\S*$/, '')}…`;
  return gloss;
}

/** A gloss for each phrase, from the entry with its reading (else the first entry with a usable sense). */
export function buildGlossary(phrases: { text: string; pinyin: string }[], dict: Map<string, CedictEntry[]>): { glossary: Record<string, string>; missing: string[] } {
  const glossary: Record<string, string> = {};
  const missing: string[] = [];
  for (const p of phrases) {
    if (p.text in glossary) continue;
    const want = plainSyllables(p.pinyin);
    const tone = tones(p.pinyin);
    const glossOf = (entries: CedictEntry[], reading: string) =>
      [
        ...entries.filter((e) => plainSyllables(e.pinyin) === reading && tones(e.pinyin) === tone && e.pinyin === e.pinyin.toLowerCase()), // same reading and tones, not a name
        ...entries.filter((e) => plainSyllables(e.pinyin) === reading && e.pinyin === e.pinyin.toLowerCase()),
        ...entries.filter((e) => plainSyllables(e.pinyin) === reading),
        ...entries,
      ]
        .map((e) => cleanGloss(e.senses))
        .find((g) => g !== null) ?? null;
    // a 儿 form is often only "erhua variant of …": then its word without 儿 gives the gloss (男孩儿 → 男孩)
    const base = p.text.length > 2 && p.text.endsWith('儿') ? p.text.slice(0, -1) : null;
    const gloss = glossOf(dict.get(p.text) ?? [], want) ?? (base ? glossOf(dict.get(base) ?? [], want.replace(/r$/, '')) : null);
    if (gloss) glossary[p.text] = gloss;
    else missing.push(p.text);
  }
  return { glossary, missing };
}

/**
 * Every simplified headword of 2–4 Han characters, once, sorted (weekly list: a pasted word that is a real word is never flagged
 * unknown). The date comes from CC-CEDICT's `#! date=` header line.
 */
export function cedictWords(text: string): { date: string | null; words: string[] } {
  const date = /^#! date=(\d{4}-\d{2}-\d{2})/m.exec(text)?.[1] ?? null;
  const words = new Set<string>();
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const simplified = line.split(' ')[1];
    if (simplified && /^\p{Script=Han}{2,4}$/u.test(simplified)) words.add(simplified);
  }
  return { date, words: [...words].sort() };
}

const MAX_WORDS = 4;
/** A dictionary sense as a kid gloss would say it: no usage notes, no leading "to", at most four words (cut at its first comma
 *  when longer); null when it can't be said so. */
function shortSense(sense: string, ok: (gloss: string) => boolean): string | null {
  if (SKIP.test(sense) || /\b(classifier|measure word|surname)\b/i.test(sense)) return null;
  const tidy = (s: string) => s.trim().replace(/^(fig\.|lit\.)\s*/i, '').replace(/^to\s+(?=\S)/i, '').replace(/[.。]+$/, '').trim();
  // a note after the meaning stays when it fits ("bear (fruit)"); one before it ("(onom.)") never
  const noted = tidy(sense.replace(/\[[^\]]*\]/g, '').replace(/\S*\|\S*/g, '').replace(/"/g, '').replace(/^(\s*\([^)]*\))+/, '').replace(/\s+/g, ' '));
  const plain = tidy(plainSense(sense));
  const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
  for (const cand of [noted, plain, plain.split(/,\s*/)[0]!.trim()]) {
    if (/[()]/.test(cand) && !/^[^()]+\([^()]+\)$/.test(cand)) continue; // one closing note, whole
    if (cand && words(cand) <= MAX_WORDS && !/[㐀-鿿]/.test(cand) && ok(cand)) return cand;
  }
  return null;
}

/**
 * CC-CEDICT's English for its 2–4 character simplified headwords (weekly list: a word the parent left without English): the
 * first sense, within the first ";" part, that a kid gloss could say in at most four words, skipping surnames, classifier
 * notes, "variant of" and the like, and names (an entry read with a capital). `ok` is the kid
 * gloss check (glossProblems empty).
 */
export function cedictGlosses(text: string, ok: (gloss: string) => boolean = () => true): { date: string | null; glosses: Map<string, string> } {
  const date = /^#! date=(\d{4}-\d{2}-\d{2})/m.exec(text)?.[1] ?? null;
  const dict = parseCedict(text);
  const glosses = new Map<string, string>();
  for (const [word, entries] of [...dict].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (!/^\p{Script=Han}{2,4}$/u.test(word)) continue;
    const ordered = entries.filter((e) => !/[A-Z]/.test(e.pinyin)); // a name (a place, a person) is no list word
    found: for (const e of ordered) {
      for (const s of e.senses) {
        const g = shortSense(s.split(/;\s*/)[0]!, ok);
        if (g) { glosses.set(word, g); break found; }
      }
    }
  }
  return { date, glosses };
}
