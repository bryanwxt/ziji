// Global Storybooks Chinese → 朗读 passages (spec 2026-10-15 §2.1): parse a story's Markdown, apply the manifest's light edits,
// cut its pages into passages of 40–110 characters, level each, and keep the stories he can read by 三上.
import { hanChars } from '../../src/content';
import { blockedWordsIn } from '../../src/content/zuju';
import { passageTerm, termIndex } from '../../src/langdu/level';
import { splitSentences } from '../../src/langdu/sentences';
import type { Passage, PassageCredit } from '../../src/types';

export const SBC_COMMIT = 'be28dab38ac55e8eb2185edb6631b11615d02185';
export const IMAGEBANK_COMMIT = '0df409752c86adc92685816e19e6085c4e4496f1';
/** Where fetch.ts leaves the page pictures (git-ignored). */
export const IMAGE_CACHE = 'scripts/.cache/storybooks';
export const CHUNK_MIN = 40;
export const CHUNK_MAX = 110;
/** The last term an imported passage may level at (spec §2.1: chunks beyond 三上 are dropped). */
export const LAST_TERM = '三上';

export interface Edit { from: string; to: string; why: string }
/** `licence`: the version when it isn't 3.0. The Markdown says only `CC-BY`; Global ASP's master index (global-asp/global-asp
 *  MASTER.md at 54c9b23) and the site give nine stories CC BY 4.0. */
export interface StoryEntry { level: 1 | 2 | 3 | 4 | 5; include?: boolean; why?: string; licence?: PassageCredit['licence']; names: string[]; edits?: Edit[] }
export type Manifest = Record<string, StoryEntry>;

export interface ParsedStory { title: string; pages: string[]; licence: PassageCredit['licence']; text: string; illustration: string; translation: string }

const LICENCES: Record<string, PassageCredit['licence']> = { 'CC-BY': 'CC BY 3.0', 'CC-BY-NC': 'CC BY-NC 3.0' };

