import { openDB } from 'idb';
import type { KidState, Settings } from '../types';
import { schoolYear } from '../content/curriculum';
import { DB_NAME, DB_VERSION, LIST_STORES, type AppDb, type ListStore, type RestorePoint } from './db';
import { applySettingsMigration } from './settings';
import { migrateToLadder } from '../ladder/migrate';
import { markOldPlacement } from '../placement/migrate';

export const BACKUP_FORMAT = 'hanzi-buddy-backup';
export const BACKUP_FORMAT_VERSION = 1;
const MEDIA_STORES: ListStore[] = ['recordings', 'prompts'];
export const RAW_FORMAT = 'hanzi-buddy-raw-dump';
const NOT_A_BACKUP = 'This file is not a 字己 ZiJi backup.';
const NEWER = 'This backup was made by a newer version of 字己 ZiJi. Update the app, then try again.';

/** Whose progress a backup holds (review 2026-10-17: two children, one wrong file): the child's name (the pet's without one),
 *  his school year then, and the device it was saved on. */
export interface BackupWho {
  name: string;
  grade: number | null;
  device: string | null;
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  exportedAt: number;
  dbVersion: number;
  who?: BackupWho; // backups before 2026-10-17 have none: it is read from their settings and pet
  stores: Partial<Record<ListStore, unknown[]>>;
  settings: unknown;
  kid: unknown;
}

export interface BackupPreview {
  file: BackupFile;
  exportedAt: number;
  who: BackupWho;
  counts: { words: number; cards: number; sessions: number; recordings: number };
  hasMedia: boolean;
  listsMissing: boolean; // a backup from before weekly lists (v6): restoring it clears this device's lists (weekly list spec §11)
  talksMissing: boolean; // a backup from before the talk log (v7): restoring it keeps this device's talks (parent loop spec §6)
}

/** The stores a backup holds: every list store; the restore point is never among them. */
export const LIST_STORES_IN_BACKUP: readonly string[] = LIST_STORES;

const whoFrom = (settings: Partial<Settings> | null, kid: Partial<KidState> | null, at: Date, device: string | null): BackupWho => ({
  name: settings?.oral?.name?.trim() || kid?.petName?.trim() || '',
  grade: settings ? schoolYear(settings, at) : null,
  device,
});

/** This device's child, as a backup made now would name him. */
export async function currentWho(db: AppDb, now: Date, device: string | null): Promise<BackupWho> {
  const [settings, kid] = await Promise.all([db.get('settings', 'main'), db.get('kid', 'main')]);
  return whoFrom(settings ?? null, kid ?? null, now, device);
}

/** What makes a backup another child's: another name, or another school year (another device is fine: his iPhone's copy). */
export function whoDiffers(file: BackupWho, here: BackupWho): ('name' | 'grade')[] {
  const out: ('name' | 'grade')[] = [];
  const a = file.name.trim(), b = here.name.trim();
  if (a && b && a !== b) out.push('name');
  if (file.grade !== null && here.grade !== null && file.grade !== here.grade) out.push('grade');
  return out;
}

const safe = (s: string) => s.trim().replace(/[\\/:*?"<>|\s]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

/** 「ziji-backup-小明-P2-iPad-2026-10-17.json」: whose it is, at a glance in Files. */
export function backupFileName(who: BackupWho, date: string): string {
  const parts = [safe(who.name), who.grade !== null ? `P${who.grade}` : '', who.device ? safe(who.device) : ''].filter(Boolean);
  return `ziji-backup-${[...parts, date].join('-')}.json`;
}

export class BackupError extends Error {}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function base64ToBlob(b64: string, type: string): Blob {
  const binary = atob(b64);
  return new Blob([Uint8Array.from(binary, (c) => c.charCodeAt(0))], { type });
}

/** JSON-safe copy: Dates become {$date}, Blobs become {$blob, type}. */
async function encodeValue(value: unknown): Promise<unknown> {
  if (value instanceof Date) return { $date: value.toISOString() };
  if (value instanceof Blob) return { $blob: await blobToBase64(value), type: value.type };
  if (Array.isArray(value)) return Promise.all(value.map(encodeValue));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = await encodeValue(v);
    return out;
  }
  return value;
}

function decodeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeValue);
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (typeof v.$date === 'string') return new Date(v.$date);
    if (typeof v.$blob === 'string') return base64ToBlob(v.$blob, String(v.type ?? ''));
    const out: Record<string, unknown> = {};
    for (const [k, inner] of Object.entries(v)) out[k] = decodeValue(inner);
    return out;
  }
  return value;
}

