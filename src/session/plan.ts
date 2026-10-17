import { addDays, endOfLocalDay, localDateKey, startOfLocalDay } from '../lib/date';
import { shuffle, type Rng } from '../lib/random';
import { meaningCue } from '../activities/flashcards/meaning';
import { PACE_START } from './pace';
import { learnerLevel } from '../content/chengyu';
import { classLessonAt, courseOf } from '../content/curriculum';
import { bookLesson, pickNewWords } from './lanes';
import { canAskRung } from '../ladder/rungs';
import { orderWriteItems, pickWriteUnits, writeCharTarget } from './writing';
import { activeLists, isReadyByDay, listBudget, listCardFor, listOwner, reteachIds, schoolNeed } from '../weeklist/plan';
import type { ActivityKind, CardKind, CardRecord, FlashItem, ListCard, SessionPlan, Settings, StepKind, WeekList, Word } from '../types';

export const REVIEW_CAP = 60;
export const BACKLOG_PAUSE = 40;
/** First rechecks of placed characters in one lesson at most (spec 2026-10-14); the rest wait for later days. */
export const PLACEMENT_CHECKS_PER_LESSON = 10;
export const STEP_ORDER: ActivityKind[] = ['newwords', 'practice', 'writing', 'speaking']; // spec 2026-10-05 §2
/** The lesson's steps the parent has on. The speaking step needs 朗读 or 看图说话 back from being parked (settings.langdu / story). */
export const stepsOn = (settings: Pick<Settings, 'activities' | 'story' | 'langdu'>): ActivityKind[] =>
  STEP_ORDER.filter((s) => settings.activities[s] && (s !== 'speaking' || settings.langdu || settings.story));

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
  newPerDay?: number; // today's pace (spec 2026-10-05 §2.2); without one, the pace's start under the ceiling
  extra?: boolean; // an extra lesson: review only (learning rules 2026-10-17), see extraCards
  lists?: WeekList[]; // weekly lists (weekly list spec 2026-10-17 §5); active ones are picked here
  ranOut?: [boolean, boolean]; // the last two rounds ran out of time (yesterday first): no list headroom, then spill (§5.1)
}

/** Words in an extra lesson's round of his weakest words, when nothing is due or near due (learning rules 2026-10-17). */
export const WEAK_ROUND_WORDS = 8;

/**
 * An extra lesson reviews what is due by the end of tomorrow too (learning rules 2026-10-17; Cepeda et al. 2006: a second lesson of
 * new words is massed practice): a card due tomorrow that he hasn't answered today counts as due at the end of today. A card he
 * answered today stays where its review put it — the same card again today is massing, not spacing.
 */
export function extraCards(cards: CardRecord[], now: Date, skip: ReadonlySet<string> = new Set()): CardRecord[] {
  const endToday = endOfLocalDay(now);
  const endTomorrow = endOfLocalDay(addDays(startOfLocalDay(now), 1)).getTime();
  const dayStart = startOfLocalDay(now).getTime();
  return cards.map((c) => {
    if (skip.has(c.wordId)) return c; // a list's card due on its ready-by day waits for the check (weekly list spec §6.3)
    const due = c.fsrs.due.getTime();
    const seenToday = !!c.fsrs.last_review && new Date(c.fsrs.last_review).getTime() >= dayStart;
    return due > endToday.getTime() && due <= endTomorrow && !seenToday ? { ...c, fsrs: { ...c.fsrs, due: endToday } } : c;
  });
}

/** 练一练's extra time on a front-load day, paid for by half of 写一写 (weekly list spec §5.1). */
export const LIST_PRACTICE_MS = 2 * 60_000;
export const PRACTICE_SHARE = 1 / 3; // 练一练's share of the lesson: 5 of the usual 15 minutes, 朗读 takes ~3 (learning rules 2026-10-17)
export const NEW_MEANING_PER_DAY = 12; // words he knows (placed or learned) starting meaning checks each day
export const MEANING_REVIEW_CAP = 30;
/** Hear cards reviewed in one lesson at most (spec 2026-10-06 §3.2). */
export const HEAR_REVIEW_CAP = 40;
/** Understand cards reviewed in one lesson at most (plan 2b). */
export const UNDERSTAND_REVIEW_CAP = 30;
/** Say cards in one lesson at most (spec 2026-10-11 §4). */
export const SAY_PER_LESSON = 6;
/** 说一句 cards in one lesson at most (production practice spec §4). */
export const SENTENCE_PER_LESSON = 2;

