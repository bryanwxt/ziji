import { act, fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { BUILTIN, builtinWords } from '../content';
import { createSessionRecord } from '../session/runner';
import { getKid, putCards, putWords, saveKid, saveReward, saveSession } from '../store/repo';
import { makeCard, makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID, type SessionPlan } from '../types';
import { HomeScreen } from './HomeScreen';
import { CollectionScreen } from './CollectionScreen';
import { powerFamilies } from '../fun/powers';
import { Wardrobe } from './Wardrobe';
import { WORLD_LINES } from '../fun/worlds';

vi.mock('../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));

const emptyPlan: SessionPlan = { steps: [], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 };
const done = (date: string, steps: SessionPlan['steps']) => ({ ...createSessionRecord(emptyPlan, date, 0), completed: true, completedSteps: steps });

describe('HomeScreen', () => {
  it('Truffle stands on the ground beside the path, not inside it (he never moves with the list)', async () => {
    const app = await makeAppData();
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(document.querySelector('.home > .home__pet .pet')).toBeTruthy();
    expect(document.querySelector('.path .pet')).toBeNull();
    fireEvent.click(document.querySelector('.home__pet [data-part="headpos"]')!); // a tap on him plays (spec §4.5), it does not leave Home
    expect(app.go).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '松露' })); // his room is one tap away on the tab bar
    expect(app.go).toHaveBeenCalledWith({ name: 'wardrobe' });
  });
  it('the path zigzags left and right; the cards sit above it', async () => {
    const app = await makeAppData();
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    const rows = [...document.querySelectorAll<HTMLElement>('.path__row')];
    expect(rows.map((r) => r.style.getPropertyValue('--side'))).toEqual(rows.map((_, i) => (i % 2 === 0 ? '-1' : '1')));
    expect(document.querySelector('.home__main > .home__path .path')).toBeTruthy();
    expect(document.querySelector('.home__main > .home__cards')).toBeTruthy();
  });
  it("shows streak and stars and starts today's path", async () => {
    const app = await makeAppData();
    await saveSession(app.db, done('2026-10-01', ['flashcards', 'writing']));
    renderWithApp(<HomeScreen />, app);
    expect(await screen.findByLabelText('连续 1 天')).toBeTruthy();
    expect(screen.getByLabelText('2 颗星')).toBeTruthy();
    expect([...document.querySelectorAll('.home__week .seal > span')].map((s) => s.textContent)).toEqual(['字', '己']);
    fireEvent.click(screen.getByRole('button', { name: '开始：认新字' }));
    expect(app.go).toHaveBeenCalledWith({ name: 'session', free: false });
  });

  it('offers free play once today is done and shows the next reward goal', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, lastChestDate: '2026-10-02' } });
    await saveSession(app.db, done('2026-10-02', ['flashcards']));
    await putCards(app.db, [makeCard('b:大', 'recognise', new Date(2026, 9, 5))]);
    await saveReward(app.db, { id: 'g', title: 'Ice cream', emoji: '🍦', metric: 'stars', target: 10, createdAt: 0, claimedAt: null });
    renderWithApp(<HomeScreen />, app);
    expect(await screen.findByText('今天完成了！')).toBeTruthy();
    expect(screen.queryByText('Ice cream')).toBeNull(); // the parent's own note: Home shows Chinese only (phase D)
    expect(document.querySelector('.goal')?.textContent).toContain('我的奖励');
    expect(document.querySelector('.goal .goal__count')?.textContent?.trim()).toBe('1 / 10');
    expect(document.querySelector('.goal .goal__count svg.inkicon')).toBeTruthy();
    fireEvent.click(screen.getByText('再玩一会儿'));
    expect(app.go).toHaveBeenCalledWith({ name: 'session', free: true });
  });
  it('marks Home as done for today (a phone then leaves out the all-ticked path); not before', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, lastChestDate: '2026-10-02' } });
    await saveSession(app.db, done('2026-10-02', ['flashcards']));
    const a = renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天完成了！');
    expect(document.querySelector('.screen.home')!.classList.contains('home--done')).toBe(true);
    a.unmount();
    renderWithApp(<HomeScreen />, await makeAppData());
    await screen.findByText('今天的练习');
    expect(document.querySelector('.screen.home')!.classList.contains('home--done')).toBe(false);
  });

  it('reopens the session to claim an unopened chest', async () => {
    const app = await makeAppData();
    await saveSession(app.db, done('2026-10-02', ['flashcards']));
    renderWithApp(<HomeScreen />, app);
    fireEvent.click(await screen.findByRole('button', { name: '继续：宝箱' }));
    expect(app.go).toHaveBeenCalledWith({ name: 'session', free: false });
  });
});

