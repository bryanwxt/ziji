// Everything in his range that gets a clip (spec 2026-10-06 §4), built from the app's own content so the two never drift.
// npx tsx scripts/audio/inventory.ts [voiceTag] [out.json]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { clipKey } from '../../src/audio/clipKey';
import { builtinWords, schoolTerm } from '../../src/content';
import { CHENGYU, chengyuPinyin } from '../../src/content/chengyu';
import { DAPEI } from '../../src/content/dapei';
import { BLANK, fillGap, SENTENCE_BANK } from '../../src/content/sentenceBank';
import { inScopeWords, SENTENCE_TERMS, sentencesFor } from '../../src/content/understand';
import { ladderWords } from '../../src/content/ladder';
import { halfReading, readingOf } from '../../src/content/wordGate';
import { NEAR_MAX_HSK, nearWords } from '../../src/practice/pairs';
import { clipId, engineText, type ClipJob, type ClipKind } from './inventory-lib';
import SAY_AS from '../../src/audio/sayAs.json';
import { boundPair, kidGlossReading } from '../../src/content/kidGloss';

/**
 * Lone characters no voice says right alone (scripts/gen-say-as.ts `unsure`, and the 组词 `words` the iPad voice says them as
 * instead): their clip is cut out of that 组词, said by the same voice (爪 zhuǎ from 爪子; alone, every voice says zhǎo).
 */
const SAID_AS_WORD: Record<string, string[]> = (SAY_AS as { words?: Record<string, string[]> }).words ?? {};
import { parseChapter } from '../../src/story/format';

/** Lines said as they are (Settings' voice tests, 朗读's warm-up). */
export const FIXED_LINES = ['你好！', '你好，我们一起学汉字！', '你好！我是松露。我们一起学汉字吧！'];

const isHan = (c: string) => /\p{Script=Han}/u.test(c);
// the app's one pinyin source (content audit 2026-10-15): a written sentence's stored reading, a word's checked one
const sentencePinyin = (t: string) => readingOf(t);

/**
 * Words the voice gets wrong said alone even ending in 。, so they are cut from a sentence instead (scripts/audio/tts:
 * Kokoro.synth_cut). Add one whenever the parent hears a word wrong (parent, 2026-10-06: 一起's 一 rose).
 */
export const CUT_FROM_SENTENCE = new Set(['一起', '鱼']); // 鱼: parent heard it wrong on its own (2026-10-07)

/** A clip's name: its key, its reading, the voice, and exactly what the voice is given and how, so any change makes a new clip. */
export const clipIdFor = (j: Pick<ClipJob, 'key' | 'expected' | 'engineText' | 'method' | 'syllables'>, voice: string): string =>
  clipId(j.key, j.expected, `${voice}\u0000${j.method ?? 'say'}\u0000${j.engineText}${j.syllables ? `\u0000${j.syllables.join('-')}` : ''}`);

/** The 组词 an unsure character is cut from: the first of its `words` whose syllable there is the card's reading. */
export function cutFrom(ch: string, reading: string): { word: string; at: number } | null {
  for (const word of SAID_AS_WORD[ch] ?? []) {
    const at = Array.from(word).indexOf(ch);
    if (at >= 0 && readingOf(word)?.split(/\s+/)[at] === reading) return { word, at };
  }
  return null;
}

