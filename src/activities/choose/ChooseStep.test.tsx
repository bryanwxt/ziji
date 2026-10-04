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
