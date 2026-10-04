import { describe, expect, it } from 'vitest';
import { writingBoxSize } from './size';

describe('writingBoxSize', () => {
  it('fills an iPhone SE without pushing the page: room for the bar, the cue and 继续', () => {
    const s = writingBoxSize(375, 667);
    expect(s).toBeLessThanOrEqual(375 - 48);
    expect(s).toBeLessThanOrEqual(667 - 360);
    expect(s).toBeGreaterThanOrEqual(240); // still big enough for a child's finger strokes
  });
  it('is the old 320px on an upright iPad', () => {
    expect(writingBoxSize(768, 1024)).toBe(320);
  });
  it('in iPad landscape the box sits in the right column and fits the height', () => {
    const s = writingBoxSize(1024, 768);
    expect(s).toBeLessThanOrEqual(768 - 240);
    expect(s).toBeLessThanOrEqual(1024 / 2);
    expect(s).toBeGreaterThanOrEqual(320);
  });
  it('never goes below 220px', () => {
    expect(writingBoxSize(320, 480)).toBe(220);
  });
  it('a sentence cue takes two more lines: a short phone gives the box less height, a tall one has room', () => {
    expect(writingBoxSize(375, 667, true)).toBeLessThanOrEqual(writingBoxSize(375, 667) - 40);
    expect(writingBoxSize(390, 844, true)).toBe(writingBoxSize(390, 844));
  });
});
