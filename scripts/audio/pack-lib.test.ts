import { describe, expect, it } from 'vitest';
import type { ClipJob } from './inventory-lib';
import { packIndex, planShards, voiceTag } from './pack-lib';

const job = (key: string, id: string, kind: ClipJob['kind'] = 'word', sure = true): ClipJob =>
  ({ key, id, text: key.split('|')[0]!, engineText: key.split('|')[0]!, expected: 'x', kind, sure });

describe('voiceTag', () => {
  it('names the engine, voice and both speeds', () => {
    expect(voiceTag({ engine: 'kokoro', voice: 'v1.1/zf_001', speed: { word: 0.85, sentence: 0.95 } })).toBe('kokoro:v1.1/zf_001@0.85/0.95');
  });
});

describe('planShards', () => {
  it('only clips not made yet, spread evenly', () => {
    const jobs = ['a', 'b', 'c', 'd', 'e'].map((k) => job(k, k));
    const shards = planShards(jobs, new Set(['b']), 2);
    expect(shards.map((s) => s.map((j) => j.id))).toEqual([['a', 'd'], ['c', 'e']]);
  });
});

describe('packIndex', () => {
  const jobs = [job('门|mén', 'i1', 'char'), job('门口', 'i2'), job('开门', 'i3'), job('关门', 'i4', 'word', false)];
  it('indexes the clips that exist; a lone character answers to its plain text too', () => {
    const { index } = packIndex('v', jobs, new Set(['i1', 'i2', 'i4']), []);
    expect(index).toEqual({ v: 1, voice: 'v', clips: { '门|mén': 'i1', 门: 'i1', 门口: 'i2', 关门: 'i4' } });
  });
  it('reports what is missing, failed, flagged, and unsure', () => {
    const { report } = packIndex('v', jobs, new Set(['i1', 'i2', 'i4']), [
      { id: 'i3', ok: false, error: 'boom' },
      { id: 'i2', ok: true, heard: '门', flagged: true },
    ]);
    expect(report.total).toBe(4);
    expect(report.present).toBe(3);
    expect(report.missing).toEqual([{ key: '开门', text: '开门' }]);
    expect(report.failed).toEqual([{ key: '开门', text: '开门', error: 'boom' }]);
    expect(report.flagged).toEqual([{ id: 'i2', key: '门口', text: '门口', expected: 'x', heard: '门' }]);
    expect(report.unsure.map((u) => u.key)).toEqual(['关门']);
  });
  it('keeps earlier flags for clips still in use, drops them for clips made again', () => {
    const prev = packIndex('v', jobs, new Set(['i1', 'i2']), [{ id: 'i2', ok: true, heard: '门', flagged: true }]).report;
    expect(packIndex('v', jobs, new Set(['i1', 'i2']), [], prev).report.flagged).toHaveLength(1);
    expect(packIndex('v', jobs, new Set(['i1', 'i2']), [{ id: 'i2', ok: true, heard: '门口', flagged: false }], prev).report.flagged).toHaveLength(0);
  });
});

describe('packIndex, a character said without its reading (final review I3)', () => {
  it('the bare character is the taught character clip, even when a word or piece with the same text comes later', () => {
    const jobs = [job('教|jiāo', 'c1', 'char'), job('教', 'w1', 'word')];
    const { index } = packIndex('v', jobs, new Set(['c1', 'w1']), []);
    expect(index.clips['教']).toBe('c1');
  });
});
