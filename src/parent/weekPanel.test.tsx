// src/parent/weekPanel.test.tsx
// 本周词语 (weekly list spec 2026-10-17 §3): paste, preview, wrong answers confirmed, days, save; then the lists, edited and deleted.
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { allWeekLists, allWords, getWeekList, putCards, updateWeekList } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import type { WeekList } from '../types';
import { listStatus, planLine, WeekPanel } from './WeekPanel';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

// Invented, shaped like Live Text on a weekly sheet: a page code, a grid, and 搭配 under two theme headings.
const SHEET = ['P9-L01-练习', '一、词语', '草地 跑步 蝴蝶', '二、词语搭配', '早餐', '吃 面包', '喝 牛奶', '公园', '放 风筝', '踢 足球'].join('\n');
const MONDAY = new Date(2026, 9, 19, 9); // Mon 19 Oct 2026

async function setup(now = MONDAY) {
  const app = await makeAppData({ now: () => now });
  await putCards(app.db, [makeCard('w:跑步', 'recognise', new Date(2026, 9, 25), true)]); // he knows 跑步 already
  renderWithApp(<WeekPanel />, app);
  return app;
}
async function read(text = SHEET) {
  fireEvent.input(await screen.findByLabelText(/Paste the sheet/), { target: { value: text } });
  const button = screen.getByRole('button', { name: 'Read' }) as HTMLButtonElement;
  await waitFor(() => expect(button.disabled).toBe(false)); // his words and cards loaded
  fireEvent.click(button);
  await screen.findByRole('heading', { name: /New to him/ });
}
const save = () => screen.getByRole('button', { name: /^Save/ }) as HTMLButtonElement;

