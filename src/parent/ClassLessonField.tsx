// Where his class is (spec 2026-10-11 §8): the calendar's estimate, or the parent's correction while it applies.
import { useState } from 'preact/hooks';
import { classLessonAt, correctionApplies, gradeTerms, LESSONS, lessonLabel, lessonName, schoolYear, termLessons } from '../content/curriculum';
import type { Settings } from '../types';

export function ClassLessonField({ settings, now, onSave }: { settings: Settings; now: Date; onSave: (patch: Partial<Settings>) => Promise<void> }) {
  const at = classLessonAt(now, settings);
  const options = gradeTerms(schoolYear(settings, now)).flatMap(termLessons);
  const [pick, setPick] = useState<number | null>(null);
  if (at === null || !options.length) {
    const why = options.length ? `No school calendar for ${now.getFullYear()} yet (src/content/schoolCalendar.ts)` : 'No MOE list for his school year';
    return <div class="field"><p class="hint" id="st-class-now">{why}: new words follow the book from 一上.</p></div>;
  }
  const setOn = correctionApplies(now, settings) ? new Date(settings.classLesson!.setAt) : null;
  const chosen = pick ?? (options.includes(at) ? at : options[0]!);
  return (
    <div class="field">
      <label for="st-class">Class lesson</label>
      <p class="hint" id="st-class-now">Class is on: {lessonName(at)} ({setOn ? `你在${setOn.getMonth() + 1}月${setOn.getDate()}日设定` : '估计'})</p>
      <div class="row" style={{ justifyContent: 'flex-start' }}>
        <select id="st-class" value={String(chosen)} onChange={(e) => setPick(Number(e.currentTarget.value))}>
          {options.map((i) => <option key={i} value={String(i)}>{lessonLabel(i)}</option>)}
        </select>
        <button type="button" class="btn" onClick={() => void onSave({ classLesson: { term: LESSONS[chosen]!.term, lesson: LESSONS[chosen]!.lesson, setAt: now.getTime() } })}>Set</button>
        <button type="button" class="btn btn--secondary" disabled={!settings.classLesson} onClick={() => { setPick(null); void onSave({ classLesson: null }); }}>Use the estimate</button>
      </div>
      <p class="hint">New words each day come half from this lesson and the one before, half from what he hasn't met since 一上. The estimate spreads each semester's lessons over its school weeks; a correction holds until the next semester.</p>
    </div>
  );
}
