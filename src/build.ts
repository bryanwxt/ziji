// The build's name (review 2026-10-17): the git commit and its date, put in by vite.config.ts's define, shown in Parent → Settings.
declare const __BUILD_HASH__: string | undefined;
declare const __BUILD_DATE__: string | undefined;

export const BUILD = {
  hash: typeof __BUILD_HASH__ === 'string' ? __BUILD_HASH__ : 'dev',
  date: typeof __BUILD_DATE__ === 'string' ? __BUILD_DATE__ : new Date().toISOString().slice(0, 10),
};
