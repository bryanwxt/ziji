// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { keepStorage } from './persist';

describe('keepStorage (SRS tuning spec §8)', () => {
  it('asks once when not yet kept', async () => {
    const s = { persisted: vi.fn(async () => false), persist: vi.fn(async () => true) };
    await keepStorage(s);
    expect(s.persist).toHaveBeenCalledTimes(1);
  });
  it('does not ask again when already kept', async () => {
    const s = { persisted: vi.fn(async () => true), persist: vi.fn(async () => true) };
    await keepStorage(s);
    expect(s.persist).not.toHaveBeenCalled();
  });
  it('no storage API, or one that throws: nothing breaks', async () => {
    await expect(keepStorage(undefined)).resolves.toBeUndefined();
    await expect(keepStorage({ persisted: vi.fn(async () => false), persist: vi.fn(async () => { throw new Error('no'); }) })).resolves.toBeUndefined();
  });
});