describe('Wardrobe', () => {
  it('an owned costume shows a small Truffle wearing it; a locked one shows the lock', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, ownedCostumes: ['tiger'] } });
    renderWithApp(<Wardrobe />, app);
    const tiger = await screen.findByRole('button', { name: '虎' });
    expect(tiger.querySelector('svg.truffle')?.getAttribute('data-outfit')).toBe('tiger');
    expect(screen.getByRole('button', { name: '牛' }).querySelector('svg.truffle')).toBeNull();
  });
  it('accessories he has not won yet are locked', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, ownedAccessories: ['scarf'] } });
    renderWithApp(<Wardrobe />, app);
    expect(((await screen.findByRole('button', { name: '围巾' })) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: '墨镜' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('accessory names use their own pinyin (星星 is xīng xing)', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, ownedAccessories: ['starglasses'] } });
    renderWithApp(<Wardrobe />, app);
    await waitFor(() => expect([...document.querySelectorAll('.outfit__name .label')].some((l) => l.getAttribute('data-py') === 'xīng xing yǎn jìng')).toBe(true));
  });
  it('room tabs: each controls its panel, and the arrow keys move between them', async () => {
    const app = await makeAppData();
    renderWithApp(<Wardrobe />, app);
    const tabs = await screen.findAllByRole('tab');
    const panel = screen.getByRole('tabpanel');
    expect(tabs[0]!.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(tabs[0]!.id);
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowRight' });
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[1]);
    fireEvent.keyDown(tabs[1]!, { key: 'ArrowLeft' });
    fireEvent.keyDown(tabs[0]!, { key: 'ArrowLeft' }); // wraps round to the last
    expect(tabs[2]!.getAttribute('aria-selected')).toBe('true');
  });
  it('a power row says its level, and when a new level is waiting', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, powerTiersSeen: { water: 1 } } });
    renderWithApp(<Wardrobe />, app);
    fireEvent.click(await screen.findByRole('tab', { name: '能力' }));
    await waitFor(() => expect(document.querySelector('.power-row')?.getAttribute('aria-label')).toMatch(/1级/));
    const locked = [...document.querySelectorAll('.power-row')].find((r) => (r as HTMLButtonElement).disabled)!;
    expect(locked.getAttribute('aria-label')).toMatch(/还没解锁/);
  });
  it('puts on an owned accessory', async () => {
    const kid = { ...DEFAULT_KID, ownedAccessories: ['moustache', 'medal'] };
    const app = await makeAppData({ kid });
    await saveKid(app.db, kid);
    renderWithApp(<Wardrobe />, app);
    fireEvent.click(await screen.findByRole('button', { name: '金牌' }));
    await waitFor(async () => expect((await getKid(app.db))?.wearing).toBe('medal'));
  });
});

