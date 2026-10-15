import type { IconName } from './ui/icons/icons';
import type { Course } from './content';
import type { WriteItem } from './session/writing';
import { DEFAULT_FINDS, type Finds } from './fun/finds';
import { EMPTY_METER, type Meter } from './fun/meter';
import type { Card as FsrsCard, Grade, State } from 'ts-fsrs';
import type { Recall } from './session/recall';
import type { PracticeItem } from './session/round';

export type ZodiacId = 'rat' | 'ox' | 'tiger' | 'rabbit' | 'dragon' | 'snake' | 'horse' | 'goat' | 'monkey' | 'rooster' | 'dog' | 'pig';

export type { FsrsCard, Grade };

export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7; // HSK 3.0 level; 7 = 七—九级

export interface Example {
  text: string;
  pinyin: string;
}

/** One built-in character as stored in src/content/builtin.json. */
export interface BuiltinChar {
  char: string;
  pinyin: string;
  meaning: string;
  level: Level;
  rank: number;
  radical: string;
  components: string[];
  strokes: number;
  writeable: boolean;
  examples: Example[];
  school?: true; // on his textbook's list but not an HSK character (蚂 蚁 拇 狐 狸): added after every HSK character (spec 2026-10-11 §7)
}

export interface CharInfo {
  char: string;
  radical: string;
  components: string[];
}

export interface Word {
  id: string; // 'b:<char>' built-in, 'p:<uuid>' parent-added
  text: string;
  pinyin: string; // tone-marked syllables separated by single spaces
  meaning?: string;
  level: Level | null;
  rank: number | null; // built-in order; null for parent words
  source: 'builtin' | 'parent';
  listName?: string;
  listedAt?: number; // set for parent words and built-in words pulled forward by a parent list
  misreadMark?: number; // the listedAt a 朗读 misread mark gave it, and what it had before, so unmarking puts it back
  misreadPrev?: number | null;
  writeable: boolean;
  paused: boolean;
  createdAt: number;
  examples?: Example[];
  writeSkippedAt?: number; // last time its strokes failed to load in 听写; such words go to the back of the queue
  tracedAt?: number; // a read-only character's first trace in 写一写 (production practice spec §3): a recent one is traced once
  sentences?: Example[]; // imported class sentences that use this word (on-device only)
  pairs?: string[]; // words it pairs with in class (保持 → 安静)
  tags?: string[]; // e.g. '成语'
}

export type CardKind = 'recognise' | 'write' | 'meaning' | 'hear' | 'understand' | 'say' | 'sentence'; // meaning: what the word means and how it's used (spec §19); say: he reads it aloud (spec 2026-10-11 §3); sentence: he says a sentence with it (production practice spec §4)

export interface CardRecord {
  id: string; // `${wordId}:${kind}`
  wordId: string;
  kind: CardKind;
  fsrs: FsrsCard;
  passed?: number; // when its rung passed: two days' right first answers (spec 2026-10-06 §3.2), or earned before the ladder
  guess?: true; // a placement guess (spec 2026-10-06 §3.5): its next rung waits for a real answer to confirm it (final review I1)
  placed?: true; // a recognise card placement put there, not yet rechecked (spec 2026-10-14): its first recheck missed sends it back to learn
}

export interface ReviewLog {
  id?: number;
  cardId: string;
  wordId: string;
  kind: CardKind;
  at: number;
  rating: Grade;
  correct: boolean;
  responseMs?: number;
  misses?: number;
  placedCheck?: true; // the first recheck of a placed card (spec 2026-10-14), for the parent's count of rechecks
  source?: 'use' | 'write'; // a meaning rating from 选一选/用一用 (the Skills panel counts those under Words in use), or from a 组词 written in 写一写 (production practice spec §3)
  // the card as it was before this review (SRS tuning spec §4); logs written before it have none
  state?: State; // New, Learning, Review or Relearning
  elapsedDays?: number; // whole local days since the card's last review (0 = the same day)
  scheduledDays?: number; // the interval the card was on
}

