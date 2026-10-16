// The sweeps serve hanzi-writer-data from node_modules instead of the CDN: every app load prefetches the strokes of every
// character, and the sweep shouldn't hang on the network for that. (The CDN's "access control checks" errors once seen
// beside crashed flows were fetches cancelled by the crash, not its cause: see launch-webkit.ts.)
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { BrowserContext, Page, Route } from 'playwright-core';

const DATA_DIR = dirname(createRequire(import.meta.url).resolve('hanzi-writer-data/package.json'));
export const STROKE_CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@*/**';
const CORS = { 'access-control-allow-origin': '*' };

async function fulfil(route: Route): Promise<void> {
  const file = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop() ?? '');
  // only "<one character>.json": anything else (a path, a dot-dot) is not a stroke file
  if (!/^[^/\\]+\.json$/.test(file) || file.startsWith('.')) return route.fulfill({ status: 404, headers: CORS, body: '' });
  try {
    const body = await readFile(join(DATA_DIR, file));
    return await route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body });
  } catch {
    return route.fulfill({ status: 404, headers: CORS, body: '' }); // the CDN's answer for a character it has no strokes for
  }
}

/** Answers the app's stroke-data fetches from the hanzi-writer-data package (same version as the CDN's). */
export function serveStrokeData(target: BrowserContext | Page): Promise<void> {
  return target.route(STROKE_CDN, fulfil);
}