describe('CollectionScreen', () => {
  it('counts caught cards and filters by power', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    await putCards(app.db, [makeCard('b:河', 'recognise', new Date(2026, 9, 20), true)]);
    renderWithApp(<CollectionScreen />, app);
    const he = BUILTIN.find((c) => c.char === '河')!.level;
    expect(await screen.findByText(`1 / ${BUILTIN.filter((c) => c.level <= Math.max(2, he + 1)).length}`)).toBeTruthy(); // the levels he's working in
    fireEvent.click(screen.getByRole('button', { name: /水/ }));
    expect(screen.getByRole('button', { name: '河' })).toBeTruthy();
    expect(document.querySelectorAll('.zika:not(.card--back)')).toHaveLength(1);
  });
  it('face-down cards are not hundreds of disabled buttons: one line says how many are left, and a tap wiggles the card', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    await putCards(app.db, [makeCard('b:河', 'recognise', new Date(2026, 9, 20), true)]);
    renderWithApp(<CollectionScreen />, app);
    await screen.findByRole('button', { name: '河' });
    expect(screen.queryAllByRole('button', { name: '未收集' })).toHaveLength(0);
    const backs = document.querySelectorAll('.zika.card--back');
    expect(backs.length).toBeGreaterThan(10);
    expect(backs[0]!.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText(`还有 ${backs.length} 张没收集`)).toBeTruthy();
    fireEvent.click(backs[0]!);
    expect(backs[0]!.classList.contains('is-nudged')).toBe(true);
  });
  it('the card dialog is modal: focus goes to 关闭, Escape closes it, and focus returns to the card', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    await putCards(app.db, [makeCard('b:河', 'recognise', new Date(2026, 9, 20), true)]);
    renderWithApp(<CollectionScreen />, app);
    const card = await screen.findByRole('button', { name: '河' });
    card.focus();
    fireEvent.click(card);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    await waitFor(() => expect(document.activeElement?.getAttribute('aria-label')).toBe('关闭'));
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(card));
  });
  it('金卡 shows only cards he can read and write; none yet shows none', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    await putCards(app.db, [makeCard('b:河', 'recognise', new Date(2026, 9, 20), true)]);
    renderWithApp(<CollectionScreen />, app);
    await screen.findByRole('button', { name: '河' });
    fireEvent.click(screen.getByText(/金卡/));
    expect(document.querySelectorAll('.zika-grid .zika')).toHaveLength(0);
  });
  it('a child who knows nothing yet sees 0 caught and no crash', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    renderWithApp(<CollectionScreen />, app);
    expect(await screen.findByText(/^0 \/ /)).toBeTruthy();
  });
  it('puts the 金卡 filter right after 全部 so it is on screen', async () => {
    const app = await makeAppData();
    renderWithApp(<CollectionScreen />, app);
    await screen.findByText('全部');
    const chips = [...document.querySelectorAll('.filters button')].map((b) => b.textContent);
    expect(chips[1]).toContain('金卡');
  });
  it('keeps earned badges', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, badgesSeen: ['氵'] } });
    renderWithApp(<CollectionScreen />, app);
    await waitFor(() => expect(document.querySelector('.badge')?.textContent).toContain('氵'));
    expect(document.querySelector('.badge svg.inkicon')).toBeTruthy();
  });
});

describe('Wardrobe', () => {
  it('shows Truffle wearing what the child already earned (dragon-era data)', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, ownedAccessories: ['medal'], wearing: 'medal', lastStageSeen: 3 } });
    renderWithApp(<Wardrobe />, app);
    expect(document.querySelector('svg.truffle .truffle__accessory')).toBeTruthy();
  });
});

describe("Truffle's room powers", () => {
  it('choose a power the child has unlocked', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, powerTiersSeen: { water: 1 } } });
    renderWithApp(<Wardrobe />, app);
    fireEvent.click(screen.getByRole('tab', { name: '能力' }));
    const rows = await screen.findAllByRole('button', { name: /\d+\/\d+/ });
    expect(rows).toHaveLength(11);
    const fire = rows.find((r) => r.getAttribute('aria-label')!.startsWith('火'))!;
    expect((fire as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(rows.find((r) => r.getAttribute('aria-label')!.startsWith('水'))!);
    await waitFor(async () => expect((await getKid(app.db))?.activePower).toBe('water'));
    expect(document.querySelector('svg.truffle')?.getAttribute('data-power')).toBe('water');
  });
});

describe("Truffle's room ready-to-unlock hint", () => {
  it('marks a power the child has earned but not yet unlocked at a celebration', async () => {
    const app = await makeAppData();
    const water = powerFamilies(BUILTIN).water.slice(0, 3);
    await putWords(app.db, builtinWords(0));
    await putCards(app.db, water.map((c) => makeCard(`b:${c}`, 'recognise', new Date(2026, 9, 20), true)));
    renderWithApp(<Wardrobe />, app);
    fireEvent.click(screen.getByRole('tab', { name: '能力' }));
    await waitFor(() => expect(document.querySelectorAll('.power-row__ready')).toHaveLength(1));
    expect(screen.getByText('完成练习就解锁')).toBeTruthy();
  });
});