/** The card before a review, as a review log keeps it (SRS tuning spec §4); a Say or 说一句 take keeps one for the parent's verdict. */
export interface CardSnapshot { state: State; elapsedDays: number; scheduledDays: number }

/** His fitted FSRS parameters (SRS tuning spec §6.2, §7): 21 numbers, when they were fitted, and on how many reviews. */
export interface FsrsFit { w: number[]; fittedAt: number; reviews: number }

/** Skills the parent's Skills panel follows (spec §19 part 7). */
export type Skill = 'listening' | 'reading' | 'meaning' | 'use' | 'zibian' | 'writing';

/** One 选一选/用一用 or 字辨 answer, every one of them (review logs keep only the first rating a day). */
export interface AnswerLog {
  id?: number;
  at: number;
  wordId: string;
  skill: 'use' | 'zibian';
  correct: boolean;
}

/** A word's place on the context ladder (spec 2026-10-05 §3.2): the highest rung he has answered right, lowered by a miss. */
export interface LadderEntry {
  wordId: string;
  rung: number;
  at: number;
  confused?: string[]; // look-alike characters he picked for it (spec 2026-10-05 §3.4)
  confusedAt?: number; // the last time he mixed it up (the newest are fished first)
}

/** The last placement check's two levels (band indexes, -1 = none) and the words he missed. */
/** A placement result (spec 2026-10-14): he reads up to a school term (null: none), from `tested` characters asked; `assumed` were placed unasked. */
export interface PlacementResult {
  at: number;
  readsUpTo: string | null; // 一上 … 三下
  tested: number;
  assumed: number;
  missed: string[];
  /** known characters the journey starts from: what placement found (worlds count what he learns after it). */
  worldBase?: number;
}
/** A result saved by the band check before 2026-10-14: band indexes, -1 none. Loads as it is; the parent sees it read-only. */
export interface LegacyPlacementResult {
  at: number;
  reading: number;
  understanding: number;
  listening?: number; // absent before 2c
  missed: string[];
  worldBase?: number; // missing on older saves
}
export const isLegacyPlacement = (r: PlacementResult | LegacyPlacementResult): r is LegacyPlacementResult => !('readsUpTo' in r);

/** The parent can switch each of these on or off (spec 2026-10-05 §7). */
export type ActivityKind = 'newwords' | 'practice' | 'writing' | 'speaking';
/** Steps of lessons saved before the 2026-10-05 redesign; such a lesson finishes in its own flow. */
export type LegacyStep = 'flashcards' | 'choose' | 'components' | 'wrapup';
export type StepKind = ActivityKind | LegacyStep;

export interface SessionPlan {
  steps: StepKind[];
  reviewWordIds: string[];
  newWordIds: string[];
  newWordLanes?: Record<string, 'school' | 'catchup'>; // each new word's lane (spec 2026-10-11 §5); listed and non-book words have none; plans saved before it have none
  flashTimeBoxMs: number;
  writeCandidates: { wordId: string; isNew: boolean }[];
  writeCount: number;
  writeItems?: WriteItem[]; // spec 2026-10-05 §5: one character and pass each; lessons saved before it have none
  hearReviewIds?: string[];
  understandReviewIds?: string[]; // due Understand cards (spec 2026-10-06 §3.2); a plan made before 2b has none // due Hear cards (spec 2026-10-06 §3.2); a plan made before the ladder has none
  meaningReviewIds?: string[]; // due meaning cards (optional: sessions saved before plan 11 have none)
  newMeaningIds?: string[]; // begun words starting meaning practice
  practiceTimeBoxMs?: number; // 练一练's time box (spec 2026-10-05 §2)
  newWordMeaningIds?: string[]; // today's new words that have a cue: their meaning question comes in the same lesson (spec §20 part 2)
  sayIds?: string[]; // words to say aloud in 练一练, best first (spec 2026-10-11 §4); plans saved before it have none
  sentenceIds?: string[]; // words for 说一句 in 练一练, best first (production practice spec §4); plans saved before it have none
  writeWordIds?: string[]; // the words 写一写 covers today (production practice spec §3): 练一练 leaves out their 组词 taps; plans saved before it have none
}

