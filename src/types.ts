import { DEFAULT_FINDS, type Finds } from './fun/finds';
import type { ZodiacId } from './fun/costumes';
import type { Card as FsrsCard, Grade } from 'ts-fsrs';

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
  writeable: boolean;
  paused: boolean;
  createdAt: number;
  examples?: Example[];
  writeSkippedAt?: number; // last time its strokes failed to load in 听写; such words go to the back of the queue
}

export type CardKind = 'recognise' | 'write';

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
}

export type StepKind = 'flashcards' | 'writing' | 'components' | 'speaking';

export interface SessionPlan {
  steps: StepKind[];
  reviewWordIds: string[];
  newWordIds: string[];
  flashTimeBoxMs: number;
  writeCandidates: { wordId: string; isNew: boolean }[];
  writeCount: number;
}

export interface FlashItem {
  wordId: string;
  isNew: boolean;
  retry: boolean; // re-shown after a wrong answer (or free play): no scheduler review
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
  activities: Record<StepKind, boolean>;
  speechRate: number;
  soundEffects: boolean;
  targetRecognise: number;
  targetWrite: number;
  lastBackupAt: number | null;
  placementDone: boolean;
  zodiac: ZodiacId | null; // the child's 生肖, the first chest's gift
  oral: OralInfo;
  story: boolean; // 看图说话 is parked until the parent rethinks it (spec §17): off by default, no parent switch yet
}

export const DEFAULT_SETTINGS: Settings = {
  pinHash: null,
  sessionMinutes: 20,
  newPerDay: 5,
  activities: { flashcards: true, writing: true, components: true, speaking: true },
  speechRate: 0.8,
  soundEffects: true,
  targetRecognise: 500,
  targetWrite: 150,
  lastBackupAt: null,
  placementDone: false,
  zodiac: null,
  oral: { name: '', age: '', school: '', className: '', customIntro: '' },
  story: false,
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