describe("Truffle's room outfits", () => {
  it('wear a onesie, take it off; locked ones are disabled', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, ownedCostumes: ['tiger'], ownedAccessories: ['medal'], wearing: 'medal' } });
    renderWithApp(<Wardrobe />, app);
    fireEvent.click(screen.getByRole('button', { name: '虎' }));
    await waitFor(async () => expect((await getKid(app.db))?.outfit).toBe('tiger'));
    expect(document.querySelector('svg.truffle')?.getAttribute('data-outfit')).toBe('tiger');
    expect(document.querySelector('.truffle__accessory')).toBeTruthy(); // accessories go with any costume
    fireEvent.click(screen.getByRole('button', { name: '虎' }));
    await waitFor(async () => expect((await getKid(app.db))?.outfit).toBeNull());
    expect((screen.getByRole('button', { name: '龙' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("Truffle's room outfit details", () => {
  it('shows pinyin on costume and accessory names and toggles accessories', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, ownedCostumes: ['tiger'], outfit: 'tiger', ownedAccessories: ['medal'], wearing: null } });
    renderWithApp(<Wardrobe />, app);
    expect(screen.getByRole('button', { name: '虎' }).querySelector('.label')?.getAttribute('data-py')).toBe('hǔ');
    const crown = screen.getByRole('button', { name: '金牌' });
    expect(crown.querySelector('.label')?.getAttribute('data-py')).toBe('jīn pái');
    fireEvent.click(crown);
    await waitFor(async () => expect((await getKid(app.db))?.wearing).toBe('medal'));
    expect(crown.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(crown);
    await waitFor(async () => expect((await getKid(app.db))?.wearing).toBeNull());
  });
});

describe("Truffle's room accessory tiles", () => {
  it('shows each accessory as its own ink drawing, grouped by slot', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, ownedAccessories: ['wand'] } });
    renderWithApp(<Wardrobe />, app);
    const wand = screen.getByRole('button', { name: '魔法棒' });
    expect(wand.querySelector('svg.acc-thumb')).toBeTruthy();
    expect(wand.closest('section')?.querySelector('h2')?.textContent).toContain('手里');
    expect(screen.getByRole('button', { name: '不戴' }).closest('section')?.querySelector('h2')).toBeNull(); // one accessory at a time, not one per slot
  });
});

describe('HomeScreen word of the day', () => {
  it('shows a known character as the word of the day', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    await putCards(app.db, [makeCard('b:大', 'recognise', new Date(2026, 9, 20), true)]);
    renderWithApp(<HomeScreen />, app);
    expect(await screen.findByRole('button', { name: '今日一字：大' })).toBeTruthy();
  });
});

describe('HomeScreen Truffle', () => {
  it('shows Truffle sulking before practice, named 松露', async () => {
    const app = await makeAppData();
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(document.querySelector('svg.truffle')?.getAttribute('data-mood')).toBe('sulk');
    expect(document.querySelector('.home__who')?.textContent).toContain('松露');
    // name and count are both pinyin labels, so their two rows line up in the corner
    expect([...document.querySelectorAll('.home__who .label')].map((l) => l.getAttribute('data-py'))).toEqual(['sōng lù', expect.stringMatching(/^rèn shi \d+ gè zì$/)]);
  });
  it('dozes off when left alone and wakes on a tap', async () => {
    const app = await makeAppData();
    renderWithApp(<HomeScreen sleepAfterMs={150} />, app);
    await screen.findByText('今天的练习');
    const mood = () => document.querySelector('svg.truffle')!.getAttribute('data-mood');
    await waitFor(() => expect(mood()).toBe('sleepy'));
    act(() => { window.dispatchEvent(new Event('pointerdown')); });
    await waitFor(() => expect(mood()).toBe('sulk'));
  });
});

/** n built-in words, all known (recognise cards in review). */
async function seedKnown(app: Awaited<ReturnType<typeof makeAppData>>, n: number) {
  const words = builtinWords(0).slice(0, n);
  await putWords(app.db, words);
  await putCards(app.db, words.map((w) => makeCard(w.id, 'recognise', new Date(2030, 0, 1), true)));
}

