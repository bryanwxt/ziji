# Audio pipeline (Word Thief sub-project 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every word, 组词 and sentence in his range is spoken by a natural neural voice, generated once and checked for tones and 多音字. The iPad voice remains the fallback, so nothing is ever silent.

**Architecture:**
- **Generation runs in GitHub Actions, not on the Mac.** The Mac has 6.9 GB free and 8 GB of RAM, which is too little for CosyVoice 2, and the parent is often away from it.
- **The TS inventory decides the input.** A TS inventory (built from the app's own content functions) decides what to say, and the exact text each engine is given, so that 多音字 come out as taught.
- **Python does the synthesis.** A small Python runner synthesises the clips, encodes them as AAC and checks them by ASR.
- **Clips live in a release asset, not in git.** They are content-addressed (`<id>.m4a`) and kept in one GitHub release asset (`audio-store` / `audio.tar.gz`), so git never holds binaries. The deploy workflow extracts that tarball into `dist/audio/`.
- **The app plays clips first.** It loads `audio/index.json`, plays clips through Web Audio and falls back to `speechSynthesis`.

**Order of work:**
1. A **voice audition** comes first: the same 20 hard items from CosyVoice 2, Kokoro and MeloTTS, published to a page the parent listens to on the iPad.
2. The parent picks a voice. **This is a gate.**
3. The full build follows.
- The app-side tasks (8–11) don't depend on the gate and can run while the parent listens.

**Tech Stack:**
- Node 22, TypeScript, tsx, vitest, pinyin-pro.
- Python 3.10 on `ubuntu-latest`: kokoro + misaki[zh], MeloTTS, CosyVoice 2, faster-whisper and pypinyin.
- ffmpeg (AAC), GitHub Actions and Releases, `gh` CLI.
- Web Audio API, vite-plugin-pwa (Workbox runtime caching).

**Spec:** `docs/superpowers/specs/2026-10-06-ziji-word-thief-design.md`, §4 (audio pipeline), and §2 (sub-project 1).

## Global Constraints

- The app is an iPad Safari PWA served from GitHub Pages at base path `/ziji/`. Every runtime URL is built from `import.meta.env.BASE_URL`.
- No audio or other binaries are committed to git. Clips live only in the `audio-store` release asset `audio.tar.gz`.
- The repo is public. All engines are permissively licensed: Kokoro Apache-2.0, CosyVoice Apache-2.0, MeloTTS MIT.
- Nothing is ever silent. A missing index, a missing clip, a failed fetch or decode, or an audio context that is asleep all fall back to the existing `speechSynthesis` path, saying the whole line.
- A clip file never changes once written. Its id is a hash of key + expected pinyin + voice tag, so a reading fix or a new voice makes a new id.
- **Clip format:**
  - mono AAC `.m4a`, 24 kHz, 40 kb/s
  - silence trimmed to 30 ms before and 80 ms after, plus 50 ms of padding
  - peak-normalised to −1 dBFS
- **What is in range:**
  - built-in characters with `schoolTerm(char)` or HSK level ≤ 3, plus their 组词
  - sentence-bank items made only of in-range characters
  - every 成语 in `CHENGYU`
  - 搭配 (DAPEI) pairs made only of in-range characters
  - the three fixed lines in Settings and 朗读
- Anything outside the range uses the iPad voice.
- `setSpeechRate` applies to the iPad voice only. Clip pace is set at generation by `voice.json`'s `speed.word` and `speed.sentence`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Each finished task deploys when pushed to `main` (the parent's standing rule).
- Before pushing: `npx tsc --noEmit -p .` and `npx vitest run --maxWorkers=2` both pass.

## Review Focus

1. **The first launch before any audio exists, or offline** (`index.json` 404 or a network error). Every `speak()` uses the iPad voice exactly as today, with no console errors shown to him and no delay. → Task 9 (`loadClipIndex` returns false) and Task 11 (no index means the TTS path).
2. **A clip fails to fetch or decode partway through a multi-part line** (`长，长城的，长`). The whole line is said by the iPad voice; it is never half clip and half silence. → Task 10 (decode before any start) and Task 11 (`failed` falls back to the whole line).
3. **Rapid re-taps, or leaving a screen while a clip plays.** The old clip stops at once, queued lines are dropped and Truffle's mouth stops. → Task 10 (a second play stops the first) and Task 11 (`stopSpeaking` stops clips and clears the queue).
4. **The audio context is asleep:** after backgrounding, before the first tap, or while iPadOS has "interrupted" it. Speech still happens: it resumes inside the tap, and if it can't, falls back to the iPad voice. → Task 8 (`audioContext` resumes and sets `audioSession` to playback) and Task 10 (a context that won't resume returns `failed`).
5. **Truffle's mouth during a clip.** `settleIfSilent` must not close his mouth just because `speechSynthesis` is idle while a clip is playing. → Task 11 (the `setClipActive` guard).

---

## File map

| File | Responsibility |
|---|---|
| `src/audio/clipKey.ts` (new) | How a clip is looked up. Shared by the app and the scripts |
| `src/audio/clips.ts` (new) | Loading the clip index, and planning a line into clips and pauses |
| `src/audio/clipPlayer.ts` (new) | Web Audio playback of a plan: decode cache, sequencing, stop, prefetch |
| `src/audio/context.ts` (new) | The one shared `AudioContext`, waking it, and `audioSession` |
| `src/audio/sfx.ts` (modify) | Uses `context.ts` |
| `src/audio/speaking.ts` (modify) | `setClipActive`, and the `settleIfSilent` guard |
| `src/audio/speech.ts` (modify) | Clip-first `speak`, one ordered queue across clips and voice, `stopSpeaking`, `prefetchWords` |
| `src/bootstrap.ts` (modify) | Loads the clip index without blocking |
| `src/app/SessionScreen.tsx` (modify) | Prefetches the lesson's clips |
| `vite.config.ts` (modify) | Workbox runtime caching for clips and the index |
| `scripts/audio/inventory-lib.ts` (new) | Clip ids (FNV-1a 64), `engineText` (forces 多音字 readings), types |
| `scripts/audio/inventory.ts` (new) | `buildInventory(voiceTag)` from the app's content, plus a CLI |
| `scripts/audio/audition.ts` (new) | The 20 audition items as jobs |
| `scripts/audio/pack-lib.ts` (new) | `planShards`, `packIndex` (index + report), `voiceTag` |
| `scripts/audio/plan.ts` (new) | CLI: inventory minus clips already made, split into shards |
| `scripts/audio/pack.ts` (new) | CLI: merges the previous store and new shards into `audio/` |
| `scripts/audio/pack-audition.ts` (new) | CLI: puts audition clips and their manifest into `audio/audition/` |
| `scripts/audio/voice.json` (new, after the gate) | The parent's pick: engine, voice, speeds |
| `scripts/audio/tts/engines.py` (new) | Kokoro, Melo and CosyVoice behind `synth(text, speed)` |
| `scripts/audio/tts/check.py` (new) | Toneless syllable comparison, and the ASR wrapper |
| `scripts/audio/tts/synth.py` (new) | CLI: jobs → `.m4a` + `results.json` |
| `scripts/audio/tts/test_check.py` (new) | stdlib `unittest` for `check.py`'s pure functions |
| `scripts/audio/tts/setup.sh` (new) | Installs one engine (and the checker) on a runner |
| `.github/workflows/audio-audition.yml` (new) | Audition: items → three engines → publish |
| `.github/workflows/audio-build.yml` (new) | Build: plan → 6 shards → pack → upload → redeploy |
| `.github/workflows/deploy.yml` (modify) | Extracts `audio.tar.gz` into `dist/` |
| `public/audition.html` (new) | The listening page for the parent |
| `public/audio-report.html` (new) | Clips that were flagged, unsure or failed, for spot-listening |

---

### Task 1: Clip keys, ids and engine text

**Files:**
- Create: `src/audio/clipKey.ts`, `scripts/audio/inventory-lib.ts`
- Test: `scripts/audio/inventory-lib.test.ts`

**Interfaces:**
- Produces:
  - `clipKey(text: string, reading?: string): string`
  - `fnv64(s: string): string` (16 lowercase hex characters)
  - `clipId(key: string, expected: string, voice: string): string`
  - `engineText(text: string, expected: string): { text: string; sure: boolean }`
  - `type ClipKind = 'char' | 'word' | 'sentence' | 'fragment'`
  - `interface ClipJob { key: string; id: string; text: string; engineText: string; expected: string; kind: ClipKind; sure: boolean }`

- [ ] **Step 1: Write the failing test**

```ts
// scripts/audio/inventory-lib.test.ts
import { pinyin } from 'pinyin-pro';
import { describe, expect, it } from 'vitest';
import SAY_AS from '../../src/audio/sayAs.json';
import { clipKey } from '../../src/audio/clipKey';
import { clipId, engineText, fnv64 } from './inventory-lib';

describe('clipKey', () => {
  it('a lone character goes by its taught reading; anything longer by its text', () => {
    expect(clipKey('调', 'tiáo')).toBe('调|tiáo');
    expect(clipKey(' 空调 ', 'kōng tiáo')).toBe('空调');
    expect(clipKey('门')).toBe('门');
  });
});

describe('clip ids', () => {
  it('FNV-1a 64, as 16 hex digits', () => {
    expect(fnv64('')).toBe('cbf29ce484222325');
    expect(fnv64('a')).toBe('af63dc4c8601ec8c');
  });
  it('a new reading or a new voice is a new clip', () => {
    const a = clipId('调|tiáo', 'tiáo', 'kokoro:zf_001@0.85/0.95');
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(clipId('调|tiáo', 'diào', 'kokoro:zf_001@0.85/0.95')).not.toBe(a);
    expect(clipId('调|tiáo', 'tiáo', 'melo:ZH@1/1')).not.toBe(a);
  });
});

describe('engineText: the text an engine is given so each character is read as taught', () => {
  it('a lone 多音字 is swapped for a plain character with the taught reading (调 tiáo → 条)', () => {
    expect(engineText('调', 'tiáo')).toEqual({ text: '条', sure: true });
  });
  it('words already read as taught are left alone, including 一/不 sandhi, 轻声 and 儿化', () => {
    for (const [t, p] of [['门口', 'mén kǒu'], ['一个', 'yí gè'], ['不对', 'bú duì'], ['东西', 'dōng xi'], ['哪儿', 'nǎ r'], ['你好', 'nǐ hǎo']]) {
      expect(engineText(t!, p!), t).toEqual({ text: t, sure: true });
    }
  });
  it('pinyin that does not line up with the characters is left alone and marked unsure', () => {
    expect(engineText('门口', 'mén')).toEqual({ text: '门口', sure: false });
  });
  it('every lone 多音字 the cards teach comes out read as taught, or is marked unsure for the parent to check', () => {
    const { poly } = SAY_AS as { poly: Record<string, string> };
    let sure = 0;
    const entries = Object.entries(poly);
    for (const [ch, r] of entries) {
      const out = engineText(ch, r);
      if (out.sure) { sure++; expect(pinyin(out.text), `${ch} ${r} → ${out.text}`).toBe(r); }
    }
    expect(sure / Math.max(1, entries.length)).toBeGreaterThan(0.8);
  });
});
```

- [ ] **Step 2: Run the test to check that it fails**

Run: `npx vitest run scripts/audio/inventory-lib.test.ts`
Expected: FAIL. Cannot find module `../../src/audio/clipKey`.

- [ ] **Step 3: Write the implementation**

```ts
// src/audio/clipKey.ts
/**
 * How a clip is looked up (spec 2026-10-06 §4): a lone character by the reading its card teaches (调|tiáo), anything longer
 * by its text. Shared by the app and scripts/audio, so both always agree.
 */
export function clipKey(text: string, reading?: string): string {
  const t = text.trim();
  return reading && Array.from(t).length === 1 ? `${t}|${reading}` : t;
}
```

