import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../lib/random';
import { CHEERS, pickLine } from './pet';

describe('pet', () => {
  it('picks one of his lines', () => {
    expect(CHEERS).toContain(pickLine(CHEERS, mulberry32(1)));
  });
  it('no run-of-right-answers praise any more (spec 2026-10-11 §5)', async () => {
    const pet = await import('./pet');
    expect('comboPraise' in pet || 'comboMilestone' in pet).toBe(false);
  });
});
