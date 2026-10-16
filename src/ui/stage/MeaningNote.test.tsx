import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { glossFor } from '../../content/glossary';
import { MeaningNote, PICKED_LABEL, RIGHT_LABEL } from './MeaningNote';

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
    expect(lines[1]!.querySelector('.sheet__en-zh .label__py')!.textContent).toBe('gēn');
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


describe('the miss sheet as a two-row comparison (parent 2026-10-16: "can the formatting of the wrong answer section be improved")', () => {
  const cells = (row: Element) => [...row.children].map((c) => c.className.split(' ')[0]);
  const zhOf = (row: Element) => row.querySelector('.sheet__en-zh .label')!.getAttribute('data-zh');
  it('✓ 正确答案 | 鱼 | fish | speak, then ✗ 你选的 | 立 | stand: the same cells in the same order', () => {
    const { container } = render(<MeaningNote lead right="鱼" rightPinyin="yú" picked="立" />);
    const [right, mine] = [...container.querySelectorAll('.sheet__en-line')];
    expect(container.querySelector('.sheet__en')!.classList.contains('sheet__en--named')).toBe(true);
    expect(cells(right!)).toEqual(['sheet__en-label', 'sheet__en-zh', 'sheet__en-gloss', 'speak']);
    expect(cells(mine!)).toEqual(['sheet__en-label', 'sheet__en-zh', 'sheet__en-gloss']); // no second speak button
    expect(right!.querySelector('.sheet__en-label .label')!.getAttribute('data-zh')).toBe(RIGHT_LABEL);
    expect(mine!.querySelector('.sheet__en-label .label')!.getAttribute('data-zh')).toBe(PICKED_LABEL);
    expect(right!.querySelector('.sheet__en-label .label')!.getAttribute('data-py')).toBe('zhèng què dá àn'); // the names have pinyin
    expect([zhOf(right!), zhOf(mine!)]).toEqual(['鱼', '立']);
    expect(right!.querySelector('.sheet__en-gloss')!.textContent).toBe(glossFor('鱼'));
    expect(mine!.querySelector('.sheet__en-gloss')!.textContent).toBe(glossFor('立'));
    expect(mine!.classList.contains('sheet__en-picked')).toBe(true); // the quieter row
  });
  it('a pick with no English still keeps its English cell, so the columns line up', () => {
    const { container } = render(<MeaningNote right="根" picked={{ zh: '彐' }} />);
    const mine = container.querySelector('.sheet__en-picked')!;
    expect(cells(mine)).toEqual(['sheet__en-label', 'sheet__en-zh', 'sheet__en-gloss']);
    expect(mine.querySelector('.sheet__en-gloss')!.textContent).toBe('');
  });
  it('no pick and nothing to lead: just the answer and its English, no names and no speak button', () => {
    const { container } = render(<MeaningNote right="根" />);
    expect(container.querySelector('.sheet__en--named')).toBeNull();
    expect(container.querySelector('.sheet__en-label, .speak')).toBeNull();
  });
  it('leading with no pick (a 都不对 answered right): named 正确答案, with its speak button', () => {
    const { container } = render(<MeaningNote lead right="根" />);
    expect(container.querySelectorAll('.sheet__en-line')).toHaveLength(1);
    expect(container.querySelector('.sheet__en-right .sheet__en-label')).toBeTruthy();
    expect(container.querySelector('.sheet__en-right .speak')).toBeTruthy();
  });
  it('搭配 says its pair above the note: no second speak button', () => {
    expect(render(<MeaningNote right="面条" picked="气球" speak={false} />).container.querySelector('.speak')).toBeNull();
  });
  it('the why-line is the third row, inside the comparison', () => {
    const { container } = render(<MeaningNote lead right="扫" picked="扬" why={<p class="why">x</p>} />);
    expect([...container.querySelector('.sheet__en')!.children].map((c) => c.className)).toEqual(['sheet__en-line sheet__en-right', 'sheet__en-line sheet__en-picked', 'why']);
    expect(render(<MeaningNote right="欺负欺负" why={<p class="why">y</p>} />).container.querySelector('.why')).toBeTruthy(); // nothing else to show: the why alone
  });
  it('a word of three characters or more marks the note long (on a phone its English goes under it)', () => {
    expect(render(<MeaningNote lead right="美中不足" picked="说" />).container.querySelector('.sheet__en--long')).toBeTruthy();
    expect(render(<MeaningNote lead right="鱼" picked="立" />).container.querySelector('.sheet__en--long')).toBeNull();
  });
  it('都不对 picked: its own row, said plainly', async () => {
    const { NONE_PICKED_EN } = await import('../../practice/missNote');
    const { container } = render(<MeaningNote lead right="根" picked="都不对" />);
    expect(zhOf(container.querySelector('.sheet__en-picked')!)).toBe('都不对');
    expect(container.querySelector('.sheet__en-picked .sheet__en-gloss')!.textContent).toBe(NONE_PICKED_EN);
  });
});
