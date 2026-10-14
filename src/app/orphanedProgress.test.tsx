// Progress for words the content audit (2026-10-15) took away: a blocked ladder 词语 (去世) and a 成语 that left the list
// (成千上万, a ladder 词语 from 千's card). His cards, logs and takes for them stay in the database, untouched; no screen, plan
// or panel may show them or trip over them.
import { cleanup, screen, waitFor } from '@testing-library/preact';
import { Rating } from 'ts-fsrs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../content';
import { ladderWord, ladderWords } from '../content/ladder';
import { mulberry32 } from '../lib/random';
import { Dashboard } from '../parent/Dashboard';
import { ListenPanel } from '../parent/ListenPanel';
import { SkillsPanel } from '../parent/SkillsPanel';
import { WordsPanel } from '../parent/WordsPanel';
import { RecordingsPanel } from '../parent/RecordingsPanel';
import { ProgressPanel } from '../parent/ProgressPanel';
import { CollectionScreen } from './CollectionScreen';
import { loadKnowledge } from './knowledge';
import { buildSessionPlan } from '../session/plan';
import { planFreePlay, planPractice } from '../session/practice';
import { createSessionRecord } from '../session/runner';
import { topMissed } from '../stats/skills';
import { troubleWords } from '../stats/stats';
import { addAnswer, addRecording, addReviewLog, allCards, getRungs, getSettings, listRecordings, putCards, putWords } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import type { CardKind, Recording } from '../types';

vi.mock('../audio/speech', async (orig) => ({ ...(await orig<typeof import('../audio/speech')>()), speak: vi.fn(), stopSpeaking: vi.fn() }));

const GONE = ['w:去世', 'w:成千上万'];
const TEXTS = ['去世', '成千上万'];
const KINDS: CardKind[] = ['recognise', 'hear', 'meaning', 'understand', 'say', 'sentence'];

afterEach(cleanup);

async function withOrphans() {
  const app = await makeAppData();
  const words = builtinWords(0);
  await putWords(app.db, words);
  const now = app.now();
  const due = new Date(now.getTime() - 86_400_000);
  const da = words.find((w) => w.text === '大')!; // a word he really has, so every panel has something to show
  await putCards(app.db, [makeCard(da.id, 'recognise', due, true), ...GONE.flatMap((id) => KINDS.map((k) => makeCard(id, k, due, true)))]);
  for (const id of [...GONE, da.id]) {
    for (let i = 0; i < 4; i++) await addReviewLog(app.db, { cardId: `${id}:recognise`, wordId: id, kind: 'recognise', at: now.getTime() - 1000 * (i + 1), rating: Rating.Again, correct: false });
    await addReviewLog(app.db, { cardId: `${id}:meaning`, wordId: id, kind: 'meaning', at: now.getTime() - 500, rating: Rating.Again, correct: false, source: 'use' });
    await addAnswer(app.db, { at: now.getTime() - 400, wordId: id, skill: 'use', correct: false });
  }
  for (const [i, id] of GONE.entries()) {
    const take: Recording = { id: `t${i}`, createdAt: now.getTime() - 2000, prompt: { kind: i ? 'sentence' : 'say', wordId: id } as Recording['prompt'], blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 2 };
    await addRecording(app.db, take);
  }
  return { app, now, da };
}

const shows = (ids: readonly string[]) => ids.filter((id) => GONE.includes(id));
const text = () => document.body.textContent ?? '';

describe('progress for words the content no longer has (content audit 2026-10-15)', () => {
  it('the words are really gone from the content', () => {
    for (const id of GONE) expect(ladderWord(id)).toBeUndefined();
    expect(ladderWords().some((w) => TEXTS.includes(w.text))).toBe(false);
  });

  it('the lesson plan, 练一练 and free play never ask them, and his data stays', async () => {
    const { app, now } = await withOrphans();
    const [cards, settings] = await Promise.all([allCards(app.db), getSettings(app.db)]);
    const words = builtinWords(0);
    const plan = buildSessionPlan({ cards, words: [...words, ...ladderWords()], settings, now });
    expect(JSON.stringify(plan)).not.toMatch(/去世|成千上万/);
    const know = await loadKnowledge(app.db);
    expect(shows([...know.passedRungs.keys(), ...know.knownWordIds])).toEqual([]);
    const rec = createSessionRecord({ ...plan, reviewWordIds: [...plan.reviewWordIds, ...GONE], hearReviewIds: [...(plan.hearReviewIds ?? []), ...GONE], sayIds: [...(plan.sayIds ?? []), ...GONE], sentenceIds: [...(plan.sentenceIds ?? []), ...GONE] }, '2026-10-02', now.getTime());
    const items = planPractice(rec, await getRungs(app.db), know.wordsById, know.words, true, mulberry32(1), new Map(), 1, true);
    expect(shows(items.map((x) => x.wordId))).toEqual([]); // even a saved lesson that still names them
    expect(shows(planFreePlay(know.cards, know.words, new Map(), true, mulberry32(1)).map((x) => x.wordId))).toEqual([]);
    expect((await allCards(app.db)).filter((c) => GONE.includes(c.wordId))).toHaveLength(GONE.length * KINDS.length); // left in place
    expect(await listRecordings(app.db)).toHaveLength(GONE.length);
  });

  it("'missed most' and trouble words leave them out without losing a place", async () => {
    const { app, da } = await withOrphans();
    const logs = await app.db.getAll('reviewLogs');
    const answers = await app.db.getAll('answers');
    const know = await loadKnowledge(app.db);
    const has = (id: string) => !!know.wordsById.get(id) || !!know.ladderById.get(id);
    expect(troubleWords(logs, 1, has)).toEqual([{ wordId: da.id, misses: 5 }]);
    expect(topMissed(logs, answers, 'use', 1, has).map((m) => m.wordId)).toEqual([da.id]);
  });

  it('no parent panel or the collection shows them, and none breaks', async () => {
    const { app } = await withOrphans();
    const know = await loadKnowledge(app.db);
    const views = [<SkillsPanel />, <WordsPanel />, <RecordingsPanel />, <Dashboard onNavigate={() => {}} />, <ListenPanel />, <CollectionScreen />,
      <ProgressPanel know={know} settings={app.settings} now={app.now()} />];
    for (const view of views) {
      renderWithApp(view, app);
      await waitFor(() => expect(text().length).toBeGreaterThan(20));
      await new Promise((r) => setTimeout(r, 60)); // the panels load their rows a moment later
      expect(text()).not.toMatch(/去世|成千上万/);
      expect(screen.queryByText(/^w:/)).toBeNull();
      cleanup();
    }
  });
});
