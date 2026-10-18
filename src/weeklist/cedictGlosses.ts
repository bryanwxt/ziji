// src/weeklist/cedictGlosses.ts
// CC-CEDICT's English cut to a kid gloss's length (public/data/cedict-glosses.txt, built by scripts/build-cedict-words.ts), for a
// list word that has no kid gloss, glossary entry or English from the parent (parent 2026-10-18: "共用 meaning is not showing").
// Fetched only by the parent's 本周词语 panel, never in the main bundle; the service worker caches it on first use.

let pending: Promise<ReadonlyMap<string, string> | null> | null = null;

/** word → English, fetched once; null when it can't be had (offline on first use, or no file), and tried again next time. */
export function loadCedictGlosses(): Promise<ReadonlyMap<string, string> | null> {
  pending ??= (async () => {
    try {
      const res = await fetch(`${import.meta.env?.BASE_URL ?? '/'}data/cedict-glosses.txt`);
      if (!res.ok) return null;
      const out = new Map<string, string>();
      for (const line of (await res.text()).split('\n')) {
        if (!line || line.startsWith('#')) continue;
        const tab = line.indexOf('\t');
        if (tab > 0) out.set(line.slice(0, tab), line.slice(tab + 1).trim());
      }
      return out;
    } catch {
      return null;
    }
  })().then((map) => {
    if (!map) pending = null;
    return map;
  });
  return pending;
}

/** Tests: forget the loaded map. */
export const resetCedictGlosses = () => { pending = null; };
