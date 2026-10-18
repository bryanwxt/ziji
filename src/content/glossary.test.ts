import { describe, expect, it } from 'vitest';
import { makeWord } from '../test/fixtures';
import { chengyuOf } from './chengyu';
import { cardMeaning } from './glossary';

describe('the 认字 card meaning of a school word', () => {
  it("a school 成语 the parent typed no meaning for takes the 成语 list's", () => {
    expect(cardMeaning(makeWord('五颜六色', { id: 'p:9', source: 'parent', tags: ['成语'], level: null, rank: null }))).toBe(chengyuOf('五颜六色')!.meaning);
  });
  it("the parent's own meaning wins", () => {
    expect(cardMeaning({ ...makeWord('五颜六色', { id: 'p:9', source: 'parent', tags: ['成语'], level: null, rank: null }), meaning: 'very colourful' })).toBe('very colourful');
  });
});

describe('a weekly list word saved without English (parent 2026-10-18: 共用)', () => {
  const listWord = (meaning?: string) => ({ ...makeWord('共用', { id: 'p:1', source: 'parent', level: null, rank: null }), meaning });
  it('its own meaning first; else its kid gloss, on the card and in a meaning question', async () => {
    const { questionMeaning } = await import('./glossary');
    const { kidGloss } = await import('./kidGloss');
    expect(cardMeaning(listWord('use it together'))).toBe('use it together');
    expect(cardMeaning(listWord())).toBe(kidGloss('共用'));
    expect(questionMeaning(listWord())).toBe(kidGloss('共用'));
  });
  it('a word with no English anywhere still has none', () => {
    expect(cardMeaning({ ...makeWord('嗯嗯嗯', { id: 'p:2', source: 'parent', level: null, rank: null }), meaning: undefined })).toBeUndefined();
  });
});
