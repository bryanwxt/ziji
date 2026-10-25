import { migrateWorldId, OLD_WORLDS, WORLDS, type WorldId } from '../fun/worlds';
import { nextRung, type Rung } from '../session/ladder';
import { normalizeFinds } from '../fun/finds';
import { normalizeBank, normalizeMeter } from '../fun/meter';
import { migrateAccessory } from '../fun/accessories';
import { migrateReading } from '../langdu/history';
import { DEFAULT_KID, DEFAULT_SETTINGS, type AnswerLog, type CardKind, type CardRecord, type ParentPassage, type KidState, type PicturePrompt, type Recording, type ReviewLog, type RewardGoal, type SessionRecord, type Settings, type TalkLog, type WeekList, type Word } from '../types';
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
  // Journey worlds: One River ids only (an old paper world maps across by position, spec 2026-10-13 §8), in unlock order;
  // a pick must be a reached world. Unknown ids are dropped. Mapping an old id once is what tells Home to say so.
  const rawWorlds = Array.isArray(kid.worldsSeen) ? kid.worldsSeen : [];
  const worldList: (WorldId | null)[] = rawWorlds.map(migrateWorldId);
  const worldsSeen: WorldId[] = WORLDS.map((w) => w.id).filter((id) => worldList.includes(id));
  const picked = migrateWorldId(kid.world);
  const world = picked && worldsSeen.includes(picked) ? picked : null;
  const moved = rawWorlds.some((w) => typeof w === 'string' && Object.hasOwn(OLD_WORLDS, w) && !WORLDS.some((x) => x.id === w));
  // one rabbit (parent 2026-10-15): a won 小白兔 is the zodiac 兔, which now wears its look
  const toRabbit = (id: string) => (id === 'bunny' ? 'rabbit' : id);
  const ownedCostumes = [...new Set((Array.isArray(kid.ownedCostumes) ? kid.ownedCostumes : []).map(toRabbit))];
  const outfit = typeof kid.outfit === 'string' ? toRabbit(kid.outfit) : null;
  return { ...kid, ownedCostumes, outfit, ownedAccessories: owned, wearing: migrateAccessory(typeof kid.wearing === 'string' ? kid.wearing : null), worldsSeen, world, riverNews: kid.riverNews === true || moved, reading: migrateReading(kid.reading),
    speakingLast: kid.speakingLast === 'langdu' || kid.speakingLast === 'story' ? kid.speakingLast : null,
    story: normalizeStory(kid.story),
    finds: normalizeFinds(kid.finds),
    meter: normalizeMeter(kid.meter),
    bank: normalizeBank(kid.bank),
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
    tx.objectStore('cards').delete(`${id}:hear`),
    tx.objectStore('cards').delete(`${id}:say`),
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

/** The words he has answered in lessons, by card kind: practising a word's meaning doesn't make its reading practised. */
/** Every answer on one card, oldest first (a rung's pass is worked out from them). */
export async function logsForCard(db: AppDb, cardId: string): Promise<ReviewLog[]> {
  return (await db.getAllFromIndex('reviewLogs', 'byCard', cardId)).sort((a, b) => a.at - b.at);
}

export async function practisedByKind(db: AppDb): Promise<Map<CardKind, Set<string>>> {
  const out = new Map<CardKind, Set<string>>();
  // one log per card is enough (a card is one word and one kind): the byCard index visits each card once, not every log
  for (let c = await db.transaction('reviewLogs').store.index('byCard').openCursor(null, 'nextunique'); c; c = await c.continue()) {
    const l = c.value;
    (out.get(l.kind) ?? out.set(l.kind, new Set()).get(l.kind)!).add(l.wordId);
  }
  return out;
}

/** Words he has actually answered in a lesson (any review logged), with when he last did. Placement guesses have none. */
export async function practisedWords(db: AppDb): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  // every log's time counts (a restored backup's ids need not follow time), so this one still reads them all, in one pass
  for (let c = await db.transaction('reviewLogs').store.openCursor(); c; c = await c.continue()) out.set(c.value.wordId, Math.max(out.get(c.value.wordId) ?? 0, c.value.at));
  return out;
}

