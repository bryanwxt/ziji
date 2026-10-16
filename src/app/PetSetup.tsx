import { useState } from 'preact/hooks';
import { classLessonAt, lessonName } from '../content/curriculum';
import { saveKid, updateSettings } from '../store/repo';
import { DEFAULT_KID, type Settings } from '../types';
import { Label } from '../ui/Label';
import { WorldScene } from '../ui/worlds/WorldScene';
import { timeOfDay } from '../fun/worlds';
import { Truffle } from '../ui/truffle/Truffle';
import { useApp } from './AppContext';

const GRADES = ['一', '二', '三', '四', '五', '六'];

/** What his school year sets: the same fields as Parent › Settings › School year, so the class pace follows the calendar from today. */
export const gradeSettings = (grade: number, now: Date): Pick<Settings, 'grade' | 'gradeYear' | 'classLesson'> =>
  // gradeYear is the calendar year: Singapore's school year is the calendar year, and a November–December install's answer is the
  // year just finished (schoolYear() moves him up in January), which is how a child answers in the holidays
  ({ grade, gradeYear: now.getFullYear(), classLesson: null });

/** Where school is, for him: 「学校现在学到：二下 第五课」; without a calendar for the year or an MOE list for his grade, 一上. */
export function schoolLine(grade: number, now: Date): string {
  const at = classLessonAt(now, gradeSettings(grade, now));
  return at === null ? '我们从一上开始' : `学校现在学到：${lessonName(at)}`;
}

/** First run: Truffle 松露 (the family's cat) sleeps while it asks his school year; his answer wakes him. Then placement. */
export function PetSetup() {
  const { db, go, refresh, now } = useApp();
  const [grade, setGrade] = useState<number | null>(null);
  const [picking, setPicking] = useState(true);
  const awake = grade !== null;

  const pick = async (g: number) => {
    setGrade(g);
    setPicking(false);
    await updateSettings(db, gradeSettings(g, now()));
    await refresh();
  };
  const done = async () => {
    await saveKid(db, { ...DEFAULT_KID, petName: '松露' });
    await refresh();
    go({ name: 'placement' });
  };

  return (
    <div class="screen">
      <WorldScene world="home" time={timeOfDay(now())} bare />
      <div class={`setup${picking ? ' setup--grade' : ''}`}>
        <div class="setup__pet">
          <h1 class="brand" aria-label="字己"><span class="seal seal--big" aria-hidden="true"><span>字</span><span>己</span></span></h1>
          <div class="pet">
            {awake && !picking && <div class="pet__bubble">哼……我是松露。来吧！</div>}
            <Truffle mood={awake ? 'sulk' : 'sleepy'} size={240} bounce={awake} label={awake ? '松露' : '松露在睡觉'} />
          </div>
        </div>
        {picking ? (
          <div class="setup__form">
            <h2><Label zh="你读几年级？" /></h2>
            <div class="setup__grades" role="group" aria-label="你读几年级？">
              {GRADES.map((zh, i) => (
                <button key={zh} type="button" class={`btn setup__grade${grade === i + 1 ? ' btn--primary' : ''}`} onClick={() => void pick(i + 1)}>
                  <Label zh={`${zh}年级`} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div class="setup__form">
            <h2><Label zh="这是松露！" /></h2>
            <p class="setup__school"><Label zh={schoolLine(grade!, now())} /></p>
            <p class="setup__flavor"><Label zh="他有点儿凶，可是你答对了，他就会开心！" /></p>
            <div class="setup__go">
              <button type="button" class="btn setup__change" onClick={() => setPicking(true)}><Label zh="改" /></button>
              <button type="button" class="btn btn--primary btn--big" onClick={() => void done()}>
                <Label zh="好！" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
