import { describe, expect, it } from 'vitest';
import { builtinWords } from '.';
import { pickPinyinDistractors } from '../activities/flashcards/distractors';
import { trapReadings } from '../activities/flashcards/pinyinTraps';
import { mulberry32 } from '../lib/random';
import { makeWord } from '../test/fixtures';

const words = builtinWords(0);
const byText = new Map(words.map((w) => [w.text, w]));

describe('readings a P2 child meets (deferred minors, plans 1 and 5)', () => {
  it('了 is read le, the way he meets it every day (liǎo only in words like 了解)', () => {
    expect(byText.get('了')!.pinyin).toBe('le');
  });
  it('包子 is bāo zi everywhere it appears', () => {
    for (const ch of ['包', '子']) expect(byText.get(ch)!.examples!.find((e) => e.text === '包子')?.pinyin ?? 'bāo zi').toBe('bāo zi');
  });
  it('never offers the toneless form of the answer as wrong (爸 is ba in 爸爸)', () => {
    for (const ch of ['爸', '妈', '哥', '子']) {
      const w = byText.get(ch)!;
      const plain = w.pinyin.normalize('NFD').replace(/[̀-ͯ]/g, '');
      for (let seed = 1; seed < 40; seed++) expect(pickPinyinDistractors(w, words, mulberry32(seed))).not.toContain(plain);
    }
  });
  it('八 and 七 change tone before a 4th tone like 一 and 不: bá and qí are never offered as wrong', () => {
    for (const [ch, alt] of [['八', 'bá'], ['七', 'qí']] as const) {
      for (let seed = 1; seed < 40; seed++) expect(pickPinyinDistractors(byText.get(ch)!, words, mulberry32(seed))).not.toContain(alt);
    }
  });
  it('a 轻声 word whose full-tone reading is also a word (东西 dōng xī) is never given that reading as a trap', () => {
    expect(trapReadings(makeWord('东西', { pinyin: 'dōng xi', source: 'parent', level: null }))).not.toContain('dōng xī');
    expect(trapReadings(makeWord('桌子', { pinyin: 'zhuō zi', source: 'parent', level: null }))).toContain('zhuō zǐ'); // an ordinary 轻声 word still gets its trap
  });
  it('built-in content and its fixes change only with a new CONTENT_VERSION (review I3)', async () => {
    const { createHash } = await import('node:crypto');
    const { default: data } = await import('./builtin.json');
    const { CONTENT_VERSION, READING_FIXES, EXAMPLE_FIXES, MEANING_FIXES } = await import('.');
    const { EXTRA_EXAMPLES } = await import('./extraExamples');
    const hash = createHash('sha256').update(JSON.stringify([data, READING_FIXES, EXAMPLE_FIXES, MEANING_FIXES, EXTRA_EXAMPLES])).digest('hex').slice(0, 16);
    // changed builtin.json or a fix table? bump CONTENT_VERSION (so iPads rewrite their built-in words) and pin the new hash here
    const PINNED: Record<string, string> = { '1.6': '0878e4cea3c73de5' }; // 1.4 and 1.5 changed how examples are chosen (code); 1.6 added written 组词 and fixes
    expect(`${CONTENT_VERSION} ${hash}`).toBe(`${CONTENT_VERSION} ${PINNED[CONTENT_VERSION]}`);
  });
  it('了 means what it does when read le, not "clear, to finish"', async () => {
    const { builtinWords } = await import('.');
    expect(builtinWords(0).find((w) => w.text === '了')!.meaning).toMatch(/finished|change/);
  });
  it('the phrase glossary (CC-CEDICT, CC BY-SA) says where it is from and covers nearly every 组词', async () => {
    const { default: g } = await import('./glossary.json');
    const { BUILTIN } = await import('.');
    expect(g.source).toMatch(/CC-CEDICT/);
    expect(g.license).toMatch(/CC BY-SA 4\.0/);
    const phrases = new Set(BUILTIN.flatMap((c) => c.examples.map((e) => e.text)));
    const covered = [...phrases].filter((p) => p in g.entries).length;
    expect(covered / phrases.size).toBeGreaterThan(0.99);
  });
});

