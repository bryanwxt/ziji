// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseChapter } from '../../src/story/format';
import { buildInventory } from './inventory';

describe('story clips (spec 2026-10-07 3c §2)', () => {
  it("every Granny line, 听一听 line, question and choice of every shipped chapter gets a clip", () => {
    const texts = new Set(buildInventory('zf_002').map((j) => j.text));
    const dir = 'src/content/story/season-1';
    for (const f of readdirSync(dir).filter((x) => /^ch\d+\.md$/.test(x))) {
      const c = parseChapter(readFileSync(`${dir}/${f}`, 'utf8'));
      for (const m of [...c.granny, ...c.listen.lines]) expect(texts.has(m.zh), `${f}: ${m.zh}`).toBe(true);
      for (const q of c.listen.questions) for (const t of [q.zh, q.answer, ...q.wrong]) expect(texts.has(t), `${f}: ${t}`).toBe(true);
    }
  });
});
