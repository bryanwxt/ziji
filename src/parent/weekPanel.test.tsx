// src/parent/weekPanel.test.tsx
// 本周词语 (weekly list spec 2026-10-17 §3): paste, preview, wrong answers confirmed, days, save; then the lists, edited and deleted.
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSessionPlan } from '../session/plan';
import { createSessionRecord } from '../session/runner';
import { allWeekLists, allWords, getWeekList, getWord, putCards, putWeekList, putWords, saveSession, updateWeekList } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS, type WeekList } from '../types';
import { resetCedictWords } from '../weeklist/cedictWords';
import { resetCedictGlosses } from '../weeklist/cedictGlosses';
import { listStatus, planLine, WeekPanel } from './WeekPanel';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); resetCedictWords(); resetCedictGlosses(); });

// Invented, shaped like Live Text on a weekly sheet: a page code, a grid, and 搭配 under two theme headings.
const SHEET = ['P9-L01-练习', '一、词语', '草地 跑步 蝌蚪', '二、词语搭配', '早餐', '吃 面包', '喝 牛奶', '公园', '放 风筝', '踢 足球'].join('\n');
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
const allFineButton = () => screen.getByRole('button', { name: /^(All fine|Accept all anyway)/ }) as HTMLButtonElement;
/** All fine, then Accept all anyway for the rows it left to check (parent ruling 2026-10-17). */
function confirmAll() {
  fireEvent.click(allFineButton());
  if (allFineButton().textContent === 'Accept all anyway') fireEvent.click(allFineButton());
}

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
    expect(within(fresh).getByText('蝌蚪')).toBeTruthy();
    expect(screen.getByLabelText('English for 蝌蚪 (optional)')).toBeTruthy();
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

  it('a column-read sheet says so, and counts what needs checking (fix round 2026-10-17)', async () => {
    await setup();
    await read(['> 词语', '• 词语搭配', '早餐', '吃', '面包', '喝', '牛奶', '©2026 Example Publisher Pte Ltd.', '草地', '跑步', '蝌蚪', '饼干'].join('\n'));
    expect(screen.getByText(/read this sheet column by column/)).toBeTruthy();
    expect(screen.getByText(/To check: 2 搭配 pairings/)).toBeTruthy();
    expect(screen.getAllByText('check the pairing')).toHaveLength(2);
  });

  it('a pair written noun first is reordered and says so', async () => {
    await setup();
    await read(['> 词语', '草地', '> 词语搭配', '面包 吃'].join('\n'));
    expect(within(screen.getByRole('group', { name: '搭配' })).getByText('吃 — 面包')).toBeTruthy();
    expect(screen.getByText('reordered to verb first: check it')).toBeTruthy();
  });

  it('default days: ready by Wednesday, homework Friday; and the plan line', async () => {
    await setup();
    await read();
    expect(screen.getByLabelText('Ready by')).toHaveProperty('value', '2026-10-21');
    expect(screen.getByLabelText('Homework due')).toHaveProperty('value', '2026-10-23');
    expect(screen.getByText(/he knows \(quick check\)/).textContent).toMatch(/check 星期三, homework 星期五/);
  });

  it('the plan line: the new words from today\'s lesson, or from tomorrow once it is done (parent ruling 2026-10-18)', async () => {
    const app = await setup();
    await read();
    expect(screen.getByText(/he knows \(quick check\)/).textContent).toMatch(/New words: \d+ on Mon · check 星期三/);
    cleanup();
    const done = { ...createSessionRecord(buildSessionPlan({ cards: [], words: [], settings: DEFAULT_SETTINGS, now: MONDAY }), '2026-10-19', MONDAY.getTime()), completed: true };
    await saveSession(app.db, done);
    renderWithApp(<WeekPanel />, app);
    await read();
    await waitFor(() => expect(screen.getByText(/he knows \(quick check\)/).textContent).toMatch(/Today’s lesson is done, so the new words start tomorrow\. New words: \d+ on Tue · check 星期三/));
  });

  it('a past homework day is refused, with a reason', async () => {
    await setup();
    await read();
    confirmAll();
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
  it('Save waits until the wrong answers are checked; All fine (and Fine on any doubtful row) checks them', async () => {
    await setup();
    await read();
    expect(save().disabled).toBe(true);
    expect(screen.getAllByText(/to check/).length).toBeGreaterThan(0);
    confirmAll();
    expect(save().disabled).toBe(false);
  });

  it('tapping a wrong partner swaps it, and the row must be checked again', async () => {
    await setup();
    await read();
    confirmAll();
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
    fireEvent.input(screen.getByLabelText('English for 蝌蚪 (optional)'), { target: { value: 'tadpole' } });
    const fills = screen.getByRole('list', { name: '选词填空' });
    const first = fills.querySelector('li')!;
    const removed = first.getAttribute('data-word')!;
    fireEvent.click(within(first).getByRole('button', { name: 'Remove' }));
    const pairRow = screen.getByRole('group', { name: '公园' }).querySelectorAll('li')[1]!; // 踢 — 足球
    fireEvent.click(within(pairRow).getByRole('button', { name: 'Remove' }));
    confirmAll();
    fireEvent.click(save());
    await waitFor(async () => expect(await allWeekLists(app.db)).toHaveLength(1));
    const l = (await allWeekLists(app.db))[0]!;
    expect(l).toMatchObject({ name: 'P9-L01', readyBy: '2026-10-21', homeworkDue: '2026-10-23' });
    expect(l.items.map((i) => i.text)).toEqual(['草地', '跑步', '蝌蚪', '吃', '面包', '喝', '牛奶', '放', '风筝', '踢', '足球']);
    expect(l.pairs.map((p) => `${p.left}${p.right}`)).toEqual(['吃面包', '喝牛奶', '放风筝']);
    for (const p of l.pairs) expect(p.wrong).toHaveLength(3);
    expect(l.pairs[0]!.group).toBe('早餐');
    expect(l.fits.length).toBeGreaterThan(0);
    expect(l.fits.map((f) => l.items.find((i) => i.wordId === f.wordId)?.text)).not.toContain(removed);
    const tadpole = (await allWords(app.db)).find((w) => w.text === '蝌蚪')!;
    expect(tadpole).toMatchObject({ meaning: 'tadpole', writeable: false, source: 'parent' });
    expect(await screen.findByRole('status')).toHaveProperty('textContent', expect.stringMatching(/Saved “P9-L01”: 11 words/));
  });

  it('a word unticked is not saved, and English with Chinese in it is refused', async () => {
    const app = await setup();
    await read();
    fireEvent.input(screen.getByLabelText('English for 蝌蚪 (optional)'), { target: { value: '蝌蚪 fly' } });
    confirmAll();
    expect(screen.getByText(/Chinese in the English/)).toBeTruthy();
    expect(save().disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include 蝌蚪' }));
    expect(save().disabled).toBe(false);
    fireEvent.click(save());
    await waitFor(async () => expect(await allWeekLists(app.db)).toHaveLength(1));
    expect((await allWeekLists(app.db))[0]!.items.map((i) => i.text)).not.toContain('蝌蚪');
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
    confirmAll();
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
    confirmAll();
    fireEvent.click(save());
    await waitFor(() => screen.getByText(/Saved “P9-L01”/));
    expect(await allWeekLists(app.db)).toHaveLength(1);
  });

  it('an edit keeps answers recorded while it was open (updateWeekList)', async () => {
    const app = await setup();
    const l = await saved(app);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit P9-L01' }));
    fireEvent.input(screen.getByLabelText('List name'), { target: { value: '第一周' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove 蝌蚪' }));
    // he answers while the parent is editing
    const tadpole = l.items.find((i) => i.text === '蝌蚪')!.wordId;
    const grass = l.items.find((i) => i.text === '草地')!.wordId;
    await updateWeekList(app.db, l.id, (x) => ({ ...x, items: x.items.map((i) => (i.wordId === grass ? { ...i, last: { read: { at: 1, correct: true } } } : i)) }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(async () => expect((await getWeekList(app.db, l.id))?.name).toBe('第一周'));
    const after = (await getWeekList(app.db, l.id))!;
    expect(after.items.find((i) => i.wordId === grass)?.last?.read?.correct).toBe(true);
    expect(after.items.map((i) => i.wordId)).not.toContain(tadpole);
    expect(after.fits.map((f) => f.wordId)).not.toContain(tadpole);
  });

  it('Close asks on the page (never confirm()), closes the list and keeps it under a collapsed Past lists; delete is in there', async () => {
    const app = await setup();
    const l = await saved(app);
    const native = vi.spyOn(window, 'confirm');
    fireEvent.click(await screen.findByRole('button', { name: 'Close P9-L01' }));
    expect(screen.getByText(/His words and progress stay/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect((await getWeekList(app.db, l.id))?.closedAt).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Close P9-L01' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close the list' }));
    await waitFor(async () => expect((await getWeekList(app.db, l.id))?.closedAt).toBe(MONDAY.getTime()));
    const past = await screen.findByRole('button', { name: /Past lists \(1\)/ });
    expect(past.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('article', { name: 'P9-L01' })).toBeNull();
    fireEvent.click(past);
    expect(within(await screen.findByRole('article', { name: 'P9-L01' })).getByText('Closed')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete P9-L01' }));
    expect(screen.getByText(/Delete “P9-L01” for good\? His words and progress stay/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete the list' }));
    await waitFor(async () => expect(await allWeekLists(app.db)).toHaveLength(0));
    expect((await allWords(app.db)).map((w) => w.text)).toContain('蝌蚪');
    expect(native).not.toHaveBeenCalled();
  });

  it('once the check has started, ready-by is locked and homework day can only move later', async () => {
    const app = await setup();
    const l = await saved(app);
    await updateWeekList(app.db, l.id, (x) => ({ ...x, check: { at: 1, day: '2026-10-21', results: {}, done: false } }));
    cleanup();
    renderWithApp(<WeekPanel />, app);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit P9-L01' }));
    expect((screen.getAllByLabelText('Ready by').at(-1) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText(/The check has started/)).toBeTruthy();
    const due = screen.getAllByLabelText('Homework due').at(-1)!;
    fireEvent.input(due, { target: { value: '2026-10-22' } });
    expect(screen.getByRole('alert').textContent).toMatch(/can only move later now/);
    expect((screen.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.input(due, { target: { value: '2026-10-26' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(async () => expect((await getWeekList(app.db, l.id))?.homeworkDue).toBe('2026-10-26'));
    expect((await getWeekList(app.db, l.id))?.readyBy).toBe('2026-10-21');
  });
});

describe('WeekPanel: fill-in rows and joining (follow-up 2026-10-17)', () => {
  it('adjective rows get adjective decoys, and a row whose decoy may fit is marked to check first', async () => {
    await setup();
    await read(['一、词语', '整齐 热闹 干净 安静 高兴 公园 草地'].join('\n'));
    const row = screen.getByRole('list', { name: '选词填空' }).querySelector('li[data-word="整齐"]')!;
    const decoys = within(row as HTMLElement).getAllByRole('button', { name: /^✗ / }).map((b) => b.textContent!.slice(2));
    expect(decoys.sort()).toEqual(['安静', '热闹', '高兴'].sort()); // never its near-synonym 干净 (fix round)
    expect(row.classList.contains('is-doubt')).toBe(true);
    expect(within(row as HTMLElement).getByText('check this one')).toBeTruthy();
  });

  it('All fine says how many it leaves, confirms the rest and takes her to the first to check; then Accept all anyway (parent ruling 2026-10-17)', async () => {
    await setup();
    await read(['一、词语', '整齐 热闹 干净 安静 高兴 公园 草地'].join('\n'));
    const rows = screen.getByRole('list', { name: '选词填空' });
    const flagged = [...rows.querySelectorAll<HTMLElement>('li.is-doubt')];
    expect(flagged.length).toBeGreaterThan(0);
    expect(allFineButton().textContent).toBe(`All fine (${flagged.length} to check)`);
    fireEvent.click(allFineButton());
    expect(rows.querySelectorAll('li:not(.is-doubt):not(.is-ok):not(.is-off)')).toHaveLength(0); // every safe row confirmed
    expect(flagged[0]!.classList.contains('is-focus')).toBe(true);
    expect(flagged[0]!.classList.contains('is-ok')).toBe(false);
    expect(save().disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toMatch(/^To save: Fine on (the|each) marked row/);
    expect(allFineButton().textContent).toBe('Accept all anyway');
    fireEvent.click(allFineButton());
    for (const r of flagged) expect(r.classList.contains('is-ok')).toBe(true);
    expect(save().disabled).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('Fine on the highlighted row moves the highlight to the next row to check', async () => {
    await setup();
    await read(['一、词语', '整齐 热闹 干净 安静 高兴 公园 草地'].join('\n'));
    const flagged = [...screen.getByRole('list', { name: '选词填空' }).querySelectorAll<HTMLElement>('li.is-doubt')];
    fireEvent.click(allFineButton());
    fireEvent.click(within(flagged[0]!).getByRole('button', { name: 'Fine' }));
    expect(flagged[0]!.classList.contains('is-focus')).toBe(false);
    if (flagged[1]) expect(flagged[1].classList.contains('is-focus')).toBe(true);
  });

  it('Save says why it can\'t save, beside it', async () => {
    await setup();
    await read();
    expect(save().disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toBe('To save: tap All fine, or Fine on each row.');
    confirmAll();
    fireEvent.input(screen.getByLabelText('Name'), { target: { value: ' ' } });
    expect(screen.getByRole('status').textContent).toBe('Give the list a name.');
  });

  it('a word with no school sentence gets one from the list bank, and a short list borrows decoys from his started words', async () => {
    const app = await makeAppData({ now: () => MONDAY });
    await putCards(app.db, ['书包', '老师', '电视', '眼睛', '月亮'].map((t) => makeCard(`w:${t}`, 'recognise', new Date(2026, 9, 25), true)));
    renderWithApp(<WeekPanel />, app);
    await read(['一、词语', '玉米 香肠 鸡翅 气球'].join('\n'));
    const rows = screen.getByRole('list', { name: '选词填空' });
    expect(rows.querySelector('li[data-word="气球"]')!.textContent).toContain('吹得大大的'); // the list bank's sentence
    const corn = rows.querySelector<HTMLElement>('li[data-word="玉米"]')!; // 「我喜欢吃＿。」
    const decoys = within(corn).getAllByRole('button', { name: /^✗ / }).map((b) => b.textContent!.slice(2));
    expect(decoys).toHaveLength(3);
    for (const d of decoys) expect(['香肠', '鸡翅']).not.toContain(d); // food: they fit 吃 too
    expect(corn.classList.contains('is-doubt')).toBe(false);
  });

  it('a real word in the CC-CEDICT list (loaded on demand) is not flagged', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('蝌蚪\n秋千\n')));
    await setup();
    await read(['一、词语', '蝌蚪 秋千 草地'].join('\n'));
    expect(screen.queryByText(/ZiJi doesn’t know|not in ZiJi’s dictionary/)).toBeNull();
  });

  it('two cells Live Text split can be joined', async () => {
    await setup();
    await read(['一、词语', '草地 蝌 蚪'].join('\n'));
    fireEvent.click(screen.getByRole('button', { name: 'Join 蝌 and 蚪' }));
    expect(screen.getByText('蝌蚪')).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: 'Include 蝌' })).toBeNull();
  });
});

/** CC-CEDICT's headwords and short English, as the panel fetches them. */
const dictionaryFetch = (glosses: string) => vi.fn(async (url: string) => new Response(String(url).endsWith('cedict-glosses.txt') ? glosses : '蝌蚪\n'));

describe('WeekPanel: English from the dictionary (parent 2026-10-18: "共用 meaning is not showing")', () => {
  it('a new word with no English is prefilled from CC-CEDICT, marked so, and saved as its meaning', async () => {
    vi.stubGlobal('fetch', dictionaryFetch('# CC-CEDICT\n蝌蚪\ttadpole\n'));
    const app = await setup();
    await read();
    const field = screen.getByLabelText('English for 蝌蚪 (optional)') as HTMLInputElement;
    await waitFor(() => expect(field.value).toBe('tadpole'));
    expect(screen.getByText('from dictionary')).toBeTruthy();
    confirmAll();
    fireEvent.click(save());
    await waitFor(async () => expect(await allWeekLists(app.db)).toHaveLength(1));
    expect((await allWords(app.db)).find((w) => w.text === '蝌蚪')!.meaning).toBe('tadpole');
  });

  it('the parent can edit or clear it: an edit is hers, a cleared field saves none', async () => {
    vi.stubGlobal('fetch', dictionaryFetch('蝌蚪\ttadpole\n'));
    const app = await setup();
    await read();
    const field = screen.getByLabelText('English for 蝌蚪 (optional)') as HTMLInputElement;
    await waitFor(() => expect(field.value).toBe('tadpole'));
    fireEvent.input(field, { target: { value: 'baby frog' } });
    expect(screen.queryByText('from dictionary')).toBeNull();
    fireEvent.input(field, { target: { value: '' } });
    confirmAll();
    fireEvent.click(save());
    await waitFor(async () => expect(await allWeekLists(app.db)).toHaveLength(1));
    expect((await allWords(app.db)).find((w) => w.text === '蝌蚪')!.meaning).toBeUndefined();
  });

  it('a list saved without English: one tap fills its words from the dictionary', async () => {
    vi.stubGlobal('fetch', dictionaryFetch('蝌蚪\ttadpole\n螳螂\tmantis\n'));
    const app = await makeAppData({ now: () => MONDAY });
    const word = (text: string, meaning?: string) => ({ id: `p:${text}`, text, pinyin: 'x', level: null, rank: null, source: 'parent' as const, writeable: false, paused: false, createdAt: 0, ...(meaning ? { meaning } : {}) });
    await putWords(app.db, [word('蝌蚪'), word('螳螂'), word('嗯嗯嗯'), word('双方', 'both sides')]);
    await putWeekList(app.db, { id: 'wl:1', name: 'Q3', createdAt: 0, readyBy: '2026-10-21', homeworkDue: '2026-10-23', pairs: [], fits: [],
      items: ['蝌蚪', '螳螂', '嗯嗯嗯', '双方'].map((t) => ({ wordId: `p:${t}`, text: t, from: 'grid' as const, addedStatus: 'new' as const })) });
    renderWithApp(<WeekPanel />, app);
    fireEvent.click(await screen.findByRole('button', { name: 'Fill missing English from dictionary (2 words)' }));
    await waitFor(async () => expect((await getWord(app.db, 'p:蝌蚪'))!.meaning).toBe('tadpole'));
    expect((await getWord(app.db, 'p:螳螂'))!.meaning).toBe('mantis');
    expect((await getWord(app.db, 'p:嗯嗯嗯'))!.meaning).toBeUndefined();
    await waitFor(() => expect(screen.queryByRole('button', { name: /Fill missing English/ })).toBeNull());
  });
});

describe('planLine and listStatus', () => {
  const d = (date: string, n: number, minutes: number) => ({ date, n, minutes });
  it('the plan line says each day\'s new words and lesson length (parent rulings 2026-10-18)', () => {
    expect(planLine({ newCount: 27, known: 3, placed: 0, days: [d('2026-10-18', 12, 22), d('2026-10-19', 12, 22), d('2026-10-20', 3, 17)], readyBy: '2026-10-21', homeworkDue: '2026-10-23', names: [] }))
      .toBe('27 new · 3 he knows (quick check) · 0 to recheck. New words: 12 on Sun, 12 on Mon, 3 on Tue · check 星期三, homework 星期五 · Sun–Mon lessons about 22 min, Tue’s about 17 min.');
  });
  it('today\'s lesson done: the new words start tomorrow, and it says so', () => {
    expect(planLine({ newCount: 24, known: 0, placed: 0, days: [d('2026-10-19', 12, 22), d('2026-10-20', 12, 22)], readyBy: '2026-10-21', homeworkDue: '2026-10-23', names: [], today: 'done' }))
      .toBe('24 new · 0 he knows (quick check) · 0 to recheck. Today’s lesson is done, so the new words start tomorrow. New words: 12 on Mon, 12 on Tue · check 星期三, homework 星期五 · Mon–Tue lessons about 22 min.');
    expect(planLine({ newCount: 5, known: 0, placed: 0, days: [d('2026-10-20', 5, 17)], readyBy: '2026-10-21', homeworkDue: '2026-10-23', names: [], today: 'begun' }))
      .toMatch(/Today’s lesson has begun, so the new words start tomorrow\. New words: 5 on Tue · check 星期三, homework 星期五 · Tue’s lesson about 17 min\.$/);
  });
  it('names the words that won\'t be taught before the check, even at 20 a lesson', () => {
    expect(planLine({ newCount: 22, known: 0, placed: 0, days: [d('2026-10-20', 20, 30)], readyBy: '2026-10-21', homeworkDue: '2026-10-23', names: ['甲', '乙'] }))
      .toBe('22 new · 0 he knows (quick check) · 0 to recheck. New words: 20 on Tue · check 星期三, homework 星期五 · Tue’s lesson about 30 min. 2 new words won’t be taught before 星期三: 甲, 乙. They’ll still be in the check, and come after it.');
  });
  it('no new words, or no lesson day left before the check', () => {
    expect(planLine({ newCount: 0, known: 4, placed: 0, days: [], readyBy: '2026-10-21', homeworkDue: '2026-10-23', names: [] }))
      .toBe('0 new · 4 he knows (quick check) · 0 to recheck. Check 星期三, homework 星期五.');
    expect(planLine({ newCount: 1, known: 0, placed: 0, days: [], readyBy: '2026-10-21', homeworkDue: '2026-10-23', names: ['甲'], today: 'done' }))
      .toBe('1 new · 0 he knows (quick check) · 0 to recheck. Today’s lesson is done, so the new words start tomorrow. No lesson for new words before the check · check 星期三, homework 星期五. 1 new word won’t be taught before 星期三: 甲. They’ll still be in the check, and come after it.');
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
