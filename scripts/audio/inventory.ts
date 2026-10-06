// Everything in his range that gets a clip (spec 2026-10-06 §4), built from the app's own content so the two never drift.
// npx tsx scripts/audio/inventory.ts [voiceTag] [out.json]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { pinyin } from 'pinyin-pro';
import { clipKey } from '../../src/audio/clipKey';
import { builtinWords, schoolTerm } from '../../src/content';
import { CHENGYU, chengyuPinyin } from '../../src/content/chengyu';
import { DAPEI } from '../../src/content/dapei';
import { BLANK, fillGap, SENTENCE_BANK } from '../../src/content/sentenceBank';
import { inScopeWords, SENTENCE_TERMS, sentencesFor } from '../../src/content/understand';
import { clipId, engineText, type ClipJob, type ClipKind } from './inventory-lib';
import { parseChapter } from '../../src/story/format';

/** Lines said as they are (Settings' voice tests, 朗读's warm-up). */
export const FIXED_LINES = ['你好！', '你好，我们一起学汉字！', '你好！我是松露。我们一起学汉字吧！'];

const isHan = (c: string) => /\p{Script=Han}/u.test(c);
const sentencePinyin = (t: string) => pinyin(t, { type: 'array', nonZh: 'removed' }).join(' ');

/**
 * Words the voice gets wrong said alone even ending in 。, so they are cut from a sentence instead (scripts/audio/tts:
 * Kokoro.synth_cut). Add one whenever the parent hears a word wrong (parent, 2026-10-06: 一起's 一 rose).
 */
export const CUT_FROM_SENTENCE = new Set(['一起']);

/** A clip's name: its key, its reading, the voice, and exactly what the voice is given and how, so any change makes a new clip. */
export const clipIdFor = (j: Pick<ClipJob, 'key' | 'expected' | 'engineText' | 'method'>, voice: string): string =>
  clipId(j.key, j.expected, `${voice}\u0000${j.method ?? 'say'}\u0000${j.engineText}`);

export function buildInventory(voice: string): ClipJob[] {
  const jobs = new Map<string, ClipJob>();
  const add = (text: string, expected: string, kind: ClipKind, reading?: string, { piece = false } = {}) => {
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
    const job: ClipJob = { key, id: '', text: t, engineText: said, expected, kind, sure: e.sure, ...(cut ? { method: 'cut' as const } : {}) };
    jobs.set(key, { ...job, id: clipIdFor(job, voice) });
  };
  const sentence = (t: string, kind: ClipKind = 'sentence') => add(t, sentencePinyin(t), kind);

  const inRange = builtinWords(0).filter((w) => (w.level ?? 99) <= 3 || schoolTerm(w.text));
  const rangeChars = new Set(inRange.map((w) => w.text));
  const ours = (t: string) => Array.from(t).every((c) => !isHan(c) || rangeChars.has(c));

  for (const w of inRange) {
    add(w.text, w.pinyin, 'char', w.pinyin);
    for (const e of w.examples ?? []) {
      add(e.text, e.pinyin, 'word');
      add(`${e.text}的`, `${e.pinyin} de`, 'word', undefined, { piece: true }); // 听写's "长，长城的，长"
    }
  }
  for (const b of SENTENCE_BANK) {
    if (!ours(b.word)) continue;
    add(b.word, pinyin(b.word), 'word');
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
    add(d.verb, pinyin(d.verb), 'word');
    add(d.noun, pinyin(d.noun), 'word');
    add(d.verb + d.noun, pinyin(d.verb + d.noun), 'word');
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
        for (const choice of [q.answer, ...q.wrong]) add(choice, pinyin(choice), 'word');
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
