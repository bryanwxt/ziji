// The content gate's regression test (content audit 2026-10-15): every surface the child sees or hears, enumerated as the audit
// did (src/test/contentSurfaces.ts), checked against the blocklist, his cards' readings, the voice's steering and the stored
// sentence pinyin. A failure names the word and where it shows.
import { pinyin } from 'pinyin-pro';
import { describe, expect, it } from 'vitest';
import SAY_AS from '../audio/sayAs.json';
import { NEAR_MAX_HSK, nearWords, OPPOSITES, zuciBoard } from '../practice/pairs';
import { mulberry32 } from '../lib/random';
import { writingCue } from '../activities/writing/cue';
import { familyBoard } from '../practice/family';
import { ZUCI_BOARD_ON_MAIN } from '../test/zuciOnMain';
import { cardReading, isHan, wordByChar, sameReading, school, schoolSet, shownSentenceRows, shownSentences, shownWords } from '../test/contentSurfaces';
import { BLOCKED } from './blocked';
import { HSK_WORDS } from './index';
import { OTHER_READINGS } from './readingAllowlist';
import stored from './sentencePinyin.json'; // the snapshot (test-only: not shipped)

const STORED_PINYIN = (stored as { sentences: Record<string, string> }).sentences;
import { readingOf, sentenceReading } from './wordGate';
import { loneSpoken } from '../audio/speech';
import { tiles } from './zuju';

const rows = shownWords();

describe('no blocked word is reachable (content audit 2026-10-15)', () => {
  it('on any surface that shows or says a word', () => {
    expect([...new Set(rows.filter((r) => BLOCKED.has(r.word)).map((r) => `${r.word} (${r.surface}, ${r.via})`))]).toEqual([]);
  });
  it('in any sentence written for the app, word by word', () => {
    const bad = shownSentenceRows().flatMap(({ s, surface }) => tiles(s).map((t) => t.replace(/[，。！？、；：]/g, '')).filter((t) => BLOCKED.has(t)).map((t) => `${t} in ${s} (${surface})`));
    expect(bad).toEqual([]);
  });
});

describe('one reading per school character (content audit 2026-10-15)', () => {
  const allowed = new Map<string, Set<string>>();
  for (const [k, ws] of Object.entries(OTHER_READINGS)) allowed.set(k, new Set(ws.split(' ')));
  it('every shown word says each school character the way its card does, or is a listed other reading', () => {
    const bad = new Set<string>();
    const used = new Set<string>();
    for (const r of rows) {
      const cs = Array.from(r.word).filter(isHan);
      const syl = r.py.trim().split(/\s+/);
      if (syl.length !== cs.length) { bad.add(`${r.word} "${r.py}": pinyin doesn't line up (${r.surface})`); continue; }
      cs.forEach((ch, i) => {
        if (!schoolSet.has(ch) || sameReading(ch, syl[i]!, cardReading.get(ch)!)) return;
        used.add(`${ch} ${syl[i]}|${r.word}`);
        if (!allowed.get(`${ch} ${syl[i]}`)?.has(r.word)) bad.add(`${ch} (card ${cardReading.get(ch)}) is ${syl[i]} in ${r.word} (${r.surface}, ${r.via})`);
      });
    }
    expect([...bad]).toEqual([]);
    // and no entry outlives its word: one the gate took away (肝脏, 钻空子) leaves the list too
    expect([...allowed].flatMap(([k, ws]) => [...ws].filter((w) => !used.has(`${k}|${w}`)).map((w) => `${k}: ${w}`))).toEqual([]);
  });
  it('a sentence for a school character says it the way its card does (炸 zhá: 炸鸡, not 气球炸了)', () => {
    const bad: string[] = [];
    for (const x of shownSentenceRows()) {
      if (Array.from(x.for).length !== 1 || !schoolSet.has(x.for)) continue;
      const syl = STORED_PINYIN[x.s]!.split(' ');
      Array.from(x.s).filter(isHan).forEach((ch, i) => { if (ch === x.for && !sameReading(ch, syl[i]!, cardReading.get(ch)!)) bad.push(`${ch} ${cardReading.get(ch)}: ${x.s} (${syl[i]})`); });
    }
    expect(bad).toEqual([]);
  });
  it('the allowlist lists only readings the cards do not teach', () => {
    for (const key of Object.keys(OTHER_READINGS)) {
      const [ch, syl] = key.split(' ') as [string, string];
      expect(sameReading(ch, syl, cardReading.get(ch) ?? ''), key).toBe(false);
    }
  });
  it('the card readings his lessons use: 卜 bo, 应 yīng, 炸 zhá, 种 zhòng, 钻 zuān, 抹 mā, 仔 zǐ, 觉 jiào', () => {
    expect([...'卜应炸种钻抹仔觉'].map((c) => cardReading.get(c))).toEqual(['bo', 'yīng', 'zhá', 'zhòng', 'zuān', 'mā', 'zǐ', 'jiào']);
  });
});

