/** A seeded 字己 profile for the fit sweep (spec §18), built with the app's own repo functions and exported as a backup. */
import 'fake-indexeddb/auto';
import { builtinWords } from '../src/content';
import { makeParentWords } from '../src/content/parseWordList';
import { COSTUMES } from '../src/fun/costumes';
import { EMPTY_METER, type Meter } from '../src/fun/meter';
import { ACCESSORIES } from '../src/fun/pet';
import { WORLDS, type WorldId } from '../src/fun/worlds';
import { addDays, localDateKey } from '../src/lib/date';
import { hashPin } from '../src/lib/hash';
import { applyPlacement } from '../src/placement/apply';
import { seededKnownCard } from '../src/srs/scheduler';
import { createSessionRecord } from '../src/session/runner';
import { exportBackup } from '../src/store/backup';
import { openAppDb } from '../src/store/db';
import { addReviewLog, putCards, putWeekList, putWords, saveKid, saveParentPassage, saveReward, saveSession, seedBuiltinWords, updateSettings } from '../src/store/repo';
import { makeReviewHistory } from '../src/test/reviewHistory';
import { DEFAULT_KID, DEFAULT_SETTINGS, EMPTY_READING, type ActivityKind, type SessionPlan } from '../src/types';

export interface FitProfileOptions {
  now: Date;
  activities?: Partial<Record<ActivityKind, boolean>>;
  speakingLast?: 'langdu' | 'story' | null;
  langdu?: boolean; // 朗读 is parked (parent, 2026-10-05): its own flows switch it on
  doneToday?: boolean;
  doneMinutesAgo?: number; // when today's lesson ended (default 180): 再学一课 opens 2 hours after it (learning rules 2026-10-17)
  extraMastered?: boolean; // a word newly writable since the day's lesson: the next extra lesson moves the boat (rewards spec §9)
  world?: WorldId;
  pin?: boolean; // false: stop at the PIN set-up
  pinCode?: string; // a test PIN the sweep can type to reach the parent area (else the gate never opens)
  kid?: boolean; // false: stop at PetSetup
  placementDone?: boolean; // false: stop at the placement quiz
  writeSentence?: boolean; // 写一写 opens on 保持, whose cue is a long class sentence
  reviewHistory?: boolean; // four months of reviews (~1,700 training items): Skills shows retention and Fit can run (SRS tuning spec §9)
  ownsAll?: boolean; // every costume and accessory owned: the chest gives stars (sweep: that prize was never screenshotted)
  meter?: Partial<Meter>; // the river meter as a test wants it (rewards spec §3); its day is today
  bank?: number;
  weekList?: 'countdown' | 'check'; // a weekly list (weekly list spec 2026-10-17 §9): ready by in two days (Home's countdown), or today (the 考考自己 card)
  schoolText?: boolean; // false: no parent text, and one of our passages read yesterday, so 朗读 reads a Global Storybooks passage (its turn: a picture, a credit line, 下一篇; spec 2026-10-15)
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
  await putWords(db, school.map((w) => (w.text === '保持' ? { ...w, writeable: !!o.writeSentence, sentences: [{ text: '图书馆里要保持安静，大家都在看书。', pinyin: '' }] } : w)));
  await putCards(db, school.flatMap((w) => [
    { id: `${w.id}:recognise`, wordId: w.id, kind: 'recognise' as const, fsrs: seededKnownCard(o.now) },
    { id: `${w.id}:meaning`, wordId: w.id, kind: 'meaning' as const, fsrs: { ...seededKnownCard(o.now), due: new Date(t - 3_600_000) } },
  ]));
  if (o.writeSentence) {
    const baochi = school.find((w) => w.text === '保持')!;
    await putCards(db, [{ id: `${baochi.id}:write`, wordId: baochi.id, kind: 'write', fsrs: { ...seededKnownCard(o.now), due: new Date(t - 86_400_000) } }]); // due: written first
  }
  const placed = [...words.slice(0, 80), ...school].map((w) => w.id);
  await applyPlacement(db, { readingIds: placed, askedIds: [], missed: [], readsUpTo: '一上' }, o.now);
  // 40 of them understood: placement places no meaning as known (spec 2026-10-14), so the profile seeds it, as the old check did
  await putCards(db, placed.slice(0, 40).map((wordId) => ({ id: `${wordId}:meaning`, wordId, kind: 'meaning' as const, fsrs: seededKnownCard(o.now, 7), passed: t })));
  await updateSettings(db, {
    pinHash: o.pin === false ? null : o.pinCode ? await hashPin(o.pinCode) : 'fit-check',
    placementDone: o.placementDone ?? true,
    activities: { ...DEFAULT_SETTINGS.activities, ...o.activities },
    langdu: o.langdu ?? false,
    oral: { ...DEFAULT_SETTINGS.oral, name: '小明', age: '8', school: '光明小学', className: '二年级', customIntro: '我叫小明。我今年八岁。我在光明小学读二年级。我的爸爸是医生，妈妈是老师。我有一个妹妹，她今年五岁。我喜欢画画、踢足球和看书。我最喜欢的动物是猫，因为猫很可爱。' }, // a long parent-written intro: the card must scroll, not push the buttons off an SE
  });
  if (o.reviewHistory) {
    const { logs } = makeReviewHistory({ cards: 330, days: 120, end: new Date(t - 3_600_000), wordIds: words.slice(100, 430).map((w) => w.id) });
    for (const l of logs) await addReviewLog(db, l);
  }
  if (o.schoolText !== false) await saveParentPassage(db, { id: 'pp:fit', title: '我的家', text: LONG_PASSAGE, createdAt: t - 86_400_000 });
  await saveReward(db, { id: 'goal:fit', title: 'Lego set', emoji: '🧱', metric: 'stars', target: 40, createdAt: t - 86_400_000, claimedAt: null });
  const today = localDateKey(o.now);
  const yesterday = localDateKey(new Date(t - 86_400_000));
  await saveSession(db, { ...createSessionRecord(emptyPlan, yesterday, t - 86_400_000), completed: true, completedSteps: ['flashcards', 'writing'] });
  const doneAt = t - (o.doneMinutesAgo ?? 180) * 60_000;
  if (o.doneToday) await saveSession(db, { ...createSessionRecord({ ...emptyPlan, steps: ['flashcards', 'choose', 'components', 'writing', 'speaking'] }, today, doneAt), completed: true, completedSteps: ['flashcards', 'choose', 'components', 'writing', 'speaking'] });
  if (o.extraMastered) {
    const w = words[5]!; // placed, so he reads it; its write card passed a minute ago, after the day's lesson's stars
    await putCards(db, [{ id: `${w.id}:write`, wordId: w.id, kind: 'write', fsrs: seededKnownCard(o.now), passed: t - 60_000 }]);
  }
  if (o.kid !== false) {
    const world = o.world ?? 'bamboo';
    await saveKid(db, {
      ...DEFAULT_KID,
      worldsSeen: WORLDS.map((w) => w.id),
      world,
      speakingLast: o.speakingLast ?? null,
      lastChestDate: o.doneToday ? today : null,
      ...(o.doneToday ? { starredUpTo: doneAt } : {}),
      bonusStars: 3,
      ...(o.meter ? { meter: { ...EMPTY_METER, day: today, ...o.meter } } : {}),
      ...(o.bank ? { bank: o.bank } : {}),
      ...(o.schoolText === false ? { reading: { ...EMPTY_READING, lastWarmup: yesterday, history: { p01: { reads: 1, lastRead: yesterday, rest: 3, q: 1 } } } } : {}),
      ...(o.ownsAll ? { ownedCostumes: COSTUMES.map((c) => c.id), ownedAccessories: [...ACCESSORIES] } : {}),
    });
  }
  if (o.weekList) await seedWeekList(db, o.now, o.weekList);
  const json = await exportBackup(db, { includeMedia: false, now: t });
  db.close();
  return json;
}

