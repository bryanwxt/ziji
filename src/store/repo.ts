import { WORLDS, worldById } from '../fun/worlds';
import { nextRung, type Rung } from '../session/ladder';
import { normalizeFinds } from '../fun/finds';
import { migrateAccessory } from '../fun/accessories';
import { DEFAULT_KID, DEFAULT_READING, DEFAULT_SETTINGS, type AnswerLog, type CardKind, type CardRecord, type ParentPassage, type ReadingState, type KidState, type PicturePrompt, type Recording, type ReviewLog, type RewardGoal, type SessionRecord, type Settings, type Word } from '../types';
import type { AppDb } from './db';

const MAIN = 'main';

export async function getSettings(db: AppDb): Promise<Settings> {
  const s = await db.get('settings', MAIN);
  return { ...DEFAULT_SETTINGS, ...s, activities: { ...DEFAULT_SETTINGS.activities, ...s?.activities }, oral: { ...DEFAULT_SETTINGS.oral, ...s?.oral } };
}

export async function saveSettings(db: AppDb, s: Settings): Promise<void> {
  await db.put('settings', s, MAIN);
}

export async function updateSettings(db: AppDb, patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings(db)), ...patch };
  await saveSettings(db, next);
  return next;
}

/** Older records (dragon era, older backups) lack newer fields: fill them with defaults. */
export function normalizeKid(raw: Partial<KidState> | null | undefined): KidState | null {
  if (!raw) return null;
  const kid = { ...DEFAULT_KID, ...raw };
  // Accessories v2: dragon-era emoji map one-to-one onto the new add-ons; unknown values are dropped.
  const list = Array.isArray(kid.ownedAccessories) ? kid.ownedAccessories : [];
  const owned = [...new Set(list.map((v) => migrateAccessory(typeof v === 'string' ? v : null)).filter((x): x is string => !!x))];
  // Journey worlds: known ids only, in unlock order; a pick must be a reached world.
  const worldList = Array.isArray(kid.worldsSeen) ? kid.worldsSeen.filter((w): w is string => typeof w === 'string' && !!worldById(w)) : [];
  const worldsSeen = WORLDS.map((w) => w.id as string).filter((id) => worldList.includes(id));
  const world = typeof kid.world === 'string' && worldsSeen.includes(kid.world) ? kid.world : null;
  return { ...kid, ownedAccessories: owned, wearing: migrateAccessory(typeof kid.wearing === 'string' ? kid.wearing : null), worldsSeen, world, reading: normalizeReading(kid.reading),
    speakingLast: kid.speakingLast === 'langdu' || kid.speakingLast === 'story' ? kid.speakingLast : null,
    story: normalizeStory(kid.story),
    finds: normalizeFinds(kid.finds),
  };
}

export async function getKid(db: AppDb): Promise<KidState | null> {
  return normalizeKid(await db.get('kid', MAIN));
}

export async function saveKid(db: AppDb, kid: KidState): Promise<void> {
  await db.put('kid', kid, MAIN);
}

/**
 * Change his state from what is stored, in one transaction: two saves at the same moment (Home's daily one and a find from a
 * prop tap) both land (sweep). `change` returns null to leave it as it is; with no kid yet nothing happens. Returns what was saved.
 */
export async function updateKid(db: AppDb, change: (kid: KidState) => KidState | null): Promise<KidState | null> {
  const tx = db.transaction('kid', 'readwrite');
  const stored = normalizeKid(await tx.store.get(MAIN));
  const next = stored ? change(stored) : null;
  if (next) await tx.store.put(next, MAIN);
  await tx.done;
  return next;
}

