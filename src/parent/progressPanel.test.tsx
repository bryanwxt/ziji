import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { ProgressPanel } from './ProgressPanel';
import { summarize } from '../stats/stats';
import { DEFAULT_SETTINGS } from '../types';
import { makeCard, makeWord } from '../test/fixtures';

const passed = (wordId: string, kind: 'recognise' | 'hear' | 'write' | 'say' | 'sentence') => ({ ...makeCard(wordId, kind, new Date()), passed: 1 });

describe('the Progress tab (spec 2026-10-06 §3.4)', () => {
  it('shows characters recognised against the MOE target to date, and words heard, read, used, owned', () => {
    const know = summarize([makeWord('门')], [passed('b:门', 'recognise'), passed('b:门', 'hear')]);
    render(<ProgressPanel know={know} settings={{ ...DEFAULT_SETTINGS, grade: 2 }} now={new Date('2026-10-06')} />);
    expect(screen.getByText(/1 of 746/)).toBeTruthy();
    expect(screen.getByText(/Heard/)).toBeTruthy();
    expect(screen.getByText(/Owned/)).toBeTruthy();
    expect(screen.getByText('Understood in a sentence')).toBeTruthy(); // plan 2b
  });
});

describe('the Progress tab against his book (spec 2026-10-11 §8)', () => {
  const know = summarize([makeWord('门'), makeWord('介')], [passed('b:门', 'recognise'), passed('b:门', 'write'), passed('b:介', 'recognise')]);
  const show = (over = {}) => render(<ProgressPanel know={know} settings={{ ...DEFAULT_SETTINGS, grade: 2, gradeYear: 2026, ...over }} now={new Date('2026-10-11T09:00:00')} />);
  it("targets are the end of his school year: 746 to read, and both lists' 435 to write; a character outside the book isn't counted", () => {
    show();
    expect(screen.getByText('1 of 746 by the end of 二下')).toBeTruthy();
    expect(screen.getByText('1 of 435')).toBeTruthy();
  });
  it("one course's list when the parent chose one", () => {
    show({ course: 'cl' });
    expect(screen.getByText('1 of 350')).toBeTruthy();
  });
  it('each bar has a mark where his class is now (二下·17: 707 to read, 413 to write)', () => {
    show();
    expect(screen.getByText(/where his class is now: 二下·17/)).toBeTruthy();
    const marks = [...document.querySelectorAll<HTMLElement>('.pbar__mark')].map((m) => m.style.left);
    expect(marks).toEqual(['94.8%', '94.9%', '94.8%']);
    expect(screen.getByRole('img', { name: '认读 reads (taps): 1 of 746; his class is at 707' })).toBeTruthy();
  });
  it('a row per term from 一上 to the end of his year: still to read and still to write', () => {
    show();
    const rows = [...document.querySelectorAll('.progress__terms tbody tr')].map((r) => [...r.children].map((c) => c.textContent));
    expect(rows.map((r) => r[0])).toEqual(['一上', '一下', '二上', '二下']);
    expect(rows[0]).toEqual(['一上', '181', '89']); // 门 read and written
    expect(rows[1]).toEqual(['一下', '182', '112']);
  });
  it('past the lists (P4): plain counts, no bars, no table', () => {
    show({ grade: 4 });
    expect(document.querySelector('.pbar')).toBeNull();
    expect(document.querySelector('.progress__terms')).toBeNull();
  });
});

describe('can write and can say (spec 2026-10-11 §6)', () => {
  it('bars next to reads (taps): characters he writes against the write list, characters he says against the read list', () => {
    const know = summarize([makeWord('门'), makeWord('介'), makeWord('大'), makeWord('门口', { id: 'w:门口' })], [passed('b:门', 'recognise'), passed('b:门', 'write'), passed('b:门', 'say'), passed('b:大', 'say'), passed('w:门口', 'say')]);
    render(<ProgressPanel know={know} settings={{ ...DEFAULT_SETTINGS, grade: 2, gradeYear: 2026 }} now={new Date('2026-10-11T09:00:00')} />);
    expect([...document.querySelectorAll('.pbar__label')].map((l) => l.textContent)).toEqual(['认读 reads (taps)', '会写 Can write', '会说 Can say', '会用 Can use']);
    expect(screen.getByRole('img', { name: '会写 Can write: 1 of 435; his class is at 413' })).toBeTruthy();
    expect(screen.getByRole('img', { name: '会说 Can say: 2 of 746; his class is at 707' })).toBeTruthy(); // 门 and 大; 门口 counts for itself, not its characters
    expect(screen.getByText('2 of 746')).toBeTruthy();
  });
});

describe('can use (production practice spec §4)', () => {
  it('words he said sentences with, against the words he has begun', () => {
    const know = summarize([makeWord('很'), makeWord('和'), makeWord('门'), makeWord('认真', { id: 'w:认真' })], [passed('b:很', 'recognise'), passed('b:和', 'hear'), passed('b:门', 'recognise'), passed('w:认真', 'recognise'), passed('b:很', 'sentence'), passed('w:认真', 'sentence')]);
    render(<ProgressPanel know={know} settings={{ ...DEFAULT_SETTINGS, grade: 2, gradeYear: 2026 }} now={new Date('2026-10-11T09:00:00')} />);
    expect(screen.getByRole('img', { name: '会用 Can use: 2 of 4' })).toBeTruthy();
    expect(screen.getByText('2 of 4 begun')).toBeTruthy();
  });
  it('hides the count row until a word has begun', () => {
    const know = summarize([makeWord('很')], []);
    render(<ProgressPanel know={know} settings={{ ...DEFAULT_SETTINGS, grade: 2, gradeYear: 2026 }} now={new Date('2026-10-11T09:00:00')} />);
    expect(screen.queryByText('Words he can use in a sentence')).toBeNull();
    expect(document.body.textContent).not.toContain('0 of 0 begun');
  });
  it('counts can-use only over begun words, so it never passes begun', () => {
    const know = summarize([makeWord('很'), makeWord('和')], [passed('b:很', 'recognise'), passed('b:很', 'sentence'), passed('b:和', 'sentence')]);
    expect(know.begun).toBe(1);
    expect(know.canUse).toBe(1);
  });
});

describe('from memory this week (real test spec 2026-10-23 §7)', () => {
  it('counts earlier words written from memory and the right ones, and the 只点选 words with a link to them', async () => {
    const { fireEvent } = await import('@testing-library/preact');
    const { vi } = await import('vitest');
    const now = new Date(2026, 9, 23, 18);
    const at = new Date(2026, 9, 22, 9).getTime();
    const logs = [
      { cardId: 'b:草:write', wordId: 'b:草', kind: 'write' as const, at, rating: 3 as const, correct: true, misses: 0, source: 'recall' as const, state: 2 as const },
      { cardId: 'b:花:write', wordId: 'b:花', kind: 'write' as const, at, rating: 1 as const, correct: false, misses: 4, source: 'recall' as const, state: 2 as const },
      { cardId: 'b:山:recognise', wordId: 'b:山', kind: 'recognise' as const, at, rating: 3 as const, correct: true },
    ];
    const onTapOnly = vi.fn();
    render(<ProgressPanel know={summarize([makeWord('门')], [])} settings={DEFAULT_SETTINGS} now={now} logs={logs} onTapOnly={onTapOnly} />);
    expect(screen.getByText('从记忆写出：2 个旧字，1 个写对')).toBeTruthy();
    expect(document.querySelector('.progress__memory')!.textContent).toContain('1 word');
    fireEvent.click(screen.getByText('Show them'));
    expect(onTapOnly).toHaveBeenCalled();
  });
});
