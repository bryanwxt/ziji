// The v3 standard (rewards spec 2026-10-15 §5.1) over every registered v3 costume; each family task adds its own list below.
import { describe, expect, it } from 'vitest';
import { costumeById, inChest } from '../../fun/costumes';
import { LINE } from '../cel';
import { cel, celShade, gloveR, heldPole, PAW_R_D } from './costumeKit';
import { costumeLayer } from './costumes';
import { V3 } from './v3';

/** Absolute points of every path drawn with only M/L/C/Q/Z (arcs, H/V and relative moves are small details inside). */
function points(svg: string): [number, number][] {
  const out: [number, number][] = [];
  for (const m of svg.matchAll(/ d="([^"]*)"/g)) {
    const d = m[1]!;
    if (/[A-Za-z]/.test(d.replace(/[MLCQZ]/g, ''))) continue;
    const n = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i]!, n[i + 1]!]);
  }
  return out;
}
/** What pokes out of his box (30 20 260 270), as the zodiac onesie test reads it: M/L points and circles. */
function outOfBox(art: string): string[] {
  const out: string[] = [];
  for (const m of art.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)) {
    const [x, y, r] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (x - r < 31.6 || x + r > 288.4 || y - r < 21.6) out.push(`circle ${x},${y} r${r}`);
  }
  for (const m of art.matchAll(/ d="(M[^"]*)"/g)) {
    if (/[a-z]/.test(m[1]!.replace(/Z/g, ''))) continue;
    for (const v of m[1]!.matchAll(/[ML] ?([\d.]+) ([\d.]+)/g)) {
      const [x, y] = [Number(v[1]), Number(v[2])];
      if (x < 31.6 || x > 288.4 || y < 21.6) out.push(`point ${x},${y}`);
    }
  }
  return out;
}
const RULES = Object.entries(V3);
const all = (id: string) => { const l = V3[id]!(); return [l.back, l.body, l.head, l.tail ?? '', l.pawL ?? '', l.pawR ?? ''].join(''); };

describe('the v3 kit', () => {
  it('cel: the shadow first, the lit fill shrunk toward the light, then the line', () => {
    const art = cel('M10 10 L50 10 L50 50 Z', '#d8302a', 20, 20);
    expect(art.indexOf(celShade('#d8302a'))).toBeLessThan(art.indexOf('fill="#d8302a"'));
    expect(art).toContain('translate(20 20) scale(0.9) translate(-20 -20)');
    expect(art).toContain(`stroke="${LINE}"`);
  });
  it('a glove is his paw shape in the glove colour; a held pole has an ink edge', () => {
    expect(gloveR('#3d3845')).toContain(PAW_R_D);
    expect(heldPole(182, 262, -40, 118, 122, '#d8302a', 12, '#f2c230')).toMatch(/rotate\(-40\)[\s\S]*stroke="#706889"[\s\S]*stroke="#d8302a"[\s\S]*stroke="#f2c230"/);
  });
});

describe('v3 costumes (rewards spec §5.1)', () => {
  it('light cel: the soft-violet line; no clip-path, gradient or filter; no emoji', () => {
    for (const [id] of RULES) {
      expect(all(id), id).toContain(`stroke="${LINE}"`);
      expect(all(id), id).not.toMatch(/clip-path|clipPath|Gradient|filter|url\(#/);
      expect(all(id), id).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
  it('one dominant colour, drawn with its one hard shadow', () => {
    for (const [id] of RULES) expect(all(id), id).toContain(celShade(costumeById(id)!.color));
  });
  it('headgear reaches both edges of his head (x ≤ 62 and ≥ 258 at the brow, y 60–170)', () => {
    for (const [id, make] of RULES) {
      const xs = points(make().head).filter(([, y]) => y >= 60 && y <= 170).map(([x]) => x);
      expect(Math.min(...xs), id).toBeLessThanOrEqual(62);
      expect(Math.max(...xs), id).toBeGreaterThanOrEqual(258);
    }
  });
  it('what is behind him and on his head stays inside his box', () => {
    for (const [id, make] of RULES) expect(outOfBox(make().back + make().head), id).toEqual([]);
  });
  it('each is in the chest and is what Truffle wears for its id', () => {
    for (const [id, make] of RULES) {
      expect(inChest(costumeById(id)!), id).toBe(true);
      expect(costumeLayer(id), id).toEqual(make());
    }
  });
});

describe('the river onesies (rewards spec §5.2)', () => {
  it('are drawn and on the 动物 shelf', () => {
    for (const id of ['otter', 'panda', 'hornbill', 'frog', 'duck', 'dragonfly', 'koi', 'crab', 'parrot']) {
      expect(V3[id], id).toBeTypeOf('function');
      expect(costumeById(id), id).toMatchObject({ set: 'animal', kind: 'onesie' });
      expect(V3[id]!().hidesEars, id).toBe(true);
    }
  });
});
