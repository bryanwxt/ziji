import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../../content';
import { FeedbackSheet } from './FeedbackSheet';
import { LookAlikeWhy, PinyinWhy, RadicalHint } from './WhyLine';

const w = (t: string) => builtinWords(0).find((x) => x.text === t)!;
const why = (c: Element) => c.querySelector('.why')?.getAttribute('data-text');

describe('the look-alike line (spec 2026-10-12 §3)', () => {
  it('both characters, the right one first, each with the part only it has and a radical\'s meaning', () => {
    const { container } = render(<LookAlikeWhy right="河" picked="何" />);
    expect(why(container)).toBe('河 氵 water · 何 亻 person');
    expect([...container.querySelectorAll('.why__zh')].map((e) => e.textContent)).toEqual(['河', '何']);
    expect(container.querySelectorAll('.why__part svg')).toHaveLength(2); // the ink icons
  });
  it('a part he knows with no meaning is still named, without English; one he does not know is left out (银 · 铁 = 钅 + 失)', () => {
    const { container } = render(<LookAlikeWhy right="银" picked="铁" />);
    expect(why(container)).toBe('银 · 铁 失');
  });
  it('nothing to tell apart: the fallback, or nothing', () => {
    expect(render(<LookAlikeWhy right="未" picked="末" />).container.innerHTML).toBe('');
    expect(render(<LookAlikeWhy right="大" picked="小" fallback={<i class="old" />} />).container.querySelector('.old')).toBeTruthy();
  });
});

describe('the look-alike line as sums (parent 2026-10-16: "扫 彐 扬 昜" read as a stray row)', () => {
  it('不一样, then 河 = 氵 + 可 · 何 = 亻 + 可: the shared part plain, each one\'s own part marked', () => {
    const { container } = render(<LookAlikeWhy right="河" picked="何" />);
    expect(container.querySelector('.why__label .label')!.getAttribute('data-zh')).toBe('不一样');
    const sums = [...container.querySelectorAll('.why__char')].map((c) => [...c.querySelectorAll('.why__zh, .why__shared, .why__own')].map((e) => `${e.classList.contains('why__own') ? '*' : ''}${e.textContent}`).join(' '));
    expect(sums).toEqual(['河 *氵 可', '何 *亻 可']);
    expect(container.querySelectorAll('.why__op')).toHaveLength(4); // = + for each
  });
  it('no parts he does not know (review 2026-10-17): 扫 · 扬 differ only in 彐 and 昜, so no line', () => {
    expect(render(<LookAlikeWhy right="扫" picked="扬" />).container.innerHTML).toBe('');
    expect(render(<LookAlikeWhy right="扫" picked="扬" fallback={<i class="old" />} />).container.querySelector('.old')).toBeTruthy();
  });
  it('a sum with a part he does not know shows his own known part alone (根 木 · 跟 足)', () => {
    const { container } = render(<LookAlikeWhy right="根" picked="跟" />);
    expect(container.querySelector('.why__sum')).toBeNull();
    expect(why(container)).toBe('根 木 tree · 跟 足 foot');
  });
  it('characters that do not really look alike get no comparison (衣 · 商 share only 亠; never 商 → 口 丷 冏)', () => {
    expect(render(<LookAlikeWhy right="衣" picked="商" />).container.innerHTML).toBe('');
    expect(render(<LookAlikeWhy right="商" picked="衣" fallback={<i class="old" />} />).container.querySelector('.old')).toBeTruthy();
    expect(document.body.textContent).not.toContain('冏');
  });
  it('a character inside the other has no sum of its own (生 · 星 = 日 + 生)', () => {
    const { container } = render(<LookAlikeWhy right="生" picked="星" />);
    const [mine, other] = [...container.querySelectorAll('.why__char')];
    expect(mine!.querySelector('.why__sum')).toBeNull();
    expect(other!.querySelector('.why__own')!.textContent).toBe('日');
  });
});

describe('the pinyin line (spec 2026-10-12 §3)', () => {
  it('tone: 声调不同 with the right syllable and the picked one', () => {
    const { container } = render(<PinyinWhy word={w('请')} picked="qìng" />);
    expect(container.querySelector('.why--tone')!.getAttribute('data-text')).toBe('声调不同 qǐng qìng');
    expect([...container.querySelectorAll('.why__syl')].map((e) => e.textContent)).toEqual(['qǐng', 'qìng']);
  });
  it('sound part: 青 读 qīng，请 读 qǐng', () => {
    const { container } = render(<PinyinWhy word={w('请')} picked="qīng" />);
    expect(container.querySelector('.why--part')!.getAttribute('data-text')).toBe('青 读 qīng，请 读 qǐng');
  });
  it('initial or final: the letters that differ are marked', () => {
    const ini = render(<PinyinWhy word={w('群')} picked="cún" />).container;
    expect([...ini.querySelectorAll('.why--initial mark')].map((m) => m.textContent)).toEqual(['q', 'c']);
    const fin = render(<PinyinWhy word={w('街')} picked="jiā" />).container;
    expect([...fin.querySelectorAll('.why--final mark')].map((m) => m.textContent)).toEqual(['iē', 'iā']);
  });
  it('another slip: nothing (today\'s sheet)', () => {
    expect(render(<PinyinWhy word={w('河')} picked="dà" />).container.innerHTML).toBe('');
  });
});

describe('the radical hint (spec 2026-10-12 §3: a meaning miss)', () => {
  it('氵 → water for 河; nothing for a word, or a character that is its own radical', () => {
    expect(why(render(<RadicalHint text="河" />).container)).toBe('氵 → water');
    expect(render(<RadicalHint text="河流" />).container.innerHTML).toBe('');
    expect(render(<RadicalHint text="木" />).container.innerHTML).toBe('');
  });
});

describe('character first (spec 2026-10-12 §3)', () => {
  it("a miss marks its detail so the pinyin and English come 1 s after the characters; a right answer's does not", () => {
    const { container, rerender } = render(<FeedbackSheet tone="oops" title="慢慢来！" detail={<span>x</span>} actionLabel="继续" onAction={() => {}} />);
    expect(container.querySelector('.sheet__detail')!.classList.contains('sheet__detail--later')).toBe(true);
    rerender(<FeedbackSheet tone="good" title="真厉害！" detail={<span>x</span>} actionLabel="继续" onAction={() => {}} />);
    expect(container.querySelector('.sheet__detail')!.classList.contains('sheet__detail--later')).toBe(false);
  });
});
