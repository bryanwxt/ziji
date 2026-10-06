import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/content/understand', () => ({
  SENTENCE_TERMS: ['一上'],
  inScopeWords: () => [{ text: '大' }],
  sentencesFor: (t: string) => (t === '大' ? [{ zh: '大人在家里。', en: 'The grown-ups are home.' }, { zh: '我们家很大。', en: 'Our home is big.' }] : []),
}));
import { buildInventory } from './inventory';

describe('clips for the Understand sentences (plan 2b)', () => {
  it('every sentence gets a clip', () => {
    const jobs = buildInventory('test:voice@1/1');
    for (const zh of ['大人在家里。', '我们家很大。']) expect(jobs.some((j) => j.text === zh && j.kind === 'sentence'), zh).toBe(true);
  });
});