describe('every lone school 多音字 is said as its card teaches (scripts/gen-say-as.ts)', () => {
  const { sayAs, poly, unsure } = SAY_AS as { sayAs: Record<string, string>; poly: Record<string, string>; unsure: string[] };
  it('is steered: a twin, its own everyday reading, or on the spot-listen list', () => {
    const bad: string[] = [];
    for (const c of school) {
      const readings = new Set(pinyin(c.char, { multiple: true, type: 'array' }));
      if (readings.size < 2) continue;
      const taught = cardReading.get(c.char)!;
      if (poly[c.char] !== taught) bad.push(`${c.char} ${taught}: not steered (${poly[c.char] ?? 'missing'})`);
      else if (!sayAs[c.char] && pinyin(c.char) !== taught && !unsure.includes(c.char)) bad.push(`${c.char} ${taught}: no twin, and a voice reads it ${pinyin(c.char)}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('a lone character no voice can be steered on is said as a word (爪 → 爪子)', () => {
  it('each unsure character is said as a word with it, read there the way its card teaches', () => {
    const { unsure } = SAY_AS as { unsure: string[] };
    expect(unsure.length).toBeGreaterThan(0);
    const bad: string[] = [];
    for (const ch of unsure) {
      const said = loneSpoken(ch, cardReading.get(ch));
      const at = Array.from(said).indexOf(ch);
      const syl = readingOf(said).split(' ')[at];
      if (Array.from(said).length < 2 || at < 0 || !syl || !sameReading(ch, syl, cardReading.get(ch)!)) bad.push(`${ch} ${cardReading.get(ch)}: said as ${said} (${syl})`);
    }
    expect(bad).toEqual([]);
  });
});

describe('a character said as its word never says an answer (review 2026-10-15)', () => {
  it('找一家人: an unsure character is never said as a word on its board', () => {
    const { unsure } = SAY_AS as { unsure: string[] };
    const readable = new Set(school.map((c) => c.char));
    const bad: string[] = [];
    for (const ch of unsure) {
      const w = wordByChar.get(ch);
      for (let seed = 1; w && seed <= 20; seed++) {
        const b = familyBoard(w, readable, mulberry32(seed));
        if (b && b.tiles.includes(loneSpoken(ch, b.reading, b.tiles))) bad.push(`${ch}: ${b.tiles.join(' ')}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('readings the review caught (2026-10-15)', () => {
  it('种植 is zhòng zhí, and 种\'s 写一写 cue says its word at zhòng', () => {
    expect(readingOf('种植')).toBe('zhòng zhí');
    expect(sentenceReading('种植')).toBe('zhòng zhí');
    const piece = writingCue(wordByChar.get('种')!).speech.split('，').find((p) => p.length > 1)!;
    const at = Array.from(piece).indexOf('种');
    expect(sentenceReading(piece).split(' ')[at]).toBe('zhòng');
  });
  it('a lone unsure character is never said as a word that ends in a 连一连 right-hand tile', () => {
    expect(loneSpoken('茄', 'qié', [], ['子'])).toBe('番茄');
    expect(loneSpoken('茄', 'qié', [], ['茄', '子'])).toBe('茄'); // every word of it ends so: alone
  });
});

describe('stored sentence pinyin (src/content/sentencePinyin.json: npm run pinyin)', () => {
  it('covers every sentence written for the app, and only those', () => {
    const want = new Set(shownSentences());
    expect([...want].filter((s) => !(s in STORED_PINYIN))).toEqual([]);
    expect(Object.keys(STORED_PINYIN).filter((s) => !want.has(s))).toEqual([]);
  });
  it('has not drifted from a fresh reading (a pinyin-pro upgrade or a new fix reads one differently)', () => {
    const drift = Object.entries(STORED_PINYIN).filter(([s, py]) => sentenceReading(s) !== py).map(([s, py]) => `${s}: stored ${py}, now ${sentenceReading(s)}`);
    expect(drift).toEqual([]);
  });
});

describe('连一连 after the content audit (review 2026-10-15)', () => {
  it('every school character that had a 组词 board on main still has one (死 keeps no 组词: every word with it is about death)', () => {
    const lost = Array.from(ZUCI_BOARD_ON_MAIN).filter((c) => c !== '死' && ![1, 2, 3].some((seed) => zuciBoard(wordByChar.get(c)!, mulberry32(seed))));
    expect(lost).toEqual([]);
  });
});

describe('连一连 near words (content audit 2026-10-15: 男女 came from an HSK 7 card asking for level 8)', () => {
  const pool = nearWords(99);
  it(`never above HSK ${NEAR_MAX_HSK}, whatever the card's level`, () => {
    expect(pool.filter((w) => (HSK_WORDS.get(w) ?? 99) > NEAR_MAX_HSK)).toEqual([]);
    expect(pool.length).toBeGreaterThan(100);
  });
  it('never a pair of opposites', () => {
    expect(pool.filter((w) => OPPOSITES.has(w))).toEqual([]);
    expect(OPPOSITES.has('左右')).toBe(true); // a word again (review 2026-10-15), never a near pair
  });
});
