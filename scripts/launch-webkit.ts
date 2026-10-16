// The one way the sweeps start WebKit. On a Linux runner (no GPU) WebKit's Skia paints on GL through Mesa's software
// renderer, and now and then a painting thread segfaulted inside it (dmesg: "WebCore: Worker ... segfault ... in
// libLLVM.so.20.1", or in libWPEWebKit): the page died mid-flow with "Target page, context or browser has been closed".
// CPU painting takes GL out of the picture. Layout is the same either way; the Mac build of WebKit ignores the variable.
import { webkit, type Browser, type LaunchOptions } from 'playwright-core';

export function launchWebKit(opts: LaunchOptions = {}): Promise<Browser> {
  return webkit.launch({ ...opts, env: { ...process.env, WEBKIT_SKIA_ENABLE_CPU_RENDERING: '1', ...opts.env } });
}
