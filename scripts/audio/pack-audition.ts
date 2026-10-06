// Puts the audition's clips into the audio store under audio/audition/, with a manifest for public/audition.html.
// npx tsx scripts/audio/pack-audition.ts <artifactsDir> <prevAudioDir|-> <outDir>
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { AUDITION } from './audition';

interface Result { id: string; ok: boolean; error?: string }
export interface AuditionManifest {
  items: { id: string; label: string; text: string; expected: string }[];
  voices: { dir: string; name: string; ok: string[]; failed: Record<string, string> }[];
}

/** 'kokoro-v1.1-zf_001' → 'kokoro v1.1/zf_001' (the folder name is the engine, then the voice with / as -). */
const voiceName = (dir: string) => { const [engine, ...rest] = dir.split('-'); return `${engine} ${rest.join('/')}`; };

export function auditionManifest(items: AuditionManifest['items'], voices: { dir: string; results: Result[] }[]): AuditionManifest {
  return {
    items,
    voices: voices.map(({ dir, results }) => ({
      dir, name: voiceName(dir),
      ok: results.filter((r) => r.ok).map((r) => r.id),
      failed: Object.fromEntries(results.filter((r) => !r.ok).map((r) => [r.id, r.error ?? 'failed'])),
    })),
  };
}

if (basename(process.argv[1] ?? '') === 'pack-audition.ts') { // run as itself, never when imported (pack-audition.ts also ends in audition.ts)
  const [artifacts, prev, out] = process.argv.slice(2) as [string, string, string];
  const store = join(out, 'audio');
  mkdirSync(store, { recursive: true });
  if (prev !== '-' && existsSync(prev)) cpSync(prev, store, { recursive: true }); // clips and index stay as they were
  const voices: { dir: string; results: Result[] }[] = [];
  for (const art of existsSync(artifacts) ? readdirSync(artifacts) : []) {
    for (const dir of readdirSync(join(artifacts, art))) {
      const results = join(artifacts, art, dir, 'results.json');
      if (!existsSync(results)) continue;
      cpSync(join(artifacts, art, dir), join(store, 'audition', dir), { recursive: true });
      voices.push({ dir, results: JSON.parse(readFileSync(results, 'utf8')) as Result[] });
    }
  }
  const manifest = auditionManifest(AUDITION.map(({ id, label, text, expected }) => ({ id, label, text, expected })), voices);
  mkdirSync(join(store, 'audition'), { recursive: true }); // even when no voice succeeded: the page then says so
  writeFileSync(join(store, 'audition', 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log(`audition: ${voices.length} voices → ${store}/audition`);
}
