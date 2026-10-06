import { describe, expect, it } from 'vitest';
import { moeTargets, MOE_TERMS } from './index';

describe('MOE targets to date (spec 2026-10-06 §3.4)', () => {
  it('end of P2 is 746 to read, 350 to write (CL), 435 (HCL)', () => {
    expect(moeTargets('二下', 'cl')).toEqual({ read: 746, write: 350 });
    expect(moeTargets('二下', 'hcl')?.write).toBe(435);
  });
  it('the targets only grow, term by term', () => {
    const r = MOE_TERMS.map((t) => moeTargets(t, 'cl')!.read);
    expect(r).toEqual([...r].sort((a, b) => a - b));
  });
  it('beyond the lists: none', () => {
    expect(moeTargets('四上', 'cl')).toBeNull();
  });
});