```ts
// scripts/audio/inventory-lib.ts
// What a neural voice is asked to say, and how each clip is named (spec 2026-10-06 §4).
import { pinyin } from 'pinyin-pro';
import SAY_AS from '../../src/audio/sayAs.json';

export type ClipKind = 'char' | 'word' | 'sentence' | 'fragment';
export interface ClipJob { key: string; id: string; text: string; engineText: string; expected: string; kind: ClipKind; sure: boolean }

/** FNV-1a 64-bit of the UTF-8 bytes, as 16 hex digits. */
export function fnv64(s: string): string {
  let h = 0xcbf29ce484222325n;
  for (const b of new TextEncoder().encode(s)) h = ((h ^ BigInt(b)) * 0x100000001b3n) & 0xffffffffffffffffn;
  return h.toString(16).padStart(16, '0');
}

/** A clip's file name: a new reading or a new voice is a new file, so a file never changes once written. */
export const clipId = (key: string, expected: string, voice: string): string => fnv64(`${key}\u0000${expected}\u0000${voice}`);

const isHan = (c: string) => /\p{Script=Han}/u.test(c);
const marked = (s: string) => /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(s);
const SANDHI = new Set(['一', '不']); // engines change their tone from the next syllable: never swapped
const readingsCache = new Map<string, string[]>();
const readingsOf = (ch: string) => {
  let r = readingsCache.get(ch);
  if (!r) readingsCache.set(ch, (r = [...new Set(pinyin(ch, { multiple: true, type: 'array' }))]));
  return r;
};
/** Toned syllable → a common character with only that reading (from scripts/gen-say-as.ts's table). */
const TWINS: Record<string, string> = Object.fromEntries(
  Object.entries((SAY_AS as { plain: Record<string, string> }).plain).filter(([, c]) => !SANDHI.has(c) && readingsOf(c).length === 1),
);

/** Does the engine need help with this character? 一/不, 儿化 and 轻声 come right from the word itself. */
const needsHelp = (ch: string, want: string, got: string | undefined) => !SANDHI.has(ch) && want !== 'r' && marked(want) && got !== want;

/**
 * The text an engine is given so every character is read as `expected` says (space-separated, one syllable per character).
 * A lone 多音字 is always swapped (below). In a longer word, where a context reader (pinyin-pro, which works like the engines' own front ends) would read a character otherwise, that
 * character is swapped for a plain one with the wanted reading: the same sound, so the same audio. `sure` is false when the
 * pinyin can't be lined up or a swap didn't settle it: those clips go on the parent's spot-listen list.
 */
export function engineText(text: string, expected: string): { text: string; sure: boolean } {
  const chars = Array.from(text);
  const want = expected.trim().split(/\s+/);
  const hanAt = chars.flatMap((c, i) => (isHan(c) ? [i] : []));
  if (hanAt.length !== want.length) return { text, sure: false };
  // A lone 多音字 has no context: a voice guesses its reading (调 alone came out diào, parent 2026-10-05), and pinyin-pro's
  // guess (tiáo) is no guide to a voice's. So it is always said as a plain character with only the taught reading.
  if (chars.length === 1 && hanAt.length === 1 && !SANDHI.has(text) && readingsOf(text).length > 1) {
    const twin = TWINS[want[0]!];
    return twin ? { text: twin, sure: true } : { text, sure: false };
  }
  for (let pass = 0; pass < 3; pass++) {
    const got = pinyin(chars.join(''), { type: 'all' }).filter((p) => p.isZh).map((p) => p.pinyin);
    const wrong = hanAt.map((at, k) => [at, k] as const).filter(([at, k]) => needsHelp(chars[at]!, want[k]!, got[k]));
    if (!wrong.length) return { text: chars.join(''), sure: true };
    let changed = false;
    for (const [at, k] of wrong) {
      const twin = TWINS[want[k]!];
      if (twin && twin !== chars[at]) { chars[at] = twin; changed = true; }
    }
    if (!changed) break;
  }
  return { text: chars.join(''), sure: false };
}
```

- [ ] **Step 4: Run the test to check that it passes**

Run: `npx vitest run scripts/audio/inventory-lib.test.ts`
Expected: PASS.
- If `一个`/`不对` fail because pinyin-pro returns the citation tone, check the `needsHelp` skip for `SANDHI`. Those characters must be skipped.
- If the `> 0.8` ratio fails, print the unsure entries and check that `TWINS` has their syllables. Do not lower the bar without telling the parent which characters are unsure.

- [ ] **Step 5: Commit**

```bash
git add src/audio/clipKey.ts scripts/audio/inventory-lib.ts scripts/audio/inventory-lib.test.ts
git commit -m "feat(audio): clip keys, ids, and engine text that makes a voice read each 多音字 as taught"
```

---

### Task 2: Audition items

**Files:**
- Create: `scripts/audio/audition.ts`
- Test: `scripts/audio/audition.test.ts`

**Interfaces:**
- Consumes: `engineText`, `ClipJob` (Task 1).
- Produces:
  - `AUDITION: { id: string; label: string; text: string; expected: string; kind: ClipKind }[]`
  - `auditionJobs(): (ClipJob & { label: string })[]`
  - CLI: `npx tsx scripts/audio/audition.ts <out.json>`

- [ ] **Step 1: Write the failing test**

```ts
// scripts/audio/audition.test.ts
import { describe, expect, it } from 'vitest';
import { AUDITION, auditionJobs } from './audition';

describe('audition items', () => {
  it('twenty hard items, each with an id, a label for the parent and the reading it must have', () => {
    expect(AUDITION).toHaveLength(20);
    expect(new Set(AUDITION.map((a) => a.id)).size).toBe(20);
    for (const a of AUDITION) expect(a.label.length, a.id).toBeGreaterThan(3);
  });
  it('the engines get the 多音字 swaps (调 alone is said as 条)', () => {
    const tiao = auditionJobs().find((j) => j.text === '调')!;
    expect(tiao.engineText).toBe('条');
  });
});
```

- [ ] **Step 2: Run the test to check that it fails**

Run: `npx vitest run scripts/audio/audition.test.ts`
Expected: FAIL. Cannot find module `./audition`.

- [ ] **Step 3: Write the implementation**

```ts
// scripts/audio/audition.ts
// The voice audition (spec 2026-10-06 §4): the same 20 hard items from each engine, for the parent to listen to on the iPad.
import { writeFileSync } from 'node:fs';
import { pinyin } from 'pinyin-pro';
import { engineText, type ClipJob, type ClipKind } from './inventory-lib';

const sentence = (t: string) => pinyin(t, { type: 'array', nonZh: 'removed' }).join(' ');
const S = (id: string, label: string, text: string) => ({ id, label, text, expected: sentence(text), kind: 'sentence' as ClipKind });
const W = (id: string, label: string, text: string, expected: string) =>
  ({ id, label, text, expected, kind: (Array.from(text).length === 1 ? 'char' : 'word') as ClipKind });

export const AUDITION = [
  W('a01', 'A plain word', '门', 'mén'),
  W('a02', '多音字 on its own: tiáo, not diào', '调', 'tiáo'),
  W('a03', '多音字 in a word: kōng tiáo', '空调', 'kōng tiáo'),
  W('a04', '多音字 in a word: zhǎng dà', '长大', 'zhǎng dà'),
  W('a05', '多音字 in a word: yín háng', '银行', 'yín háng'),
  W('a06', '一 sandhi: yì qǐ', '一起', 'yì qǐ'),
  W('a07', '一 sandhi: yí gè', '一个', 'yí gè'),
  W('a08', '不 sandhi: bú duì', '不对', 'bú duì'),
  W('a09', 'Third-tone sandhi: ní hǎo', '你好', 'nǐ hǎo'),
  W('a10', 'Three third tones in a row', '展览馆', 'zhǎn lǎn guǎn'),
  W('a11', '轻声: dōng xi', '东西', 'dōng xi'),
  W('a12', '儿化: nǎr', '哪儿', 'nǎ r'),
  W('a13', '儿化 in a word: hǎo wánr', '好玩儿', 'hǎo wán r'),
  W('a14', 'A 成语', '四面八方', 'sì miàn bā fāng'),
  W('a15', '轻声 in a word: xiào hua', '笑话', 'xiào hua'),
  S('a16', 'A short sentence', '我们一起去公园玩儿吧！'),
  S('a17', 'A sentence with pauses', '妈妈说，下雨了，我们不要出去。'),
  S('a18', 'A question (rising, friendly)', '你今天在学校做了什么？'),
  S('a19', '听写 cue: cháng, as a teacher says it', '长，长城的长'),
  S('a20', 'A story paragraph', '小猫看见一条小鱼在水里游来游去。它想：“我要是能抓到它就好了！”可是小鱼太快了，小猫怎么也抓不到。'),
];

export function auditionJobs(): (ClipJob & { label: string })[] {
  return AUDITION.map((a) => {
    const e = a.kind === 'sentence' ? { text: a.text, sure: true } : engineText(a.text, a.expected);
    return { ...a, key: a.id, engineText: e.text, sure: e.sure };
  });
}

if (process.argv[1]?.endsWith('audition.ts')) {
  const out = process.argv[2] ?? 'build/audio/audition-jobs.json';
  writeFileSync(out, JSON.stringify(auditionJobs(), null, 1));
  console.log(`audition: ${AUDITION.length} items → ${out}`);
}
```

The id is `a01`…`a20`, so in the audition the file name is the item id.

- [ ] **Step 4: Run the test to check that it passes**

Run: `npx vitest run scripts/audio/audition.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/audio/audition.ts scripts/audio/audition.test.ts
git commit -m "feat(audio): the 20 hard items for the voice audition"
```

---

### Task 3: The Python synthesis runner

**Files:**
- Create: `scripts/audio/tts/engines.py`, `scripts/audio/tts/check.py`, `scripts/audio/tts/synth.py`, `scripts/audio/tts/setup.sh`
- Test: `scripts/audio/tts/test_check.py`

**Interfaces:**
- Consumes: a jobs JSON, i.e. an array of `ClipJob` (Task 1 shape: `id`, `text`, `engineText`, `expected`, `kind`).
- Produces:
  - `DIR/<id>.m4a`, plus `DIR/results.json` = `[{ id, ok, seconds?, error?, heard?, flagged? }]` (the TS type `SynthResult` in Task 6)
  - CLI: `python scripts/audio/tts/synth.py --jobs J --out DIR --engine {kokoro|melo|cosyvoice} --voice V [--speed-word X] [--speed-sentence Y] [--check]`
  - `setup.sh <engine> [--check]`
  - Environment: `COSYVOICE_ROOT` (default `$HOME/cosyvoice`)

- [ ] **Step 1: Write the failing test** (stdlib only, so it runs on the Mac)

```python
# scripts/audio/tts/test_check.py
import os, sys, unittest
sys.path.insert(0, os.path.dirname(__file__))
from check import distance, flag, han_count, toneless

class CheckTest(unittest.TestCase):
    def test_toneless(self):
        self.assertEqual(toneless('nǐ hǎo'), ['ni', 'hao'])
        self.assertEqual(toneless('lǜ sè'), ['lv', 'se'])
        self.assertEqual(toneless('nǎ r'), ['na'])  # 儿化's r joins the syllable before

    def test_distance(self):
        self.assertEqual(distance(['a', 'b'], ['a', 'b']), 0)
        self.assertEqual(distance(['a', 'b', 'c'], ['a', 'c']), 1)
        self.assertEqual(distance([], ['a']), 1)

    def test_flag(self):
        self.assertFalse(flag('wǒ men yì qǐ', ['wo', 'men', 'yi', 'qi']))
        self.assertFalse(flag('wǒ men yì qǐ qù', ['wo', 'men', 'yi', 'qi', 'qu', 'ba']))  # one extra syllable: 1/5
        self.assertTrue(flag('wǒ men yì qǐ', ['wo', 'men']))  # half missing
        self.assertFalse(flag('', []))

    def test_han_count(self):
        self.assertEqual(han_count('我们，一起！'), 4)

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run the test to check that it fails**

Run: `python3 -m unittest scripts/audio/tts/test_check.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'check'`.

- [ ] **Step 3: Write `check.py`**

```python
# scripts/audio/tts/check.py
"""Is a clip what its text says? An ASR pass compared syllable by syllable, toneless (spec 2026-10-06 §4).

ASR can't hear tones reliably, so this catches mumbled, dropped or wrong syllables; 多音字 readings are handled before
synthesis (engineText) and by the parent's spot-listen list.
"""
import re
import unicodedata

FLAG_AT = 0.34  # more than a third of the syllables wrong: the parent listens


def han_count(text):
    return sum(1 for c in text if '一' <= c <= '鿿')


def toneless(pinyin_text):
    s = unicodedata.normalize('NFD', pinyin_text.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn' or c == '̈')  # keep ü's dots, drop tone marks
    s = unicodedata.normalize('NFC', s).replace('ü', 'v')
    return [w for w in re.split(r'[^a-zv]+', s) if w and w != 'r']


def distance(a, b):
    prev = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        cur = [i]
        for j, y in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x != y)))
        prev = cur
    return prev[-1]


def flag(expected_pinyin, heard_syllables):
    want = toneless(expected_pinyin)
    if not want:
        return False
    return distance(want, heard_syllables) / len(want) > FLAG_AT


class Asr:
    """faster-whisper small, CPU int8: about real time on a runner, plenty for a check."""

    def __init__(self, size='small'):
        from faster_whisper import WhisperModel
        self.model = WhisperModel(size, device='cpu', compute_type='int8')

    def transcribe(self, wav_path):
        segments, _ = self.model.transcribe(wav_path, language='zh', beam_size=1, initial_prompt='以下是普通话的句子。')
        return ''.join(s.text for s in segments).strip()

    @staticmethod
    def syllables(text):
        from pypinyin import Style, lazy_pinyin
        return [p.replace('ü', 'v') for p in lazy_pinyin(text, style=Style.NORMAL, errors='ignore') if p]
```

- [ ] **Step 4: Run the test to check that it passes**

Run: `python3 -m unittest scripts/audio/tts/test_check.py -v`
Expected: 4 tests OK.

- [ ] **Step 5: Write `engines.py`, `synth.py` and `setup.sh`**

```python
# scripts/audio/tts/engines.py
"""Three open TTS engines behind one call: synth(text, speed) -> (float32 mono samples, sample rate)."""
import os
import sys

import numpy as np


class Kokoro:
    """Kokoro-82M. Voices: 'v1.1/zf_001' (the Chinese-tuned v1.1-zh) or 'v1.0/zf_xiaoxiao' (the original model)."""

    def __init__(self, voice):
        from kokoro import KModel, KPipeline
        version, self.voice = voice.split('/', 1)
        repo = 'hexgrad/Kokoro-82M-v1.1-zh' if version == 'v1.1' else 'hexgrad/Kokoro-82M'
        model = KModel(repo_id=repo).to('cpu').eval()
        self.pipe = KPipeline(lang_code='z', repo_id=repo, model=model)

    def synth(self, text, speed):
        parts = [np.asarray(r.audio, dtype=np.float32).reshape(-1) for r in self.pipe(text, voice=self.voice, speed=speed)]
        return np.concatenate(parts), 24000


