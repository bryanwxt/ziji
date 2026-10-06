import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { makeCard } from '../test/fixtures';
import { summarize } from '../stats/stats';
import { PLACES } from './town';
import { TownMap } from './TownMap';

const now = new Date('2026-10-06T09:00:00');
describe('TownMap (spec 2026-10-06 §3.7)', () => {
  it('nine places named in Chinese, each with a window per word, lit by what he has heard and owns', () => {
    const p = PLACES[0]!;
    const heard = makeCard(p.words[0]!, 'hear', now, true);
    const { container } = render(<TownMap know={summarize(builtinWords(0), [heard])} />);
    const places = container.querySelectorAll('.town__place');
    expect(places).toHaveLength(9);
    expect(places[0]!.classList.contains('town__place--part')).toBe(true);
    expect(places[1]!.classList.contains('town__place--dark')).toBe(true);
    expect(places[0]!.querySelectorAll('.town__win')).toHaveLength(6);
    expect(places[0]!.querySelectorAll('.town__win--1')).toHaveLength(1);
    expect(places[0]!.getAttribute('aria-label')).toBe('组屋：亮了 1 个');
    expect(container.querySelector('.town')!.textContent).toContain('字己镇');
    const text = container.cloneNode(true) as HTMLElement;
    text.querySelectorAll('.label__py').forEach((e) => e.remove()); // pinyin over the characters is not English
    expect(text.textContent).not.toMatch(/[A-Za-z]/); // his screen: Chinese only
  });
  it('nothing in it moves (reduced motion or not)', () => {
    const { container } = render(<TownMap know={summarize(builtinWords(0), [])} />);
    expect(container.querySelector('animate, animateTransform, [class*="pulse"], [class*="anim"]')).toBeNull();
  });
});
