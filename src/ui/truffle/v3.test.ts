// The v3 standard (rewards spec 2026-10-15 §5.1) over every registered v3 costume; each family task adds its own list below.
import { describe, expect, it } from 'vitest';
import { costumeById, inChest } from '../../fun/costumes';
import { LINE } from '../cel';
import { cel, celShade, CREAM_PAW, gloveR, heldPole, PAW_L_D, PAW_R_D } from './costumeKit';
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

describe('feet: footwear and an animal\'s feet replace his paws, never sit under them (parent 2026-10-16)', () => {
  const FEET = ['astronaut', 'football', 'soldier', 'mecha', 'carbot', 'otter', 'panda', 'frog', 'duck', 'penguin'];
  it('each draws its own feet in his paws\' place', () => {
    for (const id of FEET) {
      const l = V3[id]!();
      expect(l.feetL, id).toBeTruthy();
      expect(l.feetR, id).toBeTruthy();
    }
  });
  it('nothing on the body below his paws: no second pair of feet under them', () => {
    for (const id of FEET) {
      const body = V3[id]!().body;
      expect(Math.max(...points(body).map(([, y]) => y)), id).toBeLessThanOrEqual(278);
      for (const m of body.matchAll(/<ellipse cx="[\d.]+" cy="([\d.]+)" rx="[\d.]+" ry="([\d.]+)"/g)) expect(Number(m[1]) + Number(m[2]), id).toBeLessThanOrEqual(278);
    }
  });
  it('a raised paw wears a mitt or glove in the costume\'s colour, never a boot (parent 2026-10-16)', () => {
    for (const id of FEET) {
      const l = V3[id]!();
      expect(l.mittL, id).toBeTruthy();
      expect(l.mittR, id).toBeTruthy();
      for (const art of [l.mittL!, l.mittR!]) expect(art, id).not.toContain(CREAM_PAW);
      for (const art of [l.pawL ?? '', l.pawR ?? '']) expect(art.includes(l.feetL!) || art.includes(l.feetR!), id).toBe(false); // closing over a prop is overL/overR
    }
  });
  it('no cream paw or paw-toed glove shows over a foot', () => {
    for (const id of FEET) {
      const l = V3[id]!();
      for (const art of [l.pawL ?? '', l.pawR ?? '', l.feetL ?? '', l.feetR ?? '']) {
        expect(art, id).not.toContain(CREAM_PAW);
        expect(art, id).not.toContain(PAW_L_D);
        expect(art, id).not.toContain(PAW_R_D);
      }
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

describe('the favourite onesies (rewards spec §5.2)', () => {
  it('the bunny is the zodiac 兔 (parent 2026-10-15: one rabbit)', () => {
    expect(V3.rabbit, 'rabbit').toBeTypeOf('function');
    expect(costumeById('rabbit')).toMatchObject({ set: 'zodiac', kind: 'onesie' });
    expect(costumeById('bunny')).toBeFalsy();
  });
  it('are drawn and on the 动物 shelf', () => {
    for (const id of ['babydino', 'pterosaur', 'magpie', 'penguin', 'shark', 'unicorn', 'owl', 'tigercub']) {
      expect(V3[id], id).toBeTypeOf('function');
      expect(costumeById(id), id).toMatchObject({ set: 'animal', kind: 'onesie' });
    }
  });
  it('the zodiac 兔 is the lop-eared bunny with its carrot in its right paw (parent 2026-10-15: one rabbit)', () => {
    expect(V3.rabbit!().pawR).toContain('#ff9f43');
  });
});

describe('the jobs, full-body (rewards spec §5.2)', () => {
  it('all ten are drawn and on the 职业 shelf', () => {
    const ids = ['astronaut', 'chef', 'firefighter', 'doctor', 'pilot', 'police', 'football', 'wizard', 'pirate', 'hawker'];
    for (const id of ids) {
      expect(V3[id], id).toBeTypeOf('function');
      expect(costumeById(id), id).toMatchObject({ set: 'job', kind: 'outfit' });
    }
  });
  it("the firefighter's hose stays by him, coiled at his feet, never trailing off his box (it rides his paw when he cheers)", () => {
    const hose = [...V3.firefighter!().pawR!.matchAll(/ d="([^"]*)" fill="none" stroke="#e8c05a"/g)].map((m) => m[1]!);
    expect(hose.length).toBeGreaterThan(0);
    for (const d of hose) {
      const n = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
      for (let i = 0; i + 1 < n.length; i += 2) {
        expect(n[i], d).toBeLessThanOrEqual(276);
        expect(n[i + 1], d).toBeLessThanOrEqual(284);
      }
    }
  });
  it("the pirate's eye patch is up on his hat, never over an eye (his face stays readable)", () => {
    expect(V3.pirate!().head).not.toMatch(/<ellipse cx="202" cy="118"/);
  });
  it("the chef's spoon and the wizard's star staff ride his paws, no longer drawn on his body", () => {
    const chef = V3.chef!();
    expect(chef.pawL).toContain('#c98f55');
    expect(chef.body).not.toContain('#c98f55');
    expect(V3.wizard!().pawR).toContain('#8a5a3c');
    expect(V3.wizard!().body).not.toContain('M100 262 L76 214');
  });
});

describe('his asks: the robots and the soldier (2026-10-15)', () => {
  it('机甲 and 变形机器人 are drawn and on the 机器人 shelf; 军人 is drawn and on the 职业 shelf', () => {
    for (const id of ['mecha', 'carbot']) {
      expect(V3[id], id).toBeTypeOf('function');
      expect(costumeById(id), id).toMatchObject({ set: 'robot', kind: 'outfit' });
    }
    expect(V3.soldier, 'soldier').toBeTypeOf('function');
    expect(costumeById('soldier')).toMatchObject({ set: 'job', kind: 'outfit' });
  });
  it('each holds its signature thing in a paw slot (it rides his paw)', () => {
    for (const id of ['mecha', 'carbot', 'soldier']) expect(V3[id]!().pawR, id).toBeTruthy();
  });
});

describe('the Chinese myths, redrawn (rewards spec §5.2)', () => {
  it('all seven are drawn; the fortune cat and the lion dance are hoods', () => {
    for (const id of ['wukong', 'nezha', 'change', 'houyi', 'caishen', 'luckycat', 'liondance']) expect(V3[id], id).toBeTypeOf('function');
    expect(costumeById('luckycat')?.kind).toBe('onesie');
    expect(costumeById('liondance')?.kind).toBe('onesie');
  });
  it('every chest costume but the kept zodiac is v3', async () => {
    const { CHEST_COSTUMES } = await import('../../fun/costumes');
    for (const c of CHEST_COSTUMES) if (c.set !== 'zodiac') expect(V3[c.id], c.id).toBeTypeOf('function');
  });
});
