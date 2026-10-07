import { describe, expect, it } from 'vitest';
import { auditionManifest } from './pack-audition';

describe('audition manifest', () => {
  it('lists every item and every voice, with what failed', () => {
    const m = auditionManifest(
      [{ id: 'a01', label: 'A plain word', text: '门', expected: 'mén', phoneText: '门' }],
      [
        { dir: 'kokoro-v1.1-zf_001', results: [{ id: 'a01', ok: true }] },
        { dir: 'melo-ZH', results: [{ id: 'a01', ok: false, error: 'boom' }] },
      ],
    );
    expect(m.items).toHaveLength(1);
    expect(m.voices).toEqual([
      { dir: 'kokoro-v1.1-zf_001', name: 'Kokoro (Apache-2.0), v1.1/zf_001', ok: ['a01'], failed: {} },
      { dir: 'melo-ZH', name: 'MeloTTS (MIT), ZH', ok: [], failed: { a01: 'boom' } },
    ]);
  });
});
