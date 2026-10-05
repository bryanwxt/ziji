import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../types';
import { Label } from './Label';
import { Pet } from './Pet';
import { PinPad } from './PinPad';
import { SpeakButton } from './SpeakButton';

vi.mock('../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
import { speak } from '../audio/speech';

describe('widgets', () => {
  it('Label can take the syllables from context, so 子 in 儿子 reads zi, not zǐ', () => {
    const { container } = render(<Label zh="＿子" py="zi" />);
    expect(container.querySelector('.label')?.getAttribute('data-py')).toBe('zi');
  });
  it('Label draws a ＿ blank as its own empty box, never a line that could pass for 一', () => {
    const { container } = render(<Label zh="＿！子" />);
    const cells = [...container.querySelectorAll('.label__cell')];
    expect(cells.map((c) => c.className)).toEqual(['label__cell label__cell--blank', 'label__cell', 'label__cell label__cell--zh']);
  });
  it('Label can hide pinyin over chosen characters (fading pinyin for known ones)', () => {
    const { container } = render(<Label zh="你好" pinyinFor={(c) => c !== '好'} />);
    expect([...container.querySelectorAll('.label__py')].map((e) => e.textContent)).toEqual(['nǐ', '']);
  });
  it('Label falls back to its own reading when the given syllables do not fit', () => {
    const { container } = render(<Label zh="儿子" py="zi" />);
    expect(container.querySelector('.label')?.getAttribute('data-py')).toBe('ér zi');
  });
  it('Label puts each syllable directly above its own character', () => {
    const { container } = render(<Label zh="你好！" />);
    const cells = [...container.querySelectorAll('.label__cell')];
    expect(cells.map((c) => [c.querySelector('.label__py')?.textContent, c.querySelector('.label__ch')?.textContent])).toEqual([
      ['nǐ', '你'], ['hǎo', '好'], ['', '！'],
    ]);
    expect(container.querySelector('.label')?.getAttribute('data-py')).toBe('nǐ hǎo');
    expect(cells.map((c) => c.classList.contains('label__cell--zh'))).toEqual([true, true, false]);
    expect(screen.getByText('你好！')).toBeTruthy(); // the whole phrase stays readable as one piece of text
  });

  it("Pet is Truffle wearing the kid's accessory, with a bubble", () => {
    const { container } = render(<Pet kid={{ ...DEFAULT_KID, ownedAccessories: ['medal'], wearing: 'medal' }} mood="pleased" bubble="加油！" />);
    expect(screen.getByRole('img', { name: '松露' }).getAttribute('data-mood')).toBe('pleased');
    expect(container.querySelector('.truffle__accessory')).toBeTruthy();
    expect(screen.getByText('加油！')).toBeTruthy();
  });

  it('PinPad reports a 4-digit PIN and resets', () => {
    const onComplete = vi.fn();
    render(<PinPad onComplete={onComplete} />);
    for (const d of ['1', '2', '3', '4']) fireEvent.click(screen.getByRole('button', { name: d }));
    expect(onComplete).toHaveBeenCalledWith('1234');
    expect(document.querySelectorAll('.pin-dots .is-filled')).toHaveLength(0);
  });

  it('SpeakButton speaks its text', () => {
    render(<SpeakButton text="河" />);
    fireEvent.click(screen.getByRole('button', { name: '听' }));
    expect(speak).toHaveBeenCalledWith('河');
  });
});

describe('Label blanks', () => {
  it('a screen reader hears a blank as 空格', () => {
    const { container } = render(<Label zh="＿半" />);
    expect(container.querySelector('.sr-only')?.textContent).toBe('空格半');
  });
});

describe('Label digits', () => {
  it('keeps numbers together in the pinyin line', () => {
    const { container } = render(<Label zh="我认识 45 个字" />);
    expect(container.querySelector('.label')?.getAttribute('data-py')).toBe('wǒ rèn shi 45 gè zì');
    expect([...container.querySelectorAll('.label__ch')].map((c) => c.textContent)).toContain('45'); // its own slot, no padding spaces (parent, 2026-10-05: wide gaps around the number)
  });
});

describe('Pet bubble', () => {
  it('shows pinyin above the bubble words', () => {
    const { container } = render(<Pet kid={DEFAULT_KID} bubble="再想想" />);
    expect(container.querySelector('.pet__bubble .label')?.getAttribute('data-py')).toBe('zài xiǎng xiǎng');
  });
});

describe('Pet power', () => {
  it('shows the chosen power at the tier the child has seen', () => {
    const { container } = render(<Pet kid={{ ...DEFAULT_KID, activePower: 'water', powerTiersSeen: { water: 2 } }} />);
    expect(container.querySelector('svg.truffle')?.getAttribute('data-tier')).toBe('2');
    expect(container.querySelector('svg.truffle')?.getAttribute('data-power')).toBe('water');
  });
});

describe('Pet costume', () => {
  it('accessories go with a onesie', () => {
    const { container } = render(<Pet kid={{ ...DEFAULT_KID, outfit: 'tiger', wearing: 'scarf' }} />);
    expect(container.querySelector('svg.truffle')?.getAttribute('data-outfit')).toBe('tiger');
    expect(container.querySelector('.truffle__accessory')).toBeTruthy();
  });
});
