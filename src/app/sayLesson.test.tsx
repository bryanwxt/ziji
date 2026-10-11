import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../content';
import { allCards, getSession, listRecordings, putCards, putWords, updateSettings } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { SessionScreen } from './SessionScreen';

vi.mock('../audio/speech', () => ({ prefetchWords: vi.fn(), stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));
vi.mock('../audio/recorder', () => ({ recordingSupported: vi.fn(() => true), startRecording: vi.fn() }));
import { recordingSupported, startRecording } from '../audio/recorder';

const words = builtinWords(0);
const READ = ['大', '人', '口', '山', '水', '火'];
beforeEach(() => {
  vi.mocked(recordingSupported).mockReturnValue(true);
  vi.mocked(startRecording).mockReset();
  vi.mocked(startRecording).mockResolvedValue({ stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 1 }), cancel: vi.fn() });
});

/** A practice-only lesson: six words he reads (Read passed), their reading due today, so 练一练 has Say cards. */
async function setup() {
  const app = await makeAppData();
  await putWords(app.db, words);
  await putCards(app.db, READ.map((t) => makeCard(`b:${t}`, 'recognise', new Date(2026, 9, 2, 7), true)));
  await updateSettings(app.db, { activities: { newwords: false, practice: true, writing: false, speaking: false } });
  return app;
}

/** Answers 练一练's tap questions until a Say card shows. */
async function untilSay() {
  for (let i = 0; i < 40; i++) {
    await waitFor(() => expect(document.querySelector('.say, .choice:not([disabled]), .sheet .btn:not([disabled])')).toBeTruthy(), { timeout: 4000 });
    if (document.querySelector('.say')) return;
    const before = document.body.innerHTML;
    const open = document.querySelector<HTMLElement>('.choice:not([disabled])');
    if (open) fireEvent.click(open);
    fireEvent.click(document.querySelector<HTMLElement>('.sheet .btn:not([disabled])')!);
    await waitFor(() => expect(document.body.innerHTML).not.toBe(before), { timeout: 4000 });
  }
  throw new Error('no Say card came');
}

describe('Say cards in a lesson (spec 2026-10-11 §3, §4)', () => {
  it('his take is kept for the parent and his Say card is made', async () => {
    const app = await setup();
    renderWithApp(<SessionScreen free={false} />, app);
    await untilSay();
    const word = document.querySelector('.say [data-q]')!.textContent!;
    fireEvent.click(screen.getByText('开始录音'));
    fireEvent.click(await screen.findByText('停止'));
    fireEvent.click(await screen.findByText('继续', { selector: '.sheet .btn:not([disabled]) *' }));
    await waitFor(async () => expect((await listRecordings(app.db)).map((r) => r.prompt)).toEqual([{ kind: 'say', wordId: `b:${word}` }]));
    await waitFor(async () => expect((await allCards(app.db)).find((c) => c.id === `b:${word}:say`)).toBeTruthy());
    const rec = (await getSession(app.db, '2026-10-02'))!;
    expect(rec.practiceQueue!.filter((x) => x.ask === 'say').length).toBeGreaterThan(0);
  });
  it('a refused microphone drops the rest of the lesson’s Say cards', async () => {
    vi.mocked(startRecording).mockRejectedValue(new Error('denied'));
    const app = await setup();
    renderWithApp(<SessionScreen free={false} />, app);
    await untilSay();
    fireEvent.click(screen.getByText('开始录音'));
    await waitFor(async () => {
      const rec = (await getSession(app.db, '2026-10-02'))!;
      expect(rec.practiceQueue!.slice(rec.practiceIndex).some((x) => x.ask === 'say')).toBe(false);
    });
    expect(await listRecordings(app.db)).toEqual([]);
  });
});
