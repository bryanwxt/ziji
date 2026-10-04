import { describe, expect, it } from 'vitest';
import { writingBoxFor } from './size';

describe('writingBoxFor (the box fits the stage card)', () => {
  it('fills a roomy card up to 400px', () => expect(writingBoxFor({ width: 620, height: 640 }, 150)).toBe(400));
  it('is limited by the card height left under the cue', () => expect(writingBoxFor({ width: 620, height: 420 }, 150)).toBe(238));
  it('is limited by the card width on a phone', () => expect(writingBoxFor({ width: 343, height: 520 }, 130)).toBe(311));
  it('never smaller than 200', () => expect(writingBoxFor({ width: 200, height: 200 }, 150)).toBe(200));
});
