import { describe, expect, it } from 'vitest';
import { AUDITION, auditionJobs } from './audition';

describe('audition items', () => {
  it('the hard items and the lesson items the parent heard wrong, each with an id, a label and the reading it must have', () => {
    expect(AUDITION).toHaveLength(29);
    expect(new Set(AUDITION.map((a) => a.id)).size).toBe(29);
    for (const t of ['五', '五星级', '五颜六色', '五花八门', '衣', '鱼', '金鱼', '小鱼', '大衣']) expect(AUDITION.some((a) => a.text === t), t).toBe(true);
    for (const a of AUDITION) expect(a.label.length, a.id).toBeGreaterThan(3);
  });
  it('the engines get the 多音字 swaps (调 alone is said as 条)', () => {
    const tiao = auditionJobs().find((j) => j.text === '调')!;
    expect(tiao.engineText).toBe('条。');
    expect(tiao.phoneText).toBe('条');
  });
  it('words are given as the inventory gives them: ending in 。, or cut from a sentence where it cuts them', () => {
    const jobs = auditionJobs();
    expect(jobs.find((j) => j.text === '五')).toMatchObject({ engineText: '五。', phoneText: '五' });
    expect(jobs.find((j) => j.text === '鱼')).toMatchObject({ engineText: '鱼', method: 'cut', sayText: '鱼。' });
    expect(jobs.find((j) => j.text === '一起')).toMatchObject({ method: 'cut', sayText: '一起。' });
    expect(jobs.find((j) => j.id === 'a16')!.engineText).toBe('我们一起去公园玩儿吧！');
  });
});

describe('the audition script as a command', () => {
  it('runs only as itself: importing it from pack-audition.ts writes nothing (the first audition publish failed on this)', async () => {
    const { mkdtempSync, existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const { vi } = await import('vitest');
    const out = join(mkdtempSync(join(tmpdir(), 'aud-')), 'jobs.json');
    const argv = process.argv;
    process.argv = ['node', '/repo/scripts/audio/pack-audition.ts', out];
    try {
      vi.resetModules();
      await import('./audition');
      expect(existsSync(out)).toBe(false);
    } finally {
      process.argv = argv;
    }
  });
});
