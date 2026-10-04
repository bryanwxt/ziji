import { endOfLocalDay } from '../lib/date';
import { shuffle, type Rng } from '../lib/random';
import { meaningCue } from '../activities/flashcards/meaning';
import { isKnown } from '../srs/scheduler';
import type { ActivityKind, CardKind, CardRecord, FlashItem, SessionPlan, Settings, StepKind, Word } from '../types';

export const REVIEW_CAP = 60;
export const BACKLOG_PAUSE = 40;
export const MAX_NEW_WRITE = 2;
export const FREE_PLAY_SIZE = 20;
export const STEP_ORDER: ActivityKind[] = ['flashcards', 'choose', 'components', 'writing', 'speaking']; // spec §20 part 5

const LAST = Number.MAX_SAFE_INTEGER;

/** Listed words first (oldest list first), then built-in words by rank. */
export function newWordOrder(a: Word, b: Word): number {
  return (a.listedAt ?? LAST) - (b.listedAt ?? LAST) || (a.rank ?? LAST) - (b.rank ?? LAST) || a.createdAt - b.createdAt;
}

export interface PlanInput {
  cards: CardRecord[];
  words: Word[];
  settings: Settings;
  now: Date;
  practised?: ReadonlyMap<string, number>; // words answered in lessons → when last; placement guesses aren't here
}

export const FLASH_SHARE = 9 / 30; // 认一认's share of the lesson: 9 of 30 minutes (spec §20 part 5; 7 until the parent asked for more volume)
export const NEW_MEANING_PER_DAY = 12; // words he knows (placed or learned) starting meaning checks each day
export const MEANING_REVIEW_CAP = 30;

export function buildSessionPlan({ cards, words, settings, now, practised = new Map() }: PlanInput): SessionPlan {
  const active = words.filter((w) => !w.paused);
  const activeIds = new Set(active.map((w) => w.id));
  const cutoff = endOfLocalDay(now).getTime();
  const ofKind = (kind: CardKind) => cards.filter((c) => c.kind === kind);
  const dueOf = (list: CardRecord[]) =>
    list
      .filter((c) => activeIds.has(c.wordId) && c.fsrs.due.getTime() <= cutoff)
      .sort((a, b) => a.fsrs.due.getTime() - b.fsrs.due.getTime());

  const recognise = ofKind('recognise');
  const started = new Set(recognise.map((c) => c.wordId));
  const dueRecognise = dueOf(recognise);
  // a real backlog pauses new words; first rechecks of placement guesses (never practised) don't
  const backlog = dueRecognise.filter((c) => practised.has(c.wordId)).length;
  const newLimit = backlog > BACKLOG_PAUSE ? 0 : settings.newPerDay;

  const write = ofKind('write');
  const hasWrite = new Set(write.map((c) => c.wordId));
  const knownIds = new Set(recognise.filter((c) => isKnown(c.fsrs)).map((c) => c.wordId));

  // Meaning practice: due meaning cards, and begun words that have a 组词 cue but no meaning card yet.
  const meaning = ofKind('meaning');
  const hasMeaning = new Set(meaning.map((c) => c.wordId));
  const meaningOrder = (a: Word, b: Word) => (practised.get(b.id) ?? -1) - (practised.get(a.id) ?? -1) || newWordOrder(a, b);

  const newWords = active.filter((w) => !started.has(w.id)).sort(newWordOrder).slice(0, newLimit);
  // 用一用 closes every lesson that uses words: after 认一认 or 选一选 (spec §20 part 7)
  const steps: StepKind[] = STEP_ORDER.filter((s) => settings.activities[s]);
  if (settings.activities.flashcards || settings.activities.choose) steps.push('wrapup');

  return {
    steps,
    reviewWordIds: dueRecognise.slice(0, REVIEW_CAP).map((c) => c.wordId),
    newWordIds: newWords.map((w) => w.id),
    newWordMeaningIds: newWords.filter((w) => meaningCue(w) !== null).map((w) => w.id),
    flashTimeBoxMs: Math.round(settings.sessionMinutes * 60_000 * FLASH_SHARE),
    writeCandidates: [
      ...dueOf(write).map((c) => ({ wordId: c.wordId, isNew: c.fsrs.reps === 0 })), // never written yet (a school 听写 mistake): trace and hint first
      ...active
        .filter((w) => w.writeable && knownIds.has(w.id) && !hasWrite.has(w.id))
        .sort(
          (a, b) =>
            (a.writeSkippedAt ?? 0) - (b.writeSkippedAt ?? 0) || // strokes that failed to load go last
            (practised.get(b.id) ?? -1) - (practised.get(a.id) ?? -1) || // words from his lessons first, newest first
            (b.rank ?? -1) - (a.rank ?? -1) || // then placed characters near his level, going down
            newWordOrder(a, b),
        )
        .slice(0, MAX_NEW_WRITE)
        .map((w) => ({ wordId: w.id, isNew: true })),
    ],
    writeCount: settings.sessionMinutes < 25 ? 3 : 4, // spec §20 part 3: fewer words, each new one written three ways
    meaningReviewIds: dueOf(meaning).slice(0, MEANING_REVIEW_CAP).map((c) => c.wordId),
    newMeaningIds: active
      .filter((w) => started.has(w.id) && !hasMeaning.has(w.id) && meaningCue(w) !== null)
      .sort(meaningOrder)
      .slice(0, NEW_MEANING_PER_DAY)
      .map((w) => w.id),
  };
}

export function buildFreePlayQueue(cards: CardRecord[], words: Word[], rng: Rng, n = FREE_PLAY_SIZE): FlashItem[] {
  const active = new Set(words.filter((w) => !w.paused).map((w) => w.id));
  const ids = cards.filter((c) => c.kind === 'recognise' && active.has(c.wordId)).map((c) => c.wordId);
  return shuffle(ids, rng).slice(0, n).map((wordId) => ({ wordId, isNew: false, retry: true }));
}
