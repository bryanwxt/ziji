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
