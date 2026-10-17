// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { keepStorage, storageKept } from './persist';

describe('keepStorage (SRS tuning spec §8)', () => {
  it('asks once when not yet kept, and says whether the browser agreed (review 2026-10-17)', async () => {
    const s = { persisted: vi.fn(async () => false), persist: vi.fn(async () => true) };
    expect(await keepStorage(s)).toBe(true);
    expect(s.persist).toHaveBeenCalledTimes(1);
    expect(await keepStorage({ persisted: vi.fn(async () => false), persist: vi.fn(async () => false) })).toBe(false);
  });
  it('does not ask again when already kept', async () => {
    const s = { persisted: vi.fn(async () => true), persist: vi.fn(async () => true) };
    expect(await keepStorage(s)).toBe(true);
    expect(s.persist).not.toHaveBeenCalled();
  });
  it('no storage API, or one that throws: nothing breaks, and it is not kept', async () => {
    await expect(keepStorage(undefined)).resolves.toBe(false);
    await expect(keepStorage({ persisted: vi.fn(async () => false), persist: vi.fn(async () => { throw new Error('no'); }) })).resolves.toBe(false);
  });
});

describe('storageKept: for the parent\'s storage line', () => {
  it('yes, no, or unknown without the API', async () => {
    expect(await storageKept({ persisted: async () => true })).toBe(true);
    expect(await storageKept({ persisted: async () => false })).toBe(false);
    expect(await storageKept(undefined)).toBeNull();
    expect(await storageKept({ persisted: async () => { throw new Error('x'); } })).toBeNull();
  });
});