describe('HomeScreen journey', () => {
  it('draws the newest reached world and Truffle says a line from it', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, worldsSeen: ['yard', 'grass'] } });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(document.querySelector('.world-scene')?.getAttribute('data-world')).toBe('grass');
    expect(WORLD_LINES.grass).toContain(document.querySelector('.pet__bubble .sr-only')?.textContent); // every line is several characters, so the label carries one readable copy
  });
  it('an existing install at 61 known announces 赛车山 once and remembers it', async () => {
    const app = await makeAppData();
    await seedKnown(app, 61);
    const first = renderWithApp(<HomeScreen />, app);
    const card = await screen.findByRole('dialog', { name: '新地方' });
    expect(card.textContent).toContain('到赛车山了！');
    expect((await getKid(app.db))?.worldsSeen).toEqual(['yard', 'grass', 'race']);
    fireEvent.click(screen.getByText('走吧！'));
    expect(screen.queryByRole('dialog', { name: '新地方' })).toBeNull();
    first.unmount();
    renderWithApp(<HomeScreen />, { ...app, kid: await getKid(app.db) });
    await screen.findByText('今天的练习');
    expect(screen.queryByRole('dialog', { name: '新地方' })).toBeNull();
  });
  it('the journey save builds on the stored kid, not a stale copy (deferred minor, plan 6)', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, bonusStars: 0 } }); // the context's copy is older
    await saveKid(app.db, { ...DEFAULT_KID, bonusStars: 7, ownedCostumes: ['tiger'] }); // what's stored now
    await seedKnown(app, 61);
    renderWithApp(<HomeScreen />, app);
    await screen.findByRole('dialog', { name: '新地方' });
    const kid = (await getKid(app.db))!;
    expect([kid.bonusStars, kid.ownedCostumes, kid.worldsSeen]).toEqual([7, ['tiger'], ['yard', 'grass', 'race']]);
  });
  it('a lapse keeps the reached world', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, worldsSeen: ['yard', 'grass', 'race'] } });
    await seedKnown(app, 40);
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(document.querySelector('.world-scene')?.getAttribute('data-world')).toBe('race');
    expect(screen.queryByRole('dialog', { name: '新地方' })).toBeNull();
  });
});

/** Only 他, known, with the example word 他们 — so the word of the day is 他. */
async function seedKnownWithExample(app: Awaited<ReturnType<typeof makeAppData>>) {
  await putWords(app.db, [makeWord('他', { pinyin: 'tā', meaning: 'he', examples: [{ text: '他们', pinyin: 'tā men' }] })]);
  await putCards(app.db, [makeCard('b:他', 'recognise', new Date(2030, 0, 1), true)]);
}

describe('HomeScreen week and word of the day', () => {
  it('shows this week with the seal, and an example word under the word of the day', async () => {
    const app = await makeAppData();
    await seedKnownWithExample(app); // 他 known, with example 他们 tā men
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(document.querySelectorAll('.week__day')).toHaveLength(7);
    expect(document.querySelector('.seal')?.textContent).toBe('字己');
    expect(document.querySelector('.wotd__example .label')?.getAttribute('data-py')).toBe('tā men');
  });
});

