import { describe, expect, it } from 'vitest';
import { dayMood, requestGreeting, takeGreeting } from './greeting';

describe('greetings and his memory of the days (spec 2026-10-04 §4.6)', () => {
  it('a greeting is taken once', () => {
    requestGreeting('你好！');
    expect(takeGreeting()).toBe('你好！');
    expect(takeGreeting()).toBeNull();
  });
  it('yesterday done: a streak; the last time before yesterday: missed; never before (or only today): plain', () => {
    expect(dayMood(['2026-10-01'], '2026-10-02')).toBe('streak');
    expect(dayMood(['2026-09-28', '2026-09-27'], '2026-10-02')).toBe('missed');
    expect(dayMood([], '2026-10-02')).toBe('plain');
    expect(dayMood(['2026-10-02'], '2026-10-02')).toBe('plain');
    expect(dayMood(['2026-09-30'], '2026-10-01')).toBe('streak'); // across a month end
  });
});
