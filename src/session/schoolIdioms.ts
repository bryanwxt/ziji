// School 成语 the parent types in (spec 2026-10-05 §4): kept on the iPad as school words tagged 成语, never in the repo.
import { pinyin } from 'pinyin-pro';
import { chengyuOf } from '../content/chengyu';
import { newId } from '../lib/id';
import type { AppDb } from '../store/db';
import { allWords, putWords } from '../store/repo';
import type { Word } from '../types';

export const IDIOM_LIST = '成语';
const IDIOM = /^\p{Script=Han}{4}$/u;

/** One 成语 a line, with an optional English meaning after = (or ＝). */
export function parseIdiomLines(text: string): { idioms: { text: string; meaning?: string }[]; rejected: string[] } {
  const idioms: { text: string; meaning?: string }[] = [];
  const rejected: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const [head = '', ...rest] = line.split(/[=＝]/);
    const t = head.replace(/[\s　]+/g, '');
    const meaning = rest.join('=').trim();
    if (!IDIOM.test(t)) { rejected.push(line); continue; }
    if (idioms.some((i) => i.text === t)) continue;
    idioms.push(meaning ? { text: t, meaning } : { text: t });
  }
  return { idioms, rejected };
}

/**
 * Saves typed 成语: new ones become school words (tagged 成语, first in line like 听写 mistakes, recognise-only), with the
 * parent's meaning or the 成语 list's; one he already has gets the tag, and the meaning when it had none.
 */
export async function addSchoolIdioms(db: AppDb, text: string, now: Date) {
  const { idioms, rejected } = parseIdiomLines(text);
  const byText = new Map((await allWords(db)).map((w) => [w.text, w]));
  const out: Word[] = [];
  const added: string[] = [];
  const tagged: string[] = [];
  idioms.forEach((i, k) => {
    const meaning = i.meaning ?? chengyuOf(i.text)?.meaning;
    const had = byText.get(i.text);
    if (had) {
      out.push({ ...had, tags: [...new Set([...(had.tags ?? []), '成语'])], ...(had.meaning || !meaning ? {} : { meaning }) });
      tagged.push(i.text);
      return;
    }
    const at = now.getTime() + k; // listedAt below: first in line, in the order typed
    out.push({
      id: `p:${newId()}`, text: i.text, pinyin: pinyin(i.text, { type: 'array' }).join(' '), level: null, rank: null, source: 'parent',
      listName: IDIOM_LIST, listedAt: -now.getTime() + k, writeable: false, paused: false, createdAt: at, tags: ['成语'], ...(meaning ? { meaning } : {}),
    });
    added.push(i.text);
  });
  await putWords(db, out);
  return { added, tagged, rejected };
}
