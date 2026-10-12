import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../../types';
import { UseQuestion } from './UseQuestion';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), reducedMotion: () => false }));

describe('选一选 with single characters says why (spec 2026-10-12 §3)', () => {
  it('a look-alike pick shows the part that differs', () => {
    const item = { kind: 'fit' as const, wordId: null, word: '晴', before: '今天是', after: '天。', options: ['晴', '睛', '请', '清'] };
    render(<UseQuestion item={item} kid={DEFAULT_KID} onAnswer={vi.fn()} onNext={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '睛' }));
    expect(document.querySelector('.sheet .why--look')!.getAttribute('data-text')).toBe('晴 日 sun · 睛 目 eye');
  });
});
