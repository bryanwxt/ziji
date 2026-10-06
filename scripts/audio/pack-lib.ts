// Turning made clips into the index the app reads and the report the parent spot-listens from (spec 2026-10-06 §4).
import type { ClipJob } from './inventory-lib';

export interface VoiceConfig { engine: string; voice: string; speed: { word: number; sentence: number } }
export interface SynthResult { id: string; ok: boolean; seconds?: number; error?: string; heard?: string; flagged?: boolean }
export interface ClipIndex { v: 1; voice: string; clips: Record<string, string> }
export interface Report {
  voice: string; total: number; present: number;
  missing: { key: string; text: string }[];
  failed: { key: string; text: string; error: string }[];
  flagged: { id: string; key: string; text: string; expected: string; heard: string }[];
  unsure: { id: string; key: string; text: string; expected: string; engineText: string }[];
}

export const voiceTag = (v: VoiceConfig): string => `${v.engine}:${v.voice}@${v.speed.word}/${v.speed.sentence}`;

/** The clips still to make, dealt round-robin into n shards. */
export function planShards(jobs: ClipJob[], present: Set<string>, n: number): ClipJob[][] {
  const shards: ClipJob[][] = Array.from({ length: n }, () => []);
  jobs.filter((j) => !present.has(j.id)).forEach((j, k) => shards[k % n]!.push(j));
  return shards;
}

export function packIndex(voice: string, jobs: ClipJob[], present: Set<string>, results: SynthResult[], prev?: Report): { index: ClipIndex; report: Report } {
  const clips: Record<string, string> = {};
  for (const j of jobs) {
    if (!present.has(j.id)) continue;
    clips[j.key] = j.id;
    if (j.kind === 'char') clips[j.text] ??= j.id; // a lone character said without its reading (a 听写 cue) is the taught one
  }
  const byId = new Map(results.map((r) => [r.id, r]));
  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const remade = new Set(results.map((r) => r.id));
  const flagged = [
    ...(prev?.flagged ?? []).filter((f) => present.has(f.id) && jobById.has(f.id) && !remade.has(f.id)),
    ...results.filter((r) => r.ok && r.flagged && present.has(r.id) && jobById.has(r.id))
      .map((r) => { const j = jobById.get(r.id)!; return { id: r.id, key: j.key, text: j.text, expected: j.expected, heard: r.heard ?? '' }; }),
  ];
  return {
    index: { v: 1, voice, clips },
    report: {
      voice, total: jobs.length, present: jobs.filter((j) => present.has(j.id)).length,
      missing: jobs.filter((j) => !present.has(j.id)).map((j) => ({ key: j.key, text: j.text })),
      failed: jobs.flatMap((j) => { const r = byId.get(j.id); return r && !r.ok ? [{ key: j.key, text: j.text, error: r.error ?? 'failed' }] : []; }),
      flagged,
      unsure: jobs.filter((j) => !j.sure && present.has(j.id)).map((j) => ({ id: j.id, key: j.key, text: j.text, expected: j.expected, engineText: j.engineText })),
    },
  };
}
