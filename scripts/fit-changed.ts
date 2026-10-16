/* npm run fit:changed — the fit sweep (fit-check.ts) for only the flows the files changed since origin/main likely touch.
   A rough guide, not a guarantee: npm run fit (or the Fit workflow on a PR) still sweeps everything. --dry prints the plan only. */
import { execSync, spawnSync } from 'node:child_process';

/** Path prefix → FIT_ONLY regex of fit-check flows; first match wins. null: anything may move, sweep every flow. */
const TABLE: [string, string | null][] = [
  ['src/styles.css', null],
  ['src/ui/', null],
  ['scripts/fit-check.ts', null],
  ['scripts/fit-profile.ts', null],
  ['src/app/HomeScreen', '^home'],
  ['src/app/TodayPath', '^home'],
  ['src/app/WeekStrip', '^home'],
  ['src/app/SetupPin', '^setup-pin$|^pin-gate$'],
  ['src/app/PetSetup', '^pet-setup$|^placement$'],
  ['src/app/PlacementScreen', '^placement'],
  ['src/placement/', '^placement'],
  ['src/parent/', '^parent$|^pin-gate$|^placement-rerun$'],
  ['src/app/CollectionScreen', '^collection$'],
  ['src/app/Closeup', '^collection$'],
  ['src/app/Wardrobe', '^room$'],
  ['src/fun/', '^room$|^home|^chest-stars$'],
  ['src/app/Celebration', '^lesson$|^chest-stars$'],
  ['src/app/LangduScreen', '^langdu'],
  ['src/langdu/', '^langdu'],
  ['src/activities/langdu/', '^langdu'],
  ['src/activities/writing/', '^writing'],
  ['src/activities/say/', '^say$|^lesson$'],
  ['src/activities/speaking/', '^say$|^lesson$'],
  ['src/activities/flashcards/', '^newwords$|^lesson$'],
  ['src/activities/', '^practice|^lesson$'],
  ['src/app/SessionScreen', '^practice|^lesson$'],
  ['src/session/', '^practice|^lesson$'],
];
const FALLBACK = '^home$|^lesson$'; // any other app file

const git = (args: string) => execSync(`git ${args}`, { encoding: 'utf8' }).split('\n').filter(Boolean);
const changed = [...new Set([...git('diff --name-only origin/main'), ...git('ls-files --others --exclude-standard')])];
const relevant = changed.filter((f) => /^(src\/|index\.html$|scripts\/fit-(check|profile)\.ts$)/.test(f) && !/\.test\.tsx?$/.test(f) && !f.startsWith('src/test/'));

const picks = new Set<string | null>();
for (const f of relevant) {
  const hit = TABLE.find(([prefix]) => f.startsWith(prefix));
  picks.add(hit ? hit[1] : FALLBACK);
  console.log(`${f}  →  ${hit ? (hit[1] ?? 'every flow') : `${FALLBACK} (no table entry)`}`);
}
if (!picks.size) {
  console.log('No app files changed since origin/main: nothing to sweep.');
  process.exit(0);
}
const only = picks.has(null) ? '' : [...picks].join('|');
console.log(`\nFIT_ONLY=${only ? `'${only}'` : '(every flow)'}`);
if (process.argv.includes('--dry')) process.exit(0);

const step = (cmd: string, args: string[]) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, FIT_ONLY: only } });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
step('npx', ['vite', 'build']);
step('npx', ['tsx', 'scripts/fit-check.ts']);