/** 一 and 不 change tone in speech (一半 yí, 一边 yì, 不对 bú) without being another reading. */
const SANDHI: Record<string, string[]> = { 一: ['yí', 'yì'], 不: ['bú'] };

describe('one reading per card (parent, 2026-10-05: 调 was taught as tiáo next to 调查 diàochá)', () => {
  it('a character keeps only the 组词 that say it the way his card does', async () => {
    const { builtinWords } = await import('.');
    const byText = new Map(builtinWords(0).map((w) => [w.text, w]));
    expect(byText.get('调')!.examples!.map((e) => e.text)).toEqual(['空调']); // not 调查, 强调 (diào)
    expect(byText.get('觉')!.examples!.map((e) => e.text)).not.toContain('睡觉'); // jiào, on a jué card
    expect(byText.get('长')!.examples!.map((e) => e.text)).not.toContain('班长'); // zhǎng, on a cháng card
  });
  it('a tone change in speech is the same reading: 一 and 不 keep their 组词 (parent, 2026-10-05: 一 showed no 词语)', async () => {
    const { builtinWords } = await import('.');
    const byText = new Map(builtinWords(0).map((w) => [w.text, w]));
    expect(byText.get('一')!.examples!.map((e) => e.text)).toEqual(['一半', '一样', '一边']); // yí, yí, yì
    expect(byText.get('不')!.examples!.length).toBeGreaterThan(0);
  });
  it('a 轻声 syllable of the same sound still counts (包子 zi on a zǐ card)', async () => {
    const { builtinWords } = await import('.');
    expect(builtinWords(0).find((w) => w.text === '子')!.examples!.map((e) => e.text)).toContain('包子');
  });
  it('no built-in 组词 says its character another way', async () => {
    const { builtinWords } = await import('.');
    const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const bad: string[] = [];
    for (const w of builtinWords(0)) {
      for (const e of w.examples ?? []) {
        const chars = [...e.text];
        const syl = e.pinyin.trim().split(/\s+/);
        if (syl.length !== chars.length) continue;
        chars.forEach((ch, i) => {
          if (ch !== w.text) return;
          const s = syl[i]!;
          if (s !== w.pinyin && !(strip(s) === strip(w.pinyin) && strip(s) === s) && !(SANDHI[w.text] ?? []).includes(s)) bad.push(`${w.text} ${w.pinyin}: ${e.text} ${e.pinyin}`);
        });
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('组词 written for the app (parent, 2026-10-05: 一, 九, 猫… had none)', () => {
  it('every HSK 1–6 character has a 组词 now, and each written one has its English', async () => {
    const { builtinWords } = await import('.');
    const { glossFor } = await import('./glossary');
    const { EXTRA_EXAMPLES } = await import('./extraExamples');
    const singles = builtinWords(0).filter((w) => [...w.text].length === 1 && (w.level ?? 9) <= 6);
    expect(singles.filter((w) => !w.examples?.length).map((w) => w.text)).toEqual([]);
    for (const [t] of Object.values(EXTRA_EXAMPLES).flat()) expect(glossFor(t), t).toBeTruthy();
  });
  it('every written 组词 is kept: none says its character another way', async () => {
    const { builtinWords } = await import('.');
    const { EXTRA_EXAMPLES } = await import('./extraExamples');
    const byText = new Map(builtinWords(0).map((w) => [w.text, w]));
    for (const [ch, list] of Object.entries(EXTRA_EXAMPLES)) expect(byText.get(ch)!.examples!.slice(0, list.length).map((e) => e.text), ch).toEqual(list.map(([t]) => t)); // first, before the HSK list's
  });
  it('cards read and mean what a child meets: 夹子 jiā, 咳嗽 ké, 提供 gōng; 咸 salty, 戴 to wear', async () => {
    const { builtinWords } = await import('.');
    const { cardMeaning } = await import('./glossary');
    const byText = new Map(builtinWords(0).map((w) => [w.text, w]));
    expect(['夹', '咳', '供'].map((c) => byText.get(c)!.pinyin)).toEqual(['jiā', 'ké', 'gōng']);
    expect(cardMeaning(byText.get('咸')!)).toBe('salty');
    expect(cardMeaning(byText.get('戴')!)).toMatch(/wear/);
  });
});
