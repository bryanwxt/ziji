// The word weave (parent spec §5.5; 3c §4): a slot shows English, then Chinese with small English, then Chinese only, by his ladder.
import { isOwned } from '../ladder/rungs';
import type { Knowledge } from '../stats/stats';
import type { Page } from './format';

export type SlotState = 'new' | 'learning' | 'owned';
export const wordIdFor = (text: string): string => (Array.from(text).length === 1 ? `b:${text}` : `w:${text}`);

export function slotState(know: Pick<Knowledge, 'passedRungs' | 'wordsById' | 'ladderById'>, zh: string): SlotState {
  const id = wordIdFor(zh);
  const word = know.wordsById.get(id) ?? know.ladderById.get(id);
  const passed = know.passedRungs.get(id);
  if (!word || !passed) return 'new';
  if (isOwned(word, passed)) return 'owned';
  return passed.has('hear') ? 'learning' : 'new';
}

export type CastId = 'truffle' | 'granny';
export const DRAWN: ReadonlySet<CastId> = new Set<CastId>(['truffle', 'granny']);
const SPEAKER: Record<string, CastId> = { truffle: 'truffle', granny: 'granny', 'granny dragon': 'granny', 龙奶奶: 'granny' };

export function castFor(page: Page): CastId[] {
  const given = page.lines.find((l) => l.kind === 'cast');
  if (given && given.kind === 'cast') return given.ids.filter((x): x is CastId => DRAWN.has(x as CastId));
  const speakers = page.lines.flatMap((l) => (l.kind === 'speech' ? [SPEAKER[l.who.toLowerCase()]] : [])).filter((x): x is CastId => !!x);
  const out = [...new Set(speakers)];
  return out.length ? out : ['truffle'];
}
