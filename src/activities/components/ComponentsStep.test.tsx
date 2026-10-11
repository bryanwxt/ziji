import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { speak } from '../../audio/speech';
import { DEFAULT_KID } from '../../types';
import { ComponentsStep } from './ComponentsStep';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), reducedMotion: () => false }));
afterEach(cleanup);

const item = { wordId: 'p:1', word: '树根', index: 1, answer: '根', options: ['跟', '根', '很', '银'] };

describe('ComponentsStep — 字辨 in the pond (spec §20 part 8)', () => {
  it('shows the word with its missing character, and four fish to catch', () => {
    render(<ComponentsStep items={[item]} kid={DEFAULT_KID} onAnswer={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByText('树')).toBeTruthy();
    expect(document.querySelectorAll('.fishtile')).toHaveLength(4);
    expect(screen.getByText('钓鱼啦！')).toBeTruthy();
  });
  it('a miss: Truffle reads the word, and the part that tells them apart shows (spec 2026-10-12 §3)', () => {
    const onAnswer = vi.fn();
    render(<ComponentsStep items={[item]} kid={DEFAULT_KID} onAnswer={onAnswer} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '跟' }));
    expect(onAnswer).toHaveBeenCalledWith(item, false);
    expect(speak).toHaveBeenLastCalledWith('树根');
    expect(document.querySelector('.sheet .why--look')!.getAttribute('data-text')).toBe('根 木 tree · 跟 足 foot');
  });
  it('a catch, then 继续 ends the round', () => {
    const onDone = vi.fn();
    const onAnswer = vi.fn();
    render(<ComponentsStep items={[item]} kid={DEFAULT_KID} onAnswer={onAnswer} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: '根' }));
    expect(onAnswer).toHaveBeenCalledWith(item, true);
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalled();
  });
  it('a chosen character with the same radical: its other part is the difference (银 艮 · 铁 失)', () => {
    const same = { wordId: 'p:3', word: '银行', index: 0, answer: '银', options: ['银', '铁', '根', '很'] };
    render(<ComponentsStep items={[same]} kid={DEFAULT_KID} onAnswer={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '铁' }));
    expect(document.querySelector('.sheet .why--look')!.getAttribute('data-text')).toBe('银 艮 · 铁 失');
  });
  it('a catch keeps the answer\'s radical row', () => {
    render(<ComponentsStep items={[item]} kid={DEFAULT_KID} onAnswer={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '根' }));
    expect(document.querySelectorAll('.sheet .zibian__radical')).toHaveLength(1);
    expect(document.querySelector('.sheet .why')).toBeNull();
});
});

describe('progress (deferred minor, plan 13)', () => {
  it('reports how far through the round he is', () => {
    const onProgress = vi.fn();
    render(<ComponentsStep items={[item, { ...item, wordId: 'p:2' }]} kid={DEFAULT_KID} onAnswer={vi.fn()} onDone={vi.fn()} onProgress={onProgress} />);
    fireEvent.click(screen.getByRole('button', { name: '根' }));
    fireEvent.click(screen.getByText('继续'));
    expect(onProgress).toHaveBeenLastCalledWith(0.5);
  });
});

describe('字辨 on the stage (spec 2026-10-04 §3)', () => {
  it('Truffle in his spot, the word with its gap on the card, the fish tiles below it', () => {
    render(<ComponentsStep items={[item]} kid={DEFAULT_KID} onAnswer={vi.fn()} onDone={vi.fn()} />);
    const stage = document.querySelector('.stage[data-stage="zibian"]')!;
    expect(stage.querySelector('.stage__truffle .pet')).toBeTruthy();
    expect(stage.querySelector('.stage__card .pond-q[data-q]')).toBeTruthy();
    expect(stage.querySelector('.stage__card .pond')).toBeTruthy();
  });
});

describe('Truffle in 字辨 (spec 2026-10-04 §4.3–4.4)', () => {
  it('calm before the answer; happy after a catch', () => {
    render(<ComponentsStep items={[item]} kid={DEFAULT_KID} onAnswer={vi.fn()} onDone={vi.fn()} />);
    expect(document.querySelector('.stage__truffle svg.truffle')!.getAttribute('data-calm')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '根' }));
    expect(document.querySelector('.stage__truffle svg.truffle')!.getAttribute('data-calm')).toBeNull();
    expect(document.querySelector('.stage__truffle svg.truffle')!.getAttribute('data-expression')).toBe('happy');
  });
  it('curious after a miss', () => {
    render(<ComponentsStep items={[item]} kid={DEFAULT_KID} onAnswer={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '跟' }));
    expect(document.querySelector('.stage__truffle svg.truffle')!.getAttribute('data-expression')).toBe('curious');
  });
});
