import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { glossFor } from '../../content/glossary';
import { MeaningNote } from './MeaningNote';

describe('English on the sheet after a wrong answer (spec 2026-10-05 §3.6)', () => {
  it("the right answer's meaning, then what he picked", () => {
    const { container } = render(<MeaningNote right="根" picked="跟" />);
    const en = container.querySelector('.sheet__en')!.getAttribute('data-text')!;
    expect(en).toContain(`根 ${glossFor('根')}`);
    expect(en).toContain(`跟 ${glossFor('跟')}`);
    expect(en.indexOf('根')).toBeLessThan(en.indexOf('跟'));
  });
  it('no gloss for something that is not a word (a made-up 词语, a pinyin choice)', () => {
    const { container } = render(<MeaningNote right="根" picked="树跟" />);
    expect(container.textContent).not.toContain('树跟');
    const pinyin = render(<MeaningNote right="根" picked="gěn" />);
    expect(pinyin.container.querySelectorAll('.sheet__en-line')).toHaveLength(1); // only 根 (its own pinyin over it), not the picked pinyin
    expect(pinyin.container.textContent).not.toContain('gěn');
  });
  it('a single character he picked gets its pinyin even with no English: he may not know how to say it (parent, 2026-10-05)', () => {
    const { container } = render(<MeaningNote right="根" picked="跟" />);
    const lines = container.querySelectorAll('.sheet__en-line');
    expect(lines).toHaveLength(2);
    expect(lines[1]!.querySelector('.label__py')!.textContent).toBe('gēn');
  });
  it('nothing at all when nothing has a gloss', () => {
    expect(render(<MeaningNote right="欺负欺负" />).container.innerHTML).toBe('');
  });
});

describe('a 成语 on the sheet (spec §3.6, phase C)', () => {
  it("gives the 成语's meaning from the list", async () => {
    const { chengyuOf } = await import('../../content/chengyu');
    const { container } = render(<MeaningNote right="五颜六色" />);
    expect(container.querySelector('.sheet__en')!.getAttribute('data-text')).toBe(`五颜六色 ${chengyuOf('五颜六色')!.meaning}`);
  });
});

