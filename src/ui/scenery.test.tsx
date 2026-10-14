import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { Chest } from './Chest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('fills to the fraction and marks finished checkpoints', () => {
    const { container } = render(<ProgressBar steps={['flashcards', 'writing', 'components']} stepIndex={1} fraction={0.5} />);
    expect(container.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow')).toBe('50');
    expect((container.querySelector('.progressbar__fill') as HTMLElement).style.width).toBe('50%');
    expect(container.querySelectorAll('.progressbar__cp.is-done')).toHaveLength(1);
    expect(container.querySelectorAll('.progressbar__cp.is-current')).toHaveLength(1);
  });
});

describe('Chest', () => {
  it('is art only and shows open', () => {
    const { container } = render(<Chest open />);
    expect(container.querySelector('.chest')!.className).toContain('is-open');
    expect(container.querySelector('button')).toBeNull();
  });
});