export interface FlashItem {
  wordId: string;
  isNew: boolean;
  retry: boolean; // re-shown after a wrong answer (or free play): no scheduler review
  mode?: 'read' | 'meaning'; // absent = read
}

export interface SessionRecord {
  date: string; // local YYYY-MM-DD the session started
  startedAt: number;
  activeMs: number;
  free: boolean; // free play: never saved, never reviewed by the scheduler
  extra?: boolean; // another lesson after the day's: graded, but never saved over the day's record (its stars go to bonusStars)
  plan: SessionPlan;
  stepIndex: number;
  flashQueue: FlashItem[];
  flashIndex: number;
  flashElapsedMs: number;
  writeIndex: number;
  writeDone: number;
  completedSteps: StepKind[];
  completed: boolean;
  recalls?: Record<string, Recall>; // today's recalls per word, across steps (spec §20 part 7); absent on lessons saved before plan 13
  writePass?: number; // the pass within the current 写一写 word (spec §20 part 3)
  writeRedo?: string[]; // words to write once more at the end of 写一写
  writeRedoIndex?: number;
  writeMisses?: Record<string, number>; // spec 2026-10-05 §5: each word's misses from memory so far, rated on its last character
  writeSkipped?: string[]; // words whose strokes failed to load this lesson: their other characters are skipped
  writeLast?: string; // the last character written ('id#at'): a redo never comes straight after it
  meaningCredit?: string[]; // words whose meaning card 写一写 has rated this lesson (production practice spec §3): once a lesson
  practiceQueue?: PracticeItem[]; // 练一练's round, built when the step starts (spec 2026-10-05 §3)
  sentBack?: string[]; // words a missed placement recheck sent back to learn in this lesson: nothing more of them today (review M1)
  practiceIndex?: number;
  practiceElapsedMs?: number;
  practiceLeft?: number; // items the time box left for tomorrow (pacing reads it, spec §2.2)
  stars?: number; // the lesson's stars (spec 2026-10-11 §5): set when it finishes; absent on lessons from before, which count their steps (starsOf)
  produced?: { write: number; say: number }; // what newly reached "can produce" by the lesson's end
  closest?: string[]; // nothing new: the words one more day from it (「还差一天：森、林」)
}

export type RecordingPrompt =
  | { kind: 'picture'; promptId: string }
  | { kind: 'passage'; passageId: string; extra?: true } // extra: a 多读一遍 round, never the queue's take or the bonus baseline
  | { kind: 'intro' } // the exam-etiquette self-introduction
  | { kind: 'story'; sceneId: string; part: 'opening' | 'setting' | 'events' | 'ending' | 'opinion' | 'whole' } // 看图说话
  | { kind: 'answer'; sceneId: string; question: number } // Truffle asks
  | { kind: 'say'; wordId: string } // a Say card take: he read the word aloud (spec 2026-10-11 §3)
  | { kind: 'sentence'; wordId: string }; // a 说一句 take: he said a sentence with the word (production practice spec §4)

export interface Recording {
  id: string;
  createdAt: number;
  prompt: RecordingPrompt;
  blob: Blob;
  mime: string;
  durationSec: number;
  level?: number; // average loudness (RMS 0..1) while reading; older recordings have none
  misread?: string[]; // characters the parent confirmed he misread
  extraDayGiven?: boolean; // its marks have given the passage its one extra day (never a second, however often re-marked)
  review?: 'ok' | 'no'; // a Say or 说一句 take the parent confirmed (✓) or rejected (✗), or a passage take listened to ('ok'); absent: waiting (spec 2026-10-11 §6)
  meaning?: { correct: boolean; picked: string }; // a passage take: his answer to the meaning question (spec 2026-10-12 §3), for the parent
  cardBefore?: CardSnapshot; // a Say or 说一句 take: its card as it was when he recorded (SRS tuning spec §4), for the verdict's log
}

