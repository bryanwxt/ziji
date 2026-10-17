// The content sweep (parent 2026-10-17: 她 heard, "he, him" marked wrong): every question the app asks by ear alone, over every
// built-in character and ladder word, has no wrong choice that sounds like the answer (homophones.ts has the rule).
import { appendFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../../content';
import { questionMeaning } from '../../content/glossary';
import { askedAs } from '../../content/kidGloss';
import { ladderWords } from '../../content/ladder';
import { mulberry32 } from '../../lib/random';
import { lookAlikes } from '../../placement/questions';
import type { Word } from '../../types';
import { alike, firstSense, meaningChoices, pickCharacterDistractors, pickLookAlikes } from './distractors';
import { heardReadings, readingsOf, soundsLike, wordReadings } from './homophones';
import { syllableTone } from './tones';

// The whole content, as a lesson's meaning pool has it (his built-in characters and the ladder's 词语)
const all = [...builtinWords(0), ...ladderWords()];
const byKey = new Map<string, Word[]>();
const keyOf = (r: string) => r.split(' ').map((s) => syllableTone(s).base).join(' ');
for (const w of all) for (const k of new Set(wordReadings(w).map(keyOf))) byKey.set(k, [...(byKey.get(k) ?? []), w]);
/** Words said like this one (same syllables and tones, 轻声 matching any), worked out here without the picker's own index. */
const homophones = (w: Word) => {
  const mine = heardReadings(w);
  return [...new Set(mine.map(keyOf))].flatMap((k) => byKey.get(k) ?? []).filter((u) => u.text !== w.text && u.text !== askedAs(w.text) && soundsLike(mine, wordReadings(u)));
};

/** A heard meaning question's bad choices: a wrong one that is the meaning of a word said like the answer. */
function meaningSweep(byEar: boolean, seeds = 2): string[] {
  const bad: string[] = [];
  for (const w of all) {
    if (!questionMeaning(w)) continue;
    const alikes = homophones(w).filter((u) => questionMeaning(u)).map((u) => [u.text, firstSense(questionMeaning(u)!)] as const);
    if (!alikes.length) continue;
    const answer = firstSense(questionMeaning(w)!);
    for (let seed = 1; seed <= seeds; seed++) {
      for (const c of meaningChoices(w, all, mulberry32(seed), undefined, byEar) ?? []) {
        if (c === answer) continue;
        const hit = alikes.find(([, g]) => alike(g, c));
        if (hit) bad.push(`${w.text} (${answer}): "${c}" fits ${hit[0]}`);
      }
    }
  }
  return [...new Set(bad)];
}

/** Find-the-character by ear: a wrong character said like the answer's spoken reading, by any of its readings. */
function characterSweep(seeds = 2): string[] {
  const chars = builtinWords(0);
  const bad: string[] = [];
  for (const w of chars) {
    const heard = heardReadings(w);
    for (let seed = 1; seed <= seeds; seed++) {
      const five = pickLookAlikes(w, chars, mulberry32(seed));
      const decoys = five.length ? five : pickCharacterDistractors(w, chars, mulberry32(seed));
      for (const d of decoys) if (soundsLike(heard, wordReadings(d))) bad.push(`${w.text} ${w.pinyin}: ${d.text}`);
      for (const d of lookAlikes(w, chars, mulberry32(seed)) ?? []) if (soundsLike(heard, readingsOf(d))) bad.push(`placement ${w.text} ${w.pinyin}: ${d}`);
    }
  }
  return [...new Set(bad)];
}

const report = (name: string, bad: string[]) => { if (process.env.SWEEP_OUT) appendFileSync(process.env.SWEEP_OUT, `${name}: ${bad.length}\n${bad.join('\n')}\n`); };

describe('content sweep: questions asked by ear alone', () => {
  it('content sweep: every heard meaning question, no wrong choice fits a word said like the answer', { timeout: 120_000 }, () => {
    const bad = meaningSweep(true);
    report('heard meaning', bad);
    expect(bad).toEqual([]);
  });
  it('content sweep: every find-the-character by ear (练一练, 认新字, placement), no wrong character said like the answer', { timeout: 120_000 }, () => {
    const bad = characterSweep();
    report('find the character', bad);
    expect(bad).toEqual([]);
  });
  it('the same meaning questions read (the character shown) still offer sound-alikes: the sweep sees them', { timeout: 120_000 }, () => {
    const bad = meaningSweep(false);
    report('read meaning (old heard rule)', bad);
    expect(bad.length).toBeGreaterThan(0);
  });
});