class Melo:
    """MeloTTS Chinese (mixed Chinese-English model). Voice: 'ZH'."""

    def __init__(self, voice='ZH'):
        from melo.api import TTS
        self.tts = TTS(language='ZH', device='cpu')
        self.speaker = self.tts.hps.data.spk2id[voice]

    def synth(self, text, speed):
        audio = self.tts.tts_to_file(text, self.speaker, None, speed=speed, quiet=True)
        return np.asarray(audio, dtype=np.float32).reshape(-1), self.tts.hps.data.sampling_rate


class CosyVoice:
    """CosyVoice 2 (0.5B), zero-shot from the repo's own prompt voice. Voice: 'default'."""

    def __init__(self, voice='default'):
        root = os.environ.get('COSYVOICE_ROOT', os.path.expanduser('~/cosyvoice'))
        sys.path[:0] = [root, os.path.join(root, 'third_party', 'Matcha-TTS')]
        from cosyvoice.cli.cosyvoice import CosyVoice2
        from cosyvoice.utils.file_utils import load_wav
        self.cv = CosyVoice2(os.path.join(root, 'pretrained_models', 'CosyVoice2-0.5B'), load_jit=False, load_trt=False, fp16=False)
        self.prompt = load_wav(os.path.join(root, 'asset', 'zero_shot_prompt.wav'), 16000)
        self.prompt_text = '希望你以后能够做的比我还好呦。'

    def synth(self, text, speed):
        outs = self.cv.inference_zero_shot(text, self.prompt_text, self.prompt, stream=False, speed=speed)
        return np.concatenate([o['tts_speech'].numpy().reshape(-1) for o in outs]), self.cv.sample_rate


def make_engine(name, voice):
    return {'kokoro': Kokoro, 'melo': Melo, 'cosyvoice': CosyVoice}[name](voice)