describe("Truffle's room places", () => {
  it('lists all eight worlds, picks a reached one, and shows how far the locked ones are', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, worldsSeen: ['yard', 'grass', 'race'] } });
    renderWithApp(<Wardrobe />, app);
    fireEvent.click(await screen.findByRole('tab', { name: '地方' }));
    const places = [...document.querySelectorAll('button.place')];
    expect(places).toHaveLength(8);
    expect(places.filter((p) => (p as HTMLButtonElement).disabled)).toHaveLength(5);
    expect(places[2]!.getAttribute('aria-pressed')).toBe('true'); // newest by default
    expect(places[3]!.textContent).toContain('100');
    fireEvent.click(places[1]!);
    await waitFor(async () => expect((await getKid(app.db))?.world).toBe('grass'));
    expect(places[1]!.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('HomeScreen word of the day reading', () => {
  it('shows the content reading, so it matches the example word (长 zhǎng, 长大)', async () => {
    const app = await makeAppData();
    await putWords(app.db, [makeWord('长', { pinyin: 'zhǎng', examples: [{ text: '长大', pinyin: 'zhǎng dà' }] })]);
    await putCards(app.db, [makeCard('b:长', 'recognise', new Date(2030, 0, 1), true)]);
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    expect(document.querySelector('.wotd__py')?.textContent).toBe('zhǎng');
    expect(document.querySelector('.wotd__example .label')?.getAttribute('data-py')).toBe('zhǎng dà');
  });
});

describe('HomeScreen world tap fun', () => {
  it("Truffle plays with his props: tapping his bowl, he munches, looking toward it, and says so (spec 2026-10-04 §4.5)", async () => {
    const app = await makeAppData();
    await saveKid(app.db, app.kid!);
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    fireEvent.click(document.querySelector('.world-props [aria-label="小碗"]')!);
    await waitFor(() => expect(document.querySelector('.pet__bubble .sr-only')?.textContent).toBe('好吃！'));
    expect(document.querySelector('.home .truffle')?.getAttribute('data-expression')).toBe('content');
    expect(document.querySelector('.home [data-part="headrot"]')?.getAttribute('transform')).toMatch(/^rotate\(-/); // the bowl is on his left
  });
  it('tapping the box in the tall grass finds an animal, saves it, and Truffle says so', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, worldsSeen: ['yard', 'grass'] } });
    await saveKid(app.db, app.kid!);
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    fireEvent.click(document.querySelector('.world-props [aria-label="纸箱"]')!);
    await waitFor(async () => expect((await getKid(app.db))?.finds.animals).toEqual(['rat']));
    expect(document.querySelector('.pet__bubble .sr-only')?.textContent).toBe('找到了！');
  });
});

describe('找到的动物 and the gem jar', () => {
  it('字卡 has an animals page: found ones named, the rest unknown', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, finds: { ...DEFAULT_KID.finds, animals: ['rat', 'ox'] } } });
    renderWithApp(<CollectionScreen />, app);
    fireEvent.click(await screen.findByRole('button', { name: '找到的动物' }));
    const slots = [...document.querySelectorAll('.animal-slot')];
    expect(slots).toHaveLength(12);
    expect(slots.filter((s) => s.classList.contains('is-found')).map((s) => s.querySelector('.label__ch')?.textContent)).toEqual(['鼠', '牛']);
    expect(slots.filter((s) => !s.classList.contains('is-found')).every((s) => s.textContent?.includes('？'))).toBe(true);
  });
  it('字卡 and 松露的房间 scroll inside a panel; the bar, filters and tabs stay put', async () => {
    const app = await makeAppData();
    const { unmount } = renderWithApp(<CollectionScreen />, app);
    await screen.findByRole('group', { name: '筛选' });
    expect(document.querySelector('.screen > .scroll-panel .zika-grid')).toBeTruthy();
    expect(document.querySelector('.scroll-panel .filters')).toBeNull();
    unmount();
    renderWithApp(<Wardrobe />, app);
    for (const name of ['服装', '能力', '地方']) {
      fireEvent.click(await screen.findByRole('tab', { name }));
      expect(document.querySelector('[role="tabpanel"]')!.classList.contains('scroll-panel')).toBe(true);
    }
    expect(document.querySelector('.scroll-panel .room__tabs, .scroll-panel .pet')).toBeNull();
  });
  it("Truffle's room shows his gems in a jar", async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, finds: { ...DEFAULT_KID.finds, gems: 3 } } });
    renderWithApp(<Wardrobe />, app);
    fireEvent.click(await screen.findByRole('tab', { name: '地方' }));
    expect(screen.getByText('3 颗宝石')).toBeTruthy();
    expect(document.querySelectorAll('.gem-jar .gem')).toHaveLength(3);
  });
  it('a full jar keeps every gem below the rim', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, finds: { ...DEFAULT_KID.finds, gems: 30 } } });
    renderWithApp(<Wardrobe />, app);
    fireEvent.click(await screen.findByRole('tab', { name: '地方' }));
    expect(screen.getByText('30 颗宝石')).toBeTruthy();
    const ys = [...document.querySelectorAll('.gem-jar .gem')].map((g) => Number(/translate\([-\d.]+ ([-\d.]+)\)/.exec(g.getAttribute('transform')!)![1]));
    expect(ys.length).toBeGreaterThan(0);
    expect(Math.min(...ys) - 7).toBeGreaterThan(-38); // a gem is about 14 tall at this scale; the rim's lower edge is y -38
  });
});

