// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Singapore usage (content PR #33): no 儿化 in what the app says to him. Content (its word lists keep 一会儿 and 哪儿 as words to
// learn) and tests are left out; this covers the app's own lines: buttons, Truffle's bubbles, the worlds.
const root = new URL('.', import.meta.url).pathname;
const SCOPE = /^(app|fun|ui|activities|story|town|weeklist)\/.*\.tsx?$/;
const ERHUA = /哪儿|一会儿|玩儿|点儿|这儿|那儿/;
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));

describe('the UI speaks Singapore Mandarin', () => {
  it('no 儿化 (哪儿, 一会儿, 玩儿, 点儿) in UI strings', () => {
    const offenders = files(root)
      .map((p) => relative(root, p))
      .filter((r) => SCOPE.test(r) && !/\.test\.tsx?$/.test(r))
      .flatMap((r) => readFileSync(join(root, r), 'utf8').split('\n').map((line, i) => [r, i + 1, line] as const))
      .filter(([, , line]) => ERHUA.test(line))
      .map(([r, n, line]) => `${r}:${n}: ${line.trim().slice(0, 80)}`);
    expect(offenders).toEqual([]);
  });
});
