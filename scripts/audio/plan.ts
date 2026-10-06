// npx tsx scripts/audio/plan.ts --prev <old audio/ dir> --out <dir> --shards 6
// Writes <out>/inventory.json and <out>/shard-<i>.json (clips not made yet); prints todo=<n> (and to $GITHUB_OUTPUT).
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { buildInventory } from './inventory';
import { planShards, voiceTag, type VoiceConfig } from './pack-lib';

const { values } = parseArgs({ options: { prev: { type: 'string' }, out: { type: 'string' }, shards: { type: 'string', default: '6' } } });
const voice = voiceTag(JSON.parse(readFileSync(new URL('./voice.json', import.meta.url), 'utf8')) as VoiceConfig);
const jobs = buildInventory(voice);
const clipsDir = join(values.prev!, 'clips');
const present = new Set(existsSync(clipsDir) ? readdirSync(clipsDir).map((f) => f.replace(/\.m4a$/, '')) : []);
const shards = planShards(jobs, present, Number(values.shards));
mkdirSync(values.out!, { recursive: true });
writeFileSync(join(values.out!, 'inventory.json'), JSON.stringify(jobs));
shards.forEach((s, i) => writeFileSync(join(values.out!, `shard-${i}.json`), JSON.stringify(s)));
const todo = shards.reduce((n, s) => n + s.length, 0);
console.log(`voice ${voice}: ${jobs.length} clips, ${present.size} made before, todo=${todo}`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `todo=${todo}\n`);
