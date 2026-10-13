import { describe, expect, it } from 'vitest';
import { DEFAULT_KID } from '../types';
import { currentWorld, migrateWorldId, reachedWorlds, timeOfDay, updateWorlds, WORLD_LINES, WORLDS, worldLine } from './worlds';

const kid = (over = {}) => ({ ...DEFAULT_KID, ...over });

describe('worlds catalog', () => {
  it('is one river: the eight worlds in unlock order with their names and unchanged thresholds (spec 2026-10-13 §3.1)', () => {
    expect(WORLDS.map((w) => [w.id, w.zh, w.at])).toEqual([
      ['home', '家门口', 0], ['rainforest', '雨林', 30], ['bamboo', '竹林', 60], ['terraces', '梯田', 100],
      ['dino', '恐龙谷', 150], ['lantern', '灯笼水乡', 200], ['cove', '海湾', 300], ['milkyway', '银河', 400],
    ]);
  });
  it('maps an old paper world to its river world by position; a river id stays; anything else is dropped (spec §8)', () => {
    expect(['yard', 'grass', 'race', 'blocks', 'dino', 'sea', 'space', 'pirate'].map(migrateWorldId)).toEqual(WORLDS.map((w) => w.id));
    for (const w of WORLDS) expect(migrateWorldId(w.id)).toBe(w.id);
    expect([migrateWorldId('bogus'), migrateWorldId(7), migrateWorldId(null), migrateWorldId('constructor')]).toEqual([null, null, null, null]);
  });
  it('reaches worlds by known count, always including 家门口', () => {
    expect(reachedWorlds(0)).toEqual(['home']);
    expect(reachedWorlds(29)).toEqual(['home']);
    expect(reachedWorlds(75)).toEqual(['home', 'rainforest', 'bamboo']);
    expect(reachedWorlds(600)).toHaveLength(8);
  });
});

describe('updateWorlds', () => {
  it('an existing install at 75 records three worlds and announces only the newest', () => {
    const u = updateWorlds(kid(), 75);
    expect(u.kid.worldsSeen).toEqual(['home', 'rainforest', 'bamboo']);
    expect(u.arrived).toBe('bamboo');
    expect(u.changed).toBe(true);
  });
  it('announces nothing the second time', () => {
    const once = updateWorlds(kid(), 75).kid;
    expect(updateWorlds(once, 75)).toMatchObject({ arrived: null, changed: false });
  });
  it('never announces 家门口', () => {
    expect(updateWorlds(kid(), 0)).toMatchObject({ arrived: null, changed: true });
    expect(updateWorlds(kid(), 0).kid.worldsSeen).toEqual(['home']);
  });
  it('keeps reached worlds after a lapse', () => {
    const u = updateWorlds(kid({ worldsSeen: ['home', 'rainforest', 'bamboo'] }), 55);
    expect(u).toMatchObject({ arrived: null, changed: false });
    expect(u.kid.worldsSeen).toEqual(['home', 'rainforest', 'bamboo']);
  });
  it('an arrival resets the pick so the new world shows', () => {
    const u = updateWorlds(kid({ worldsSeen: ['home', 'rainforest'], world: 'home' }), 61);
    expect(u.arrived).toBe('bamboo');
    expect(u.kid.world).toBeNull();
  });
});

describe('currentWorld', () => {
  it('is the newest reached when nothing is picked', () => {
    expect(currentWorld(kid({ worldsSeen: ['home', 'rainforest', 'bamboo'] }))).toBe('bamboo');
    expect(currentWorld(kid())).toBe('home');
  });
  it('is the pick when it has been reached', () => {
    expect(currentWorld(kid({ worldsSeen: ['home', 'rainforest', 'bamboo'], world: 'rainforest' }))).toBe('rainforest');
  });
  it('ignores a pick that is unknown or not reached', () => {
    expect(currentWorld(kid({ worldsSeen: ['home', 'rainforest'], world: 'cove' }))).toBe('rainforest');
    expect(currentWorld(kid({ worldsSeen: ['home'], world: 'bogus' }))).toBe('home');
  });
});

describe('timeOfDay', () => {
  it('morning before noon, afternoon until 18:00, evening after', () => {
    const at = (h: number, m = 0) => timeOfDay(new Date(2026, 9, 3, h, m));
    expect([at(7), at(11, 59), at(12), at(17, 59), at(18), at(21)]).toEqual(['morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening']);
  });
});

describe('Truffle world lines', () => {
  it('has 2–3 short Chinese lines per world, picked steadily by date', () => {
    for (const w of WORLDS) {
      const lines = WORLD_LINES[w.id];
      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines.length).toBeLessThanOrEqual(3);
      for (const l of lines) expect(l).toMatch(/^[\p{Script=Han}，。！？…、]+$/u);
    }
    expect(worldLine('rainforest', '2026-10-03')).toBe(worldLine('rainforest', '2026-10-03'));
    expect(WORLD_LINES.rainforest).toContain(worldLine('rainforest', '2026-10-04'));
  });
});
