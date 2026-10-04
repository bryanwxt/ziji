import { describe, expect, it } from 'vitest';
import { ACCESSORY_DEFS, ACCESSORY_IDS, LEGACY_ACCESSORY, accessoryById, migrateAccessory } from './accessories';

describe('accessories v2', () => {
  it('has 16 add-ons in four slots with Chinese names', () => {
    expect(ACCESSORY_DEFS).toHaveLength(16);
    expect(new Set(ACCESSORY_IDS).size).toBe(16);
    expect(new Set(ACCESSORY_DEFS.map((a) => a.slot))).toEqual(new Set(['face', 'neck', 'held', 'back']));
    expect(accessoryById('brush')).toMatchObject({ zh: '毛笔', py: 'máo bǐ', slot: 'held' });
  });
  it('maps every old emoji accessory to a distinct new one', () => {
    const targets = Object.values(LEGACY_ACCESSORY);
    expect(Object.keys(LEGACY_ACCESSORY)).toHaveLength(16);
    expect(new Set(targets).size).toBe(16);
    for (const t of targets) expect(accessoryById(t)).toBeTruthy();
    expect(migrateAccessory('🕶️')).toBe('sunglasses');
    expect(migrateAccessory('brush')).toBe('brush');
    expect(migrateAccessory('bogus')).toBeNull();
    expect(migrateAccessory(null)).toBeNull();
  });
});