export async function exportBackup(db: AppDb, opts: { includeMedia: boolean; now: number; device?: string | null }): Promise<string> {
  const stores: BackupFile['stores'] = {};
  for (const name of LIST_STORES) {
    if (!opts.includeMedia && MEDIA_STORES.includes(name)) continue;
    stores[name] = (await encodeValue(await db.getAll(name))) as unknown[];
  }
  const file: BackupFile = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: opts.now,
    dbVersion: DB_VERSION,
    who: await currentWho(db, new Date(opts.now), opts.device ?? null),
    stores,
    settings: (await encodeValue(await db.get('settings', 'main'))) ?? null,
    kid: (await encodeValue(await db.get('kid', 'main'))) ?? null,
  };
  return JSON.stringify(file);
}

const listsMissing = (file: BackupFile) => 'words' in file.stores && !('weekLists' in file.stores);
/** A backup from before v7: its restore leaves the talk log as it is (the family's log, not his progress); Undo still covers it. */
const talksMissing = (file: BackupFile) => 'words' in file.stores && !('talks' in file.stores);

/** Validates without writing anything. Throws BackupError with a parent-friendly message. */
export function readBackup(text: string): BackupPreview {
  let file: BackupFile;
  try {
    file = JSON.parse(text);
  } catch {
    throw new BackupError(NOT_A_BACKUP);
  }
  if ((file as { format?: unknown } | null)?.format === RAW_FORMAT) file = fromRawDump(file as RawDump); // the emergency copy
  if (!file || typeof file !== 'object' || file.format !== BACKUP_FORMAT || !file.stores || typeof file.stores !== 'object') {
    throw new BackupError(NOT_A_BACKUP);
  }
  if (file.formatVersion > BACKUP_FORMAT_VERSION || (typeof file.dbVersion === 'number' && file.dbVersion > DB_VERSION)) {
    throw new BackupError(NEWER); // a newer build's stores and records would not fit this one: update the app first
  }
  for (const [name, rows] of Object.entries(file.stores)) {
    if (!(LIST_STORES as readonly string[]).includes(name) || !Array.isArray(rows)) throw new BackupError(NOT_A_BACKUP);
  }
  const count = (n: ListStore) => file.stores[n]?.length ?? 0;
  const who = file.who && typeof file.who.name === 'string'
    ? { name: file.who.name, grade: typeof file.who.grade === 'number' ? file.who.grade : null, device: typeof file.who.device === 'string' ? file.who.device : null }
    : whoFrom(decodeValue(file.settings) as Partial<Settings> | null, decodeValue(file.kid) as Partial<KidState> | null, new Date(file.exportedAt || Date.now()), null);
  return {
    file,
    exportedAt: file.exportedAt,
    who,
    counts: { words: count('words'), cards: count('cards'), sessions: count('sessions'), recordings: count('recordings') },
    hasMedia: 'recordings' in file.stores,
    listsMissing: listsMissing(file),
    talksMissing: talksMissing(file),
  };
}

interface RawDump {
  dbVersion?: unknown;
  exportedAt?: unknown;
  stores?: unknown;
}

