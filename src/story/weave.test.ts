import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import { parseChapter } from './format';
import { castFor, slotState, wordIdFor } from './weave';

const know = (passed: Record<string, string[]>) => ({
  passedRungs: new Map(Object.entries(passed).map(([id, rs]) => [id, new Set(rs as never[])])),
  wordsById: new Map([['b:门', makeWord('门')]]),
  ladderById: new Map([['w:电梯', { ...makeWord('电梯'), id: 'w:电梯' }]]),
});
const page = (body: string) => parseChapter(`---\nchapter: 1\ntitle: T\nplace: hdb\nslots: []\n---\n## Setup\n### Page 1\n${body}\n`).setup[0]!;

describe('the word weave (spec 3c §4, parent spec §5.5)', () => {
  it('one character is b:, a 词语 is w:', () => {
    expect(wordIdFor('门')).toBe('b:门');
    expect(wordIdFor('电梯')).toBe('w:电梯');
  });
  it('new until Hear passes; learning after; owned when every rung is passed', () => {
    expect(slotState(know({}), '门')).toBe('new');
    expect(slotState(know({ 'b:门': ['read', 'use'] }), '门')).toBe('new'); // read but never heard: still the English
    expect(slotState(know({ 'b:门': ['hear'] }), '门')).toBe('learning');
    expect(slotState(know({ 'w:电梯': ['hear', 'understand', 'read', 'use'] }), '电梯')).toBe('owned');
  });
  it('an unknown word is new: its English', () => {
    expect(slotState(know({}), '火箭')).toBe('new');
  });
  it('the cast: @cast first, else who speaks (drawn ones), else Truffle', () => {
    expect(castFor(page('@cast granny\nText.'))).toEqual(['granny']);
    expect(castFor(page('> Truffle: Hi!\n> Granny Dragon: Hello!'))).toEqual(['truffle', 'granny']);
    expect(castFor(page('> Dog: Woof!'))).toEqual(['truffle']); // Dog has no art yet (3d)
    expect(castFor(page('Just narration.'))).toEqual(['truffle']);
  });
});
