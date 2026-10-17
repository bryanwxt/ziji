import { describe, expect, it } from 'vitest';
import { lessonStops, pathNodes } from './path';

const ALL = ['flashcards', 'writing', 'components', 'speaking'] as const;
const states = (n: ReturnType<typeof pathNodes>) => n.map((x) => `${x.kind}:${x.state}`);

describe('pathNodes', () => {
  it('starts at the first step, chest last', () => {
    expect(states(pathNodes([...ALL], [], false, false))).toEqual([
      'flashcards:current', 'writing:upcoming', 'components:upcoming', 'speaking:upcoming', 'chest:upcoming',
    ]);
  });
  it('moves the current node past finished steps', () => {
    expect(states(pathNodes([...ALL], ['flashcards'], false, false))[1]).toBe('writing:current');
  });
  it('makes the chest current when the day is done but it is still closed', () => {
    expect(states(pathNodes([...ALL], [...ALL], false, true))).toEqual([
      'flashcards:done', 'writing:done', 'components:done', 'speaking:done', 'chest:current',
    ]);
  });
  it('is all done once the chest is opened', () => {
    expect(pathNodes([...ALL], [...ALL], true, true).every((n) => n.state === 'done')).toBe(true);
  });
  it('only shows switched-on steps', () => {
    expect(states(pathNodes(['flashcards', 'speaking'], [], false, false))).toEqual(['flashcards:current', 'speaking:upcoming', 'chest:upcoming']);
  });
  it('with only 用一用 left (he left during it), the chest is the stop to tap: it resumes the lesson', () => {
    const steps = ['flashcards', 'choose', 'wrapup'] as const;
    expect(states(pathNodes([...steps], ['flashcards', 'choose'], false, false))).toEqual(['flashcards:done', 'choose:done', 'chest:current']);
  });
});

describe('lessonStops: one set of names on the path (review 2026-10-17)', () => {
  it("a lesson saved with the old steps shows today's stops: 认一认 → 认新字, 选一选 and 钓鱼 → 练一练", () => {
    const old = ['flashcards', 'choose', 'components', 'writing', 'speaking'] as const;
    expect(states(lessonStops(pathNodes([...old], [...old], true, true)))).toEqual(['newwords:done', 'practice:done', 'writing:done', 'speaking:done', 'chest:done']);
  });
  it('a merged stop is done only when all of it is; it is current when any of it is', () => {
    const old = ['flashcards', 'choose', 'components', 'writing'] as const;
    expect(states(lessonStops(pathNodes([...old], ['flashcards', 'choose'], false, false)))).toEqual(['newwords:done', 'practice:current', 'writing:upcoming', 'chest:upcoming']);
  });
  it("today's steps pass through unchanged", () => {
    const now = ['newwords', 'practice', 'writing', 'speaking'] as const;
    const nodes = pathNodes([...now], ['newwords'], false, false);
    expect(lessonStops(nodes)).toEqual(nodes);
  });
});
