/* SRS tuning spec §9: runs the real FSRS optimizer (fsrs-browser, WebAssembly) through src/srs/optimizer.ts in WebKit, the iPad's
   engine, on a made-up child's logs. Checks too little data fails softly, a fit returns 21 parameters ts-fsrs accepts, and how
   long the main thread is held. Run: npm run optimizer  (exit 1 on any problem) */
import { createServer } from 'vite';
import { webkit } from 'playwright-core';

const PORT = 4391;
const server = await createServer({ server: { port: PORT, strictPort: true, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await webkit.launch();
let failed = false;
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', String(e)));
  await page.goto(`http://127.0.0.1:${PORT}/scripts/optimizer-check.html`);
  const r = (await page.evaluate(() => (window as unknown as { result: Promise<unknown> }).result)) as Record<string, { ok: boolean; reason?: string; items?: number; n?: number; checked?: boolean; ms?: number }>;
  console.log(JSON.stringify(r, null, 1));
  const problems: string[] = [];
  for (const name of ['tooLittle', 'malformed']) if (r[name]!.ok || r[name]!.reason !== 'failed') problems.push(`${name}: did not fail softly`);
  for (const name of ['normal', 'large']) {
    const x = r[name]!;
    if (!x.ok || x.n !== 21 || !x.checked) problems.push(`${name}: no valid 21 parameters`);
  }
  if (r.normal!.ms! > 200) problems.push(`a normal fit held the main thread ${r.normal!.ms} ms (over 200: move it to a Web Worker, spec §6.2)`);
  for (const p of problems) console.error('PROBLEM:', p);
  failed = problems.length > 0;
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
