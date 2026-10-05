import { describe, expect, it } from 'vitest';
import { makeWord } from '../../test/fixtures';
import { pickExample, writingCue } from './cue';

describe('writingCue', () => {
  it('gives the first meaning, a blanked word that uses it, and says which character', () => {
    const er = makeWord('儿', { pinyin: 'ér', meaning: 'son, child', examples: [{ text: '儿子', pinyin: 'ér zi' }, { text: '好玩儿', pinyin: 'hǎo wán ér' }] });
    expect(writingCue(er)).toEqual({ meaning: 'son', blanked: '＿子', blankedPy: 'zi', speech: '儿，儿子的，儿', sentence: null });
  });
  it('without an example word there is no blank, and it just says the character', () => {
    const ba = makeWord('八', { meaning: 'eight; 8', examples: [] });
    expect(writingCue(ba)).toEqual({ meaning: 'eight', blanked: null, blankedPy: null, speech: '八', sentence: null });
  });
  it('a parent word with no meaning says the word itself', () => {
    expect(writingCue(makeWord('大人', { source: 'parent' }))).toEqual({ meaning: null, blanked: null, blankedPy: null, speech: '大人', sentence: null });
  });
  it('ignores an example that is just the character itself', () => {
    expect(writingCue(makeWord('大', { meaning: 'big', examples: [{ text: '大', pinyin: 'dà' }] })).blanked).toBeNull();
  });
});

describe('writingCue meanings a child can use', () => {
  const m = (ch: string, meaning: string) => writingCue(makeWord(ch, { meaning })).meaning;
  it('uses kid meanings for common characters whose first dictionary sense misleads', () => {
    expect(m('他', 'other; another; he')).toBe('he');
    expect(m('呢', 'wool; particle')).toBeNull();
    expect(m('了', 'clear; to finish')).toBeNull();
    expect(m('个', 'this; measure word')).toBeNull();
    expect(m('的', 'aim; clear')).toBeNull();
    expect(m('和', 'harmony; and')).toBe('and');
    expect(m('着', 'to make a move')).toBeNull();
  });
  it('drops grammar labels and long definitions, and the leading "to"', () => {
    expect(m('吗', 'final interrogative particle')).toBeNull();
    expect(m('公', 'unit of distance equal to 0.5km')).toBeNull();
    expect(m('吃', 'to eat')).toBe('eat');
  });
});

describe('writingCue example word', () => {
  it('prefers a word where the character appears once', () => {
    const nai = makeWord('奶', { pinyin: 'nǎi', meaning: 'milk', examples: [{ text: '奶奶', pinyin: 'nǎi nai' }, { text: '牛奶', pinyin: 'niú nǎi' }] });
    expect(writingCue(nai)).toMatchObject({ blanked: '牛＿', blankedPy: 'niú', speech: '奶，牛奶的，奶' });
  });
  it('a doubled word is still said aloud but not shown as two empty boxes', () => {
    const ba = makeWord('爸', { pinyin: 'bà', meaning: 'father', examples: [{ text: '爸爸', pinyin: 'bà ba' }] });
    expect(writingCue(ba)).toMatchObject({ blanked: null, speech: '爸，爸爸的，爸' });
  });
  it('skips a word that uses a different reading from the one being written', () => {
    const xing = makeWord('行', { pinyin: 'xíng', meaning: 'walk', examples: [{ text: '银行', pinyin: 'yín háng' }, { text: '行人', pinyin: 'xíng rén' }] }); // 长 now has a bank sentence
    expect(writingCue(xing)).toMatchObject({ blanked: '＿人', speech: '行，行人的，行' });
    const wei = makeWord('为', { pinyin: 'wèi', examples: [{ text: '成为', pinyin: 'chéng wéi' }] });
    expect(writingCue(wei)).toMatchObject({ blanked: null, speech: '为' });
  });
  it('a neutral-tone use of the same syllable still counts (儿子 for 子)', () => {
    const zi = makeWord('子', { pinyin: 'zǐ', examples: [{ text: '儿子', pinyin: 'ér zi' }] });
    expect(writingCue(zi)).toMatchObject({ blanked: '儿＿', speech: '子，儿子的，子' });
  });
});

describe('pickExample', () => {
  it('shares the writing rules: matching reading, one occurrence preferred', () => {
    const nai = makeWord('奶', { pinyin: 'nǎi', examples: [{ text: '奶奶', pinyin: 'nǎi nai' }, { text: '牛奶', pinyin: 'niú nǎi' }] });
    expect(pickExample(nai)).toEqual({ example: { text: '牛奶', pinyin: 'niú nǎi' }, once: true });
    expect(pickExample(makeWord('八', { examples: [] }))).toBeNull();
  });
});

describe('the sentence cue never shows what he is writing (review of plan 14)', () => {
  it('a sentence with one of the word\'s characters outside the gap is skipped for the other one (考试: not 我这次＿＿考得很好)', () => {
    const cue = writingCue(makeWord('考试', { id: 'p:k', pinyin: 'kǎo shì', source: 'parent', level: null }));
    expect(cue.sentence).toBe('明天有＿＿。');
  });
  it('when every sentence shows it, the cue falls back to 组词 or nothing', () => {
    const w = makeWord('欺负', { id: 'p:q', pinyin: 'qī fu', source: 'parent', level: null, sentences: [{ text: '大家不要欺负他，欺人不好。', pinyin: '' }] });
    expect(writingCue(w).sentence).toBeNull();
  });
});

describe('one character of a longer word (spec 2026-10-05 §5)', () => {
  it('blanks only that character; the other shows', () => {
    const w = makeWord('朋友', { id: 'p:1', source: 'parent', pinyin: 'péng you', sentences: [{ text: '他是我最好的朋友，我们天天一起玩。', pinyin: '' }] });
    expect(writingCue(w).sentence).toContain('＿＿');
    const cue = writingCue(w, 1);
    expect(cue.sentence).toContain('朋＿');
    expect(cue.sentence!.split('＿').length - 1).toBe(1);
    expect(writingCue(w, 0).sentence).toContain('＿友');
  });
});


describe('the gap carries the sound he writes (parent, 2026-10-05: the pinyin sat apart from the 组词)', async () => {
  const { gapPinyin } = await import('./WritingStep');
  it('the gap gets the character\'s syllable, the others theirs as said in the word', () => {
    expect(gapPinyin('＿实', 'shí', 'chéng', 0)).toBe('chéng shí');
    expect(gapPinyin('＿子', 'zi', 'ér', 0)).toBe('ér zi');
  });
  it('one character of a longer word: that character\'s syllable', () => {
    expect(gapPinyin('朋＿', 'péng', 'péng you', 1)).toBe('péng you');
  });
  it('falls back to the others alone when they don\'t line up', () => {
    expect(gapPinyin('＿实', 'shí', 'chéng shí', 5)).toBe('shí'); // no syllable at that place
  });
});

describe('he hears the tone he writes (parent, 2026-10-05: 笑话 was heard as huā)', () => {
  it('prefers a 组词 where the character keeps its full tone, and says the character alone last', () => {
    const hua = makeWord('话', { pinyin: 'huà', examples: [{ text: '笑话', pinyin: 'xiào hua' }, { text: '说话', pinyin: 'shuō huà' }] });
    expect(writingCue(hua)).toMatchObject({ blanked: '说＿', speech: '话，说话的，话' });
  });
  it('a 轻声 word is still used when it is the only one', () => {
    const hua = makeWord('话', { pinyin: 'huà', examples: [{ text: '笑话', pinyin: 'xiào hua' }] });
    expect(writingCue(hua).speech).toBe('话，笑话的，话');
  });
});