export function buildInventory(voice: string): ClipJob[] {
  const jobs = new Map<string, ClipJob>();
  const add = (text: string, expected: string, kind: ClipKind, reading?: string, { piece = false, taught = false } = {}) => {
    const t = text.trim();
    if (!Array.from(t).some(isHan)) return;
    const key = clipKey(t, reading);
    if (jobs.has(key)) return;
    // words carry checked pinyin (the card's, with the content fixes): an engine is steered to it. Sentences go as written.
    const e = kind === 'char' || kind === 'word' ? engineText(t, expected) : { text: t, sure: true };
    const cut = CUT_FROM_SENTENCE.has(t);
    // A bare word is said like an unfinished phrase, its tones bent (东西's 东 falling: parent, 2026-10-06); ended with 。 it
    // is said whole. Not a 听写 cue's middle piece (长城的): that is said mid-cue, and with 。 its 的 came out stressed.
    const said = (kind === 'char' || kind === 'word') && !cut && !piece && !/[。！？]$/.test(e.text) ? `${e.text}。` : e.text;
    const job: ClipJob = { key, id: '', text: t, engineText: said, expected, kind, sure: e.sure, ...(cut ? { method: 'cut' as const } : {}), ...(taught ? { taught } : {}) };
    jobs.set(key, { ...job, id: clipIdFor(job, voice) });
  };
  const sentence = (t: string, kind: ClipKind = 'sentence') => add(t, sentencePinyin(t), kind);

  const inRange = builtinWords(0).filter((w) => (w.level ?? 99) <= 3 || schoolTerm(w.text));
  const rangeChars = new Set(inRange.map((w) => w.text));
  const ours = (t: string) => Array.from(t).every((c) => !isHan(c) || rangeChars.has(c));

  for (const w of inRange) {
    const from = Array.from(w.text).length === 1 ? cutFrom(w.text, w.pinyin) : null;
    if (from) {
      // spot-listened (sure: false): the cut is only as good as the voice's 组词
      const job: ClipJob = { key: clipKey(w.text, w.pinyin), id: '', text: w.text, engineText: from.word, expected: w.pinyin, kind: 'char', sure: false, method: 'cut', syllables: [from.at, from.at + 1], taught: true };
      jobs.set(job.key, { ...job, id: clipIdFor(job, voice) });
    } else add(w.text, w.pinyin, 'char', w.pinyin, { taught: Array.from(w.text).length === 1 });
    for (const x of SAID_AS_WORD[w.text] ?? []) add(x, readingOf(x), 'word'); // what the iPad voice says it as, when no clip plays
    for (const e of w.examples ?? []) {
      add(e.text, e.pinyin, 'word');
      add(`${e.text}的`, `${e.pinyin} de`, 'word', undefined, { piece: true }); // 听写's "长，长城的，长"
    }
    // a bound character is said as its pair (番 → 番茄, speech.ts loneSpoken): the pair's clip, whether or not the card lists it
    const pair = boundPair(w.text);
    if (pair) add(pair, kidGlossReading(pair) ?? readingOf(pair), 'word');
  }
  for (const b of SENTENCE_BANK) {
    if (!ours(b.word)) continue;
    add(b.word, readingOf(b.word), 'word');
    for (const gap of b.gaps) {
      sentence(fillGap(gap, b.word));
      const at = gap.text.indexOf(BLANK);
      sentence(gap.text.slice(0, at), 'fragment'); // a meaning question says the sentence around its gap
      sentence(gap.text.slice(at + BLANK.length), 'fragment');
    }
  }
  for (const c of CHENGYU) {
    add(c.text, chengyuPinyin(c.text), 'word');
    for (const s of c.sentences) {
      sentence(s);
      const at = s.indexOf(c.text);
      if (at >= 0) { sentence(s.slice(0, at), 'fragment'); sentence(s.slice(at + c.text.length), 'fragment'); }
    }
  }
  // the Understand rung's sentences (plan 2b)
  for (const term of SENTENCE_TERMS) for (const w of inScopeWords(term)) for (const s of sentencesFor(w.text)) sentence(s.zh);
  for (const d of DAPEI) {
    if (!ours(d.verb + d.noun)) continue;
    add(d.verb, readingOf(d.verb), 'word');
    add(d.noun, readingOf(d.noun), 'word');
    add(d.verb + d.noun, readingOf(d.verb + d.noun), 'word');
  }
  // 连一连's left halves, said at their reading in their word when it isn't their card's (长 in 长大: zhǎng): every two-character
  // word a board can hold — the near pool, and each card's and ladder word's own (content audit 2026-10-15)
  const halves = new Set<string>(nearWords(NEAR_MAX_HSK));
  for (const w of inRange) for (const e of w.examples ?? []) if (Array.from(e.text).length === 2) halves.add(e.text);
  for (const w of ladderWords()) if (Array.from(w.text).length === 2) halves.add(w.text);
  for (const word of halves) {
    const [first] = Array.from(word) as [string];
    const r = halfReading(word, 0);
    if (r && rangeChars.has(first) && r !== inRange.find((w) => w.text === first)?.pinyin) add(first, r, 'char', r);
  }
  for (const l of FIXED_LINES) sentence(l);
  // the story's Mandarin (spec 2026-10-07 3c §2): Granny Dragon's lines, each 听一听 scene, its questions and their choices
  const STORY = 'src/content/story';
  for (const season of readdirSync(STORY).filter((d) => d.startsWith('season-'))) {
    for (const f of readdirSync(`${STORY}/${season}`).filter((x) => /^ch\d+\.md$/.test(x))) {
      const c = parseChapter(readFileSync(`${STORY}/${season}/${f}`, 'utf8'));
      for (const m of [...c.granny, ...c.listen.lines]) sentence(m.zh);
      for (const q of c.listen.questions) {
        sentence(q.zh);
        for (const choice of [q.answer, ...q.wrong]) add(choice, readingOf(choice), 'word');
      }
    }
  }
  return [...jobs.values()];
}

if (basename(process.argv[1] ?? '') === 'inventory.ts') { // run as itself, never when imported (pack-audition.ts also ends in audition.ts)
  const jobs = buildInventory(process.argv[2] ?? 'preview');
  const kinds = jobs.reduce<Record<string, number>>((n, j) => ({ ...n, [j.kind]: (n[j.kind] ?? 0) + 1 }), {});
  console.log(`inventory: ${jobs.length} clips`, kinds, `unsure ${jobs.filter((j) => !j.sure).length}`);
  if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(jobs));
}
