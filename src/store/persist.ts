/**
 * Asks the browser to keep the app's storage (SRS tuning spec §8): once, when it can and hasn't already, so Safari doesn't evict
 * his IndexedDB. Says whether it is kept (review 2026-10-17: the answer was ignored); Parent → Backup shows it.
 */
export async function keepStorage(storage: Pick<StorageManager, 'persist' | 'persisted'> | undefined = globalThis.navigator?.storage): Promise<boolean> {
  try {
    if (!storage?.persist) return false;
    if (await storage.persisted?.()) return true;
    return await storage.persist();
  } catch {
    return false; // a refusal or an old browser
  }
}

/** Whether the browser has agreed to keep the app's storage; null when it can't say. */
export async function storageKept(storage: Pick<StorageManager, 'persisted'> | undefined = globalThis.navigator?.storage): Promise<boolean | null> {
  try {
    return storage?.persisted ? await storage.persisted() : null;
  } catch {
    return null;
  }
}
