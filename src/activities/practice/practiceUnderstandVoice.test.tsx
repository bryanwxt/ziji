import { render } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../../types';
import { makeWord } from '../../test/fixtures';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../practice/understand', () => ({ understandItem: () => ({ zh: '我家有一只猫。', en: 'We have a cat.', choices: ['We have a cat.', 'A dog runs.', 'It rains.'] }) }));
import { PracticeQuestion } from './PracticeQuestion';

describe('final review I1: a saved Understand question with no voice today', () => {
  it('is skipped, never asked in silence', () => {
    const onDone = vi.fn();
    const w = makeWord('猫', { meaning: 'cat' });
    render(<PracticeQuestion item={{ wordId: w.id, rung: 3, ask: 'understand', grades: 'understand', retry: false }} word={w} pool={[w]} voice={false} kid={DEFAULT_KID} resting="sulk" combo={0} closeupReady={false} onDone={onDone} />);
    expect(onDone).toHaveBeenCalledWith(null);
    expect(document.querySelector('.understand__choice')).toBeNull();
  });
});