export interface PicturePrompt {
  id: string;
  createdAt: number;
  blob: Blob;
  mime: string;
}

export interface Passage {
  id: string;
  title: string;
  text: string;
}

/** A 朗读 meaning question (spec 2026-10-12 §3): 谁 / 哪里 / 什么 / 为什么, three choices, the right one marked. `sentence`: the
 *  passage's sentence (splitSentences) that answers it; a parent's question has none and is answered where its right choice is. */
export interface PassageQuestion {
  q: string;
  choices: [string, string, string];
  answer: 0 | 1 | 2;
  sentence?: number;
}

/** A school text the parent added for 朗读. id 'pp:<uuid>'; text may hold '/' marks; an optional meaning question. */
export interface ParentPassage {
  id: string;
  title: string;
  text: string;
  createdAt: number;
  question?: PassageQuestion;
}

/** Details for the oral-exam self-introduction (stored only on the iPad). */
export interface OralInfo {
  name: string;
  age: string;
  school: string;
  className: string;
  customIntro: string;
}

/** 朗读 progress: the passage in its 3-day cycle, and warm-ups recorded (for pinyin fading). */
export interface ReadingState {
  passageId: string | null;
  days: number;
  extra: number;
  lastDay: string | null;
  lastRead: Record<string, string>;
  warmups: number;
}

export const DEFAULT_READING: ReadingState = { passageId: null, days: 0, extra: 0, lastDay: null, lastRead: {}, warmups: 0 };

/** The parent's correction of where his class is (spec 2026-10-11 §4): the lesson on the day it was set. */
export interface ClassLessonSetting { term: string; lesson: number; setAt: number }

export interface Settings {
  pinHash: string | null;
  sessionMinutes: number;
  newPerDay: number;
  activities: Record<ActivityKind, boolean>;
  speechRate: number;
  soundEffects: boolean;
  targetRecognise: number;
  targetWrite: number;
  lastBackupAt: number | null;
  placementDone: boolean;
  zodiac: ZodiacId | null; // the child's 生肖, the first chest's gift
  oral: OralInfo;
  lessonVersion?: number; // one-off settings moves for existing installs (src/store/settings.ts)
  placementMarked?: boolean; // an older placement's unrechecked cards marked placed and re-spread (src/placement/migrate.ts)
  readingsReopened?: string; // the content version whose changed readings reopened his Say and Hear cards (src/store/readingMigration.ts)
  ladderMigrated?: boolean; // his cards moved onto the word ladder (spec 2026-10-06 §3.6)
  grade?: number; // his school year (P1 = 1): which MOE term's targets apply (spec 2026-10-06 §3.4)
  gradeYear?: number; // the calendar year `grade` was set in: the school year goes up each January from there (a yardstick, never a cap)
  classLesson?: ClassLessonSetting | null; // the parent's "class is on" (spec 2026-10-11 §4): carries at the calendar's pace, lapses next semester; null/absent: the estimate
  story: boolean; // 看图说话 is parked until the parent rethinks it (spec §17): off by default, no parent switch yet
  langdu: boolean; // 朗读, the lesson's last step (spec 2026-10-12): on by default; Settings → 「朗读 Read aloud」
  course?: Course; // 华文, 高级华文 or both lists: which 识写字 he practises writing (all read the same characters); absent: 'both' (courseOf, spec 2026-10-11 §6)
  contentCourse?: Course; // the course the stored built-in words were written for; absent: 'cl' (written before courses)
  voiceURI?: string | null; // the parent's pick of Mandarin voice; null/absent: the clearest the iPad has
  recordedVoice?: boolean; // speak with the generated clips (Kokoro); absent/false: the iPad/iPhone voice (parent 2026-10-08: the clips sounded worse)
  placementResult?: PlacementResult | LegacyPlacementResult;
  storyProgress?: { chapter: number; readOn?: string; setupDone?: boolean; payoffDone?: boolean }; // the Word Thief chapters (spec 2026-10-07 3c §3)
  storyOn?: boolean; // the Word Thief story around lessons (spec 2026-10-11 §3): off unless true; no parent switch yet. Not `story` (看图说话)
  sayCards?: boolean; // Say cards in 练一练 (spec 2026-10-11 §4): on unless false
  fadePinyin?: boolean; // pinyin hides over characters he reads, tap to peek (spec 2026-10-12 §4): on unless false
  baselines?: Partial<Record<Skill, number>>; // % right on his class worksheets, typed in by the parent (stays on the iPad)
  pace?: { day: string; perDay: number; reason: string }; // today's new words per day and why (spec 2026-10-05 §2.2)
  contentVersion?: string; // the built-in content last written to this install (src/content CONTENT_VERSION)
  fsrs?: FsrsFit; // his fitted FSRS parameters (SRS tuning spec §6.2); absent: the defaults
}

