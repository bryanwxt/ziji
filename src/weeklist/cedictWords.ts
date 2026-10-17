// src/weeklist/cedictWords.ts
// CC-CEDICT's headwords (public/data/cedict-words.txt, built by scripts/build-cedict-words.ts), fetched only when the parent's
// 本周词语 panel opens, never in the main bundle; the service worker caches it on first use. Until it loads, or offline before it
// ever has, weekIsWord answers as it did without it.

let pending: Promise<ReadonlySet<string> | null> | null = null;

/** The headword set, fetched once; null when it can't be had (offline on first use, or no file), and tried again next time. */
export function loadCedictWords(): Promise<ReadonlySet<string> | null> {
  pending ??= (async () => {
    try {
      const res = await fetch(`${import.meta.env?.BASE_URL ?? '/'}data/cedict-words.txt`);
      if (!res.ok) return null;
      const words = (await res.text()).split('\n').filter((l) => l && !l.startsWith('#'));
      return new Set(words);
    } catch {
      return null;
    }
  })().then((set) => {
    if (!set) pending = null;
    return set;
  });
  return pending;
}

/** Tests: forget the loaded set. */
export const resetCedictWords = () => { pending = null; };
