import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import type { SessionRecord } from '../types';
import { createSessionRecord, type WriteTask } from './runner';
import { meaningCredit } from './writeCredit';

const ji = makeWord('计', { pinyin: 'jì', examples: [{ text: '计划', pinyin: 'jì huà' }] }); // cue: 「计，计划的计」 (＿划)
const bare = makeWord('计', { pinyin: 'jì' }); // no 组词: the cue is its pinyin
const rec: SessionRecord = createSessionRecord({ steps: ['writing'], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 }, 'd', 0);
const recall: WriteTask = { wordId: ji.id, isNew: false, pass: 'recall', redo: false, at: 0, last: true };
const traced: WriteTask = { wordId: ji.id, isNew: true, pass: 'trace', redo: false, at: 0, readOnly: true };
const ok = { totalMisses: 0, hinted: false };

describe('the 组词 he writes rates its meaning (production practice spec §3)', () => {
  it('a write-list character from memory: right with no hint and at most 1 miss, else wrong', () => {
    expect(meaningCredit(rec, recall, ok, ji, true)).toBe(true);
    expect(meaningCredit(rec, recall, { totalMisses: 1, hinted: false }, ji, true)).toBe(true);
    expect(meaningCredit(rec, recall, { totalMisses: 2, hinted: false }, ji, true)).toBe(false);
    expect(meaningCredit(rec, recall, { totalMisses: 0, hinted: true }, ji, true)).toBe(false);
  });
  it('a traced read-only character: right with at most 3 misses', () => {
    expect(meaningCredit(rec, traced, { totalMisses: 3, hinted: false }, ji, true)).toBe(true);
    expect(meaningCredit(rec, traced, { totalMisses: 4, hinted: false }, ji, true)).toBe(false);
  });
  it('once a lesson: a word already rated by 写一写 is not rated again', () => {
    expect(meaningCredit({ ...rec, meaningCredit: [ji.id] }, recall, ok, ji, true)).toBeNull();
  });
  it('never a write-list trace, a redo, a cue that is not a 组词, a word whose Use rung is not open, or free play', () => {
    expect(meaningCredit(rec, { ...recall, pass: 'trace' }, ok, ji, true)).toBeNull();
    expect(meaningCredit(rec, { ...recall, redo: true }, ok, ji, true)).toBeNull();
    expect(meaningCredit(rec, recall, ok, bare, true)).toBeNull();
    expect(meaningCredit(rec, recall, ok, ji, false)).toBeNull();
    expect(meaningCredit({ ...rec, free: true }, recall, ok, ji, true)).toBeNull();
  });
});
