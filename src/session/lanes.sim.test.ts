// @vitest-environment node
// A semester of lessons through buildSessionPlan with the real book and ladder (final review I1): at the default pace his
// school lane reaches the lesson his class is on, and meets its characters while it is current.
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { ladderWordsBesides } from '../content/ladder';
import { classLessonAt, lessonIndex, lessonLabel, taughtAt } from '../content/curriculum';
import { makeCard } from '../test/fixtures';
import { DEFAULT_SETTINGS, type CardRecord, type Settings } from '../types';
import { laneTag } from './lanes';
import { buildSessionPlan } from './plan';
import { PACE_START } from './pace';

describe('a P2 child at the default pace, 二下·11 to the end of the year (final review I1)', () => {
  it("from 二下·14 on, each day's new words meet his class's lesson, labelled 课本 with that lesson", () => {
    const base = builtinWords(0, 'both'); // as bootstrap stores them, with the ladder's 词语 as record.ts adds them
    const words = [...base, ...ladderWordsBesides(base)];
    const byId = new Map(words.map((w) => [w.id, w]));
    const settings: Settings = { ...DEFAULT_SETTINGS, grade: 2, gradeYear: 2026, newPerDay: PACE_START };
    const later = new Date(2030, 0, 1); // begun cards never fall due here: no backlog pauses new words
    const firstOf二下 = lessonIndex('二下', 1)!;
    const from = lessonIndex('二下', 14)!;
    // placement: he knows four in five of 一上–二上's characters
    let k = 0;
    const cards: CardRecord[] = base.filter((w) => { const at = taughtAt(w.text); return at !== undefined && at < firstOf二下 && k++ % 5 !== 0; }).map((w) => makeCard(w.id, 'recognise', later));
    const begun = new Set(cards.map((c) => c.wordId));
    const charsOf = (lesson: number) => base.filter((w) => taughtAt(w.text) === lesson);
    const tagsMet = new Set<string>();
    let checked = 0;
    for (let day = new Date(2026, 5, 29, 8); day <= new Date(2026, 10, 20, 8); day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 8)) {
      const classAt = classLessonAt(day, settings)!;
      const plan = buildSessionPlan({ cards, words, settings, now: day, newPerDay: PACE_START });
      const current = plan.newWordIds.map((id) => byId.get(id)!).filter((w) => taughtAt(w.text) === classAt && Array.from(w.text).length === 1);
      if (classAt >= from) {
        checked += 1;
        const allStarted = charsOf(classAt).every((w) => begun.has(w.id));
        expect(current.length > 0 || allStarted, `${day.toDateString()} (class on ${lessonLabel(classAt)})`).toBe(true);
      }
      for (const w of current) { const tag = laneTag(plan.newWordLanes?.[w.id], w); if (tag) tagsMet.add(tag); }
      for (const id of plan.newWordIds) { cards.push(makeCard(id, 'recognise', later)); begun.add(id); }
    }
    expect(checked).toBeGreaterThan(30);
    for (let n = 14; n <= 19; n++) if (lessonIndex('二下', n) !== undefined) expect(tagsMet).toContain(`课本 二下·${n}`);
  });
});