```

```python
#!/usr/bin/env python3
# scripts/audio/tts/synth.py
"""Turn clip jobs into AAC files with one engine (spec 2026-10-06 §4).

python scripts/audio/tts/synth.py --jobs JOBS.json --out DIR --engine kokoro --voice v1.1/zf_001 \
    [--speed-word 1.0] [--speed-sentence 1.0] [--check]

Writes DIR/<id>.m4a per job and DIR/results.json. One job failing is recorded and the run goes on; an engine that can't
start fails the run.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile
import time

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(__file__))
from check import flag, han_count  # noqa: E402
from engines import make_engine  # noqa: E402


def tidy(audio, rate):
    """Trim silence (30 ms kept before, 80 ms after), normalise to -1 dBFS, pad 50 ms each side."""
    audio = np.asarray(audio, dtype=np.float32).reshape(-1)
    loud = np.flatnonzero(np.abs(audio) > 0.01)
    if loud.size:
        audio = audio[max(0, loud[0] - int(0.03 * rate)): loud[-1] + int(0.08 * rate)]
    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    if peak > 0:
        audio = audio * (0.89 / peak)
    pad = np.zeros(int(0.05 * rate), dtype=np.float32)
    return np.concatenate([pad, audio, pad])


def to_aac(wav, out):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', '24000', '-c:a', 'aac', '-b:a', '40k', out], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--jobs', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--engine', required=True, choices=['kokoro', 'melo', 'cosyvoice'])
    ap.add_argument('--voice', required=True)
    ap.add_argument('--speed-word', type=float, default=1.0)
    ap.add_argument('--speed-sentence', type=float, default=1.0)
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()

    with open(args.jobs, encoding='utf-8') as f:
        jobs = json.load(f)
    os.makedirs(args.out, exist_ok=True)
    engine = make_engine(args.engine, args.voice)
    asr = None
    if args.check:
        from check import Asr
        asr = Asr()

    results = []
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'clip.wav')
        for i, job in enumerate(jobs):
            speed = args.speed_word if job['kind'] in ('char', 'word') else args.speed_sentence
            t0 = time.time()
            try:
                audio, rate = engine.synth(job['engineText'], speed)
                sf.write(wav, tidy(audio, rate), rate)
                to_aac(wav, os.path.join(args.out, f"{job['id']}.m4a"))
                r = {'id': job['id'], 'ok': True, 'seconds': round(time.time() - t0, 2)}
                if asr and han_count(job['text']) >= 3:
                    heard = asr.transcribe(wav)
                    r['heard'] = heard
                    r['flagged'] = flag(job['expected'], asr.syllables(heard))
            except Exception as e:  # one bad line never stops the run
                r = {'id': job['id'], 'ok': False, 'error': f'{type(e).__name__}: {e}'[:300]}
            results.append(r)
            if i % 100 == 0:
                print(f'{i}/{len(jobs)}', flush=True)

    with open(os.path.join(args.out, 'results.json'), 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False)
    print(f"done: {sum(r['ok'] for r in results)}/{len(results)} ok", flush=True)


if __name__ == '__main__':
    main()
```

```bash
#!/usr/bin/env bash
# scripts/audio/tts/setup.sh — install one TTS engine (and, with --check, the ASR checker) on an Ubuntu runner, Python 3.10.
set -euo pipefail
engine="$1"; check="${2:-}"
sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg espeak-ng
python -m pip install -q --upgrade pip
python -m pip install -q numpy soundfile
case "$engine" in
  kokoro) python -m pip install -q "kokoro>=0.9.4" "misaki[zh]>=0.9.4" ;;
  melo)
    python -m pip install -q git+https://github.com/myshell-ai/MeloTTS.git
    python -m unidic download ;;
  cosyvoice)
    root="${COSYVOICE_ROOT:-$HOME/cosyvoice}"
    git clone -q --recursive --depth 1 https://github.com/FunAudioLLM/CosyVoice.git "$root"
    python -m pip install -q -r "$root/requirements.txt"
    python -c "from modelscope import snapshot_download; snapshot_download('iic/CosyVoice2-0.5B', local_dir='$root/pretrained_models/CosyVoice2-0.5B')" ;;
  *) echo "unknown engine: $engine" >&2; exit 2 ;;
esac
if [ "$check" = "--check" ]; then python -m pip install -q faster-whisper pypinyin; fi
```

Run: `chmod +x scripts/audio/tts/setup.sh scripts/audio/tts/synth.py && python3 -m py_compile scripts/audio/tts/*.py`
Expected: no output. The engines themselves are first exercised in CI (Task 5).

- [ ] **Step 6: Commit**

```bash
git add scripts/audio/tts
git commit -m "feat(audio): Python runner — Kokoro, Melo and CosyVoice behind one call, AAC output, ASR check"
```

---

### Task 4: Store audio in a release; deploy extracts it

**Files:**
- Modify: `.github/workflows/deploy.yml` (after `npm run build`)
- Create: `scripts/audio/pack-audition.ts`
- Test: `scripts/audio/pack-audition.test.ts`

**Interfaces:**
- Consumes: the audition shard folders from Task 5's jobs. Each is `art/audition-<engine>/<engine>-<voice>/` with `a01.m4a`… and `results.json`.
- Produces:
  - `auditionManifest(items, voices): AuditionManifest`
  - CLI `npx tsx scripts/audio/pack-audition.ts <artifactsDir> <prevAudioDir|-> <outDir>`
  - It writes `<outDir>/audio/audition/manifest.json` and `<outDir>/audio/audition/<voiceDir>/<id>.m4a`, and copies the rest of the previous `audio/` store unchanged.
  - The release is tag `audio-store`, asset `audio.tar.gz`, top folder `audio/`.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/audio/pack-audition.test.ts
import { describe, expect, it } from 'vitest';
import { auditionManifest } from './pack-audition';

describe('audition manifest', () => {
  it('lists every item and every voice, with what failed', () => {
    const m = auditionManifest(
      [{ id: 'a01', label: 'A plain word', text: '门', expected: 'mén' }],
      [
        { dir: 'kokoro-v1.1-zf_001', results: [{ id: 'a01', ok: true }] },
        { dir: 'melo-ZH', results: [{ id: 'a01', ok: false, error: 'boom' }] },
      ],
    );
    expect(m.items).toHaveLength(1);
    expect(m.voices).toEqual([
      { dir: 'kokoro-v1.1-zf_001', name: 'kokoro v1.1/zf_001', ok: ['a01'], failed: {} },
      { dir: 'melo-ZH', name: 'melo ZH', ok: [], failed: { a01: 'boom' } },
    ]);
  });
});
```

- [ ] **Step 2: Run the test to check that it fails**

Run: `npx vitest run scripts/audio/pack-audition.test.ts`
Expected: FAIL. Cannot find module.

- [ ] **Step 3: Write the implementation**

```ts
// scripts/audio/pack-audition.ts
// Puts the audition's clips into the audio store under audio/audition/, with a manifest for public/audition.html.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AUDITION } from './audition';

interface Result { id: string; ok: boolean; error?: string }
export interface AuditionManifest {
  items: { id: string; label: string; text: string; expected: string }[];
  voices: { dir: string; name: string; ok: string[]; failed: Record<string, string> }[];
}

/** 'kokoro-v1.1-zf_001' → 'kokoro v1.1/zf_001' (the folder name is the engine, then the voice with / as -). */
const voiceName = (dir: string) => { const [engine, ...rest] = dir.split('-'); return `${engine} ${rest.join('/')}`; };

export function auditionManifest(items: AuditionManifest['items'], voices: { dir: string; results: Result[] }[]): AuditionManifest {
  return {
    items,
    voices: voices.map(({ dir, results }) => ({
      dir, name: voiceName(dir),
      ok: results.filter((r) => r.ok).map((r) => r.id),
      failed: Object.fromEntries(results.filter((r) => !r.ok).map((r) => [r.id, r.error ?? 'failed'])),
    })),
  };
}

if (process.argv[1]?.endsWith('pack-audition.ts')) {
  const [artifacts, prev, out] = process.argv.slice(2) as [string, string, string];
  const store = join(out, 'audio');
  mkdirSync(store, { recursive: true });
  if (prev !== '-' && existsSync(prev)) cpSync(prev, store, { recursive: true }); // clips and index stay as they were
  const voices: { dir: string; results: Result[] }[] = [];
  for (const art of existsSync(artifacts) ? readdirSync(artifacts) : []) {
    for (const dir of readdirSync(join(artifacts, art))) {
      const results = join(artifacts, art, dir, 'results.json');
      if (!existsSync(results)) continue;
      cpSync(join(artifacts, art, dir), join(store, 'audition', dir), { recursive: true });
      voices.push({ dir, results: JSON.parse(readFileSync(results, 'utf8')) as Result[] });
    }
  }
  const manifest = auditionManifest(AUDITION.map(({ id, label, text, expected }) => ({ id, label, text, expected })), voices);
  mkdirSync(join(store, 'audition'), { recursive: true }); // even when no voice succeeded: the page then says so
  writeFileSync(join(store, 'audition', 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log(`audition: ${voices.length} voices → ${store}/audition`);
}
```

- [ ] **Step 4: Run the test to check that it passes**

Run: `npx vitest run scripts/audio/pack-audition.test.ts`
Expected: PASS.

- [ ] **Step 5: Make deploy extract the store**

Change the `build` job in `.github/workflows/deploy.yml` as follows. Add `contents: read` (already present). Then, after `- run: npm run build` and its `env`, insert:

```yaml
      - name: Add the audio clips (the iPad voice speaks until there are any)
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          if gh release download audio-store -p audio.tar.gz -D "$RUNNER_TEMP/audio" 2>/dev/null; then
            tar -xzf "$RUNNER_TEMP/audio/audio.tar.gz" -C dist
            echo "audio: $(ls dist/audio/clips 2>/dev/null | wc -l) clips"
          else
            echo "audio: no store yet"
          fi
```

- [ ] **Step 6: Commit and push (a no-op deploy: no store exists yet)**

```bash
git add scripts/audio/pack-audition.ts scripts/audio/pack-audition.test.ts .github/workflows/deploy.yml
git commit -m "feat(audio): the audio store lives in a release asset; deploy extracts it into the site"
git push origin HEAD:main
```

Check: `gh run watch` on the Deploy run. The log shows `audio: no store yet`, and the deploy succeeds.

---

### Task 5: Audition workflow and listening page, then the parent picks (GATE)

**Files:**
- Create: `.github/workflows/audio-audition.yml`, `public/audition.html`

**Interfaces:**
- Consumes:
  - `scripts/audio/audition.ts` CLI (Task 2)
  - `setup.sh` / `synth.py` (Task 3)
  - `pack-audition.ts` (Task 4)
- Produces:
  - `https://bryanwxt.github.io/ziji/audition.html`
  - after the gate: `scripts/audio/voice.json` = `{ "engine": string, "voice": string, "speed": { "word": number, "sentence": number } }`

- [ ] **Step 1: Write the workflow**

```yaml
# .github/workflows/audio-audition.yml
name: Audio audition
on: workflow_dispatch

permissions:
  contents: write
  actions: write

jobs:
  items:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: mkdir -p build/audio && npx tsx scripts/audio/audition.ts build/audio/audition-jobs.json
      - uses: actions/upload-artifact@v4
        with: { name: audition-jobs, path: build/audio/audition-jobs.json }

  synth:
    needs: items
    runs-on: ubuntu-latest
    timeout-minutes: 120
    continue-on-error: true
    strategy:
      fail-fast: false
      matrix:
        include:
          - engine: kokoro
            voices: "v1.1/zf_001 v1.1/zf_002 v1.1/zm_010 v1.0/zf_xiaoxiao v1.0/zf_xiaobei v1.0/zm_yunxi"
          - engine: melo
            voices: "ZH"
          - engine: cosyvoice
            voices: "default"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.10' }
      - uses: actions/download-artifact@v4
        with: { name: audition-jobs, path: build/audio }
      - run: bash scripts/audio/tts/setup.sh ${{ matrix.engine }}
      - name: Say the 20 items in each voice
        run: |
          for v in ${{ matrix.voices }}; do
            dir="out/${{ matrix.engine }}-${v//\//-}"
            python scripts/audio/tts/synth.py --jobs build/audio/audition-jobs.json --out "$dir" \
              --engine ${{ matrix.engine }} --voice "$v" || echo "::warning::${{ matrix.engine }} $v failed to start"
          done
      - uses: actions/upload-artifact@v4
        with: { name: 'audition-${{ matrix.engine }}', path: out, if-no-files-found: ignore }

  publish:
    needs: synth
    if: always()
    runs-on: ubuntu-latest
    env:
      GH_TOKEN: ${{ github.token }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - uses: actions/download-artifact@v4
        with: { pattern: 'audition-*', path: art }
      - name: Previous store
        run: |
          mkdir -p prev
          if gh release download audio-store -p audio.tar.gz -D "$RUNNER_TEMP/a"; then tar -xzf "$RUNNER_TEMP/a/audio.tar.gz" -C prev; fi
          mkdir -p prev/audio
      - run: rm -rf art/audition-jobs && npx tsx scripts/audio/pack-audition.ts art prev/audio out
      - name: Upload the store and redeploy
        run: |
          tar -czf audio.tar.gz -C out audio
          gh release view audio-store >/dev/null 2>&1 || gh release create audio-store --title "Audio clips" --notes "ZiJi's generated audio (scripts/audio). Not a code release." --target main
          gh release upload audio-store audio.tar.gz --clobber
          gh workflow run deploy.yml --ref main
```

- [ ] **Step 2: Write the listening page**

```html
<!-- public/audition.html: the voice audition (spec 2026-10-06 §4). Listen on the iPad, pick one voice. -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ZiJi voice audition</title>
<style>
  :root { --bg: #fbf6ea; --ink: #2b2620; --line: #e2d8c3; --accent: #c0612b; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.4 -apple-system, system-ui, sans-serif; }
  main { max-width: 1100px; margin: 0 auto; padding: 16px; }
  .wrap { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border-bottom: 1px solid var(--line); padding: 8px; text-align: left; vertical-align: middle; }
  th { position: sticky; top: 0; background: var(--bg); font-size: 13px; }
  .zh { font-size: 22px; }
  .py { color: #7a6f5f; font-size: 13px; }
  button { min-width: 46px; min-height: 46px; border-radius: 12px; border: 1px solid var(--line); background: #fff; font-size: 20px; }
  button.on { background: var(--accent); color: #fff; }
  .fail { color: #a33; font-size: 12px; }
</style>
</head>
<body>
<main>
  <h1>Which voice is clearest for him?</h1>
  <p>Tap ▶ to listen. Rows are the hard cases: 多音字, tone changes, 儿化, a question, a story. Tell Claude the column you like best, and whether its pace should be slower or faster.</p>
  <div class="wrap"><table id="t"></table></div>
</main>
<script>
  const audio = new Audio();
  fetch('audio/audition/manifest.json', { cache: 'no-store' }).then((r) => r.json()).then(({ items, voices }) => {
    const t = document.getElementById('t');
    t.innerHTML = '<tr><th>Item</th>' + voices.map((v) => `<th>${v.name}</th>`).join('') + '</tr>' + items.map((it) =>
      `<tr><td><div class="zh">${it.text}</div><div class="py">${it.expected} · ${it.label}</div></td>` +
      voices.map((v) => v.ok.includes(it.id)
        ? `<td><button data-src="audio/audition/${v.dir}/${it.id}.m4a" aria-label="${v.name} ${it.text}">▶</button></td>`
        : `<td class="fail">${v.failed[it.id] ? 'failed' : '—'}</td>`).join('') + '</tr>').join('');
    t.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      document.querySelectorAll('button.on').forEach((x) => x.classList.remove('on'));
      b.classList.add('on'); audio.src = b.dataset.src; audio.play();
    });
    audio.onended = () => document.querySelectorAll('button.on').forEach((x) => x.classList.remove('on'));
  }).catch(() => { document.getElementById('t').innerHTML = '<tr><td>No audition yet: the workflow is still running.</td></tr>'; });
</script>
</body>
</html>
```

- [ ] **Step 3: Commit, push and run the audition**

```bash
git add .github/workflows/audio-audition.yml public/audition.html
git commit -m "feat(audio): the voice audition — 20 hard items from Kokoro, Melo and CosyVoice 2 on one listening page"
git push origin HEAD:main
gh workflow run audio-audition.yml --ref main
gh run watch "$(gh run list --workflow=audio-audition.yml -L1 --json databaseId -q '.[0].databaseId')"
```

Expected:
- The synth jobs finish. Any one may show a warning: `continue-on-error` keeps the others.
- Publish uploads `audio.tar.gz` and dispatches Deploy.
- After Deploy, `curl -s https://bryanwxt.github.io/ziji/audio/audition/manifest.json | head -c 300` shows items and voices.
- **If an engine failed to install,** read its log and fix `setup.sh` once. Two failed fixes for the same engine means it is dropped from the audition, and the parent is told why.

- [ ] **Step 4: GATE: the parent listens and picks**

Send the parent `https://bryanwxt.github.io/ziji/audition.html`. Ask them to listen on the iPad and name the column, plus any pace change. **Stop here until they answer.** Then write their pick:

```json
{ "engine": "kokoro", "voice": "v1.1/zf_001", "speed": { "word": 0.85, "sentence": 0.95 } }
```

Save it to `scripts/audio/voice.json`, using their engine and voice. The default speeds are `word` 0.85 (one or two characters said slower, as `SHORT_WORD_PACE` does today) and `sentence` 0.95.

```bash
git add scripts/audio/voice.json
git commit -m "chore(audio): the parent's voice pick"
```

Don't push yet. The push in Task 7 starts the first build.

---

### Task 6: The inventory, shard planning and packing

**Files:**
- Create: `scripts/audio/inventory.ts`, `scripts/audio/pack-lib.ts`, `scripts/audio/plan.ts`, `scripts/audio/pack.ts`
- Test: `scripts/audio/inventory.test.ts`, `scripts/audio/pack-lib.test.ts`

**Interfaces:**
- Consumes: `clipKey` and `ClipJob`, `clipId`, `engineText` (Task 1).
- Produces:
  - `FIXED_LINES: string[]`
  - `buildInventory(voice: string): ClipJob[]`
  - `voiceTag(v: VoiceConfig): string`
  - `planShards(jobs: ClipJob[], present: Set<string>, n: number): ClipJob[][]`
  - `interface SynthResult { id: string; ok: boolean; seconds?: number; error?: string; heard?: string; flagged?: boolean }`
  - `interface ClipIndex { v: 1; voice: string; clips: Record<string, string> }`
  - `interface Report { voice: string; total: number; present: number; missing: { key: string; text: string }[]; failed: { key: string; text: string; error: string }[]; flagged: { id: string; key: string; text: string; expected: string; heard: string }[]; unsure: { id: string; key: string; text: string; expected: string; engineText: string }[] }`
  - `packIndex(voice: string, jobs: ClipJob[], present: Set<string>, results: SynthResult[], prev?: Report): { index: ClipIndex; report: Report }`
  - CLIs: `plan.ts --prev <dir> --out <dir> --shards <n>` and `pack.ts --prev <dir> --clips <dir> --plan <dir> --out <dir>`

- [ ] **Step 1: Write the failing tests**

```ts
// scripts/audio/inventory.test.ts
import { describe, expect, it } from 'vitest';
import { clipKey } from '../../src/audio/clipKey';
import { builtinWords, schoolTerm } from '../../src/content';
import { buildInventory, FIXED_LINES } from './inventory';

const jobs = buildInventory('test:voice@1/1');
const keys = new Set(jobs.map((j) => j.key));

describe('the clip inventory', () => {
  it('every in-range character, by its taught reading, and its 组词', () => {
    const inRange = builtinWords(0).filter((w) => w.level <= 3 || schoolTerm(w.text));
    for (const w of inRange) {
      expect(keys.has(clipKey(w.text, w.pinyin)), w.text).toBe(true);
      for (const e of w.examples ?? []) expect(keys.has(e.text), e.text).toBe(true);
    }
  });
  it('the pieces lines are built from: 听写 cues (长城的) and the fixed lines', () => {
    const w = builtinWords(0).find((x) => (x.examples ?? []).length > 0 && (x.level <= 3 || schoolTerm(x.text)))!;
    expect(keys.has(`${w.examples![0]!.text}的`)).toBe(true);
    for (const l of FIXED_LINES) expect(keys.has(l), l).toBe(true);
  });
  it('one job per key, unique ids, a sane size', () => {
    expect(keys.size).toBe(jobs.length);
    expect(new Set(jobs.map((j) => j.id)).size).toBe(jobs.length);
    expect(jobs.length).toBeGreaterThan(5000);
    expect(jobs.length).toBeLessThan(25000);
  });
  it('another voice renames every clip', () => {
    const other = new Map(buildInventory('other@1/1').map((j) => [j.key, j.id]));
    expect(jobs.every((j) => other.get(j.key) !== j.id)).toBe(true);
  });
});
```

```ts
// scripts/audio/pack-lib.test.ts
import { describe, expect, it } from 'vitest';
import type { ClipJob } from './inventory-lib';
import { packIndex, planShards, voiceTag } from './pack-lib';

const job = (key: string, id: string, kind: ClipJob['kind'] = 'word', sure = true): ClipJob =>
  ({ key, id, text: key.split('|')[0]!, engineText: key.split('|')[0]!, expected: 'x', kind, sure });

describe('voiceTag', () => {
  it('names the engine, voice and both speeds', () => {
    expect(voiceTag({ engine: 'kokoro', voice: 'v1.1/zf_001', speed: { word: 0.85, sentence: 0.95 } })).toBe('kokoro:v1.1/zf_001@0.85/0.95');
  });
});

describe('planShards', () => {
  it('only clips not made yet, spread evenly', () => {
    const jobs = ['a', 'b', 'c', 'd', 'e'].map((k) => job(k, k));
    const shards = planShards(jobs, new Set(['b']), 2);
    expect(shards.map((s) => s.map((j) => j.id))).toEqual([['a', 'd'], ['c', 'e']]);
  });
});

describe('packIndex', () => {
  const jobs = [job('门|mén', 'i1', 'char'), job('门口', 'i2'), job('开门', 'i3'), job('关门', 'i4', 'word', false)];
  it('indexes the clips that exist; a lone character answers to its plain text too', () => {
    const { index } = packIndex('v', jobs, new Set(['i1', 'i2', 'i4']), []);
    expect(index).toEqual({ v: 1, voice: 'v', clips: { '门|mén': 'i1', 门: 'i1', 门口: 'i2', 关门: 'i4' } });
  });
  it('reports what is missing, failed, flagged, and unsure', () => {
    const { report } = packIndex('v', jobs, new Set(['i1', 'i2', 'i4']), [
      { id: 'i3', ok: false, error: 'boom' },
      { id: 'i2', ok: true, heard: '门', flagged: true },
    ]);
    expect(report.total).toBe(4);
    expect(report.present).toBe(3);
    expect(report.missing).toEqual([{ key: '开门', text: '开门' }]);
    expect(report.failed).toEqual([{ key: '开门', text: '开门', error: 'boom' }]);
    expect(report.flagged).toEqual([{ id: 'i2', key: '门口', text: '门口', expected: 'x', heard: '门' }]);
    expect(report.unsure.map((u) => u.key)).toEqual(['关门']);
  });
  it('keeps earlier flags for clips still in use, drops them for clips made again', () => {
    const prev = packIndex('v', jobs, new Set(['i1', 'i2']), [{ id: 'i2', ok: true, heard: '门', flagged: true }]).report;
    expect(packIndex('v', jobs, new Set(['i1', 'i2']), [], prev).report.flagged).toHaveLength(1);
    expect(packIndex('v', jobs, new Set(['i1', 'i2']), [{ id: 'i2', ok: true, heard: '门口', flagged: false }], prev).report.flagged).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the tests to check that they fail**

Run: `npx vitest run scripts/audio/inventory.test.ts scripts/audio/pack-lib.test.ts`
Expected: FAIL. Cannot find the modules.

- [ ] **Step 3: Write `inventory.ts`**

```ts
// scripts/audio/inventory.ts
// Everything in his range that gets a clip (spec 2026-10-06 §4), built from the app's own content so the two never drift.
import { writeFileSync } from 'node:fs';
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
    jobs.set(key, { key, id: clipId(key, expected, voice), text: t, engineText: e.text, expected, kind, sure: e.sure });
  };
  const sentence = (t: string, kind: ClipKind = 'sentence') => add(t, sentencePinyin(t), kind);

  const inRange = builtinWords(0).filter((w) => w.level <= 3 || schoolTerm(w.text));
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

if (process.argv[1]?.endsWith('inventory.ts')) {
  const jobs = buildInventory(process.argv[2] ?? 'preview');
  const kinds = jobs.reduce<Record<string, number>>((n, j) => ({ ...n, [j.kind]: (n[j.kind] ?? 0) + 1 }), {});
  console.log(`inventory: ${jobs.length} clips`, kinds, `unsure ${jobs.filter((j) => !j.sure).length}`);
  if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(jobs));
}
```

- [ ] **Step 4: Write `pack-lib.ts`**

```ts
// scripts/audio/pack-lib.ts
// Turning made clips into the index the app reads and the report the parent spot-listens from (spec 2026-10-06 §4).
import type { ClipJob } from './inventory-lib';

export interface VoiceConfig { engine: string; voice: string; speed: { word: number; sentence: number } }
export interface SynthResult { id: string; ok: boolean; seconds?: number; error?: string; heard?: string; flagged?: boolean }
export interface ClipIndex { v: 1; voice: string; clips: Record<string, string> }
export interface Report {
  voice: string; total: number; present: number;
  missing: { key: string; text: string }[];
  failed: { key: string; text: string; error: string }[];
  flagged: { id: string; key: string; text: string; expected: string; heard: string }[];
  unsure: { id: string; key: string; text: string; expected: string; engineText: string }[];
}

export const voiceTag = (v: VoiceConfig): string => `${v.engine}:${v.voice}@${v.speed.word}/${v.speed.sentence}`;

/** The clips still to make, dealt round-robin into n shards. */
export function planShards(jobs: ClipJob[], present: Set<string>, n: number): ClipJob[][] {
  const shards: ClipJob[][] = Array.from({ length: n }, () => []);
  jobs.filter((j) => !present.has(j.id)).forEach((j, k) => shards[k % n]!.push(j));
  return shards;
}

export function packIndex(voice: string, jobs: ClipJob[], present: Set<string>, results: SynthResult[], prev?: Report): { index: ClipIndex; report: Report } {
  const clips: Record<string, string> = {};
  for (const j of jobs) {
    if (!present.has(j.id)) continue;
    clips[j.key] = j.id;
    if (j.kind === 'char') clips[j.text] ??= j.id; // a lone character said without its reading (a 听写 cue) is the taught one
  }
  const byId = new Map(results.map((r) => [r.id, r]));
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const remade = new Set(results.map((r) => r.id));
  const flagged = [
    ...(prev?.flagged ?? []).filter((f) => present.has(f.id) && jobById.has(f.id) && !remade.has(f.id)),
    ...results.filter((r) => r.ok && r.flagged && present.has(r.id) && jobById.has(r.id))
      .map((r) => { const j = jobById.get(r.id)!; return { id: r.id, key: j.key, text: j.text, expected: j.expected, heard: r.heard ?? '' }; }),
  ];
  return {
    index: { v: 1, voice, clips },
    report: {
      voice, total: jobs.length, present: jobs.filter((j) => present.has(j.id)).length,
      missing: jobs.filter((j) => !present.has(j.id)).map((j) => ({ key: j.key, text: j.text })),
      failed: jobs.flatMap((j) => { const r = byId.get(j.id); return r && !r.ok ? [{ key: j.key, text: j.text, error: r.error ?? 'failed' }] : []; }),
      flagged,
      unsure: jobs.filter((j) => !j.sure && present.has(j.id)).map((j) => ({ id: j.id, key: j.key, text: j.text, expected: j.expected, engineText: j.engineText })),
    },
  };
}
```

- [ ] **Step 5: Run the tests to check that they pass**

Run: `npx vitest run scripts/audio/inventory.test.ts scripts/audio/pack-lib.test.ts`
Expected: PASS.
- Then run `npx tsx scripts/audio/inventory.ts preview` and note the count, kinds and unsure numbers for the parent.
- If `jobs.length > 25000`, report it rather than raising the bound.

- [ ] **Step 6: Write the two CLIs**

```ts
// scripts/audio/plan.ts
// npx tsx scripts/audio/plan.ts --prev <old audio/ dir> --out <dir> --shards 6
// Writes <out>/inventory.json and <out>/shard-<i>.json (clips not made yet); prints todo=<n> (and to $GITHUB_OUTPUT).
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { buildInventory } from './inventory';
import { planShards, voiceTag, type VoiceConfig } from './pack-lib';

const { values } = parseArgs({ options: { prev: { type: 'string' }, out: { type: 'string' }, shards: { type: 'string', default: '6' } } });
const voice = voiceTag(JSON.parse(readFileSync(new URL('./voice.json', import.meta.url), 'utf8')) as VoiceConfig);
const jobs = buildInventory(voice);
const clipsDir = join(values.prev!, 'clips');
const present = new Set(existsSync(clipsDir) ? readdirSync(clipsDir).map((f) => f.replace(/\.m4a$/, '')) : []);
const shards = planShards(jobs, present, Number(values.shards));
mkdirSync(values.out!, { recursive: true });
writeFileSync(join(values.out!, 'inventory.json'), JSON.stringify(jobs));
shards.forEach((s, i) => writeFileSync(join(values.out!, `shard-${i}.json`), JSON.stringify(s)));
const todo = shards.reduce((n, s) => n + s.length, 0);
console.log(`voice ${voice}: ${jobs.length} clips, ${present.size} made before, todo=${todo}`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `todo=${todo}\n`);
```

```ts
// scripts/audio/pack.ts
// npx tsx scripts/audio/pack.ts --prev <old audio/> --clips <dir of shard folders> --plan <plan dir> --out <dir>
// Writes <out>/audio/{index.json, report.json, clips/*.m4a, audition/…}: clips no longer in the inventory are dropped.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import type { ClipJob } from './inventory-lib';
import { packIndex, voiceTag, type Report, type SynthResult, type VoiceConfig } from './pack-lib';

const { values } = parseArgs({ options: { prev: { type: 'string' }, clips: { type: 'string' }, plan: { type: 'string' }, out: { type: 'string' } } });
const voice = voiceTag(JSON.parse(readFileSync(new URL('./voice.json', import.meta.url), 'utf8')) as VoiceConfig);
const jobs = JSON.parse(readFileSync(join(values.plan!, 'inventory.json'), 'utf8')) as ClipJob[];
const wanted = new Set(jobs.map((j) => j.id));
const store = join(values.out!, 'audio');
mkdirSync(join(store, 'clips'), { recursive: true });

const present = new Set<string>();
const keep = (dir: string) => {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    const id = f.replace(/\.m4a$/, '');
    if (!f.endsWith('.m4a') || !wanted.has(id)) continue;
    cpSync(join(dir, f), join(store, 'clips', f));
    present.add(id);
  }
};
keep(join(values.prev!, 'clips'));
const results: SynthResult[] = [];
for (const shard of existsSync(values.clips!) ? readdirSync(values.clips!) : []) {
  for (const sub of readdirSync(join(values.clips!, shard))) { // artifact folder → the synth's out folder
    const dir = join(values.clips!, shard, sub);
    keep(dir);
    if (existsSync(join(dir, 'results.json'))) results.push(...(JSON.parse(readFileSync(join(dir, 'results.json'), 'utf8')) as SynthResult[]));
  }
}
if (existsSync(join(values.prev!, 'audition'))) cpSync(join(values.prev!, 'audition'), join(store, 'audition'), { recursive: true });
const prevReport = existsSync(join(values.prev!, 'report.json')) ? (JSON.parse(readFileSync(join(values.prev!, 'report.json'), 'utf8')) as Report) : undefined;
const prevVoice = existsSync(join(values.prev!, 'index.json')) ? (JSON.parse(readFileSync(join(values.prev!, 'index.json'), 'utf8')) as { voice: string }).voice : null;
const { index, report } = packIndex(voice, jobs, present, results, prevVoice === voice ? prevReport : undefined);
writeFileSync(join(store, 'index.json'), JSON.stringify(index));
writeFileSync(join(store, 'report.json'), JSON.stringify(report));
console.log(`packed ${report.present}/${report.total}: failed ${report.failed.length}, flagged ${report.flagged.length}, unsure ${report.unsure.length}`);
```

Run: `npx tsc --noEmit -p .`
Expected: no errors. If `scripts/` is outside the tsconfig's `include`, run `npx tsc --noEmit --strict --module nodenext --moduleResolution nodenext --resolveJsonModule --target es2022 scripts/audio/*.ts` instead.

- [ ] **Step 7: Commit**

```bash
git add scripts/audio/inventory.ts scripts/audio/inventory.test.ts scripts/audio/pack-lib.ts scripts/audio/pack-lib.test.ts scripts/audio/plan.ts scripts/audio/pack.ts
git commit -m "feat(audio): the clip inventory from the app's content, shard planning, and packing into an index and a report"
```

---

### Task 7: Build workflow, report page, first full build

**Files:**
- Create: `.github/workflows/audio-build.yml`, `public/audio-report.html`

**Interfaces:**
- Consumes: `plan.ts`, `pack.ts` (Task 6), `setup.sh`/`synth.py` (Task 3), `voice.json` (Task 5 gate).
- Produces: a store with `audio/index.json` (`ClipIndex`), `audio/report.json` (`Report`) and `audio/clips/<id>.m4a`, and the page `https://bryanwxt.github.io/ziji/audio-report.html`.

- [ ] **Step 1: Write the workflow**

```yaml
# .github/workflows/audio-build.yml
name: Audio build
on:
  workflow_dispatch: {}
  push:
    branches: [main]
    paths: ['src/content/**', 'src/audio/sayAs.json', 'scripts/audio/**']

permissions:
  contents: write
  actions: write

concurrency:
  group: audio-build
  cancel-in-progress: false

jobs:
  plan:
    runs-on: ubuntu-latest
    outputs:
      todo: ${{ steps.plan.outputs.todo }}
      ready: ${{ steps.voice.outputs.ready }}
    env:
      GH_TOKEN: ${{ github.token }}
    steps:
      - uses: actions/checkout@v4
      - id: voice
        run: if [ -f scripts/audio/voice.json ]; then echo "ready=true" >> "$GITHUB_OUTPUT"; else echo "ready=false" >> "$GITHUB_OUTPUT"; echo "No voice picked yet"; fi
      - if: steps.voice.outputs.ready == 'true'
        uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - if: steps.voice.outputs.ready == 'true'
        run: npm ci
      - if: steps.voice.outputs.ready == 'true'
        name: Previous store
        run: |
          mkdir -p prev
          if gh release download audio-store -p audio.tar.gz -D "$RUNNER_TEMP/a"; then tar -xzf "$RUNNER_TEMP/a/audio.tar.gz" -C prev; fi
          mkdir -p prev/audio
      - if: steps.voice.outputs.ready == 'true'
        id: plan
        run: npx tsx scripts/audio/plan.ts --prev prev/audio --out build/plan --shards 6
      - if: steps.voice.outputs.ready == 'true'
        uses: actions/upload-artifact@v4
        with: { name: plan, path: build/plan }

  synth:
    needs: plan
    if: needs.plan.outputs.ready == 'true' && needs.plan.outputs.todo != '0'
    runs-on: ubuntu-latest
    timeout-minutes: 350
    strategy:
      fail-fast: false
      matrix:
        shard: [0, 1, 2, 3, 4, 5]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.10' }
      - uses: actions/download-artifact@v4
        with: { name: plan, path: build/plan }
      - name: Install the picked engine and the checker
        run: bash scripts/audio/tts/setup.sh "$(jq -r .engine scripts/audio/voice.json)" --check
      - name: Synthesise this shard
        run: |
          python scripts/audio/tts/synth.py --jobs build/plan/shard-${{ matrix.shard }}.json --out out/shard \
            --engine "$(jq -r .engine scripts/audio/voice.json)" --voice "$(jq -r .voice scripts/audio/voice.json)" \
            --speed-word "$(jq -r .speed.word scripts/audio/voice.json)" --speed-sentence "$(jq -r .speed.sentence scripts/audio/voice.json)" --check
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: 'clips-${{ matrix.shard }}', path: out, if-no-files-found: ignore }

  pack:
    needs: [plan, synth]
    if: always() && needs.plan.outputs.ready == 'true'
    runs-on: ubuntu-latest
    env:
      GH_TOKEN: ${{ github.token }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - uses: actions/download-artifact@v4
        with: { name: plan, path: build/plan }
      - uses: actions/download-artifact@v4
        with: { pattern: 'clips-*', path: art }
      - name: Previous store
        run: |
          mkdir -p prev
          if gh release download audio-store -p audio.tar.gz -D "$RUNNER_TEMP/a"; then tar -xzf "$RUNNER_TEMP/a/audio.tar.gz" -C prev; fi
          mkdir -p prev/audio art
      - run: npx tsx scripts/audio/pack.ts --prev prev/audio --clips art --plan build/plan --out out
      - name: Upload the store and redeploy
        run: |
          tar -czf audio.tar.gz -C out audio
          gh release view audio-store >/dev/null 2>&1 || gh release create audio-store --title "Audio clips" --notes "ZiJi's generated audio (scripts/audio). Not a code release." --target main
          gh release upload audio-store audio.tar.gz --clobber
          gh workflow run deploy.yml --ref main
```

- [ ] **Step 2: Write the report page**

```html
<!-- public/audio-report.html: clips to spot-listen (spec 2026-10-06 §4): flagged by the ASR check, or unsure of a 多音字. -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ZiJi audio check</title>
<style>
  :root { --bg: #fbf6ea; --ink: #2b2620; --line: #e2d8c3; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.4 -apple-system, system-ui, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 16px; }
  li { display: flex; gap: 12px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line); list-style: none; }
  ul { padding: 0; }
  .zh { font-size: 22px; } .py { color: #7a6f5f; font-size: 13px; }
  button { min-width: 46px; min-height: 46px; border-radius: 12px; border: 1px solid var(--line); background: #fff; font-size: 20px; }
</style>
</head>
<body>
<main>
  <h1>Audio check</h1>
  <p id="sum">Loading…</p>
  <h2>Heard differently by the checker</h2><ul id="flagged"></ul>
  <h2>多音字 the voice may read otherwise</h2><ul id="unsure"></ul>
  <h2>Failed (the iPad voice says these)</h2><ul id="failed"></ul>
</main>
<script>
  const audio = new Audio();
  const row = (x, note) => `<li>${x.id ? `<button data-id="${x.id}" aria-label="${x.text}">▶</button>` : ''}<div><div class="zh">${x.text}</div><div class="py">${note}</div></div></li>`;
  fetch('audio/report.json', { cache: 'no-store' }).then((r) => r.json()).then((r) => {
    document.getElementById('sum').textContent = `${r.present} of ${r.total} clips made · voice ${r.voice}. Tap ▶ and tell Claude any that sound wrong.`;
    document.getElementById('flagged').innerHTML = r.flagged.map((x) => row(x, `${x.expected} · heard “${x.heard}”`)).join('') || '<li>None</li>';
    document.getElementById('unsure').innerHTML = r.unsure.map((x) => row(x, x.expected)).join('') || '<li>None</li>';
    document.getElementById('failed').innerHTML = r.failed.map((x) => row(x, x.error)).join('') || '<li>None</li>';
    document.body.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { audio.src = `audio/clips/${b.dataset.id}.m4a`; audio.play(); } });
  }).catch(() => { document.getElementById('sum').textContent = 'No audio built yet.'; });
</script>
</body>
</html>
```

- [ ] **Step 3: Push (the voice pick plus this task) and watch the first build**

```bash
git add .github/workflows/audio-build.yml public/audio-report.html
git commit -m "feat(audio): the build — the inventory in 6 shards, checked by ASR, packed into the store; a spot-listen page"
git push origin HEAD:main
gh run watch "$(gh run list --workflow=audio-build.yml -L1 --json databaseId -q '.[0].databaseId')"
```

Expected:
- The plan step prints `todo=<inventory size>`.
- The 6 synth shards finish within 350 minutes each.
- Pack prints `packed N/N` and dispatches Deploy.
- Then, after Deploy:
  - `curl -s https://bryanwxt.github.io/ziji/audio/index.json | head -c 200` shows `{"v":1,"voice":"…","clips":{…`
  - `curl -sI https://bryanwxt.github.io/ziji/audio/clips/<an id from it>.m4a` returns `200` with `content-type: audio/mp4` (or `audio/x-m4a`).
- **If a shard hits its timeout**, re-run with 12 shards (`--shards 12`, and the matrix `[0…11]`). Clips already made are skipped.

- [ ] **Step 4: Send the parent the report**

Send `https://bryanwxt.github.io/ziji/audio-report.html`, with the counts of failed, flagged and unsure clips. Fixes they ask for go into the content fixes (`READING_FIXES`/`EXAMPLE_FIXES`), which give new ids and so new clips on the next push.

---

### Task 8: One shared audio context

**Files:**
- Create: `src/audio/context.ts`
- Modify: `src/audio/sfx.ts:17-48` (the `ctx`, `audio()` and `armAudioWake` code)
- Test: `src/audio/context.test.ts`

**Interfaces:**
- Produces:
  - `audioContext(): AudioContext | null` (creates the context, resumes it if asleep, sets `navigator.audioSession.type = 'playback'` once)
  - `audioAsleep(): boolean`
  - `resetAudioContextForTests(): void`

- [ ] **Step 1: Write the failing test**

```ts
// src/audio/context.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { audioAsleep, audioContext, resetAudioContextForTests } from './context';

class FakeAC { state = 'suspended'; resume = vi.fn(async () => { this.state = 'running'; }); }

describe('the shared audio context', () => {
  afterEach(() => { vi.unstubAllGlobals(); resetAudioContextForTests(); });
  it('one context for sound effects and clips, woken when asked for', () => {
    vi.stubGlobal('AudioContext', FakeAC);
    const a = audioContext();
    expect(a).toBe(audioContext());
    expect((a as unknown as FakeAC).resume).toHaveBeenCalled();
  });
  it('plays even with the iPad on silent: the audio session is playback', () => {
    vi.stubGlobal('AudioContext', FakeAC);
    const session = { type: 'auto' };
    vi.stubGlobal('navigator', { ...navigator, audioSession: session });
    audioContext();
    expect(session.type).toBe('playback');
  });
  it('no Web Audio: null, and counted asleep', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(audioContext()).toBeNull();
    expect(audioAsleep()).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to check that it fails**

Run: `npx vitest run src/audio/context.test.ts`
Expected: FAIL. Cannot find module `./context`.

- [ ] **Step 3: Write `context.ts` and point `sfx.ts` at it**

```ts
// src/audio/context.ts
// The one Web Audio context: sound effects and spoken clips share it (spec 2026-10-06 §4), so one tap wakes both.
let ctx: AudioContext | null = null;

export function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    // Safari 16.4+: play like media, so the iPad's silent setting doesn't mute his words
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) try { session.type = 'playback'; } catch { /* older Safari */ }
  }
  if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') void ctx.resume().catch(() => {}); // iPad Safari interrupts it in the background
  return ctx;
}

export const audioAsleep = (): boolean => !ctx || ctx.state === 'suspended' || (ctx.state as string) === 'interrupted';

export function resetAudioContextForTests(): void {
  ctx = null;
}
```

In `src/audio/sfx.ts`:
1. Delete `let ctx: AudioContext | null = null;` and the body of `function audio()`, replacing it with:

```ts
import { audioAsleep, audioContext } from './context';

function audio(): AudioContext | null {
  return enabled ? audioContext() : null;
}
```

2. In `armAudioWake`, replace `const asleep = () => !ctx || ctx.state === 'suspended' || (ctx.state as string) === 'interrupted';` with `const asleep = audioAsleep;`.
3. Replace `if (asleep()) audio();` with `if (asleep()) audioContext();`. That way, clips wake even when sound effects are off.

- [ ] **Step 4: Run the tests to check that they pass**

Run: `npx vitest run src/audio/`
Expected: PASS, including the existing `sfx.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/audio/context.ts src/audio/context.test.ts src/audio/sfx.ts
git commit -m "refactor(audio): one shared audio context for sound effects and clips, playing through the silent setting"
```

---

### Task 9: The clip index and line plans

**Files:**
- Create: `src/audio/clips.ts`
- Test: `src/audio/clips.test.ts`

**Interfaces:**
- Consumes: `clipKey` (Task 1).
- Produces:
  - `interface ClipIndex { v: 1; voice: string; clips: Record<string, string> }`
  - `type ClipStep = { id: string } | { pause: number }`
  - `COMMA_PAUSE = 0.3`, `GAP_PAUSE = 0.7`
  - `setClipIndex(i: ClipIndex | null): void`
  - `loadClipIndex(base?: string, get?: typeof fetch): Promise<boolean>`
  - `clipPlan(text: string, reading?: string): ClipStep[] | null`
  - `clipUrl(id: string, base?: string): string`

- [ ] **Step 1: Write the failing test**

```ts
// src/audio/clips.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clipPlan, clipUrl, COMMA_PAUSE, GAP_PAUSE, loadClipIndex, setClipIndex } from './clips';

const index = { v: 1 as const, voice: 't', clips: { '长|cháng': 'c1', 长: 'c1', 长城的: 'c2', 门口: 'c3', 我在: 'c4', 等你: 'c5' } };

describe('clipPlan', () => {
  afterEach(() => setClipIndex(null));
  it('no index: no plan (the iPad voice speaks)', () => {
    expect(clipPlan('门口')).toBeNull();
  });
  it('a whole line, a lone character by its reading, or by its plain text', () => {
    setClipIndex(index);
    expect(clipPlan('门口')).toEqual([{ id: 'c3' }]);
    expect(clipPlan('长', 'cháng')).toEqual([{ id: 'c1' }]);
    expect(clipPlan('长')).toEqual([{ id: 'c1' }]);
  });
  it('a 听写 cue is its pieces with short pauses', () => {
    setClipIndex(index);
    expect(clipPlan('长，长城的，长')).toEqual([{ id: 'c1' }, { pause: COMMA_PAUSE }, { id: 'c2' }, { pause: COMMA_PAUSE }, { id: 'c1' }]);
  });
  it("a meaning question's gap (，，) is a longer pause", () => {
    setClipIndex(index);
    expect(clipPlan('我在，，等你')).toEqual([{ id: 'c4' }, { pause: GAP_PAUSE }, { id: 'c5' }]);
  });
  it('any missing piece: no plan, so the whole line goes to the iPad voice', () => {
    setClipIndex(index);
    expect(clipPlan('长，长江的，长')).toBeNull();
    expect(clipPlan('大门')).toBeNull();
  });
});

describe('loadClipIndex', () => {
  afterEach(() => setClipIndex(null));
  it('loads a good index from the site', async () => {
    const get = vi.fn(async () => new Response(JSON.stringify(index)));
    expect(await loadClipIndex('/ziji/', get as unknown as typeof fetch)).toBe(true);
    expect(get).toHaveBeenCalledWith('/ziji/audio/index.json');
    expect(clipPlan('门口')).toEqual([{ id: 'c3' }]);
  });
  it('a 404, a bad file or no network: false, and no plans', async () => {
    for (const get of [async () => new Response('', { status: 404 }), async () => new Response('{"v":2}'), async () => { throw new TypeError('offline'); }]) {
      expect(await loadClipIndex('/', get as unknown as typeof fetch)).toBe(false);
      expect(clipPlan('门口')).toBeNull();
    }
  });
  it('clip urls sit under the site base', () => {
    expect(clipUrl('ab12', '/ziji/')).toBe('/ziji/audio/clips/ab12.m4a');
  });
});
```

- [ ] **Step 2: Run the test to check that it fails**

Run: `npx vitest run src/audio/clips.test.ts`
Expected: FAIL. Cannot find module `./clips`.

- [ ] **Step 3: Write the implementation**

```ts
// src/audio/clips.ts
// The neural voice's clips (spec 2026-10-06 §4): which line has a clip, and how a line built from pieces is said.
import { clipKey } from './clipKey';

export interface ClipIndex { v: 1; voice: string; clips: Record<string, string> }
/** One step of saying a line: a clip, or a pause in seconds. */
export type ClipStep = { id: string } | { pause: number };
export const COMMA_PAUSE = 0.3;
/** A meaning question's gap (before，，after): long enough to hear that something is missing. */
export const GAP_PAUSE = 0.7;

let index: ClipIndex | null = null;
const BASE = (import.meta.env?.BASE_URL as string | undefined) ?? '/';

export function setClipIndex(i: ClipIndex | null): void {
  index = i;
}

/** Loads the clip index; false (and the iPad voice speaks) when there is none yet, it's broken, or he's offline. */
export async function loadClipIndex(base: string = BASE, get: typeof fetch = fetch): Promise<boolean> {
  try {
    const r = await get(`${base}audio/index.json`);
    if (!r.ok) return false;
    const i = (await r.json()) as ClipIndex;
    if (i?.v !== 1 || typeof i.clips !== 'object' || i.clips === null) return false;
    index = i;
    return true;
  } catch {
    return false;
  }
}

export const clipUrl = (id: string, base: string = BASE): string => `${base}audio/clips/${id}.m4a`;

/**
 * How to say a line with clips: the whole line, or (for a line built from pieces, 长，长城的，长) each piece with a pause.
 * Null when any piece has no clip: the whole line then goes to the iPad voice, never half and half.
 */
export function clipPlan(text: string, reading?: string): ClipStep[] | null {
  if (!index) return null;
  const whole = index.clips[clipKey(text, reading)];
  if (whole) return [{ id: whole }];
  if (!text.includes('，')) return null;
  const steps: ClipStep[] = [];
  let gap = false;
  for (const part of text.split('，')) {
    const p = part.trim();
    if (!p) { gap = steps.length > 0; continue; }
    const id = index.clips[clipKey(p, Array.from(p).length === 1 ? reading : undefined)];
    if (!id) return null;
    if (steps.length) steps.push({ pause: gap ? GAP_PAUSE : COMMA_PAUSE });
    steps.push({ id });
    gap = false;
  }
  return steps.length ? steps : null;
}
```

- [ ] **Step 4: Run the test to check that it passes**

Run: `npx vitest run src/audio/clips.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/audio/clips.ts src/audio/clips.test.ts
git commit -m "feat(audio): the clip index and line plans — whole lines, 听写 cues in pieces, never half clip half silence"
```

---

### Task 10: The clip player

**Files:**
- Create: `src/audio/clipPlayer.ts`
- Test: `src/audio/clipPlayer.test.ts`

**Interfaces:**
- Consumes: `ClipStep` (Task 9).
- Produces:
  - `type PlayResult = 'ended' | 'stopped' | 'failed'`
  - `interface ClipBackend { context(): AudioContext | null; load(id: string): Promise<ArrayBuffer> }`
  - `interface ClipPlayer { play(steps: ClipStep[], onStart?: () => void): Promise<PlayResult>; stop(): void; prefetch(ids: string[]): void }`
  - `createClipPlayer(backend: ClipBackend): ClipPlayer`

- [ ] **Step 1: Write the failing test**

```ts
// src/audio/clipPlayer.test.ts
import { describe, expect, it, vi } from 'vitest';
import { createClipPlayer } from './clipPlayer';

class FakeSource { buffer: { duration: number } | null = null; onended: (() => void) | null = null; started: number[] = []; stopped = false; connect() {} start(t: number) { this.started.push(t); } stop() { this.stopped = true; } }
class FakeContext {
  state = 'running'; currentTime = 10; destination = {}; sources: FakeSource[] = [];
  decodeAudioData = vi.fn(async (b: ArrayBuffer) => ({ duration: b.byteLength / 10 }));
  createBufferSource() { const s = new FakeSource(); this.sources.push(s); return s; }
  resume = vi.fn(async () => {});
}
const setup = (load = vi.fn(async () => new ArrayBuffer(10))) => {
  const ac = new FakeContext();
  const player = createClipPlayer({ context: () => ac as unknown as AudioContext, load });
  return { ac, load, player };
};
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('clip player', () => {
  it('plays the clips back to back with their pauses, then says it ended', async () => {
    const { ac, player } = setup();
    const onStart = vi.fn();
    const done = player.play([{ id: 'a' }, { pause: 0.3 }, { id: 'b' }], onStart);
    await tick();
    expect(ac.sources.map((s) => s.started[0])).toEqual([expect.closeTo(10.02, 5), expect.closeTo(11.32, 5)]);
    expect(onStart).toHaveBeenCalledOnce();
    ac.sources[1]!.onended!();
    expect(await done).toBe('ended');
  });
  it('a clip that will not load: failed, and nothing was played', async () => {
    const { ac, player } = setup(vi.fn(async () => { throw new Error('404'); }));
    expect(await player.play([{ id: 'a' }, { id: 'b' }])).toBe('failed');
    expect(ac.sources).toHaveLength(0);
  });
  it('stop() cuts it off: stopped', async () => {
    const { ac, player } = setup();
    const done = player.play([{ id: 'a' }]);
    await tick();
    player.stop();
    expect(await done).toBe('stopped');
    expect(ac.sources[0]!.stopped).toBe(true);
  });
  it('a new line stops the one playing', async () => {
    const { player } = setup();
    const first = player.play([{ id: 'a' }]);
    await tick();
    void player.play([{ id: 'b' }]);
    expect(await first).toBe('stopped');
  });
  it('no audio context, or one that will not wake: failed', async () => {
    expect(await createClipPlayer({ context: () => null, load: async () => new ArrayBuffer(1) }).play([{ id: 'a' }])).toBe('failed');
    const { ac, player } = setup();
    ac.state = 'suspended';
    expect(await player.play([{ id: 'a' }])).toBe('failed');
  });
  it('a clip heard before is not fetched again', async () => {
    const { ac, load, player } = setup();
    void player.play([{ id: 'a' }]); await tick(); ac.sources[0]!.onended!();
    void player.play([{ id: 'a' }]); await tick();
    expect(load).toHaveBeenCalledOnce();
  });
  it('prefetch fetches without playing', async () => {
    const { ac, load, player } = setup();
    player.prefetch(['x', 'y']);
    await tick();
    expect(load).toHaveBeenCalledTimes(2);
    expect(ac.sources).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to check that it fails**

Run: `npx vitest run src/audio/clipPlayer.test.ts`
Expected: FAIL. Cannot find module `./clipPlayer`.

- [ ] **Step 3: Write the implementation**

```ts
// src/audio/clipPlayer.ts
// Plays a line's clips through Web Audio (spec 2026-10-06 §4): everything is fetched and decoded before the first sound, so
// a line is either said whole or reported failed (and the iPad voice says it), never cut off half way by a missing clip.
import type { ClipStep } from './clips';

export type PlayResult = 'ended' | 'stopped' | 'failed';
export interface ClipBackend { context(): AudioContext | null; load(id: string): Promise<ArrayBuffer> }
export interface ClipPlayer {
  play(steps: ClipStep[], onStart?: () => void): Promise<PlayResult>;
  stop(): void;
  prefetch(ids: string[]): void;
}

/** Decoded clips kept in memory: a lesson's words and their 组词. */
const KEEP = 150;
const WAKE_MS = 300;

export function createClipPlayer(backend: ClipBackend): ClipPlayer {
  const buffers = new Map<string, Promise<AudioBuffer>>();
  let sources: AudioBufferSourceNode[] = [];
  let finish: ((r: PlayResult) => void) | null = null;
  let token = 0;

  const decoded = (ac: AudioContext, id: string): Promise<AudioBuffer> => {
    let p = buffers.get(id);
    if (p) buffers.delete(id); // most recently used goes last
    else {
      p = backend.load(id).then((b) => ac.decodeAudioData(b));
      p.catch(() => buffers.delete(id));
    }
    buffers.set(id, p);
    if (buffers.size > KEEP) buffers.delete(buffers.keys().next().value!);
    return p;
  };

  function stop(): void {
    token++;
    for (const s of sources) {
      s.onended = null;
      try { s.stop(); } catch { /* not started yet */ }
    }
    sources = [];
    const f = finish;
    finish = null;
    f?.('stopped');
  }

  async function play(steps: ClipStep[], onStart?: () => void): Promise<PlayResult> {
    stop();
    const mine = token;
    const ac = backend.context();
    if (!ac) return 'failed';
    let bufs: AudioBuffer[];
    try {
      bufs = await Promise.all(steps.flatMap((s) => ('id' in s ? [decoded(ac, s.id)] : [])));
    } catch {
      return mine === token ? 'failed' : 'stopped';
    }
    if (mine !== token) return 'stopped';
    if (ac.state !== 'running') {
      await Promise.race([ac.resume().catch(() => {}), new Promise((r) => setTimeout(r, WAKE_MS))]);
      if (mine !== token) return 'stopped';
      if (ac.state !== 'running') return 'failed'; // asleep outside a tap: the iPad voice says it
    }
    return new Promise<PlayResult>((resolve) => {
      let t = ac.currentTime + 0.02;
      let b = 0;
      const mineSources: AudioBufferSourceNode[] = [];
      for (const s of steps) {
        if ('pause' in s) { t += s.pause; continue; }
        const src = ac.createBufferSource();
        src.buffer = bufs[b++]!;
        src.connect(ac.destination);
        src.start(t);
        t += src.buffer.duration;
        mineSources.push(src);
      }
      sources = mineSources;
      const last = mineSources[mineSources.length - 1];
      if (!last) { resolve('ended'); return; }
      finish = resolve;
      last.onended = () => {
        if (finish !== resolve) return;
        finish = null;
        sources = [];
        resolve('ended');
      };
      onStart?.();
    });
  }

  function prefetch(ids: string[]): void {
    for (const id of ids) void backend.load(id).catch(() => {}); // the service worker keeps the file
  }

  return { play, stop, prefetch };
}
```

- [ ] **Step 4: Run the test to check that it passes**

Run: `npx vitest run src/audio/clipPlayer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/audio/clipPlayer.ts src/audio/clipPlayer.test.ts
git commit -m "feat(audio): the clip player — decode first, play in order with pauses, stop, prefetch"
```

---

### Task 11: Clip-first `speak()`, wired into the app

**Files:**
- Modify:
  - `src/audio/speech.ts` (`speak`, `say`, `stopSpeaking`, `primeSpeech`; add `setClipPlayer`, `prefetchWords`)
  - `src/audio/speaking.ts`: `setClipActive`, and the guard in `settleIfSilent`
  - `src/bootstrap.ts:28`
  - `src/app/SessionScreen.tsx`: after the lesson record resolves
  - `vite.config.ts`: `workbox.runtimeCaching`
- Test: `src/audio/speechClips.test.ts`

**Interfaces:**
- Consumes:
  - `clipPlan`, `setClipIndex`, `loadClipIndex`, `clipUrl` (Task 9)
  - `createClipPlayer`, `ClipPlayer` (Task 10)
  - `audioContext` (Task 8)
- Produces:
  - `setClipPlayer(p: ClipPlayer): void` (tests)
  - `prefetchWords(words: { text: string; pinyin?: string; examples?: { text: string }[] }[]): void`
  - `setClipActive(on: boolean): void`
  - `speak` and `stopSpeaking` keep their signatures

- [ ] **Step 1: Write the failing test**

```ts
// src/audio/speechClips.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClipStep } from './clips';
import { setClipIndex } from './clips';
import type { PlayResult } from './clipPlayer';
import { prefetchWords, setClipPlayer, speak, stopSpeaking } from './speech';
import { onSpeaking, settleIfSilent } from './speaking';

type Call = { steps: ClipStep[]; resolve: (r: PlayResult) => void; onStart?: () => void };
let calls: Call[];
let player: { play: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; prefetch: ReturnType<typeof vi.fn> };
let spoken: string[];
const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  calls = [];
  player = {
    play: vi.fn((steps: ClipStep[], onStart?: () => void) => new Promise<PlayResult>((resolve) => calls.push({ steps, resolve, onStart }))),
    stop: vi.fn(() => { for (const c of calls) c.resolve('stopped'); }),
    prefetch: vi.fn(),
  };
  setClipPlayer(player);
  setClipIndex({ v: 1, voice: 't', clips: { 门: 'm', 大门: 'd', '调|tiáo': 't' } });
  spoken = [];
  vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: (u: { text: string }) => spoken.push(u.text), getVoices: () => [], speaking: false, pending: false });
  vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; lang = ''; rate = 1; voice = null; onstart: (() => void) | null = null; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(t: string) { this.text = t; } });
});
afterEach(() => { stopSpeaking(); setClipIndex(null); vi.unstubAllGlobals(); });

describe('speak, with clips', () => {
  it('a line with a clip plays the clip, not the iPad voice', () => {
    speak('调', { reading: 'tiáo' });
    expect(calls[0]!.steps).toEqual([{ id: 't' }]);
    expect(spoken).toEqual([]);
  });
  it('a clip that fails: the iPad voice says the whole line', async () => {
    speak('调', { reading: 'tiáo' });
    calls[0]!.resolve('failed');
    await tick();
    expect(spoken).toEqual(['条']); // the iPad voice's own 多音字 stand-in (spokenAs)
  });
  it('queued lines wait their turn behind a clip, in order', async () => {
    speak('门');
    speak('大门', { queue: true });
    expect(calls).toHaveLength(1);
    calls[0]!.resolve('ended');
    await tick();
    expect(calls[1]!.steps).toEqual([{ id: 'd' }]);
  });
  it('a queued line with no clip goes to the iPad voice after the clip', async () => {
    speak('门');
    speak('小门', { queue: true });
    expect(spoken).toEqual([]);
    calls[0]!.resolve('ended');
    await tick();
    expect(spoken).toEqual(['小门']);
  });
  it('stopSpeaking stops the clip and drops what was queued', async () => {
    speak('门');
    speak('大门', { queue: true });
    stopSpeaking();
    expect(player.stop).toHaveBeenCalled();
    await tick();
    expect(calls).toHaveLength(1);
  });
  it("Truffle's mouth stays open while a clip plays, though the iPad voice is idle", () => {
    const states: boolean[] = [];
    const off = onSpeaking((on) => states.push(on));
    speak('门');
    calls[0]!.onStart!();
    settleIfSilent();
    expect(states).toEqual([true]);
    off();
  });
  it('prefetchWords fetches the clips of the words and their 组词', () => {
    prefetchWords([{ text: '调', pinyin: 'tiáo', examples: [{ text: '大门' }, { text: '没有' }] }]);
    expect(player.prefetch).toHaveBeenCalledWith(['t', 'd']);
  });
});
```

- [ ] **Step 2: Run the test to check that it fails**

Run: `npx vitest run src/audio/speechClips.test.ts`
Expected: FAIL. `setClipPlayer` is not exported.

- [ ] **Step 3: Implement it in `speaking.ts`**

Add the following to `src/audio/speaking.ts`, and change `settleIfSilent`'s first line:

```ts
/** A clip is playing (Web Audio): the iPad voice being idle then says nothing about whether he is talking. */
let clipActive = false;
export function setClipActive(on: boolean): void {
  clipActive = on;
}
```

```ts
export function settleIfSilent(): void {
  if (!speakingNow || clipActive || typeof speechSynthesis === 'undefined' || !speechSynthesis) return;
  if (!speechSynthesis.speaking && !speechSynthesis.pending) setSpeaking(false);
}
```

- [ ] **Step 4: Implement it in `speech.ts`**

1. Imports. Change the import line from `./speaking` to:

```ts
import { audioContext } from './context';
import { clipPlan, clipUrl } from './clips';
import { createClipPlayer, type ClipPlayer } from './clipPlayer';
import { setClipActive, setSpeaking } from './speaking';
```

2. Rename the current `export function speak(...)` to `function ttsSpeak(text: string, { queue = false, reading }: { queue?: boolean; reading?: string } = {}): void`. Leave its body unchanged.

3. In `say()`, make an utterance's end start the next queued line once the iPad voice has nothing left:

```ts
  const done = () => {
    live.delete(u);
    setSpeaking(false);
    if (live.size === 0 && !waiting) drain();
  };
```

4. Add the clip-first `speak` and its queue, above `ttsSpeak`:

```ts
let player: ClipPlayer = createClipPlayer({
  context: audioContext,
  load: (id) => fetch(clipUrl(id)).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`clip ${id}: ${r.status}`)))),
});
/** For tests: a stand-in player. */
export function setClipPlayer(p: ClipPlayer): void {
  player = p;
}

type Line = { text: string; reading?: string };
/** Lines queued behind a clip (or behind the iPad voice while a clip waits): said in order, one at a time. */
let after: Line[] = [];
let clipBusy = false;
const ttsBusy = () => available() && (live.size > 0 || waiting !== null);

/**
 * Say Chinese text: the neural voice's clip when there is one (spec 2026-10-06 §4), else the iPad voice. It cuts off whatever
 * is playing, unless `queue` (then it waits its turn: the character, then its usage line). `reading` is the pinyin a lone
 * character is taught with, when the screen knows it.
 */
export function speak(text: string, { queue = false, reading }: { queue?: boolean; reading?: string } = {}): void {
  if (queue && (clipBusy || after.length > 0 || (ttsBusy() && clipPlan(text, reading)))) {
    after.push({ text, reading });
    return;
  }
  const steps = clipPlan(text, reading);
  if (!steps) { ttsSpeak(text, { queue, reading }); return; }
  if (!queue) stopSpeaking();
  playClip(steps, { text, reading });
}

function playClip(steps: NonNullable<ReturnType<typeof clipPlan>>, line: Line): void {
  clipBusy = true;
  setClipActive(true);
  void player.play(steps, () => setSpeaking(true)).then((r) => {
    if (r === 'stopped') return; // whoever stopped it has reset everything
    clipBusy = false;
    setClipActive(false);
    if (r === 'failed') { ttsSpeak(line.text, { queue: true, reading: line.reading }); return; } // never silent
    setSpeaking(false);
    drain();
  });
}

/** The next queued line, once nothing is playing. */
function drain(): void {
  if (clipBusy || ttsBusy()) return;
  const next = after.shift();
  if (!next) return;
  const steps = clipPlan(next.text, next.reading);
  if (steps) playClip(steps, next);
  else ttsSpeak(next.text, { queue: true, reading: next.reading });
}

/** Fetch a lesson's clips ahead, so they play at once and offline (the service worker keeps them). */
export function prefetchWords(words: { text: string; pinyin?: string; examples?: { text: string }[] }[]): void {
  const ids = new Set<string>();
  const add = (text: string, reading?: string) => { for (const s of clipPlan(text, reading) ?? []) if ('id' in s) ids.add(s.id); };
  for (const w of words) {
    add(w.text, w.pinyin);
    for (const e of w.examples ?? []) add(e.text);
  }
  if (ids.size) player.prefetch([...ids]);
}
```

5. In `stopSpeaking()`, add clip stopping before the existing lines:

```ts
export function stopSpeaking(): void {
  after = [];
  clipBusy = false;
  setClipActive(false);
  player.stop();
  epoch++;
  if (waiting) clearTimeout(waiting.timer);
  waiting = null;
  if (available()) speechSynthesis.cancel();
  live.clear();
  setSpeaking(false);
}
```

6. In `primeSpeech()`, wake the audio context inside the tap. Add this as the first line: `audioContext();`.

- [ ] **Step 5: Run the audio tests**

Run: `npx vitest run src/audio/`
Expected: PASS. Both the new `speechClips.test.ts` and the existing `speech.test.ts` must pass: with no index, nothing about the iPad voice changes.
- If the existing "re-tap after cancel" tests fail, check that `speak` still reaches `ttsSpeak` unchanged when `clipPlan` returns null. `stopSpeaking()` must only be called on the clip path.

- [ ] **Step 6: Wire the app**

In `src/bootstrap.ts`, before `const voice = await loadChineseVoice(...)`:

```ts
  void loadClipIndex(); // the neural voice's clips; until it loads (or with none), the iPad voice speaks
```

and add `import { loadClipIndex } from './audio/clips';`.

In `src/app/SessionScreen.tsx`, find the effect that awaits `startOrResumeSession(...)` / `startExtraLesson(...)` and stores the record. Right after the record is available (call it `rec`), add:

```ts
      void allWords(db).then((ws) => {
        const want = new Set([...rec.plan.newWordIds, ...rec.plan.reviewWordIds]);
        prefetchWords(ws.filter((w) => want.has(w.id)));
      });
```

- Import `prefetchWords` from `../audio/speech`.
- Import `allWords` from the store module the file already uses for words. Check with `grep -n "allWords" src/store/*.ts`.

In `vite.config.ts`, append these to `workbox.runtimeCaching`:

```ts
          {
            urlPattern: ({ url }) => url.pathname.includes('/audio/clips/'),
            handler: 'CacheFirst', // a clip never changes: its name is its content
            options: { cacheName: 'clips', expiration: { maxEntries: 6000, maxAgeSeconds: 60 * 60 * 24 * 180 }, cacheableResponse: { statuses: [200] } },
          },
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/audio/index.json'),
            handler: 'NetworkFirst',
            options: { cacheName: 'clip-index', networkTimeoutSeconds: 3, cacheableResponse: { statuses: [200] } },
          },
```

- [ ] **Step 7: Full check**

Run: `npx tsc --noEmit -p . && npx vitest run --maxWorkers=2`
Expected: no type errors; all tests pass.

Run: `npm run build && grep -c "audio/clips" dist/sw.js`
Expected: `1` or more (the runtime route is in the service worker).

- [ ] **Step 8: Commit and push**

```bash
git add src/audio src/bootstrap.ts src/app/SessionScreen.tsx vite.config.ts
git commit -m "feat(audio): speak with the neural voice's clips first, the iPad voice as fallback; lesson clips prefetched and kept offline"
git push origin HEAD:main
```

---

### Task 12: Verify on the live site and on the iPad

**Files:** none (verification only).

- [ ] **Step 1: Check that the live site serves clips**

```bash
curl -s https://bryanwxt.github.io/ziji/audio/index.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const i=JSON.parse(s);console.log(i.voice,Object.keys(i.clips).length)})"
```

Expected: the picked voice tag, and a count of at least the inventory size (character aliases add more).

- [ ] **Step 2: WebKit smoke test (the app requests clips, and doesn't fall back)**

Run Playwright WebKit (`playwright-core` 1.52, as in `scripts/fit-check.ts`) against `npm run preview`, with `dist/audio` present. To get it locally, extract the store: `gh release download audio-store -p audio.tar.gz -D /tmp/a && tar -xzf /tmp/a/audio.tar.gz -C dist`.
1. Open the app and tap a 🔊 button on the collection screen.
2. Record the network requests.

Expected: a `GET …/audio/clips/<id>.m4a` with status 200, and no `speechSynthesis.speak` call. Check the latter with `page.addInitScript(() => { window.__said = []; const s = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = (u) => { window.__said.push(u.text); s(u); }; })`, then `page.evaluate(() => window.__said)` returns `[]`.

- [ ] **Step 3: Parent check on the iPad**

Ask the parent to:
1. Close and reopen ZiJi from the home screen, so the new service worker takes over.
2. Do part of a lesson.
3. Tap a few 🔊 buttons, including a 听写 cue in 写一写.
4. Turn on silent mode and tap again.
5. Report anything still in the old voice, any wrong tone, and any delay.

Expected: the neural voice everywhere in his range. Silent mode doesn't mute it.

- [ ] **Step 4: Update the project memory**

Update `hanzi-buddy-project.md` in the auto-memory directory with:
- the audio pipeline is live
- which voice was picked
- the store location (release `audio-store`)
- that clips regenerate automatically on content pushes through `audio-build.yml`


## Build record (2026-10-06)

All 12 tasks were built and deployed. These are the rulings made, review fixes and deferred minors, copied from the build ledger:

- Ruling: Push cadence — pushes to main as the plan's steps say (parent's standing "deploy when done" rule); branch feat/audio is rebased onto origin/main before each push.
- Task 1: Ruling: TWINS filter "one pinyin-pro reading" dropped — pinyin-pro lists rare readings even for 条/车, so it removed 162 of 1017 twins; use gen-say-as's plain table (already steers the iPad voice) minus 一/不 — cost if wrong: a twin with a rare second reading misread by an engine (caught by the spot-listen list).
- Task 1: Ruling: lone 多音字 with no twin is sure when pinyin(ch) equals the taught reading (大 dà, 说 shuō: their common reading) — the plan's 0.8 bar failed at 0.72 for exactly these — cost if wrong: a common-reading lone char read otherwise by a voice, unflagged.
- Task 2: Ruling: CLI creates the output's folder (mkdirSync) — the workflow already mkdirs, but a local run shouldn't fail — cost if wrong: none.
- Task 5: Ruling: items job drops 'mkdir -p build/audio &&' — audition.ts CLI creates its folder (Task 2 ruling) — cost if wrong: none.
- Task 6: Ruling: (w.level ?? 99) <= 3 — Word.level is nullable; the plan's code didn't type-check — cost if wrong: none.
- Task 8: Ruling: stopPurr reads the time from its own node (gain.context) — the plan missed that stopPurr used the module's ctx — cost if wrong: none (same context).
- Task 5: Ruling: audition publish failed — audition.ts's CLI guard endsWith('audition.ts') matched pack-audition.ts, so importing it wrote to 'art' (EISDIR). Guards now compare basename exactly (audition, inventory, pack-audition) — test "runs only as itself" RED→GREEN — cost if wrong: none.
- Task 5: Ruling: CosyVoice install failed (openai-whisper needs pkg_resources; setuptools 81 dropped it) — setup.sh pins setuptools<81 via PIP_CONSTRAINT (covers build isolation) — cost if wrong: CosyVoice still fails and is dropped from the audition after one more try (plan: two failed fixes → drop).
- Task 11: Ruling: prefetch uses the lesson's already-loaded know.words instead of a second allWords(db) query — same words, one fewer read — cost if wrong: none. Four app tests' speech mocks gain prefetchWords: vi.fn().
- Task 5: Ruling: CosyVoice second failure (PIP_CONSTRAINT didn't reach the isolated build) — last try: pre-install openai-whisper with --no-build-isolation; if it fails, CosyVoice is dropped (plan: two failed fixes) — cost if wrong: one more ~15 min run.
- Task 5: Ruling: third CosyVoice attempt, past the plan's two-fix limit — root cause now exact (requirements pin openai-whisper==20231117; the pre-install took the latest, so pip rebuilt the pin in isolation); one-line fix, runs while the parent listens — cost if wrong: one ~15 min CI run, then CosyVoice is dropped.
- Task 6 (amended): Ruling: char/word engine text ends in 。 — measured on 60 words with an F0 tone check: 67 → 86/117 tones right; zf_002 is the best voice by the same check (85 vs 49–61) — cost if wrong: words sound slightly final/declarative (they are said alone anyway).
- Task 5: Ruling: cancelled the third CosyVoice audition run — the parent had already picked zf_002; avoids two workflows uploading the store at once — cost if wrong: CosyVoice stays unheard (can be re-run any time).
- Amend: Ruling: no automatic best-of-two pick — a pitch tone check (built, tested on synthetic tones) disagreed with the parent's ear on real clips (scored 一起。 right; 空调/门/条 wrong), so it was removed rather than shipped — cost if wrong: words like 一起 are found by ear, not automatically.
- Amend: Ruling (parent approved): words end in 。, except CUT_FROM_SENTENCE (一起: said in 就是一起。 and cut out) and 听写 cue pieces (长城的: no 。, its 的 came out stressed — 52 ASR flags were mostly these). Clip ids now include what the voice is given and how (clipIdFor), so any such change regenerates exactly the clips it touches; this change regenerates all 8,266 once.
- Final: fixed C1 (a no-clip tap left the clip playing and its queue alive) — test "a tap on a line with no clip stops the clip…" RED→GREEN, suite 1453/1453
- Final: fixed I1 (a late end from a cancelled iPad-voice line shut Truffle's mouth mid-clip) — test "a cancelled iPad-voice line ending late…" RED→GREEN, suite 1453/1453
- Final: fixed I2 (no timeout on clip fetch) — LOAD_MS 1500 then the iPad voice — test "a clip that takes too long to arrive" RED→GREEN, suite 1453/1453
- Final: fixed I3 (bare-character key shadowed: 教 played jiào in 听写 cues) — test "the bare character is the taught character clip…" RED→GREEN, suite 1453/1453
- Final: Ruling: WritingStep not changed to pass reading — with the index fix a bare character always maps to its taught clip, so the reading adds nothing — cost if wrong: none for built-ins.
- Final: minor (deferred): M1 an iPad-voice line that never ends stalls clip lines queued behind it until the next tap
- Final: minor (deferred): M2 a clip cut off by backgrounding never reports its end (mouth open until the next tap)
- Final: minor (deferred): M3 meaning cues whose halves contain ， fall back to the iPad voice (138 clips unreachable)
- Final: minor (deferred): M4 a half-written .m4a (failed ffmpeg / shard timeout) is kept and never remade
- Final: minor (deferred): M5 audition and build workflows share no concurrency group; deploy hides a failed store download
- Final: minor (deferred): M6 audio-build paths miss src/audio/clipKey.ts; pack runs when todo=0
- Final: minor (deferred): M7 first-wins dedup: 6 "…的" words get the cue-piece treatment or vice versa
- Final: minor (deferred): M8 prefetch skips 听写 pieces/sentences; first visit before the SW controls the page caches nothing
- Final: minor (deferred): M9 synth_cut doesn't assert pred_dur aligns with the phonemes
