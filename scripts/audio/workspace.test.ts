// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('the Audio build workspace', () => {
  it("the repo has no art/ folder: the Audio build downloads its clips into art/ and packs every file there (3c push: the paintings' folder broke it)", () => {
    expect(readFileSync('.github/workflows/audio-build.yml', 'utf8')).toContain('--clips art');
    expect(existsSync('art')).toBe(false);
  });
});