/** An invented weekly list (never a sheet's): grid words, three pairs that make a 连一连 board, one more pair, a 选词填空 row. */
async function seedWeekList(db: Awaited<ReturnType<typeof openAppDb>>, now: Date, when: 'countdown' | 'check') {
  const P = (text: string, pinyin: string, meaning?: string) => ({ id: `p:wk-${text}`, text, pinyin, ...(meaning ? { meaning } : {}), level: null, rank: null, source: 'parent' as const, writeable: false, paused: false, createdAt: now.getTime() - 86_400_000 });
  const words = [P('风筝', 'fēng zheng', 'kite'), P('雨伞', 'yǔ sǎn', 'umbrella'), P('小河', 'xiǎo hé', 'stream'), P('钓鱼', 'diào yú', 'to fish'), P('书包', 'shū bāo', 'school bag'),
    P('闪闪亮', 'shǎn shǎn liàng', 'sparkly'), P('拔', 'bá', 'to pull up'), P('萝卜', 'luó bo', 'radish'), P('摘', 'zhāi', 'to pick'), P('苹果', 'píng guǒ', 'apple'), P('浇', 'jiāo', 'to water'), P('花朵', 'huā duǒ', 'flower'), P('放', 'fàng')];
  await putWords(db, words);
  const today = localDateKey(now);
  await putWeekList(db, {
    id: 'wl:fit', name: 'P2-L33-复习', createdAt: now.getTime() - 86_400_000,
    readyBy: when === 'check' ? today : localDateKey(addDays(now, 2)), homeworkDue: localDateKey(addDays(now, when === 'check' ? 2 : 4)),
    items: words.map((w) => ({ wordId: w.id, text: w.text, from: 'grid' as const, addedStatus: 'new' as const })),
    pairs: [
      { left: '拔', right: '萝卜', wrong: ['苹果', '花朵', '书包'], reading: 'bá luó bo' },
      { left: '摘', right: '苹果', wrong: ['萝卜', '花朵', '书包'], reading: 'zhāi píng guǒ' },
      { left: '浇', right: '花朵', wrong: ['萝卜', '苹果', '书包'], reading: 'jiāo huā duǒ' },
      { left: '放', right: '风筝', wrong: ['萝卜', '苹果', '书包'], reading: 'fàng fēng zheng' },
    ],
    fits: [{ wordId: 'p:wk-雨伞', sentence: '下雨了，我打着＿上学。', source: 'parent', wrong: ['小河', '钓鱼', '书包'] }],
  });
}
