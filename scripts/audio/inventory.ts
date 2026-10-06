// Everything in his range that gets a clip (spec 2026-10-06 §4), built from the app's own content so the two never drift.
// npx tsx scripts/audio/inventory.ts [voiceTag] [out.json]
import { writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { pinyin } from 'pinyin-pro';
import { clipKey } from '../../src/audio/clipKey';
import { builtinWords, schoolTerm } from '../../src/content';
import { CHENGYU, chengyuPinyin } from '../../src/content/chengyu';
import { DAPEI } from '../../src/content/dapei';
import { BLANK, fillGap, SENTENCE_BANK } from '../../src/content/sentenceBank';
import { clipId, engineText, type ClipJob, type ClipKind } from './inventory-lib';

/** Lines said as they are (Settings' voice tests, 朗读's warm-up). */
export const FIXED_LINES = ['你好！', '你好，我们一起学汉字！', '你好！我是松露。我们一起学汉字吧！'];

const isHan = (c: string) => /\p{Script=Han}/u.test(c);
const sentencePinyin = (t: string) => pinyin(t, { type: 'array', nonZh: 'removed' }).join(' ');

export function buildInventory(voice: string): ClipJob[] {
  const jobs = new Map<string, ClipJob>();
  const add = (text: string, expected: string, kind: ClipKind, reading?: string) => {
    const t = text.trim();
    if (!Array.from(t).some(isHan)) return;
    const key = clipKey(t, reading);
    if (jobs.has(key)) return;
    // words carry checked pinyin (the card's, with the content fixes): an engine is steered to it. Sentences go as written.
    const e = kind === 'char' || kind === 'word' ? engineText(t, expected) : { text: t, sure: true };
    // A bare word is said like an unfinished phrase, its tones bent (一起 came out yí, 东西's 东 falling: parent, 2026-10-06).
    // Ended with 。 it is said whole: pitch checks on 60 words, 67 → 86 of 117 tones right.
    const said = (kind === 'char' || kind === 'word') && !/[。！？]$/.test(e.text) ? `${e.text}。` : e.text;
    jobs.set(key, { key, id: clipId(key, expected, voice), text: t, engineText: said, expected, kind, sure: e.sure });
  };
  const sentence = (t: string, kind: ClipKind = 'sentence') => add(t, sentencePinyin(t), kind);

  const inRange = builtinWords(0).filter((w) => (w.level ?? 99) <= 3 || schoolTerm(w.text));
  const rangeChars = new Set(inRange.map((w) => w.text));
  const ours = (t: string) => Array.from(t).every((c) => !isHan(c) || rangeChars.has(c));

  for (const w of inRange) {
    add(w.text, w.pinyin, 'char', w.pinyin);
    for (const e of w.examples ?? []) {
      add(e.text, e.pinyin, 'word');
      add(`${e.text}的`, `${e.pinyin} de`, 'word'); // 听写's "长，长城的，长"
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
  for (const d of DAPEI) {
    if (!ours(d.verb + d.noun)) continue;
    add(d.verb, pinyin(d.verb), 'word');
    add(d.noun, pinyin(d.noun), 'word');
    add(d.verb + d.noun, pinyin(d.verb + d.noun), 'word');
  }
  for (const l of FIXED_LINES) sentence(l);
  return [...jobs.values()];
}

if (basename(process.argv[1] ?? '') === 'inventory.ts') { // run as itself, never when imported (pack-audition.ts also ends in audition.ts)
  const jobs = buildInventory(process.argv[2] ?? 'preview');
  const kinds = jobs.reduce<Record<string, number>>((n, j) => ({ ...n, [j.kind]: (n[j.kind] ?? 0) + 1 }), {});
  console.log(`inventory: ${jobs.length} clips`, kinds, `unsure ${jobs.filter((j) => !j.sure).length}`);
  if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(jobs));
}
