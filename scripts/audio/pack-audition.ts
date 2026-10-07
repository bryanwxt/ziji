// Puts the audition's clips into the audio store under audio/audition/, with a manifest for public/audition.html.
// npx tsx scripts/audio/pack-audition.ts <artifactsDir> <prevAudioDir|-> <outDir>
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { auditionJobs } from './audition';

interface Result { id: string; ok: boolean; error?: string }
export interface AuditionManifest {
  items: { id: string; label: string; text: string; expected: string; phoneText: string }[];
  voices: { dir: string; name: string; ok: string[]; failed: Record<string, string> }[];
}

/** Each engine as the parent sees it, with its licence (scripts/audio/tts/engines.py). */
const ENGINES: Record<string, string> = {
  kokoro: 'Kokoro (Apache-2.0)',
  melo: 'MeloTTS (MIT)',
  cosyvoice2: 'CosyVoice 2 (Apache-2.0)',
  cosyvoice3: 'CosyVoice 3 (Apache-2.0)',
  indextts2: 'IndexTTS 2 (bilibili model licence)',
  indextts25: 'IndexTTS 2.5 (bilibili model licence)',
  spark: 'Spark-TTS (CC BY-NC-SA 4.0)',
};
/** This audition's voices (.github/workflows/audio-audition.yml), in the page's order: the app's current voice first. */
export const AUDITION_VOICES = ['kokoro-v1.1-zf_002', 'cosyvoice2-ref', 'cosyvoice3-ref', 'indextts2-ref', 'indextts25-ref', 'spark-ref', 'spark-female'];

/** 'kokoro-v1.1-zf_001' → 'Kokoro (Apache-2.0), v1.1/zf_001' (the folder name is the engine, then the voice with / as -). */
const VOICES: Record<string, string> = { ref: 'copying one sample voice', female: 'its own made-up voice', 'v1.1/zf_002': 'zf_002, the app\'s voice now' };
const voiceName = (dir: string) => {
  const [engine, ...rest] = dir.split('-');
  const voice = rest.join('/');
  return `${ENGINES[engine!] ?? engine}, ${VOICES[voice] ?? voice}`;
};

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
  const audition = join(store, 'audition');
  mkdirSync(audition, { recursive: true });
  // the last audition's voices stay unless remade now (a rerun of one engine keeps the rest), but only this audition's voices
  for (const dir of readdirSync(audition)) if (!AUDITION_VOICES.includes(dir)) rmSync(join(audition, dir), { recursive: true, force: true });
  for (const art of existsSync(artifacts) ? readdirSync(artifacts) : []) {
    for (const dir of readdirSync(join(artifacts, art))) {
      if (!existsSync(join(artifacts, art, dir, 'results.json'))) continue;
      rmSync(join(audition, dir), { recursive: true, force: true });
      cpSync(join(artifacts, art, dir), join(audition, dir), { recursive: true });
    }
  }
  const voices = readdirSync(audition).filter((dir) => existsSync(join(audition, dir, 'results.json')))
    .map((dir) => ({ dir, results: JSON.parse(readFileSync(join(audition, dir, 'results.json'), 'utf8')) as Result[] }));
  const items = auditionJobs().map(({ id, label, text, expected, phoneText }) => ({ id, label, text, expected, phoneText }));
  const order = (dir: string) => (AUDITION_VOICES.indexOf(dir) + 1 || 99);
  const manifest = auditionManifest(items, voices.sort((a, b) => order(a.dir) - order(b.dir) || a.dir.localeCompare(b.dir)));
  writeFileSync(join(audition, 'manifest.json'), JSON.stringify(manifest, null, 1)); // even when no voice succeeded: the page then says so
  console.log(`audition: ${voices.length} voices → ${store}/audition`);
}
