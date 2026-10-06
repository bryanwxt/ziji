// npx tsx scripts/audio/pack.ts --prev <old audio/> --clips <dir of shard folders> --plan <plan dir> --out <dir>
// Writes <out>/audio/{index.json, report.json, clips/*.m4a, audition/…}: clips no longer in the inventory are dropped.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import type { ClipJob } from './inventory-lib';
import { packIndex, voiceTag, type Report, type SynthResult, type VoiceConfig } from './pack-lib';

const { values } = parseArgs({ options: { prev: { type: 'string' }, clips: { type: 'string' }, plan: { type: 'string' }, out: { type: 'string' } } });
const voice = voiceTag(JSON.parse(readFileSync(new URL('./voice.json', import.meta.url), 'utf8')) as VoiceConfig);
const jobs = JSON.parse(readFileSync(join(values.plan!, 'inventory.json'), 'utf8')) as ClipJob[];
const wanted = new Set(jobs.map((j) => j.id));
const store = join(values.out!, 'audio');
mkdirSync(join(store, 'clips'), { recursive: true });

const present = new Set<string>();
const keep = (dir: string) => {
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    const id = f.replace(/\.m4a$/, '');
    if (!f.endsWith('.m4a') || !wanted.has(id)) continue;
    cpSync(join(dir, f), join(store, 'clips', f));
    present.add(id);
  }
};
keep(join(values.prev!, 'clips'));
const results: SynthResult[] = [];
for (const shard of existsSync(values.clips!) ? readdirSync(values.clips!) : []) {
  for (const sub of readdirSync(join(values.clips!, shard))) { // artifact folder → the synth's out folder
    const dir = join(values.clips!, shard, sub);
    keep(dir);
    if (existsSync(join(dir, 'results.json'))) results.push(...(JSON.parse(readFileSync(join(dir, 'results.json'), 'utf8')) as SynthResult[]));
  }
}
if (existsSync(join(values.prev!, 'audition'))) cpSync(join(values.prev!, 'audition'), join(store, 'audition'), { recursive: true });
const prevReport = existsSync(join(values.prev!, 'report.json')) ? (JSON.parse(readFileSync(join(values.prev!, 'report.json'), 'utf8')) as Report) : undefined;
const prevVoice = existsSync(join(values.prev!, 'index.json')) ? (JSON.parse(readFileSync(join(values.prev!, 'index.json'), 'utf8')) as { voice: string }).voice : null;
const { index, report } = packIndex(voice, jobs, present, results, prevVoice === voice ? prevReport : undefined);
writeFileSync(join(store, 'index.json'), JSON.stringify(index));
writeFileSync(join(store, 'report.json'), JSON.stringify(report));
console.log(`packed ${report.present}/${report.total}: failed ${report.failed.length}, flagged ${report.flagged.length}, unsure ${report.unsure.length}`);