/** Adds missing built-in words; with refresh, also brings existing ones up to the current content (keeping his and the parent's state). */
export async function seedBuiltinWords(db: AppDb, words: Word[], refresh = true): Promise<number> {
  const tx = db.transaction('words', 'readwrite');
  if (!refresh) {
    const have = new Set(await tx.store.getAllKeys());
    const missing = words.filter((w) => !have.has(w.id));
    await Promise.all([...missing.map((w) => tx.store.put(w)), tx.done]);
    return missing.length;
  }
  const existing = new Map((await tx.store.getAll()).map((w) => [w.id, w]));
  const missing = words.filter((w) => !existing.has(w.id));
  // Existing installs pick up content fixes; the parent's and child's state on each word is kept.
  const refreshed = words.flatMap((w) => {
    const old = existing.get(w.id);
    if (!old) return [];
    const kept = { paused: old.paused, listName: old.listName, listedAt: old.listedAt, createdAt: old.createdAt, writeSkippedAt: old.writeSkippedAt, misreadMark: old.misreadMark, misreadPrev: old.misreadPrev };
    const imported = { pairs: old.pairs, sentences: old.sentences, tags: old.tags }; // from a worksheet import; on-device only
    const writeable = w.writeable || (old.listName !== undefined && old.writeable); // a parent list's 写 choice stays
    return [{ ...w, ...kept, ...imported, writeable }];
  });
  await Promise.all([...[...missing, ...refreshed].map((w) => tx.store.put(w)), tx.done]);
  return missing.length;
}

export const allWords = (db: AppDb) => db.getAll('words');
export const getWord = (db: AppDb, id: string) => db.get('words', id);

export async function putWords(db: AppDb, words: Word[]): Promise<void> {
  const tx = db.transaction('words', 'readwrite');
  await Promise.all([...words.map((w) => tx.store.put(w)), tx.done]);
}

export async function deleteWord(db: AppDb, id: string): Promise<void> {
  const tx = db.transaction(['words', 'cards'], 'readwrite');
  await Promise.all([
    tx.objectStore('words').delete(id),
    tx.objectStore('cards').delete(`${id}:recognise`),
    tx.objectStore('cards').delete(`${id}:write`),
    tx.objectStore('cards').delete(`${id}:meaning`),
    tx.done,
  ]);
}

export const allCards = (db: AppDb) => db.getAll('cards');
export const getCard = (db: AppDb, id: string) => db.get('cards', id);

export async function putCards(db: AppDb, cards: CardRecord[]): Promise<void> {
  const tx = db.transaction('cards', 'readwrite');
  await Promise.all([...cards.map((c) => tx.store.put(c)), tx.done]);
}

export async function addReviewLog(db: AppDb, log: ReviewLog): Promise<void> {
  const { id: _id, ...rest } = log;
  await db.add('reviewLogs', rest as ReviewLog);
}

export async function deleteCards(db: AppDb, ids: string[]): Promise<void> {
  const tx = db.transaction('cards', 'readwrite');
  await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
}

/** Words he has actually answered in a lesson (any review logged), with when he last did. Placement guesses have none. */
/** The words he has answered in lessons, by card kind: practising a word's meaning doesn't make its reading practised. */
export async function practisedByKind(db: AppDb): Promise<Map<CardKind, Set<string>>> {
  const out = new Map<CardKind, Set<string>>();
  for (const l of await db.getAll('reviewLogs')) (out.get(l.kind) ?? out.set(l.kind, new Set()).get(l.kind)!).add(l.wordId);
  return out;
}

export async function practisedWords(db: AppDb): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const l of await db.getAll('reviewLogs')) out.set(l.wordId, Math.max(out.get(l.wordId) ?? 0, l.at));
  return out;
}

export async function addAnswer(db: AppDb, a: AnswerLog): Promise<void> {
  const { id: _id, ...rest } = a;
  await db.add('answers', rest as AnswerLog);
}

export const answersSince = (db: AppDb, sinceMs: number) => db.getAllFromIndex('answers', 'byAt', IDBKeyRange.lowerBound(sinceMs));

export const logsSince = (db: AppDb, sinceMs: number) =>
  db.getAllFromIndex('reviewLogs', 'byAt', IDBKeyRange.lowerBound(sinceMs));

export const getSession = (db: AppDb, date: string) => db.get('sessions', date);
export const allSessions = (db: AppDb) => db.getAll('sessions');

export async function saveSession(db: AppDb, rec: SessionRecord): Promise<void> {
  await db.put('sessions', rec);
}

export async function addRecording(db: AppDb, r: Recording): Promise<void> {
  await db.put('recordings', r);
}

/** A recording that can't be saved (storage full) is lost, but the lesson goes on; the parent frees space under Recordings. */
export async function keepRecording(db: AppDb, r: Recording): Promise<void> {
  try {
    await addRecording(db, r);
  } catch {
    // nothing else to do
  }
}

