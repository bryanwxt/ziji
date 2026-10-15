import { render } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { Label, nobreakGroups } from './Label';

vi.mock('../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));

/** The groups as text, so a test reads like the line it guards. */
const runs = (cells: string[]) => nobreakGroups(cells).map((g) => g.map((i) => cells[i]).join(''));

describe('nobreakGroups (punctuation never starts a line)', () => {
  it('keeps closing punctuation with the character before it', () => {
    expect(runs([...'我们要保持教室干净', '。'])).toEqual([...'我们要保持教室干', '净。']);
    expect(runs(['好', '，', '走', '！'])).toEqual(['好，', '走！']);
  });

  it('covers every closing mark the app writes', () => {
    for (const p of ['。', '，', '！', '？', '、', '；', '：', '」', '』', '）', '…', '”', '!', '?', ',', '.']) expect(runs(['字', p]), p).toEqual([`字${p}`]);
  });

  it('keeps a run like 」。 together and with its character', () => {
    expect(runs(['说', '」。'])).toEqual(['说」。']);
  });

  it('keeps opening punctuation with the character after it', () => {
    expect(runs(['用', '『', '保', '持', '』', '说'])).toEqual(['用', '『保', '持』', '说']);
    expect(runs(['他', '说', '：「', '好'])).toEqual(['他', '说：「好']);
  });

  it('keeps a number with its measure word (已测 14 个字)', () => {
    expect(runs(['测', '14', '个', '字', '，'])).toEqual(['测', '14个', '字，']);
    expect(runs(['定', '1017', '个'])).toEqual(['定', '1017个']);
  });

  it('ignores the spaces Label keeps around a separator', () => {
    expect(runs(['下', ' · ', '已'])).toEqual(['下 · ', '已']);
  });

  it('leaves plain characters free to break, and a lone cell alone', () => {
    expect(runs([...'你好吗'])).toEqual(['你', '好', '吗']);
    expect(runs(['！'])).toEqual(['！']);
    expect(nobreakGroups([])).toEqual([]);
  });

  it('keeps a blank with the punctuation after it', () => {
    expect(runs(['＿', '！', '子'])).toEqual(['＿！', '子']);
  });
});

describe('Label groups', () => {
  it('wraps a character and its closing punctuation in one unbreakable run', () => {
    const { container } = render(<Label zh="教室干净。" />);
    const nb = [...container.querySelectorAll('.label__nb')];
    expect(nb.map((e) => [...e.querySelectorAll('.label__ch')].map((c) => c.textContent).join(''))).toEqual(['净。']);
    // the cells themselves are unchanged: four characters, then the 。
    expect([...container.querySelectorAll('.label__cell')].map((c) => c.querySelector('.label__ch')!.textContent)).toEqual([...'教室干净。']);
  });

  it('keeps 14 with 个 in the placement line', () => {
    const { container } = render(<Label zh="读到 三下 · 已测 14 个字，推定 1017 个" />);
    const nb = [...container.querySelectorAll('.label__nb')].map((e) => [...e.querySelectorAll('.label__ch')].map((c) => c.textContent).join(''));
    expect(nb).toContain('14个');
    expect(nb).toContain('1017个');
    expect(nb).toContain('字，');
  });
});
