// The sweeps serve hanzi-writer-data from node_modules instead of the CDN. On CI the CDN fetches fail by the hundred ("due to
// access control checks"), and a WebKit page that had prefetched a few hundred failing fetches sometimes died mid-flow
// ("Target page, context or browser has been closed"). A local copy is also faster and the same on every run.
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
    return await route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: await readFile(join(DATA_DIR, file)) });
  } catch {
    return route.fulfill({ status: 404, headers: CORS, body: '' }); // the CDN's answer for a character it has no strokes for
  }
}

/** Answers the app's stroke-data fetches from the hanzi-writer-data package (same version as the CDN's). */
export function serveStrokeData(target: BrowserContext | Page): Promise<void> {
  return target.route(STROKE_CDN, fulfil);
}
