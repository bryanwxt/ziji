import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../../content';
import { bankFor } from '../../content/sentenceBank';
import { DEFAULT_KID } from '../../types';
import { makeWord } from '../../test/fixtures';
import { PracticeQuestion } from './PracticeQuestion';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => false }));

const pool = builtinWords(0);
const he = pool.find((w) => w.text === '河')!;
const bankWord = pool.find((w) => bankFor(w.text))!;
const base = { pool, voice: false, kid: DEFAULT_KID, resting: 'sulk' as const, combo: 0, closeupReady: false };

describe('a 练一练 question (spec 2026-10-05 §3.2)', () => {
  it('字: asks straight away (no intro card) and reports what it asked', () => {
    const onDone = vi.fn();
    render(<PracticeQuestion {...base} word={he} item={{ wordId: he.id, rung: 1, ask: 'read', grades: 'recognise', retry: false }} onDone={onDone} />);
    expect(screen.queryByText('我记住了！')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: he.pinyin }));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true, asked: 'read' }));
  });
  it('句子: 用对了吗 on the stage; the answer comes back as a use answer after 继续', () => {
    const onDone = vi.fn();
    render(<PracticeQuestion {...base} word={bankWord} item={{ wordId: bankWord.id, rung: 3, ask: 'usage', grades: 'use', retry: false }} onDone={onDone} />);
    fireEvent.click(document.querySelector<HTMLButtonElement>('.usage-opts .choice')!);
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ asked: 'use', inContext: true }));
  });
  it('a sentence question that can no longer be made is skipped', () => {
    const onDone = vi.fn();
    render(<PracticeQuestion {...base} word={he} item={{ wordId: he.id, rung: 3, ask: 'usage', grades: 'use', retry: false }} onDone={onDone} />);
    expect(onDone).toHaveBeenCalledWith(null);
  });
  it('组句: the tiles on the stage; the answer comes back as a use answer', () => {
    const hen = pool.find((w) => w.text === '很')!;
    const onDone = vi.fn();
    render(<PracticeQuestion {...base} word={hen} item={{ wordId: hen.id, rung: 4, ask: 'build', grades: 'use', retry: false }} onDone={onDone} />);
    expect(document.querySelectorAll('.build__bank .choice').length).toBeGreaterThanOrEqual(4);
    while (document.querySelector('.build__bank .choice')) fireEvent.click(document.querySelector<HTMLButtonElement>('.build__bank .choice')!);
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ asked: 'use', inContext: true }));
  });
  it('搭配: the word and four partners on the stage; the answer comes back as a meaning answer', () => {
    const chuan = pool.find((w) => w.text === '穿')!;
    const onDone = vi.fn();
    render(<PracticeQuestion {...base} word={chuan} item={{ wordId: chuan.id, rung: 2, ask: 'match', grades: 'meaning', retry: false }} onDone={onDone} />);
    expect(document.querySelector('.match__word')!.textContent).toBe('穿');
    expect(document.querySelectorAll('.choice')).toHaveLength(4);
    fireEvent.click(document.querySelector<HTMLButtonElement>('.choice')!);
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ asked: 'meaning' }));
  });
  it('钓鱼: the pond with the look-alike he picked among the fish; the answer comes back as a 字辨 answer', () => {
    const gen = pool.find((w) => w.text === '根')!;
    const onDone = vi.fn();
    render(<PracticeQuestion {...base} word={gen} confused={['跟']} item={{ wordId: gen.id, rung: 2, ask: 'fish', grades: null, retry: false }} onDone={onDone} />);
    expect([...document.querySelectorAll('.fishtile')].map((b) => b.textContent)).toContain('跟');
    fireEvent.click(screen.getByRole('button', { name: '根' }));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ asked: 'zibian', correct: true }));
  });
});

describe('成语 questions (spec 2026-10-05 §3.2 rung 5, phase C)', () => {
  const xin = pool.find((w) => w.text === '心')!;
  const item = (ask: 'idiom' | 'idiomFit' | 'idiomBuild' | 'whole', word = xin) => ({ wordId: word.id, rung: (ask === 'whole' ? 2 : 5) as 2 | 5, ask, grades: 'meaning' as const, retry: false });
  it('completes a 成语 that uses the word, graded as meaning', () => {
    const onDone = vi.fn();
    render(<PracticeQuestion {...base} level={1} word={xin} item={item('idiom')} onDone={onDone} />);
    expect(document.querySelector('.idiom')!.textContent).toContain('？');
    fireEvent.click(document.querySelector<HTMLButtonElement>('.choice')!);
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ asked: 'meaning' }));
  });
  it('picks the 成语 for a sentence', () => {
    render(<PracticeQuestion {...base} level={1} word={xin} item={item('idiomFit')} onDone={vi.fn()} />);
    const opts = [...document.querySelectorAll('.choice')].map((b) => b.textContent!);
    expect(opts).toHaveLength(4);
    for (const o of opts) expect(Array.from(o)).toHaveLength(4);
  });
  it('builds a sentence with the 成语', () => {
    render(<PracticeQuestion {...base} level={1} word={xin} item={item('idiomBuild')} onDone={vi.fn()} />);
    expect(document.querySelector('.build')).toBeTruthy();
    expect([...document.querySelectorAll('.build button')].some((b) => Array.from(b.textContent ?? '').length >= 4)).toBe(true);
  });
  it('a school 成语 completes itself', () => {
    const school = makeWord('五颜六色', { id: 'p:9', source: 'parent', tags: ['成语'], pinyin: 'wǔ yán liù sè' });
    render(<PracticeQuestion {...base} level={1} word={school} item={item('whole', school)} onDone={vi.fn()} />);
    expect(document.querySelector('.idiom')!.textContent).toMatch(/^[五颜六色？]{4}$/);
  });
  it('skips the question when the word has no 成语 at his level', () => {
    const onDone = vi.fn();
    const ma = pool.find((w) => w.text === '吗')!;
    render(<PracticeQuestion {...base} level={1} word={ma} item={item('idiom', ma)} onDone={onDone} />);
    expect(onDone).toHaveBeenCalledWith(null);
  });
});

describe('final review I2: Truffle peeks only at a word he missed', () => {
  it('a retry after a miss peeks; a free-play question (also marked retry) does not', () => {
    const missed = render(<PracticeQuestion {...base} word={he} item={{ wordId: he.id, rung: 1, ask: 'read', grades: null, retry: true, missed: true }} onDone={vi.fn()} />);
    expect(missed.container.querySelector('svg.truffle')?.getAttribute('data-react')).toBe('peek');
    missed.unmount();
    const free = render(<PracticeQuestion {...base} word={he} item={{ wordId: he.id, rung: 1, ask: 'read', grades: null, retry: true }} onDone={vi.fn()} />);
    expect(free.container.querySelector('svg.truffle')?.getAttribute('data-react')).not.toBe('peek');
  });
});

