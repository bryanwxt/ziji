// Where the app runs (review 2026-10-17): a short device name for backups, and whether it is the Home Screen app — on iOS only
// that one escapes Safari's 7-day clearing of a site's storage.

/** 'iPad', 'iPhone', 'Mac', 'Android', 'Windows' or 'Linux'; null when there is no navigator. An iPad asking for the desktop site
 *  says Macintosh: its touch points give it away. */
export function deviceLabel(nav: { userAgent?: string; maxTouchPoints?: number } | undefined = globalThis.navigator): string | null {
  const ua = nav?.userAgent;
  if (!ua) return null;
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints ?? 0) > 1)) return 'iPad';
  if (/iPhone|iPod/.test(ua)) return 'iPhone';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  return null;
}

/** Running as the installed app (from the Home Screen), not in a browser tab. */
export function isInstalled(win: { matchMedia?: (q: string) => { matches: boolean }; navigator?: { standalone?: boolean } } = globalThis as never): boolean {
  try {
    return !!win.matchMedia?.('(display-mode: standalone)').matches || win.navigator?.standalone === true;
  } catch {
    return false;
  }
}
