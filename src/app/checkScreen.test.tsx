// 考考自己 (weekly list spec 2026-10-17 §8.1): no pinyin on the questions, saved as he goes, resumable the same day, the misses
// only at the end with their right answer, pinyin and English. Invented fixtures: 蟋蟀, 蝌蚪, 螳螂, 书包, 雨伞.
import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => true }));
import { allWeekLists, getKid, putWeekList, putWords, saveKid } from '../store/repo';
import { makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, type WeekList, type Word } from '../types';
import { CheckScreen } from './CheckScreen';

const parent = (text: string, pinyin: string, meaning?: string): Word => makeWord(text, { id: `p:${text}`, source: 'parent', pinyin, meaning, rank: null, level: null });
const words = [parent('蟋蟀', 'xī shuài'), parent('蝌蚪', 'kē dǒu'), parent('螳螂', 'táng láng'), parent('书包', 'shū bāo'), parent('雨伞', 'yǔ sǎn')];
const list = (over: Partial<WeekList> = {}): WeekList => ({
  id: 'wl:c', name: 'L', createdAt: 11, readyBy: '2026-11-04', homeworkDue: '2026-11-06',
  items: [{ wordId: 'p:蟋蟀', text: '蟋蟀', from: 'grid', addedStatus: 'new' }, { wordId: 'p:蝌蚪', text: '蝌蚪', from: 'grid', addedStatus: 'new' }],
  pairs: [], fits: [], ...over,
});
async function setUp(l: WeekList) {
  const app = await makeAppData({ now: () => new Date(2026, 10, 4, 17) });
  await putWords(app.db, words);
  await saveKid(app.db, { ...DEFAULT_KID });
  await putWeekList(app.db, l);
  return app;
}
const asked = () => document.querySelector('.hanzi--q')?.textContent ?? '';
const answer = (right: boolean) => {
  const py = words.find((w) => w.text === asked())!.pinyin;
  const btn = [...document.querySelectorAll<HTMLButtonElement>('.stage__card .choice')].find((b) => (b.textContent === py) === right)!;
  fireEvent.click(btn);
};
const cardPinyin = () => [...document.querySelectorAll('.stage__card .label__py, .stage__card .pinyin')].map((e) => e.textContent ?? '').filter((t) => t.trim());

describe('CheckScreen (spec §8.1)', () => {
  it('asks without pinyin and saves each answer as he goes', async () => {
    const app = await setUp(list());
    renderWithApp(<CheckScreen listId="wl:c" />, app);
    await waitFor(() => expect(asked()).not.toBe(''));
    expect(cardPinyin()).toEqual([]);
    answer(true);
    await waitFor(async () => expect(Object.keys((await allWeekLists(app.db))[0]!.check?.results ?? {})).toHaveLength(1));
  });
  it('the misses only at the end: right answer, pinyin and English; a star for each newly ready item; 好了！ goes home', async () => {
    const app = await setUp(list());
    renderWithApp(<CheckScreen listId="wl:c" />, app);
    await waitFor(() => expect(asked()).not.toBe(''));
    const first = asked();
    answer(false);
    await waitFor(() => expect(asked()).not.toBe(first));
    expect(document.querySelector('.pair-summary')).toBeNull(); // no miss sheet mid-check
    answer(true);
    const row = await screen.findByText((_, el) => !!el?.classList.contains('pair-summary__row'));
    expect(row.querySelector('.label')!.getAttribute('data-zh')).toBe(first);
    expect(row.querySelector('.label')!.getAttribute('data-py')).toBe(words.find((w) => w.text === first)!.pinyin);
    expect(document.querySelector('.check__stars')!.textContent).toContain('1');
    expect((await getKid(app.db))!.bonusStars).toBe(1);
    expect((await allWeekLists(app.db))[0]!.check!.done).toBe(true);
    const ok = document.querySelector<HTMLButtonElement>('.stage__sheet button')!;
    expect(ok.querySelector('.label')!.getAttribute('data-zh')).toBe('好了！');
    fireEvent.click(ok);
    expect(app.go).toHaveBeenCalledWith({ name: 'home' });
  });
  it('stopping and coming back the same day asks only what is left', async () => {
    const app = await setUp(list({ check: { at: 1, day: '2026-11-04', done: false, results: { 'p:蟋蟀': { form: 'read', correct: true } } } }));
    renderWithApp(<CheckScreen listId="wl:c" />, app);
    await waitFor(() => expect(asked()).toBe('蝌蚪'));
  });
  it('a 搭配 asked from the list pair: no pinyin, and the pair goes on at once', async () => {
    const l = list({
      items: ['拔', '萝卜', '书包', '雨伞', '螳螂'].map((t) => ({ wordId: `p:${t}`, text: t, from: 'pair' as const, addedStatus: 'new' as const })),
      pairs: [{ left: '拔', right: '萝卜', wrong: ['书包', '雨伞', '螳螂'] }],
    });
    const app = await setUp(l);
    await putWords(app.db, [parent('拔', 'bá'), parent('萝卜', 'luó bo')]);
    renderWithApp(<CheckScreen listId="wl:c" />, app);
    await waitFor(() => expect(document.querySelector('.match__word, .hanzi--q')).toBeTruthy());
    for (let n = 0; n < 4 && !document.querySelector('.match__word'); n++) { answer(true); await new Promise((r) => setTimeout(r, 20)); }
    expect(document.querySelector('.match__word')!.textContent).toBe('拔');
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent === '萝卜')!);
    await waitFor(async () => expect((await allWeekLists(app.db))[0]!.check?.results['p:萝卜']?.correct).toBe(true));
  });
});
