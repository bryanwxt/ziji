// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chapterProblems } from '../../story/check';
import { parseChapter, parseOutline } from '../../story/format';
import { sceneIds } from '../../story/art';
import { CHAPTERS } from '../../story/chapters';

const dir = 'src/content/story/season-1';
describe('the shipped story (spec 3c §2)', () => {
  it('every chapter passes the writing rules and matches the outline', () => {
    const rows = parseOutline(readFileSync('docs/story/season-1/outline.md', 'utf8'));
    for (const f of readdirSync(dir).filter((x) => /^ch\d+\.md$/.test(x))) {
      const c = parseChapter(readFileSync(`${dir}/${f}`, 'utf8'));
      expect(chapterProblems(c, rows.find((r) => r.chapter === c.chapter)), f).toEqual([]);
    }
  });
  it('the app bundles every chapter, in order, and every scene has its painting', () => {
    expect(CHAPTERS.map((c) => c.chapter)).toEqual([1, 2, 3]);
    for (const id of sceneIds(CHAPTERS)) expect(existsSync(`public/story/bg/${id}.webp`), id).toBe(true);
  });
});
