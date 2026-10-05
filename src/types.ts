import { DEFAULT_FINDS, type Finds } from './fun/finds';
import type { Card as FsrsCard, Grade } from 'ts-fsrs';
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
  sentences?: Example[]; // imported class sentences that use this word (on-device only)
  pairs?: string[]; // words it pairs with in class (保持 → 安静)
  tags?: string[]; // e.g. '成语'
}

export type CardKind = 'recognise' | 'write' | 'meaning'; // meaning: what the word means and how it's used (spec §19)

export interface CardRecord {
  id: string; // `${wordId}:${kind}`
  wordId: string;
  kind: CardKind;
  fsrs: FsrsCard;
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
  source?: 'use'; // a meaning rating from 选一选/用一用 (the Skills panel counts those under Words in use)
}

/** Skills the parent's Skills panel follows (spec §19 part 7). */
export type Skill = 'reading' | 'meaning' | 'use' | 'zibian' | 'writing';

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
}

/** The last placement check's two levels (band indexes, -1 = none) and the words he missed. */
export interface PlacementResult {
  at: number;
  reading: number;
  understanding: number;
  missed: string[];
}

/** The parent can switch each of these on or off; 用一用 (wrapup) closes the lesson whenever 认一认 or 选一选 runs (spec §20). */
export type ActivityKind = 'flashcards' | 'choose' | 'writing' | 'components' | 'speaking';
export type StepKind = ActivityKind | 'wrapup' | 'newwords' | 'practice';

export interface SessionPlan {
  steps: StepKind[];
  reviewWordIds: string[];
  newWordIds: string[];
  flashTimeBoxMs: number;
  writeCandidates: { wordId: string; isNew: boolean }[];
  writeCount: number;
  meaningReviewIds?: string[]; // due meaning cards (optional: sessions saved before plan 11 have none)
  newMeaningIds?: string[]; // begun words starting meaning practice
  practiceTimeBoxMs?: number; // 练一练's time box (spec 2026-10-05 §2)
  newWordMeaningIds?: string[]; // today's new words that have a cue: their meaning question comes in the same lesson (spec §20 part 2)
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
  practiceQueue?: PracticeItem[]; // 练一练's round, built when the step starts (spec 2026-10-05 §3)
  practiceIndex?: number;
  practiceElapsedMs?: number;
  practiceLeft?: number; // items the time box left for tomorrow (pacing reads it, spec §2.2)
}

export type RecordingPrompt =
  | { kind: 'picture'; promptId: string }
  | { kind: 'passage'; passageId: string }
  | { kind: 'intro' } // the exam-etiquette self-introduction
  | { kind: 'story'; sceneId: string; part: 'opening' | 'setting' | 'events' | 'ending' | 'opinion' | 'whole' } // 看图说话
  | { kind: 'answer'; sceneId: string; question: number }; // Truffle asks

export interface Recording {
  id: string;
  createdAt: number;
  prompt: RecordingPrompt;
  blob: Blob;
  mime: string;
  durationSec: number;
  level?: number; // average loudness (RMS 0..1) while reading; older recordings have none
  misread?: string[]; // characters the parent confirmed he misread
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

/** A school text the parent added for 朗读. id 'pp:<uuid>'; text may hold '/' phrase marks. */
export interface ParentPassage {
  id: string;
  title: string;
  text: string;
  createdAt: number;
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
  story: boolean; // 看图说话 is parked until the parent rethinks it (spec §17): off by default, no parent switch yet
  placementResult?: PlacementResult;
  baselines?: Partial<Record<Skill, number>>;
  contentVersion?: string; // the built-in content last written to this install (src/content CONTENT_VERSION) // % right on his class worksheets, typed in by the parent (stays on the iPad)
}

export const DEFAULT_SETTINGS: Settings = {
  pinHash: null,
  sessionMinutes: 30,
  newPerDay: 4,
  activities: { flashcards: true, choose: true, writing: true, components: true, speaking: true },
  speechRate: 0.8,
  soundEffects: true,
  targetRecognise: 500,
  targetWrite: 150,
  lastBackupAt: null,
  placementDone: false,
  zodiac: null,
  oral: { name: '', age: '', school: '', className: '', customIntro: '' },
  story: false,
  lessonVersion: 3,
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
  reading: ReadingState;
  speakingLast: 'langdu' | 'story' | null; // which activity the speaking step ran last (they alternate)
  story: { next: number; told: number }; // 看图说话: next scene, stories told (drives starter fading)
  finds: Finds; // tap fun in the journey worlds
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
  reading: DEFAULT_READING,
  speakingLast: null,
  story: { next: 0, told: 0 },
  finds: DEFAULT_FINDS,
};

export interface RewardGoal {
  id: string;
  title: string;
  emoji: string;
  metric: 'stars' | 'known';
  target: number;
  createdAt: number;
  claimedAt: number | null;
}
