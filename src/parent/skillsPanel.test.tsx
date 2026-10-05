import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { addAnswer, allCards, getSettings, putCards, putWords, updateSettings } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { SkillsPanel } from './SkillsPanel';

describe('SkillsPanel (spec §19 part 7)', () => {
  it("shows 14-day accuracy per skill, the last placement levels and his missed words, the parent's class baseline, and brings missed words forward", async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    const gen = builtinWords(0).find((w) => w.text === '根')!;
    await putCards(app.db, [makeCard(gen.id, 'write', new Date(2026, 9, 20), true)]);
    await addAnswer(app.db, { at: app.now().getTime() - 1000, wordId: gen.id, skill: 'zibian', correct: false });
    await updateSettings(app.db, { placementResult: { at: app.now().getTime(), reading: 8, understanding: 4, missed: [gen.id] } });
    renderWithApp(<SkillsPanel />, app);
    expect((await screen.findAllByText('Look-alike characters (字辨)')).length).toBe(2); // its row, and its missed words
    expect(screen.getByText(/Reading: P\d term \d \(.{2}\) · Understanding: P\d term \d \(.{2}\)/)).toBeTruthy(); // school terms (MOE order, 2026-10-06)
    expect(screen.getByText('0% (1)')).toBeTruthy();
    const box = screen.getByLabelText('Class baseline for Look-alike characters (字辨) (% right)');
    fireEvent.input(box, { target: { value: '5' } }); // still typing: nothing saved yet
    await new Promise((r) => setTimeout(r, 30));
    expect((await getSettings(app.db)).baselines?.zibian).toBeUndefined();
    fireEvent.change(box, { target: { value: '53' } }); // done typing
    await waitFor(async () => expect((await getSettings(app.db)).baselines?.zibian).toBe(53));
    fireEvent.click(screen.getByRole('button', { name: 'Practise 根 more (Look-alike characters (字辨))' }));
    await waitFor(async () => expect((await allCards(app.db))[0]!.fsrs.due.getTime()).toBeLessThanOrEqual(app.now().getTime()));
  });
  it('sweep: a baseline typed and left (a tab tapped, no change event on iPad Safari) is still saved', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    const { unmount } = renderWithApp(<SkillsPanel />, app);
    const box = await screen.findByLabelText('Class baseline for Look-alike characters (字辨) (% right)');
    fireEvent.input(box, { target: { value: '61' } });
    await waitFor(async () => expect((await getSettings(app.db)).baselines?.zibian).toBe(61), { timeout: 3000 }); // after a pause in typing
    fireEvent.input(screen.getByLabelText('Class baseline for Reading (认一认) (% right)'), { target: { value: '70' } });
    unmount(); // he leaves straight away
    await waitFor(async () => expect((await getSettings(app.db)).baselines).toMatchObject({ zibian: 61, reading: 70 }));
  });
  it('before any placement or practice it says so', async () => {
    const app = await makeAppData();
    renderWithApp(<SkillsPanel />, app);
    expect(await screen.findByText(/Placement: not done yet/)).toBeTruthy();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});

describe('pacing in the Skills panel', () => {
  it("shows today's number of new words and why (spec 2026-10-05 §2.2)", async () => {
    const app = await makeAppData();
    await updateSettings(app.db, { newPerDay: 8, pace: { day: '2026-10-06', perDay: 5, reason: 'kept 9 of 10 recent new words' } });
    renderWithApp(<SkillsPanel />, app);
    expect(await screen.findByText('New words: 5 a day — kept 9 of 10 recent new words (most 8)')).toBeTruthy();
  });
});