export function buildSessionPlan({ cards: stored, words, settings, now, practised = new Map(), newPerDay, extra = false, lists = [], ranOut = [false, false] }: PlanInput): SessionPlan {
  // weekly lists (weekly list spec 2026-10-17 §5–6): on its ready-by day a list's reading cards are the check's; from then to
  // homework day its due cards go first; an extra lesson the day before never pulls them into today
  const open = activeLists(lists, now);
  const owner = listOwner(open, now);
  const day = localDateKey(now);
  const tomorrow = localDateKey(addDays(startOfLocalDay(now), 1));
  const cards = extra ? extraCards(stored, now, new Set(open.filter((l) => l.readyBy === tomorrow).flatMap((l) => l.items.map((i) => i.wordId)))) : stored;
  const checkToday = new Set(isReadyByDay(open, now).flatMap((l) => l.items.map((i) => i.wordId)));
  const leftForCheck = (c: CardRecord) => checkToday.has(c.wordId) && c.kind !== 'write' && c.kind !== 'say' && c.kind !== 'sentence';
  const homeworkWindow = (id: string) => { const l = owner.get(id); return !!l && day > l.readyBy && day <= l.homeworkDue; };
  const active = words.filter((w) => !w.paused);
  const byId = new Map(active.map((w) => [w.id, w]));
  const activeIds = new Set(active.map((w) => w.id));
  const cutoff = endOfLocalDay(now).getTime();
  const ofKind = (kind: CardKind) => cards.filter((c) => c.kind === kind);
  const dueOf = (list: CardRecord[]) =>
    list
      .filter((c) => activeIds.has(c.wordId) && c.fsrs.due.getTime() <= cutoff && !leftForCheck(c))
      .sort((a, b) => Number(homeworkWindow(b.wordId)) - Number(homeworkWindow(a.wordId)) || a.fsrs.due.getTime() - b.fsrs.due.getTime());
  // a cap is for the rest: list cards due between ready-by and homework day come on top, so they never squeeze revision out (§6.3)
  const capped = (due: CardRecord[], cap: number) => [...due.filter((c) => homeworkWindow(c.wordId)), ...due.filter((c) => !homeworkWindow(c.wordId)).slice(0, cap)];

  const recognise = ofKind('recognise');
  const hear = ofKind('hear');
  const understand = ofKind('understand');
  // begun: heard or read (spec 2026-10-06 §3.2: a new word starts on its Hear rung)
  const started = new Set([...recognise, ...hear].map((c) => c.wordId));
  // Use (meaning practice) starts once Read has passed: two days' right first answers (spec 2026-10-06 §3.2)
  const readPassed = new Set(recognise.filter((c) => c.passed).map((c) => c.wordId));
  // first rechecks of placed characters (spec 2026-10-14): 10 a lesson, in the school order their due times keep
  const placementCheck = (c: CardRecord) => c.placed === true;
  const dueAll = dueOf(recognise);
  // a list word's recheck is its quick check (weekly list spec §5.2): it doesn't count toward the 10
  const checks = new Set([
    ...dueAll.filter((c) => placementCheck(c) && !owner.has(c.wordId)).slice(0, PLACEMENT_CHECKS_PER_LESSON),
    ...dueAll.filter((c) => placementCheck(c) && owner.has(c.wordId)),
  ]);
  const dueRecognise = dueAll.filter((c) => !placementCheck(c) || checks.has(c));
  // a real backlog pauses new words; first rechecks of placement guesses (never practised, or marked placed) don't
  // list cards (weekly list spec §5.1) don't count: a week of list words must not pause his class words
  const backlog = dueAll.filter((c) => !placementCheck(c) && practised.has(c.wordId) && !owner.has(c.wordId)).length;
  const perDay = extra ? 0 : newPerDay ?? Math.min(settings.newPerDay, PACE_START); // an extra lesson takes no new words

  // Meaning practice: due meaning cards, and begun words that have a 组词 cue but no meaning card yet.
  const meaning = ofKind('meaning');
  const hasMeaning = new Set(meaning.map((c) => c.wordId));
  const meaningOrder = (a: Word, b: Word) => (practised.get(b.id) ?? -1) - (practised.get(a.id) ?? -1) || newWordOrder(a, b);

  // A ladder 词语 comes only once every character in it is begun, or comes earlier in today's new words (spec 2026-10-06 §3.1)
  const begunChars = new Set(active.filter((w) => started.has(w.id) && Array.from(w.text).length === 1).map((w) => w.text));
  // two lanes (spec 2026-10-11 §5): his class's lesson and catch-up from 一上, after the words listed for him
  const classAt = classLessonAt(now, settings);
  // a weekly list (weekly list spec §5): front-loaded, his class lane protected, catch-up yields; never in an extra lesson
  const budget = extra || !open.length ? null : listBudget({
    lists: open, cards: new Map(cards.map((c) => [c.id, c])), now, pace: perDay, ceiling: settings.newPerDay,
    ranOutYesterday: ranOut[0], ranOutTwice: ranOut[0] && ranOut[1], backlog: backlog > BACKLOG_PAUSE,
    schoolNeed: schoolNeed(active, started, classAt),
  });
  // a backlog pauses new words — but a list's, at most 3 (weekly list spec §5.1); new words switched off pause both
  const newLimit = !settings.activities.newwords ? 0 : budget ? budget.total : backlog > BACKLOG_PAUSE ? 0 : perDay;
  const { words: newWords, lanes: newWordLanes, listTaken } = pickNewWords({
    candidates: active.filter((x) => !started.has(x.id)).sort(newWordOrder), n: newLimit, classAt, begunChars,
    listIds: budget?.listIds ?? [], listQuota: budget?.listQuota ?? 0, schoolFirst: budget?.schoolFirst ?? 0,
  });
  const frontLoad = !!budget?.frontLoad && listTaken.length > 0;
  // re-teaching cards (weekly list spec §2.1): a not-solid list item's card again the day after a miss, first in 认新字, with no
  // new-word slot; never in an extra lesson. Today's list words and they get the list word card (§7.1–7.2)
  const reteach = extra || !open.length ? [] : reteachIds(open, now).filter((id) => byId.has(id) && !newWords.some((w) => w.id === id));
  const listIdsAll = new Set(open.flatMap((l) => l.items.map((i) => i.wordId)));
  const listCards: Record<string, ListCard> = {};
  for (const id of [...reteach, ...newWords.filter((w) => listIdsAll.has(w.id)).map((w) => w.id)]) listCards[id] = listCardFor(byId.get(id)!, open, begunChars);
  // spec 2026-10-05 §2: no separate 用一用; a day with no new words (and no re-teaching cards) starts at 练一练 (no empty 认新字 stop, no star for it)
  const steps: StepKind[] = stepsOn(settings).filter((s) => s !== 'newwords' || newWords.length > 0 || reteach.length > 0);
  // 写一写 (spec 2026-10-05 §5): characters, not words — due, then today's and recent lesson words, then what he reads at his level
  const writeUnits = settings.activities.writing
    ? pickWriteUnits({ cards, words: active, newWordIds: newWords.map((w) => w.id), practised, level: learnerLevel(words, started), writeBy: { course: courseOf(settings), classAt }, cutoff, target: frontLoad ? Math.max(1, Math.floor(writeCharTarget(settings.sessionMinutes) / 2)) : writeCharTarget(settings.sessionMinutes) }) // half on a front-load day (weekly list spec §5.1)
    : [];
  const writeItems = orderWriteItems(writeUnits);
  // Say (spec 2026-10-11 §4): due Say cards first, then words whose Read has passed and that have no Say card yet — his class's
  // lesson (and the one before it) first, then the newest Read pass. Never a word introduced today. Off with settings.sayCards.
  const say = ofKind('say');
  const hasSay = new Set(say.map((c) => c.wordId));
  const readAt = new Map(recognise.filter((c) => c.passed).map((c) => [c.wordId, c.passed!]));
  const today = new Set(newWords.map((w) => w.id));
  const inClass = (w: Word) => { const at = classAt === null ? undefined : bookLesson(w); return at !== undefined && (at === classAt || at === classAt! - 1); };
  // a word with no reading card (sent back to learn by its placement recheck) says nothing until 认新字 teaches it again (review M2)
  const hasRead = new Set(recognise.map((c) => c.wordId));
  const sayIds = settings.sayCards === false ? [] : [
    ...dueOf(say).map((c) => c.wordId).filter((id) => hasRead.has(id)),
    ...active
      .filter((w) => readPassed.has(w.id) && !hasSay.has(w.id) && !today.has(w.id))
      .sort((a, b) => Number(inClass(b)) - Number(inClass(a)) || readAt.get(b.id)! - readAt.get(a.id)! || newWordOrder(a, b))
      .map((w) => w.id),
  ].slice(0, SAY_PER_LESSON);
  // 说一句 (production practice spec §4): due Sentence cards first, then words whose Read has passed, that have a sentence-bank
  // example and no Sentence card yet, the newest Read pass first. Never a word introduced today.
  const sentence = ofKind('sentence');
  const hasSentence = new Set(sentence.map((c) => c.wordId));
  const canSentence = (id: string) => { const w = byId.get(id); return !!w && !today.has(id) && hasRead.has(id) && canAskRung(w, 'sentence'); };
  const sentenceIds = [
    ...dueOf(sentence).map((c) => c.wordId),
    ...active
      .filter((w) => readPassed.has(w.id) && !hasSentence.has(w.id))
      .sort((a, b) => readAt.get(b.id)! - readAt.get(a.id)! || newWordOrder(a, b))
      .map((w) => w.id),
  ].filter(canSentence).slice(0, SENTENCE_PER_LESSON);

  const plan: SessionPlan = {
    steps,
    reviewWordIds: capped(dueRecognise, REVIEW_CAP).map((c) => c.wordId),
    newWordIds: newWords.map((w) => w.id),
    newWordLanes,
    flashTimeBoxMs: 0, // only lessons saved before 2026-10-05 time-boxed 认一认
    practiceTimeBoxMs: Math.round(settings.sessionMinutes * 60_000 * PRACTICE_SHARE) + (frontLoad ? LIST_PRACTICE_MS : 0),
    writeCandidates: writeUnits.map((u) => ({ wordId: u.wordId, isNew: u.isNew })),
    writeItems,
    writeCount: writeItems.length,
    writeWordIds: writeUnits.map((u) => u.wordId),
    // a word whose cue is gone (its 组词 or sentence removed) can never be asked: its card doesn't hold a slot (sweep)
    // only words that can be asked by ear: a card that can't be asked would stay due and hold a slot forever (final review I1)
    hearReviewIds: capped(dueOf(hear).filter((c) => { const w = byId.get(c.wordId); return !!w && canAskRung(w, 'hear'); }), HEAR_REVIEW_CAP).map((c) => c.wordId),
    understandReviewIds: capped(dueOf(understand).filter((c) => { const w = byId.get(c.wordId); return !!w && canAskRung(w, 'understand'); }), UNDERSTAND_REVIEW_CAP).map((c) => c.wordId),
    meaningReviewIds: capped(dueOf(meaning).filter((c) => { const w = byId.get(c.wordId); return !!w && meaningCue(w) !== null; }), MEANING_REVIEW_CAP).map((c) => c.wordId),
    newMeaningIds: extra ? [] : active // an extra lesson starts nothing new, meaning practice included
      .filter((w) => readPassed.has(w.id) && !hasMeaning.has(w.id) && meaningCue(w) !== null)
      .sort(meaningOrder)
      .slice(0, NEW_MEANING_PER_DAY)
      .map((w) => w.id),
    sayIds,
    sentenceIds,
    listNewIds: listTaken,
    ...(reteach.length ? { reteachIds: reteach } : {}),
    ...(Object.keys(listCards).length ? { listCards } : {}),
    frontLoad,
  };
  if (!extra) return plan;
  // nothing due or near due: a short practice-only round of his weakest words (lowest reading stability), never graded
  const nothing = !plan.reviewWordIds.length && !plan.hearReviewIds?.length && !plan.understandReviewIds?.length && !plan.meaningReviewIds?.length;
  if (!nothing) return plan;
  const weakIds = recognise
    .filter((c) => byId.has(c.wordId) && !c.placed && c.fsrs.reps > 0)
    .sort((a, b) => a.fsrs.stability - b.fsrs.stability || a.wordId.localeCompare(b.wordId))
    .slice(0, WEAK_ROUND_WORDS)
    .map((c) => c.wordId);
  return { ...plan, weakIds };
}
