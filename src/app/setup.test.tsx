import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { hashPin } from '../lib/hash';
import { getKid, getSettings, putWords } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS } from '../types';
import { PetSetup } from './PetSetup';
import { classLessonAt, lessonName, LESSONS, schoolYear, termLessons } from '../content/curriculum';
import { classTerm, startTerm, TERMS } from '../placement/walk';

const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
import { SetupPin } from './SetupPin';

const type = (pin: string) => [...pin].forEach((d) => fireEvent.click(screen.getByRole('button', { name: d })));

describe('first launch', () => {
  it('SetupPin asks twice and saves a hashed PIN', async () => {
    const app = await makeAppData({ settings: { ...DEFAULT_SETTINGS } });
    renderWithApp(<SetupPin />, app);
    type('1234');
    await screen.findByText('Enter the same PIN again');
    type('9999');
    expect(await screen.findByText('The PINs did not match. Please start again.')).toBeTruthy();
    type('1234');
    await screen.findByText('Enter the same PIN again');
    type('1234');
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'petSetup' }));
    expect((await getSettings(app.db)).pinHash).toBe(await hashPin('1234'));
  });

  it('PetSetup welcomes him with the red 字己 seal, and no explanation of the pun', async () => {
    renderWithApp(<PetSetup />, await makeAppData({ kid: null }));
    expect(screen.getByRole('heading', { name: '字己' })).toBeTruthy();
    expect(document.querySelector('.brand .seal')?.textContent).toBe('字己');
    expect([...document.querySelectorAll('.brand .seal > span')].map((s) => s.textContent)).toEqual(['字', '己']); // stacked, not vertical text
    expect(document.querySelector('.pun')).toBeNull();
    expect(document.body.textContent).not.toContain('自己学汉字');
  });

  it('Meet Truffle: he sleeps while it asks his school year; six grade buttons, nothing else to tap yet', async () => {
    renderWithApp(<PetSetup />, await makeAppData({ kid: null }));
    expect(document.querySelector('svg.truffle')?.getAttribute('data-mood')).toBe('sleepy');
    expect(screen.getByRole('heading', { name: '你读几年级？' })).toBeTruthy();
    expect(GRADES.map((g) => screen.getByRole('button', { name: g }))).toHaveLength(6);
    expect(screen.queryByText('好！')).toBeNull();
  });

  it('picking a grade wakes him, saves the school year for the calendar, says where school is; 好！ goes on to placement', async () => {
    const app = await makeAppData({ kid: null, settings: { ...DEFAULT_SETTINGS, classLesson: { term: '二下', lesson: 3, setAt: 0 } } });
    renderWithApp(<PetSetup />, app);
    fireEvent.click(screen.getByRole('button', { name: '一年级' }));
    await waitFor(() => expect(app.refresh).toHaveBeenCalled()); // saved, then the app's settings reloaded
    expect(document.querySelector('svg.truffle')?.getAttribute('data-mood')).toBe('sulk');
    const s = await getSettings(app.db);
    expect([s.grade, s.gradeYear, s.classLesson]).toEqual([1, 2026, null]);
    expect(screen.getByRole('heading', { name: '这是松露！' })).toBeTruthy();
    const at = classLessonAt(app.now(), s)!;
    expect(LESSONS[at]!.term).toBe('一下'); // 2 October 2026: Semester II
    expect(screen.getByText(`学校现在学到：${lessonName(at)}`)).toBeTruthy();
    expect(screen.queryByRole('button', { name: '二年级' })).toBeNull();
    fireEvent.click(screen.getByText('好！'));
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'placement' }));
    expect((await getKid(app.db))?.petName).toBe('松露');
  });

  it('改 lets him pick again', async () => {
    const app = await makeAppData({ kid: null });
    renderWithApp(<PetSetup />, app);
    fireEvent.click(screen.getByRole('button', { name: '一年级' }));
    fireEvent.click(await screen.findByRole('button', { name: '改' }));
    fireEvent.click(screen.getByRole('button', { name: '三年级' }));
    await screen.findByText(/学校现在学到：三下/);
    await waitFor(() => expect(app.refresh).toHaveBeenCalledTimes(2));
    expect((await getSettings(app.db)).grade).toBe(3);
  });

  it('no calendar for the year, or no MOE list for his grade: a gentle 我们从一上开始', async () => {
    for (const [now, grade] of [[new Date(2029, 2, 1), '二年级'], [new Date(2026, 9, 2), '五年级']] as const) {
      const app = await makeAppData({ kid: null, now: () => now });
      const { unmount } = renderWithApp(<PetSetup />, app);
      fireEvent.click(screen.getByRole('button', { name: grade }));
      expect(await screen.findByText('我们从一上开始')).toBeTruthy();
      expect(screen.queryByText(/学校现在学到/)).toBeNull();
      unmount();
    }
  });

  it('a December install: the grade he just finished, so January moves him up a year', async () => {
    const dec = new Date(2026, 11, 10);
    const app = await makeAppData({ kid: null, now: () => dec });
    renderWithApp(<PetSetup />, app);
    fireEvent.click(screen.getByRole('button', { name: '一年级' }));
    expect(await screen.findByText(`学校现在学到：${lessonName(termLessons('一下').at(-1)!)}`)).toBeTruthy(); // the holiday keeps 一下's last lesson
    await waitFor(() => expect(app.refresh).toHaveBeenCalled());
    const s = await getSettings(app.db);
    expect(schoolYear(s, dec)).toBe(1);
    expect(schoolYear(s, new Date(2027, 0, 5))).toBe(2);
  });

  it('placement starts one term below the class term of the grade he picked: a P1 child at 一上, a P3 child at 三上', async () => {
    for (const [grade, start] of [['一年级', '一上'], ['三年级', '三上']] as const) {
      const app = await makeAppData({ kid: null });
      const { unmount } = renderWithApp(<PetSetup />, app);
      fireEvent.click(screen.getByRole('button', { name: grade }));
      await waitFor(() => expect(app.refresh).toHaveBeenCalled());
      expect(TERMS[startTerm(classTerm(app.now(), await getSettings(app.db)))]).toBe(start);
      unmount();
    }
  });
});
