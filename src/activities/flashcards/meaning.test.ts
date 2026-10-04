import { describe, expect, it } from 'vitest';
import { makeWord } from '../../test/fixtures';
import { meaningCue } from './meaning';

describe('meaningCue', () => {
  it('blanks the character inside one of its 组词 words', () => {
    const w = makeWord('惜', { examples: [{ text: '珍惜', pinyin: 'zhēn xī' }, { text: '可惜', pinyin: 'kě xī' }] });
    expect(meaningCue(w)).toEqual({ full: '珍惜', pinyin: 'zhēn xī', before: '珍', after: '' });
  });
  it('has no cue when no example contains the word (a two-character school word without sentences yet)', () => {
    expect(meaningCue(makeWord('保持', { examples: [] }))).toBeNull();
    expect(meaningCue(makeWord('保持'))).toBeNull();
  });
});
