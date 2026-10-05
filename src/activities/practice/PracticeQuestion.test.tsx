import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../../content';
import { bankFor } from '../../content/sentenceBank';
import { DEFAULT_KID } from '../../types';
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
});
