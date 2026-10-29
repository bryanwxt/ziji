import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { makeCard } from '../test/fixtures';
import type { ReviewLog } from '../types';
import { legacyPlacementLine, placementLine, placementLineZh, placementPhrasesZh, recentSentBack, recheckLine, recheckProgress, sentBackLine } from './summary';
import { makeWord } from '../test/fixtures';

const at = new Date(2026, 9, 5, 9).getTime();
const result = { at, readsUpTo: '一下', tested: 12, assumed: 360, missed: [] };

describe('placement copy for the parent (spec 2026-10-14)', () => {
  it('the result screen: 读到 一下 · 已测 12 个字，推定 360 个', () => {
    expect(placementLineZh(result)).toBe('读到 一下 · 已测 12 个字，推定 360 个');
    expect(placementLineZh({ ...result, readsUpTo: null, assumed: 0, tested: 6 })).toBe('还没开始 · 已测 6 个字');
  });
  it('the same line in phrases the screen never breaks inside (v2.1: no 「个」 alone on a line)', () => {
    expect(placementPhrasesZh(result)).toEqual(['读到 一下 ·', '已测 12 个字，', '推定 360 个']);
    expect(placementPhrasesZh(result).join(' ').replace('， ', '，')).toBe(placementLineZh(result));
    expect(placementPhrasesZh({ ...result, readsUpTo: null, tested: 6 }).join(' ')).toBe('还没开始 · 已测 6 个字');
  });
  it('Skills, in English: Reads up to 一下 — 12 tested, 360 assumed.', () => {
    expect(placementLine(result)).toBe('Reads up to 一下 — 12 tested, 360 assumed.');
    expect(placementLine({ ...result, readsUpTo: null, assumed: 0, tested: 6 })).toBe('Reads none of the terms yet — 6 tested.');
  });
  it('rechecks: done of all placed, and how many were sent back to learn', () => {
    const pending = Array.from({ length: 320 }, (_, i) => ({ ...makeCard(`b:${i}`, 'recognise', new Date(at), true), placed: true as const }));
    const log = (i: number, correct: boolean, when = at + 86_400_000): ReviewLog => ({ cardId: `b:x${i}:recognise`, wordId: `b:x${i}`, kind: 'recognise', at: when, rating: correct ? 3 : 1, correct, placedCheck: true });
    const logs = [...Array.from({ length: 37 }, (_, i) => log(i, true)), log(37, false), log(38, false), log(39, false), log(99, false, at - 1)]; // the last: an earlier placement's
    const p = recheckProgress(pending, logs, at);
    expect(p).toEqual({ done: 40, total: 360, sentBack: 3 });
    expect(recheckLine(p)).toBe('Placement rechecks: 40 of 360 done, 3 sent back to learn.');
  });
  it('an older band result still shows, read-only, by the school term of its band', () => {
    const line = legacyPlacementLine({ at, reading: 2, understanding: 0, missed: [] }, builtinWords(0));
    expect(line).toBe('Earlier check (bands) — Reading: 一下 · Understanding: 一上. Re-run it for a term result.');
  });
  it('words sent back in the last 7 days: missed when, retaught when (parent 2026-10-29)', () => {
    const now = new Date(2026, 9, 29, 18);
    const day = (d: number, h = 17) => new Date(2026, 9, d, h).getTime();
    const words = new Map([makeWord('照顾', { id: 'a' }), makeWord('碰', { id: 'b' }), makeWord('射', { id: 'c' })].map((w) => [w.id, w]));
    const log = (wordId: string, when: number, extra: Partial<ReviewLog> = {}): ReviewLog => ({ cardId: `${wordId}:recognise`, wordId, kind: 'recognise', at: when, rating: 1, correct: false, ...extra });
    const logs = [
      log('a', day(27), { placedCheck: true }), log('a', day(27, 18)), log('a', day(28), { correct: true }), // the same day's later log isn't the reteach
      log('b', day(28), { placedCheck: true }),
      log('c', day(20), { placedCheck: true }), // older than 7 days
      log('a', day(26), { placedCheck: true, correct: true }),
    ];
    const back = recentSentBack(logs, words, now);
    expect(back).toEqual([{ text: '照顾', missed: '2026-10-27', taught: '2026-10-28' }, { text: '碰', missed: '2026-10-28' }]);
    expect(sentBackLine(back)).toBe('Missed on a recheck, taught again in 认新字: 照顾 (missed 10-27, retaught 10-28) · 碰 (missed 10-28, next lesson).');
  });
});