export async function addAnswer(db: AppDb, a: AnswerLog): Promise<void> {
  const { id: _id, ...rest } = a;
  await db.add('answers', rest as AnswerLog);
}

export const answersSince = (db: AppDb, sinceMs: number) => db.getAllFromIndex('answers', 'byAt', IDBKeyRange.lowerBound(sinceMs));

/** Every answer on one word, any kind. */
export const logsForWord = (db: AppDb, wordId: string) => db.getAllFromIndex('reviewLogs', 'byWord', wordId);

/** The cards with at least one answer logged, by id (keys only: no log is read). */
export async function answeredCardIds(db: AppDb): Promise<Set<string>> {
  const out = new Set<string>();
  for (let c = await db.transaction('reviewLogs').store.index('byCard').openKeyCursor(null, 'nextunique'); c; c = await c.continue()) out.add(c.key);
  return out;
}

export const logsSince = (db: AppDb, sinceMs: number) =>
  db.getAllFromIndex('reviewLogs', 'byAt', IDBKeyRange.lowerBound(sinceMs));
export const logsUntil = (db: AppDb, untilMs: number) =>
  db.getAllFromIndex('reviewLogs', 'byAt', IDBKeyRange.upperBound(untilMs));

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

export const getRecording = (db: AppDb, id: string) => db.get('recordings', id);
export const deleteRecording = (db: AppDb, id: string) => db.delete('recordings', id);

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

export async function listParentPassages(db: AppDb): Promise<ParentPassage[]> {
  return (await db.getAll('passages')).sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveParentPassage(db: AppDb, p: ParentPassage): Promise<void> {
  await db.put('passages', p);
}

export const deleteParentPassage = (db: AppDb, id: string) => db.delete('passages', id);

/** Marks a take reviewed and writes its review log in one transaction; false (nothing written) if it is gone or already reviewed. */
export async function settleTake(db: AppDb, id: string, verdict: 'ok' | 'no', log: Omit<ReviewLog, 'id'>): Promise<boolean> {
  const tx = db.transaction(['recordings', 'reviewLogs'], 'readwrite');
  const rec = await tx.objectStore('recordings').get(id);
  if (!rec || rec.review) {
    await tx.done;
    return false;
  }
  await Promise.all([tx.objectStore('recordings').put({ ...rec, review: verdict }), tx.objectStore('reviewLogs').add(log as ReviewLog), tx.done]);
  return true;
}

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

/** Weekly lists (weekly list spec 2026-10-17 §4), active and closed. */
export const allWeekLists = (db: AppDb) => db.getAll('weekLists');
export const getWeekList = (db: AppDb, id: string) => db.get('weekLists', id);
export async function putWeekList(db: AppDb, l: WeekList): Promise<void> {
  await db.put('weekLists', l);
}
export const deleteWeekList = (db: AppDb, id: string) => db.delete('weekLists', id);
/**
 * Changes one list in a single readwrite transaction: `change` gets the list as stored now (with every answer recorded so far)
 * and returns it changed. Use this, not read → await → put, so answers recorded in between are never overwritten (weekly list
 * fix round 2026-10-17). `change` must be synchronous. Undefined when the list is gone.
 */
export async function updateWeekList(db: AppDb, id: string, change: (l: WeekList) => WeekList): Promise<WeekList | undefined> {
  const tx = db.transaction('weekLists', 'readwrite');
  const was = await tx.store.get(id);
  if (!was) {
    await tx.done;
    return undefined;
  }
  const next = change(was);
  await Promise.all([tx.store.put(next), tx.done]);
  return next;
}

/** A 「✓ 聊了」 (parent loop spec §5). */
export async function addTalk(db: AppDb, t: TalkLog): Promise<void> {
  await db.put('talks', t);
}
export const deleteTalk = (db: AppDb, id: string) => db.delete('talks', id);
/** Talks logged in [from, to), oldest first. */
export const talksBetween = (db: AppDb, from: number, to: number): Promise<TalkLog[]> => db.getAllFromIndex('talks', 'byAt', IDBKeyRange.bound(from, to, false, true));
/** Every talk logged, oldest first. */
export const allTalks = (db: AppDb): Promise<TalkLog[]> => db.getAllFromIndex('talks', 'byAt');