describe('Home on the stage (spec 2026-10-04 §3, phase D)', () => {
  it('one top strip holds the streak, stars, week, seal and his name', async () => {
    const app = await makeAppData();
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    const strips = document.querySelectorAll('.home__strip');
    expect(strips).toHaveLength(1);
    for (const sel of ['.stat--fire', '.stat--star', '.week', '.seal', '.home__who']) expect(strips[0]!.querySelector(sel), sel).toBeTruthy();
  });
});

describe('the reward goal on Home (spec 2026-10-04 §3, phase D)', () => {
  const emojiRe = /\p{Extended_Pictographic}/u;
  it('shows its Chinese title and ink icon, never the English or the emoji', async () => {
    const app = await makeAppData();
    await saveReward(app.db, { id: 'g', title: 'Lego set', emoji: '🧱', zh: '乐高', icon: 'car', metric: 'stars', target: 40, createdAt: 0, claimedAt: null });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    const goal = document.querySelector('.goal')!;
    expect(goal.textContent).toContain('乐高');
    expect(goal.textContent).not.toContain('Lego');
    expect(emojiRe.test(goal.textContent ?? '')).toBe(false);
    expect(goal.querySelector('svg.inkicon')).toBeTruthy();
  });
  it('a reached goal tells him to ask for it, in Chinese', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, bonusStars: 5 } });
    await saveKid(app.db, app.kid!);
    await saveReward(app.db, { id: 'g', title: 'Lego set', emoji: '🧱', zh: '乐高', icon: 'gift', metric: 'stars', target: 1, createdAt: 0, claimedAt: null });
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    const goal = document.querySelector('.goal--reached')!;
    expect(goal.textContent).toContain('你做到了！');
    expect(goal.textContent).toContain('找爸爸妈妈拿奖励吧！');
    expect(goal.textContent).not.toMatch(/Ask|parent|Lego/);
    expect(emojiRe.test(goal.textContent ?? '')).toBe(false);
  });
});

describe("today's stops on the world's path (phase D)", () => {
  it('a path in the world’s colours runs under the stops, decorative only', async () => {
    const app = await makeAppData({ kid: { ...DEFAULT_KID, worldsSeen: ['yard', 'grass'] } });
    await saveKid(app.db, app.kid!);
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    const trail = document.querySelector('.home__path .trail')!;
    expect(trail.getAttribute('data-world')).toBe('grass');
    expect(trail.getAttribute('aria-hidden')).toBe('true');
  });
});

describe("Truffle's memory (spec 2026-10-04 §4.6, phase E)", () => {
  const bubble = () => document.querySelector('.home .pet__bubble .sr-only')?.textContent ?? '';
  const react = () => document.querySelector('.home svg.truffle')?.getAttribute('data-react');
  it('after days away he sulks a little, once that day', async () => {
    const app = await makeAppData();
    await saveKid(app.db, app.kid!);
    await saveSession(app.db, done('2026-09-28', ['flashcards']));
    const first = renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    await waitFor(() => expect(bubble()).toBe('你去哪儿了？'));
    await waitFor(() => expect(react()).toBe('huff'));
    await waitFor(async () => expect((await getKid(app.db))?.greetedOn).toBe('2026-10-02'));
    first.unmount();
    renderWithApp(<HomeScreen />, { ...app, kid: (await getKid(app.db))! });
    await screen.findByText('今天的练习');
    await new Promise((r) => setTimeout(r, 200));
    expect(bubble()).not.toBe('你去哪儿了？');
  });
  it('on a streak day he is extra bouncy', async () => {
    const app = await makeAppData();
    await saveKid(app.db, app.kid!);
    await saveSession(app.db, done('2026-10-01', ['flashcards']));
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    await waitFor(() => expect(bubble()).toBe('又见面了！'));
    await waitFor(() => expect(react()).toBe('bouncy'));
  });
  it('a new child gets neither', async () => {
    const app = await makeAppData();
    await saveKid(app.db, app.kid!);
    renderWithApp(<HomeScreen />, app);
    await screen.findByText('今天的练习');
    await new Promise((r) => setTimeout(r, 200));
    expect(['huff', 'bouncy']).not.toContain(react());
  });
});

