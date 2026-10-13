/**
 * Asks the browser to keep the app's storage (SRS tuning spec §8): once, when it can and hasn't already, so Safari doesn't evict
 * his IndexedDB. The answer is ignored: nothing else changes either way. Sync across devices is its own sub-project.
 */
export async function keepStorage(storage: Pick<StorageManager, 'persist' | 'persisted'> | undefined = globalThis.navigator?.storage): Promise<void> {
  try {
    if (!storage?.persist) return;
    if (await storage.persisted?.()) return;
    await storage.persist();
  } catch {
    // a refusal or an old browser: nothing to do
  }
}
