import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { MeaningNote } from './MeaningNote';

describe("I4: a school 成语's own meaning reaches the sheet (spec §3.6)", () => {
  it('uses the meaning the parent typed when the lists have none', () => {
    const { container } = render(<MeaningNote right="守株待兔" rightMeaning="wait for luck instead of working" />);
    expect(container.querySelector('.sheet__en')!.getAttribute('data-text')).toBe('守株待兔 wait for luck instead of working');
  });
});