/** The emergency copy (every store as key/value rows) reshaped as a normal backup, so it is checked and restored the same way. */
function fromRawDump(raw: RawDump): BackupFile {
  if (!raw.stores || typeof raw.stores !== 'object') throw new BackupError(NOT_A_BACKUP);
  if (typeof raw.dbVersion === 'number' && raw.dbVersion > DB_VERSION) throw new BackupError(NEWER);
  const stores: Record<string, unknown[]> = {};
  let settings: unknown = null;
  let kid: unknown = null;
  for (const [name, rows] of Object.entries(raw.stores)) {
    const ok = Array.isArray(rows) && rows.every((r) => r && typeof r === 'object' && 'key' in r && 'value' in r);
    if (!ok) throw new BackupError(NOT_A_BACKUP);
    const entries = rows as { key: unknown; value: unknown }[];
    const main = () => entries.find((r) => r.key === 'main')?.value ?? null;
    if (name === 'settings') settings = main();
    else if (name === 'kid') kid = main();
    else if (name === 'restorePoints') continue; // the undo copy is no part of his progress
    else stores[name] = entries.map((r) => r.value); // unknown store names are refused by readBackup, as for any backup
  }
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: typeof raw.exportedAt === 'number' ? raw.exportedAt : 0,
    dbVersion: typeof raw.dbVersion === 'number' ? raw.dbVersion : DB_VERSION,
    stores,
    settings,
    kid,
  };
}

/** Replaces each store present in the backup (stores absent from it are kept), in one transaction. */
export async function applyBackup(db: AppDb, preview: BackupPreview): Promise<void> {
  const { file } = preview;
  const decoded = Object.entries(file.stores).map(([name, rows]) => [name as ListStore, (rows as unknown[]).map(decodeValue)] as const);
  const settings = decodeValue(file.settings) as Settings | null;
  const kid = decodeValue(file.kid) as KidState | null;
  const tx = db.transaction([...LIST_STORES, 'settings', 'kid'], 'readwrite');
  const ops: Promise<unknown>[] = [];
  for (const [name, rows] of decoded) {
    const store = tx.objectStore(name);
    ops.push(store.clear());
    for (const row of rows) ops.push(store.put(row as never));
  }
  // a backup from before v6 has no weekly lists, and its words replace the parent words they point at: clear them too (weekly
  // list spec 2026-10-17 §11); undoing the restore brings them back from the restore point
  if (listsMissing(file)) ops.push(tx.objectStore('weekLists').clear());
  if (settings) ops.push(tx.objectStore('settings').put(settings, 'main'));
  if (kid) ops.push(tx.objectStore('kid').put(kid, 'main'));
  await Promise.all([...ops, tx.done]);
  await applySettingsMigration(db); // an older backup's settings move to today's at once, not on the next launch (sweep)
  await migrateToLadder(db, new Date()); // a backup from before the ladder moves over too (it checks its own flag)
  await markOldPlacement(db, new Date()); // and an older placement follows the new recheck rules (spec 2026-10-14; its own flag)
}

const POINT = 'before-restore';

/** What a restore would replace, if one ran on this device and hasn't been undone. */
export const restorePoint = async (db: AppDb): Promise<RestorePoint | null> => (await db.get('restorePoints', POINT)) ?? null;

/** Restores a backup, keeping what was here first (review 2026-10-17) so undoRestore can put it back. Only the kinds the backup
 *  replaces are kept: without media, the recordings stay where they are. */
export async function restoreWithUndo(db: AppDb, preview: BackupPreview, now: Date): Promise<void> {
  const text = await exportBackup(db, { includeMedia: preview.hasMedia, now: now.getTime() });
  await db.put('restorePoints', { id: POINT, at: now.getTime(), who: readBackup(text).who, text });
  await applyBackup(db, preview);
}

/** Puts back what the last restore replaced, once. */
export async function undoRestore(db: AppDb): Promise<boolean> {
  const point = await restorePoint(db);
  if (!point) return false;
  await applyBackup(db, readBackup(point.text));
  await db.delete('restorePoints', POINT);
  return true;
}

/** Emergency dump of whatever is on disk, for when the app cannot open its database normally. */
export async function exportRawBackup(name: string = DB_NAME): Promise<string> {
  const db = await openDB(name);
  const stores: Record<string, unknown> = {};
  for (const store of Array.from(db.objectStoreNames)) {
    const [keys, values] = await Promise.all([db.getAllKeys(store), db.getAll(store)]);
    stores[store] = await encodeValue(values.map((value, i) => ({ key: keys[i], value })));
  }
  const dump = JSON.stringify({ format: RAW_FORMAT, dbVersion: db.version, exportedAt: Date.now(), stores });
  db.close();
  return dump;
}
