// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = new URL('.', import.meta.url).pathname;
// The parent area keeps its emoji (including the parent's own reward-goal picks); the legacy map holds old emoji on purpose.
const EXCLUDED = [/^parent\//, /^importer\//, /\.test\.tsx?$/, /^fun\/accessories\.ts$/, /^test\//]; // importer: parent-only worksheet parsing (matches ©, ➤ in Live Text)
const EMOJI = /\p{Extended_Pictographic}/u;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|json|css)$/.test(f) ? [p] : []; // content JSON and styles too (a CSS content: '⭐' shows on screen)
  });
}

describe('child screens use ink art, not emoji', () => {
  it('no emoji in child-facing source', () => {
    const offenders = [...files(root), join(root, '../index.html')]
      .map((p) => relative(root, p))
      .filter((r) => !EXCLUDED.some((x) => x.test(r)))
      .flatMap((r) => readFileSync(join(root, r), 'utf8').split('\n').map((line, i) => [r, i + 1, line] as const))
      .filter(([, , line]) => EMOJI.test(line))
      .map(([r, n, line]) => `${r}:${n}: ${line.trim().slice(0, 80)}`);
    expect(offenders).toEqual([]);
  });
});