describe('WeekPanel: paste and preview (spec §3.2–3.5)', () => {
  it('says how to copy the sheet with Live Text, and Read waits for text', async () => {
    await setup();
    expect(await screen.findByText(/Copy the text from a photo of the sheet with Live Text: long-press the text → Select All → Copy/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Read' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('splits new words from ones he knows, and asks English only for a new word without one', async () => {
    await setup();
    await read();
    const fresh = screen.getByRole('list', { name: /New to him/ });
    const known = screen.getByRole('list', { name: /He knows/ });
    expect(within(known).getByText('跑步')).toBeTruthy();
    expect(within(fresh).queryByText('跑步')).toBeNull();
    expect(within(fresh).getByText('蝴蝶')).toBeTruthy();
    expect(screen.getByLabelText('English for 蝴蝶 (optional)')).toBeTruthy();
    expect(screen.queryByLabelText('English for 草地 (optional)')).toBeNull(); // it has one
    expect(within(fresh).getByText('grass field')).toBeTruthy();
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'P9-L01');
  });

  it('shows the 搭配 under their theme headings, and a column-read pair flagged to check', async () => {
    await setup();
    await read();
    const breakfast = screen.getByRole('group', { name: '早餐' });
    expect(within(breakfast).getByText('吃 — 面包')).toBeTruthy();
    expect(within(screen.getByRole('group', { name: '公园' })).getByText('踢 — 足球')).toBeTruthy();
    cleanup();
    await setup();
    await read(['> 词语搭配', '早餐', '吃', '面包', '喝', '牛奶'].join('\n'));
    expect(screen.getAllByText('check the pairing')).toHaveLength(2);
  });

  it('default days: ready by Wednesday, homework Friday; and the plan line', async () => {
    await setup();
    await read();
    expect(screen.getByLabelText('Ready by')).toHaveProperty('value', '2026-10-21');
    expect(screen.getByLabelText('Homework due')).toHaveProperty('value', '2026-10-23');
    expect(screen.getByText(/he knows \(quick check\)/).textContent).toMatch(/check 星期三, homework 星期五/);
  });

  it('a past homework day is refused, with a reason', async () => {
    await setup();
    await read();
    fireEvent.click(screen.getByRole('button', { name: 'All fine' }));
    fireEvent.input(screen.getByLabelText('Homework due'), { target: { value: '2026-10-16' } });
    expect(screen.getByText(/Homework day is already past/)).toBeTruthy();
    expect(save().disabled).toBe(true);
  });

  it('a Thursday list for Friday says there is only one day', async () => {
    await setup(new Date(2026, 9, 22, 9));
    await read();
    expect(screen.getByLabelText('Ready by')).toHaveProperty('value', '2026-10-23');
    expect(screen.getByText(/Only 1 day — he’ll see the new words today and the check tomorrow/)).toBeTruthy();
  });
});

describe('WeekPanel: confirming the wrong answers', () => {
  it('Save waits until the wrong answers are checked; All fine checks them all in one tap', async () => {
    await setup();
    await read();
    expect(save().disabled).toBe(true);
    expect(screen.getByText(/to check/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'All fine' }));
    expect(save().disabled).toBe(false);
  });

  it('tapping a wrong partner swaps it, and the row must be checked again', async () => {
    await setup();
    await read();
    fireEvent.click(screen.getByRole('button', { name: 'All fine' }));
    const row = screen.getByRole('group', { name: '早餐' }).querySelector('li')!;
    const chip = within(row).getAllByRole('button', { name: /^✗ / })[0]!;
    const was = chip.textContent;
    fireEvent.click(chip);
    expect(within(row).getAllByRole('button', { name: /^✗ / })[0]!.textContent).not.toBe(was);
    expect(within(row).getAllByRole('button', { name: /^✗ / }).map((b) => b.textContent)).not.toContain(was);
    expect(save().disabled).toBe(true);
  });

  it('saves the list: new parent words with the English typed, pairs with three wrongs, checked fill-ins; removed rows left out', async () => {
    const app = await setup();
    await read();
    fireEvent.input(screen.getByLabelText('English for 蝴蝶 (optional)'), { target: { value: 'butterfly' } });
    const fills = screen.getByRole('list', { name: '选词填空' });
    const first = fills.querySelector('li')!;
    const removed = first.getAttribute('data-word')!;
    fireEvent.click(within(first).getByRole('button', { name: 'Remove' }));
    const pairRow = screen.getByRole('group', { name: '公园' }).querySelectorAll('li')[1]!; // 踢 — 足球
    fireEvent.click(within(pairRow).getByRole('button', { name: 'Remove' }));
    fireEvent.click(screen.getByRole('button', { name: 'All fine' }));
    fireEvent.click(save());
    await waitFor(async () => expect(await allWeekLists(app.db)).toHaveLength(1));
    const l = (await allWeekLists(app.db))[0]!;
    expect(l).toMatchObject({ name: 'P9-L01', readyBy: '2026-10-21', homeworkDue: '2026-10-23' });
    expect(l.items.map((i) => i.text)).toEqual(['草地', '跑步', '蝴蝶', '吃', '面包', '喝', '牛奶', '放', '风筝', '踢', '足球']);
    expect(l.pairs.map((p) => `${p.left}${p.right}`)).toEqual(['吃面包', '喝牛奶', '放风筝']);
    for (const p of l.pairs) expect(p.wrong).toHaveLength(3);
    expect(l.pairs[0]!.group).toBe('早餐');
    expect(l.fits.length).toBeGreaterThan(0);
    expect(l.fits.map((f) => l.items.find((i) => i.wordId === f.wordId)?.text)).not.toContain(removed);
    const butterfly = (await allWords(app.db)).find((w) => w.text === '蝴蝶')!;
    expect(butterfly).toMatchObject({ meaning: 'butterfly', writeable: false, source: 'parent' });
    expect(await screen.findByRole('status')).toHaveProperty('textContent', expect.stringMatching(/Saved “P9-L01”: 11 words/));
  });

  it('a word unticked is not saved, and English with Chinese in it is refused', async () => {
    const app = await setup();
    await read();
    fireEvent.input(screen.getByLabelText('English for 蝴蝶 (optional)'), { target: { value: '蝴蝶 fly' } });
    fireEvent.click(screen.getByRole('button', { name: 'All fine' }));
    expect(screen.getByText(/Chinese in the English/)).toBeTruthy();
    expect(save().disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include 蝴蝶' }));
    expect(save().disabled).toBe(false);
    fireEvent.click(save());
    await waitFor(async () => expect(await allWeekLists(app.db)).toHaveLength(1));
    expect((await allWeekLists(app.db))[0]!.items.map((i) => i.text)).not.toContain('蝴蝶');
  });

  it('a look-alike misread offers its fix', async () => {
    await setup();
    await read(['一、词语', '告坼 草地'].join('\n'));
    fireEvent.click(screen.getByRole('button', { name: 'Use 告诉' }));
    expect(screen.getByText('告诉')).toBeTruthy();
    expect(screen.queryByText('告坼')).toBeNull();
  });
});

describe('WeekPanel: the lists', () => {
  async function saved(app: Awaited<ReturnType<typeof setup>>) {
    await read();
    fireEvent.click(screen.getByRole('button', { name: 'All fine' }));
    fireEvent.click(save());
    await waitFor(async () => expect(await allWeekLists(app.db)).toHaveLength(1));
    return (await allWeekLists(app.db))[0]!;
  }

  it('shows each list with its days and where it stands', async () => {
    const app = await setup();
    await saved(app);
    const card = await screen.findByRole('article', { name: 'P9-L01' });
    expect(card.textContent).toMatch(/Learning · check 星期三 \(in 2 days\)/);
    expect(card.textContent).toMatch(/11 words/);
  });

  it('pasting the same sheet again updates its list, never a second one', async () => {
    const app = await setup();
    await saved(app);
    await read();
    expect(await screen.findByText(/Saving adds to it/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'All fine' }));
    fireEvent.click(save());
    await waitFor(() => screen.getByText(/Saved “P9-L01”/));
    expect(await allWeekLists(app.db)).toHaveLength(1);
  });

  it('an edit keeps answers recorded while it was open (updateWeekList)', async () => {
    const app = await setup();
    const l = await saved(app);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit P9-L01' }));
    fireEvent.input(screen.getByLabelText('List name'), { target: { value: '第一周' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove 蝴蝶' }));
    // he answers while the parent is editing
    const butterfly = l.items.find((i) => i.text === '蝴蝶')!.wordId;
    const grass = l.items.find((i) => i.text === '草地')!.wordId;
    await updateWeekList(app.db, l.id, (x) => ({ ...x, items: x.items.map((i) => (i.wordId === grass ? { ...i, last: { read: { at: 1, correct: true } } } : i)) }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(async () => expect((await getWeekList(app.db, l.id))?.name).toBe('第一周'));
    const after = (await getWeekList(app.db, l.id))!;
    expect(after.items.find((i) => i.wordId === grass)?.last?.read?.correct).toBe(true);
    expect(after.items.map((i) => i.wordId)).not.toContain(butterfly);
    expect(after.fits.map((f) => f.wordId)).not.toContain(butterfly);
  });

  it('delete asks on the page (never confirm()), and keeps his words', async () => {
    const app = await setup();
    await saved(app);
    const native = vi.spyOn(window, 'confirm');
    fireEvent.click(await screen.findByRole('button', { name: 'Delete P9-L01' }));
    expect(native).not.toHaveBeenCalled();
    expect(screen.getByText(/His words and progress stay/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(await allWeekLists(app.db)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Delete P9-L01' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete the list' }));
    await waitFor(async () => expect(await allWeekLists(app.db)).toHaveLength(0));
    expect((await allWords(app.db)).map((w) => w.text)).toContain('蝴蝶');
    await waitFor(() => expect(screen.queryByRole('article', { name: 'P9-L01' })).toBeNull());
  });
});

describe('planLine and listStatus', () => {
  it('the plan line names the words that will not fit', () => {
    expect(planLine({ newCount: 18, known: 10, placed: 4, rate: 7, days: 2, readyBy: '2026-10-21', homeworkDue: '2026-10-23', names: ['甲', '乙', '丙', '丁'] }))
      .toBe('18 new · 10 he knows (quick check) · 4 to recheck. New words 7 a day for 2 days, check 星期三, homework 星期五. At 7 a day, 4 new words won’t be taught before 星期三: 甲, 乙, 丙, 丁. They’ll still be in the check.');
  });
  const list = (over: Partial<WeekList> = {}): WeekList => ({ id: 'wl:1', name: 'x', createdAt: 0, readyBy: '2026-10-21', homeworkDue: '2026-10-23', items: [{ wordId: 'b:a', text: 'a', from: 'grid', addedStatus: 'new' }, { wordId: 'b:b', text: 'b', from: 'grid', addedStatus: 'new' }], pairs: [], fits: [], ...over });
  it('says where a list stands', () => {
    expect(listStatus(list(), new Date(2026, 9, 20, 9))).toBe('Learning · check 星期三 (tomorrow)');
    expect(listStatus(list(), new Date(2026, 9, 21, 9))).toBe('Check today (考考自己)');
    const checked = list({ check: { at: 1, day: '2026-10-21', done: true, results: { 'b:a': { form: 'read', correct: true }, 'b:b': { form: 'read', correct: false } } } });
    expect(listStatus(checked, new Date(2026, 9, 21, 18))).toBe('Check done: 1 of 2 right · 1 still practised');
    expect(listStatus(checked, new Date(2026, 9, 31, 9))).toBe('Finished · practised until 30 Oct');
    expect(listStatus(list({ closedAt: 5 }), new Date(2026, 9, 20, 9))).toBe('Closed');
  });
});
