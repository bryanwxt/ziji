import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { speak } from '../../audio/speech';
import { DEFAULT_KID } from '../../types';
import { ChooseStep } from './ChooseStep';

vi.mock('../../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => false }));
afterEach(cleanup);

const fit = { kind: 'fit' as const, wordId: 'b:很', word: '很', before: '今天', after: '热。', options: ['在', '很', '和', '跟'], clue: '想一想' };
const usage = { kind: 'usage' as const, wordId: 'b:很', word: '很', right: '这个书包很大。', wrong: '我很一个书包。', pair: '多' };

describe('ChooseStep', () => {
  it('a fit question: pick the word, Truffle reads the whole sentence, a miss shows the clue', () => {
    const onAnswer = vi.fn();
    render(<ChooseStep items={[fit]} kid={DEFAULT_KID} resting="sulk" onAnswer={onAnswer} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '在' }));
    expect(onAnswer).toHaveBeenCalledWith(fit, false, expect.any(Number));
    expect(speak).toHaveBeenLastCalledWith('今天很热。');
    expect(screen.getByText('想一想')).toBeTruthy();
  });
  it('用对了吗: two sentences, the right one wins, and the pairing shows', () => {
    const onAnswer = vi.fn();
    render(<ChooseStep items={[usage]} kid={DEFAULT_KID} resting="sulk" onAnswer={onAnswer} onDone={vi.fn()} />);
    expect(screen.getByRole('button', { name: '我很一个书包。' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '这个书包很大。' }));
    expect(onAnswer).toHaveBeenCalledWith(usage, true, expect.any(Number));
    expect(screen.getByText('很 + 多')).toBeTruthy();
  });
  it('ends after the last item', () => {
    const onDone = vi.fn();
    render(<ChooseStep items={[fit]} kid={DEFAULT_KID} resting="sulk" onAnswer={vi.fn()} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: '很' }));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalled();
  });
});

describe('progress (deferred minor, plan 13)', () => {
  it('reports how far through the items he is', () => {
    const onProgress = vi.fn();
    render(<ChooseStep items={[fit, usage]} kid={DEFAULT_KID} resting="sulk" onAnswer={vi.fn()} onDone={vi.fn()} onProgress={onProgress} />);
    fireEvent.click(screen.getByRole('button', { name: '很' }));
    fireEvent.click(screen.getByText('继续'));
    expect(onProgress).toHaveBeenLastCalledWith(0.5);
  });
});

describe('选一选 / 用一用 on the stage (spec 2026-10-04 §3)', () => {
  it('a fit question: Truffle in his spot, the sentence with pinyin and a speaker on the card', () => {
    render(<ChooseStep items={[fit]} kid={DEFAULT_KID} resting="sulk" onAnswer={vi.fn()} onDone={vi.fn()} />);
    const card = document.querySelector('.stage[data-stage="use"] .stage__card')!;
    expect(card.querySelector('.meaning-cue--sentence .label__py')).toBeTruthy();
    expect(card.querySelector('.meaning-cue--sentence[data-q]')).toBeNull(); // a sentence is sized as a sentence, not as a question character
    expect(card.querySelector('.meaning-cue--sentence .speak')).toBeTruthy();
    expect(document.querySelector('.stage__truffle .pet')).toBeTruthy();
  });
  it('the speaker reads around the gap before the answer, never the word itself', () => {
    vi.mocked(speak).mockClear();
    render(<ChooseStep items={[fit]} kid={DEFAULT_KID} resting="sulk" onAnswer={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(document.querySelector('.meaning-cue--sentence .speak')!);
    expect(vi.mocked(speak).mock.calls.at(-1)![0]).toBe('今天，，热。');
  });
  it('用对了吗: each sentence has pinyin and its own speaker, outside the answer button', () => {
    render(<ChooseStep items={[usage]} kid={DEFAULT_KID} resting="sulk" onAnswer={vi.fn()} onDone={vi.fn()} />);
    const rows = [...document.querySelectorAll('.usage-row')];
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.querySelector('button.usage-opt .label__py')).toBeTruthy();
      expect(r.querySelector(':scope > .speak')).toBeTruthy();
    }
  });
  it('a short fill-in (four characters or fewer) is sized as a question, not as a sentence', () => {
    const shortFit = { ...fit, before: '读', after: '', word: '书', options: ['书', '树', '熟', '数'] };
    render(<ChooseStep items={[shortFit]} kid={DEFAULT_KID} resting="sulk" onAnswer={vi.fn()} onDone={vi.fn()} />);
    expect(document.querySelector('.meaning-cue--short[data-q]')).toBeTruthy();
  });
});
