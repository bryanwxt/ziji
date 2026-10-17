// A weekly list's items in 练一练 (weekly list spec 2026-10-17 §7.3–7.5): 选词填空 from the list's own words, 搭配 with the
// parent's confirmed wrong partners, a 连一连 board of list pairs with a decoy; misses on the two-row ✓/✗ sheet.
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => false }));
import { speak } from '../../audio/speech';
import type { PracticeItem } from '../../session/round';
import { makeWord } from '../../test/fixtures';
import { DEFAULT_KID, type WeekPair, type Word } from '../../types';
import { PracticeQuestion } from './PracticeQuestion';

const parent = (text: string, pinyin: string, meaning: string): Word => makeWord(text, { id: `p:${text}`, source: 'parent', pinyin, meaning, rank: null, level: null });
const pool: Word[] = [parent('亮晶晶', 'liàng jīng jīng', 'sparkly'), parent('胖乎乎', 'pàng hū hū', 'chubby'), parent('毛茸茸', 'máo róng róng', 'fluffy'), parent('绿油油', 'lǜ yóu yóu', 'lush green'),
  makeWord('踢', { pinyin: 'tī' }), makeWord('炒', { pinyin: 'chǎo' }), makeWord('放', { pinyin: 'fàng' })];
const pairs: WeekPair[] = [
  { left: '踢', right: '毽子', wrong: ['青菜', '风筝', '书包'], reading: 'tī jiàn zi' },
  { left: '炒', right: '青菜', wrong: ['毽子', '风筝', '书包'], reading: 'chǎo qīng cài' },
  { left: '放', right: '风筝', wrong: ['毽子', '青菜', '书包'], reading: 'fàng fēng zheng' },
];
const base = { pool, voice: false, kid: DEFAULT_KID, resting: 'content' as const, combo: 0, closeupReady: false };
const ask = (word: Word, item: PracticeItem, onDone = vi.fn()) => { render(<PracticeQuestion {...base} item={item} word={word} onDone={onDone} />); return onDone; };
const choice = (t: string) => [...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent === t)!;
const rows = () => [...document.querySelectorAll('.sheet__en-line')].map((r) => [r.querySelector('.sheet__en-zh .label')?.getAttribute('data-zh'), r.querySelector('.sheet__en-gloss')?.textContent]);

afterEach(() => { cleanup(); vi.mocked(speak).mockClear(); });

describe('选词填空 from the list (spec §7.3)', () => {
  const fit = { wordId: 'p:亮晶晶', sentence: '夜空里的星星＿。', source: 'parent' as const, wrong: ['胖乎乎', '毛茸茸', '绿油油'] as [string, string, string] };
  const item: PracticeItem = { wordId: 'p:亮晶晶', rung: 2, ask: 'fit', grades: null, retry: false, list: { listId: 'wl:q', form: 'fit', fit } };
  it('the confirmed sentence, its blank, and the four list words as choices', () => {
    ask(pool[0]!, item);
    expect(document.querySelector('.meaning-cue .label')!.getAttribute('data-zh')).toBe('夜空里的星星＿＿＿。');
    expect([...document.querySelectorAll('.choice')].map((b) => b.textContent).sort()).toEqual(['亮晶晶', '毛茸茸', '绿油油', '胖乎乎'].sort());
  });
  it('a miss: ✓ the answer and ✗ his pick, each with its pinyin and English, then counted as a use answer', () => {
    const onDone = ask(pool[0]!, item);
    fireEvent.click(choice('胖乎乎'));
    expect(rows()).toEqual([['亮晶晶', 'sparkly'], ['胖乎乎', 'chubby']]);
    expect(document.querySelector('.sheet__en-picked .sheet__en-zh .label__py')!.textContent).toBe('pàng');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false, asked: 'use' }));
  });
});

describe('搭配 from the list (spec §7.5)', () => {
  const item: PracticeItem = { wordId: 'b:炒', rung: 2, ask: 'match', grades: null, retry: false, list: { listId: 'wl:q', form: 'dapei', pair: pairs[1] } };
  it('which goes with it: the right partner and the three the parent confirmed wrong', () => {
    ask(pool[5]!, item);
    expect(document.querySelector('.match__word')!.textContent).toBe('炒');
    expect([...document.querySelectorAll('.choice')].map((b) => b.textContent).sort()).toEqual(['书包', '毽子', '青菜', '风筝'].sort());
  });
  it('a miss: ✓ 炒青菜 and ✗ 炒毽子 as whole phrases with pinyin, said at the pair reading', () => {
    const onDone = ask(pool[5]!, item);
    fireEvent.click(choice('毽子'));
    expect(rows().map((r) => r[0])).toEqual(['炒青菜', '炒毽子']);
    expect([...document.querySelectorAll('.sheet__en-right .sheet__en-zh .label__py')].map((e) => e.textContent).join(' ')).toBe('chǎo qīng cài');
    expect(speak).toHaveBeenCalledWith('炒青菜', { reading: 'chǎo qīng cài' });
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false, asked: 'meaning', listPairs: [{ left: '炒', right: '青菜', correct: false }] }));
  });
});

describe('a 连一连 board of list pairs (spec §7.5)', () => {
  const item: PracticeItem = { wordId: 'b:踢', rung: 2, ask: 'match', grades: null, retry: false, list: { listId: 'wl:q', form: 'dapei', pairs } };
  const tile = (t: string) => [...document.querySelectorAll<HTMLButtonElement>('.pair__tile')].find((b) => b.textContent === t)!;
  const join = (l: string, r: string) => { fireEvent.click(tile(l)); fireEvent.click(tile(r)); };
  it('three pairs and the decoy 书包; each pair noted on its own', () => {
    const onDone = ask(pool[4]!, item);
    expect([...document.querySelectorAll('.pairs__col--right .pair__tile')].map((b) => b.textContent).sort()).toEqual(['书包', '毽子', '青菜', '风筝'].sort());
    join('炒', '书包'); // the decoy: a miss
    join('炒', '青菜');
    join('踢', '毽子');
    join('放', '风筝');
    // the summary: every pair with its list reading and English, the missed one marked
    const missed = document.querySelector('.pair-summary__row.is-missed .label')!;
    expect(missed.getAttribute('data-zh')).toBe('炒青菜');
    expect([...missed.querySelectorAll('.label__py')].map((e) => e.textContent).join(' ')).toBe('chǎo qīng cài');
    fireEvent.click(screen.getByText('继续'));
    const r = onDone.mock.calls[0]![0];
    expect(r.correct).toBe(false);
    expect([...r.listPairs].sort((a: { left: string }, b: { left: string }) => a.left.localeCompare(b.left))).toEqual([
      { left: '放', right: '风筝', correct: true }, { left: '炒', right: '青菜', correct: false }, { left: '踢', right: '毽子', correct: true },
    ].sort((a, b) => a.left.localeCompare(b.left)));
  });
});
