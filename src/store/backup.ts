import { openDB } from 'idb';
import type { KidState, Settings } from '../types';
import { DB_NAME, DB_VERSION, LIST_STORES, type AppDb, type ListStore } from './db';

export const BACKUP_FORMAT = 'hanzi-buddy-backup';
export const BACKUP_FORMAT_VERSION = 1;
const MEDIA_STORES: ListStore[] = ['recordings', 'prompts'];
export const RAW_FORMAT = 'hanzi-buddy-raw-dump';
const NOT_A_BACKUP = 'This file is not a 字己 ZiJi backup.';
const NEWER = 'This backup was made by a newer version of 字己 ZiJi. Update the app, then try again.';

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  exportedAt: number;
  dbVersion: number;
  stores: Partial<Record<ListStore, unknown[]>>;
  settings: unknown;
  kid: unknown;
}

export interface BackupPreview {
  file: BackupFile;
  exportedAt: number;
  counts: { words: number; cards: number; sessions: number; recordings: number };
  hasMedia: boolean;
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

export async function exportBackup(db: AppDb, opts: { includeMedia: boolean; now: number }): Promise<string> {
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
    stores,
    settings: (await encodeValue(await db.get('settings', 'main'))) ?? null,
    kid: (await encodeValue(await db.get('kid', 'main'))) ?? null,
  };
  return JSON.stringify(file);
}

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
  if (file.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupError(NEWER);
  }
  for (const [name, rows] of Object.entries(file.stores)) {
    if (!(LIST_STORES as readonly string[]).includes(name) || !Array.isArray(rows)) throw new BackupError(NOT_A_BACKUP);
  }
  const count = (n: ListStore) => file.stores[n]?.length ?? 0;
  return {
    file,
    exportedAt: file.exportedAt,
    counts: { words: count('words'), cards: count('cards'), sessions: count('sessions'), recordings: count('recordings') },
    hasMedia: 'recordings' in file.stores,
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
  if (settings) ops.push(tx.objectStore('settings').put(settings, 'main'));
  if (kid) ops.push(tx.objectStore('kid').put(kid, 'main'));
  await Promise.all([...ops, tx.done]);
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