export const DEFAULT_SETTINGS: Settings = {
  pinHash: null,
  sessionMinutes: 20, // one ~20-minute lesson (spec 2026-10-12 production practice §6)
  newPerDay: 8, // the ceiling the app paces under (spec 2026-10-05 §2.2)
  activities: { newwords: true, practice: true, writing: true, speaking: true },
  speechRate: 0.8,
  soundEffects: true,
  targetRecognise: 500,
  targetWrite: 150,
  lastBackupAt: null,
  placementDone: false,
  zodiac: null,
  oral: { name: '', age: '', school: '', className: '', customIntro: '' },
  story: false,
  langdu: true,
  lessonVersion: 8,
};

export type PetColor = 'green' | 'blue' | 'purple' | 'red' | 'gold';

export interface KidState {
  petName: string;
  petColor: PetColor;
  ownedAccessories: string[];
  wearing: string | null;
  bonusStars: number;
  lastChestDate: string | null;
  lastStageSeen: number; // dragon era; no longer read
  badgesSeen: string[];
  activePower: string | null;
  powerTiersSeen: Record<string, number>;
  ownedCostumes: string[];
  outfit: string | null;
  worldsSeen: string[]; // journey worlds reached; never shrinks
  world: string | null; // the child's pick in the room; null = newest reached
  riverNews: boolean; // his old paper worlds were just mapped onto One River: Home says so once (spec 2026-10-13 §8)
  reading: ReadingState;
  speakingLast: 'langdu' | 'story' | null; // which activity the speaking step ran last (they alternate)
  story: { next: number; told: number }; // 看图说话: next scene, stories told (drives starter fading)
  finds: Finds; // tap fun in the journey worlds
  greetedOn?: string; // the day Truffle last greeted him on Home with how he feels about it (spec 2026-10-04 §4.6)
  starredUpTo?: number; // passes up to this time have earned their stars (spec 2026-10-11 §5); absent: none yet
  meter: Meter; // the river meter toward the chest (rewards spec 2026-10-15 §3)
  bank?: number; // halves earned past the day's 2 chests, waiting for tomorrow (at most one full meter)
}

export const DEFAULT_KID: KidState = {
  petName: '松露',
  petColor: 'green',
  ownedAccessories: [],
  wearing: null,
  bonusStars: 0,
  lastChestDate: null,
  lastStageSeen: 0,
  badgesSeen: [],
  activePower: null,
  powerTiersSeen: {},
  ownedCostumes: [],
  outfit: null,
  worldsSeen: [],
  world: null,
  riverNews: false,
  reading: DEFAULT_READING,
  speakingLast: null,
  story: { next: 0, told: 0 },
  finds: DEFAULT_FINDS,
  meter: EMPTY_METER,
};

export interface RewardGoal {
  id: string;
  title: string; // the parent's own note (English is fine): Home never shows it
  emoji: string; // goals saved before 2026-10-05 had an emoji; Home never shows it
  zh?: string; // what he sees on Home, in Chinese (spec 2026-10-04 §3, phase D)
  icon?: IconName; // its ink icon on Home
  metric: 'stars' | 'known';
  target: number;
  createdAt: number;
  claimedAt: number | null;
}