export async function listRecordings(db: AppDb): Promise<Recording[]> {
  return (await db.getAllFromIndex('recordings', 'byCreatedAt')).reverse();
}

export const deleteRecording = (db: AppDb, id: string) => db.delete('recordings', id);
export const countRecordings = (db: AppDb) => db.count('recordings');

export async function addPrompt(db: AppDb, p: PicturePrompt): Promise<void> {
  await db.put('prompts', p);
}

export async function listPrompts(db: AppDb): Promise<PicturePrompt[]> {
  return (await db.getAll('prompts')).sort((a, b) => a.createdAt - b.createdAt);
}

export const deletePrompt = (db: AppDb, id: string) => db.delete('prompts', id);

export async function listRewards(db: AppDb): Promise<RewardGoal[]> {
  return (await db.getAll('rewards')).sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveReward(db: AppDb, g: RewardGoal): Promise<void> {
  await db.put('rewards', g);
}

export const deleteReward = (db: AppDb, id: string) => db.delete('rewards', id);

function normalizeReading(r: unknown): ReadingState {
  if (!r || typeof r !== 'object') return { ...DEFAULT_READING, lastRead: {} };
  const x = r as Partial<ReadingState>;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
  const str = (v: unknown) => (typeof v === 'string' ? v : null);
  const lastRead = x.lastRead && typeof x.lastRead === 'object' ? Object.fromEntries(Object.entries(x.lastRead).filter(([, d]) => typeof d === 'string')) : {};
  return { passageId: str(x.passageId), days: num(x.days), extra: num(x.extra), lastDay: str(x.lastDay), lastRead, warmups: num(x.warmups) };
}

export async function listParentPassages(db: AppDb): Promise<ParentPassage[]> {
  return (await db.getAll('passages')).sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveParentPassage(db: AppDb, p: ParentPassage): Promise<void> {
  await db.put('passages', p);
}

export const deleteParentPassage = (db: AppDb, id: string) => db.delete('passages', id);

export async function updateRecording(db: AppDb, r: Recording): Promise<void> {
  await db.put('recordings', r);
}

function normalizeStory(v: unknown): { next: number; told: number } {
  const x = (v && typeof v === 'object' ? v : {}) as { next?: unknown; told?: unknown };
  const n = (a: unknown) => (typeof a === 'number' && Number.isInteger(a) && a >= 0 ? a : 0);
  return { next: n(x.next), told: n(x.told) };
}

/** Every word's rung on the context ladder (words never practised in 练一练 have none: rung 0). */
export async function getRungs(db: AppDb): Promise<Map<string, number>> {
  return new Map((await db.getAll('ladder')).map((e) => [e.wordId, e.rung]));
}

/** Notes one answer at `rung` and returns the word's new rung (what else the entry holds stays). */
export async function noteRung(db: AppDb, wordId: string, rung: Rung, correct: boolean, now: Date): Promise<number> {
  const had = await db.get('ladder', wordId);
  const next = nextRung(had?.rung ?? 0, rung, correct);
  await db.put('ladder', { ...had, wordId, rung: next, at: now.getTime() });
  return next;
}

/** A look-alike he picked for this word (spec 2026-10-05 §3.4): 钓鱼 comes back for it. */
export async function noteConfusion(db: AppDb, wordId: string, ch: string, now: Date): Promise<void> {
  const had = await db.get('ladder', wordId);
  const confused = [...new Set([...(had?.confused ?? []), ch])];
  await db.put('ladder', { wordId, rung: had?.rung ?? 0, at: now.getTime(), ...had, confused, confusedAt: now.getTime() });
}

/** He caught the right fish: stop asking. */
export async function clearConfusion(db: AppDb, wordId: string): Promise<void> {
  const had = await db.get('ladder', wordId);
  if (had?.confused) await db.put('ladder', { ...had, confused: [] });
}

export async function getConfusions(db: AppDb): Promise<Map<string, string[]>> {
  // newest first, so the two a lesson fishes are the freshest mix-ups (sweep)
  const list = (await db.getAll('ladder')).filter((e) => e.confused?.length).sort((a, b) => (b.confusedAt ?? b.at ?? 0) - (a.confusedAt ?? a.at ?? 0));
  return new Map(list.map((e) => [e.wordId, e.confused!]));
}