/** `# title`, one `##` block a page, then the credit list (`* License: [CC-BY]`, `* Text: …`, …). */
export function parseStory(md: string): ParsedStory {
  const title = /^# (.+)$/m.exec(md)?.[1]?.trim();
  if (!title) throw new Error('no # title');
  const blocks = md.split(/^##[ \t]*$/m).slice(1).map((b) => b.trim());
  const at = blocks.findIndex((b) => b.startsWith('* License'));
  if (at < 0) throw new Error(`${title}: no credit list`);
  const field = (name: string) => new RegExp(`^\\* ${name}: (.+)$`, 'm').exec(blocks[at]!)?.[1]?.trim() ?? '';
  const licence = LICENCES[field('License').replace(/[[\]]/g, '')];
  if (!licence) throw new Error(`${title}: unknown licence "${field('License')}"`);
  const pages = blocks.slice(0, at).map((b) => b.split('\n').map((l) => l.trim()).join('')).filter((p) => p.length > 0);
  return { title, pages, licence, text: field('Text'), illustration: field('Illustration'), translation: field('Translation') };
}

/** Each edit's `from` must occur exactly once in the story (a missing or ambiguous one fails the import); it is replaced there. */
export function applyEdits(pages: string[], edits: readonly Edit[] = []): string[] {
  let out = pages;
  for (const e of edits) {
    const n = out.reduce((s, p) => s + p.split(e.from).length - 1, 0);
    if (n !== 1) throw new Error(`edit "${e.from}" found ${n} times (want exactly 1)`);
    out = out.map((p) => p.replace(e.from, e.to));
  }
  return out;
}

/** Words of the blocklist in a text, word by word as the content gate reads it (src/content/contentGate.test.ts). D2 allows no
 *  rewording, so a chunk with one is dropped like a chunk beyond 三上. */
export function blockedIn(text: string): string[] {
  return splitSentences(text).flatMap(blockedWordsIn);
}

export interface Chunk { firstPage: number; text: string }

/** Pages in order into passages of 40–110 Han characters: a page over 110 is cut at its sentences; a short tail joins the last. */
export function chunkPages(pages: string[]): Chunk[] {
  const units = pages.flatMap((p, i) => (hanChars(p).length > CHUNK_MAX ? splitSentences(p) : [p]).map((text) => ({ page: i + 1, text, n: hanChars(text).length })));
  const out: (Chunk & { n: number })[] = [];
  let cur: (Chunk & { n: number }) | null = null;
  for (const u of units) {
    if (cur && cur.n + u.n > CHUNK_MAX && cur.n >= CHUNK_MIN) {
      out.push(cur);
      cur = null;
    }
    cur ??= { firstPage: u.page, text: '', n: 0 };
    cur.text += u.text;
    cur.n += u.n;
  }
  const last = out[out.length - 1];
  if (cur && cur.n < CHUNK_MIN && last) {
    last.text += cur.text;
    last.n += cur.n;
  } else if (cur) out.push(cur);
  return out.map(({ firstPage, text }) => ({ firstPage, text }));
}

/** Where a passage's picture is served from (under public/). */
export const passageImage = (story: string, chunk: number): string => `passages/gsb-${story}-${chunk}.webp`;
/** The imagebank picture of a page: 01 is the cover, so page n is n + 1. */
export const pageImage = (story: string, page: number): string => `${story}/${String(page + 1).padStart(2, '0')}.jpg`;
export const sourceUrl = (file: string): string => `https://github.com/global-asp/sbc-source/blob/${SBC_COMMIT.slice(0, 7)}/zh/${encodeURIComponent(file)}`;

export interface ImportedStory { id: string; title: string; chunks: number; passages: Passage[]; images: { out: string; page: string }[] }

/** One story: its passages ≤ 三上 with no blocked word (none when fewer than half its chunks are, or not its first), each with
 *  its picture and the story's credit. */
export function importStory(file: string, md: string, entry: StoryEntry): ImportedStory {
  const id = file.slice(0, 4);
  const story = parseStory(md);
  const edits = entry.edits ?? [];
  const chunks = chunkPages(applyEdits(story.pages, edits)).map((c, i) => ({ ...c, chunk: i + 1, term: passageTerm(c.text, entry.names) }));
  const kept = chunks.filter((c) => c.term !== null && termIndex(c.term) <= termIndex(LAST_TERM) && !blockedIn(c.text).length);
  // fewer than half survive, or not its opening: a story missing its middle, or its start, is no story
  const whole = kept.length * 2 >= chunks.length && kept[0]?.chunk === 1;
  const licence = entry.licence ?? story.licence;
  if (licence.includes('NC') !== story.licence.includes('NC')) throw new Error(`${file}: manifest licence ${licence} but the story says ${story.licence}`);
  const credit: PassageCredit = { title: story.title, text: story.text, illustration: story.illustration, translation: story.translation, licence, adapted: edits.length > 0, source: sourceUrl(file) };
  const passages: Passage[] = (whole ? kept : []).map((c, i, all) => {
    const names = entry.names.filter((n) => c.text.includes(n));
    return {
      id: `gsb:${id}-${c.chunk}`,
      title: all.length > 1 ? `${story.title}（${i + 1}）` : story.title,
      text: c.text,
      term: c.term!,
      source: 'gsb',
      ...(names.length ? { names } : {}),
      image: passageImage(id, c.chunk),
      story: { id, part: i + 1, parts: all.length },
      credit,
    };
  });
  const images = (whole ? kept : []).map((c) => ({ out: passageImage(id, c.chunk), page: pageImage(id, c.firstPage) }));
  return { id, title: story.title, chunks: chunks.length, passages, images };
}

/** Every included story in file order. A story missing from the manifest fails the import. */
export function importAll(manifest: Manifest, files: { file: string; md: string }[]): ImportedStory[] {
  return files.flatMap(({ file, md }) => {
    const entry = manifest[file.slice(0, 4)];
    if (!entry) throw new Error(`${file}: not in manifest.json`);
    return entry.include === false ? [] : [importStory(file, md, entry)];
  });
}
