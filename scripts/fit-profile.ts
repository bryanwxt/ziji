/** A seeded 字己 profile for the fit sweep (spec §18), built with the app's own repo functions and exported as a backup. */
import 'fake-indexeddb/auto';
import { builtinWords } from '../src/content';
import { makeParentWords } from '../src/content/parseWordList';
import { WORLDS, type WorldId } from '../src/fun/worlds';
import { localDateKey } from '../src/lib/date';
import { applyPlacement } from '../src/placement/apply';
import { seededKnownCard } from '../src/srs/scheduler';
import { createSessionRecord } from '../src/session/runner';
import { exportBackup } from '../src/store/backup';
import { openAppDb } from '../src/store/db';
import { putCards, putWords, saveKid, saveParentPassage, saveReward, saveSession, seedBuiltinWords, updateSettings } from '../src/store/repo';
import { DEFAULT_KID, DEFAULT_SETTINGS, type ActivityKind, type SessionPlan } from '../src/types';

export interface FitProfileOptions {
  now: Date;
  activities?: Partial<Record<ActivityKind, boolean>>;
  speakingLast?: 'langdu' | 'story' | null;
  doneToday?: boolean;
  world?: WorldId;
  pin?: boolean; // false: stop at the PIN set-up
  kid?: boolean; // false: stop at PetSetup
  placementDone?: boolean; // false: stop at the placement quiz
}

const LONG_PASSAGE =
  '我家有四口人：爸爸、妈妈、妹妹和我。爸爸每天早上送我上学，妈妈下班后陪我读书。妹妹今年三岁，她最喜欢和我们的猫松露玩。周末我们一起去公园散步，看小鸟在树上唱歌，看小鱼在水里游来游去。晚上我们一起吃饭，一起说说今天发生的事。吃完饭，爸爸教我写字，妈妈给妹妹讲故事，松露在沙发上睡大觉。我爱我的家，我的家人也很爱我，我们每天都很快乐。';

const emptyPlan: SessionPlan = { steps: [], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };

export async function buildFitProfile(o: FitProfileOptions): Promise<string> {
  const db = await openAppDb(`fit-${Math.random().toString(36).slice(2)}`);
  const t = o.now.getTime();
  const words = builtinWords(t);
  await seedBuiltinWords(db, words);
  // A school word with an imported class sentence and a meaning card due now, so the sweep sees the wrapping sentence cue (spec §19 part 2).
  let n = 0;
  const school = makeParentWords(
    [['保持', 'bǎo chí'], ['树根', 'shù gēn'], ['跟着', 'gēn zhe'], ['请问', 'qǐng wèn'], ['清楚', 'qīng chu'], ['银行', 'yín háng']].map(([text, pinyin]) => ({ text: text!, pinyin: pinyin! })),
    { listName: '第三十课', writeable: false, existing: words, now: t - 86_400_000, newId: () => `fit-${n++}` },
  ).added; // a school list: 保持 has a class sentence; the rest give 字辨 its look-alike words
  await putWords(db, school.map((w) => (w.text === '保持' ? { ...w, sentences: [{ text: '图书馆里要保持安静，大家都在看书。', pinyin: '' }] } : w)));
  await putCards(db, school.flatMap((w) => [
    { id: `${w.id}:recognise`, wordId: w.id, kind: 'recognise' as const, fsrs: seededKnownCard(o.now) },
    { id: `${w.id}:meaning`, wordId: w.id, kind: 'meaning' as const, fsrs: { ...seededKnownCard(o.now), due: new Date(t - 3_600_000) } },
  ]));
  await applyPlacement(db, [...words.slice(0, 80), ...school].map((w) => w.id), o.now);
  await updateSettings(db, {
    pinHash: o.pin === false ? null : 'fit-check',
    placementDone: o.placementDone ?? true,
    activities: { ...DEFAULT_SETTINGS.activities, ...o.activities },
    oral: { ...DEFAULT_SETTINGS.oral, name: '小明', age: '8', school: '光明小学', className: '二年级' },
  });
  await saveParentPassage(db, { id: 'pp:fit', title: '我的家', text: LONG_PASSAGE, createdAt: t - 86_400_000 });
  await saveReward(db, { id: 'goal:fit', title: 'Lego set', emoji: '🧱', metric: 'stars', target: 40, createdAt: t - 86_400_000, claimedAt: null });
  const today = localDateKey(o.now);
  const yesterday = localDateKey(new Date(t - 86_400_000));
  await saveSession(db, { ...createSessionRecord(emptyPlan, yesterday, t - 86_400_000), completed: true, completedSteps: ['flashcards', 'writing'] });
  if (o.doneToday) await saveSession(db, { ...createSessionRecord({ ...emptyPlan, steps: ['flashcards', 'choose', 'components', 'writing', 'speaking'] }, today, t - 3_600_000), completed: true, completedSteps: ['flashcards', 'choose', 'components', 'writing', 'speaking'] });
  if (o.kid !== false) {
    const world = o.world ?? 'race';
    await saveKid(db, {
      ...DEFAULT_KID,
      worldsSeen: WORLDS.map((w) => w.id),
      world,
      speakingLast: o.speakingLast ?? null,
      lastChestDate: o.doneToday ? today : null,
      bonusStars: 3,
    });
  }
  const json = await exportBackup(db, { includeMedia: false, now: t });
  db.close();
  return json;
}
