# Testing

| Command | Runs |
| --- | --- |
| `npm test` | Every test (CI runs this on PRs and before deploy). |
| `npm run test:fast` | Everything except `*.slow.test.tsx` (the whole-lesson walks). |
| `npm run test:changed` | Tests related to files changed vs `origin/main` (committed, staged, unstaged, untracked), minus slow ones. Config changes do not widen it: run `npm test` after editing `vite.config.ts` or `src/test/`. |
| `npm run test:watch` | Vitest watch mode. |
| `npm run fit` | Build, then the WebKit fit sweep, stage cases and story walk (20–50 min). |
| `npm run fit:changed` | Build, then the fit sweep for the flows the changed files likely touch (`-- --dry` prints the plan). |

## Conventions

- `*.test.ts` runs in **node** (no DOM). `*.test.tsx` runs in **jsdom**. Two Vitest projects in `vite.config.ts` do this.
- A `.test.ts` that needs `document`, `window` or other DOM globals goes in `DOM_TS` in `vite.config.ts`.
- A test that walks a whole lesson, placement or first launch is named `*.slow.test.tsx`.
- Run one project with `npx vitest run --project node` (or `dom`).

## Fit sweep filters

- `FIT_ONLY=<regex>` matches flow names, for example `home`, `lesson` or `^placement`.
- `FIT_VIEWPORT=<regex>` matches size names: `iphone-se`, `iphone-15`, `iphone-safari`, `ipad-portrait`, `ipad-landscape`, `ipad-air-landscape` and `iphone-sideways`, the rotate check.
- On a PR, `.github/workflows/fit.yml` runs one shard per size. When a shard fails, its `fit-shots-<size>` artifact holds the screenshots.
