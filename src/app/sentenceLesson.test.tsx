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
/** 很 has a sentence-bank example (今天很热。); the others don't */
const READ = ['很', '人', '口', '山', '水', '火'];
beforeEach(() => {
  vi.mocked(recordingSupported).mockReturnValue(true);
  vi.mocked(startRecording).mockReset();
  vi.mocked(startRecording).mockResolvedValue({ stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 1 }), cancel: vi.fn() });
});

/** A practice-only lesson, Say cards off: six words he reads, due today, so 练一练 has a 说一句 for 很. */
async function setup() {
  const app = await makeAppData();
  await putWords(app.db, words);
  await putCards(app.db, READ.map((t) => makeCard(`b:${t}`, 'recognise', new Date(2026, 9, 2, 7), true)));
  await updateSettings(app.db, { sayCards: false, activities: { newwords: false, practice: true, writing: false, speaking: false } });
  return app;
}

/** Any tap question's open tiles (a picked or joined tile isn't tapped again). */
const TAPS = '.choice:not([disabled]):not(.is-picked):not(.is-matched), .fishtile:not([disabled]), .bubble-opt:not([disabled]), .whichpart__char:not([disabled])';
/** Answers 练一练's tap questions until the 说一句 card shows. */
async function untilSentence() {
  for (let i = 0; i < 300; i++) {
    await waitFor(() => expect(document.querySelector(`.say-sentence, ${TAPS}, .sheet .btn:not([disabled])`)).toBeTruthy(), { timeout: 4000 });
    if (document.querySelector('.say-sentence')) return;
    const before = document.body.innerHTML;
    const open = document.querySelector<HTMLElement>(TAPS);
    if (open) fireEvent.click(open);
    const next = document.querySelector<HTMLElement>('.sheet .btn:not([disabled])');
    if (next) fireEvent.click(next);
    await waitFor(() => expect(document.body.innerHTML).not.toBe(before), { timeout: 4000 });
  }
  throw new Error('no 说一句 came');
}

describe('说一句 in a lesson (production practice spec §4)', () => {
  it('his take is kept for the parent as a 说一句 take, and his Sentence card is made', async () => {
    const app = await setup();
    renderWithApp(<SessionScreen free={false} />, app);
    await untilSentence();
    fireEvent.click(screen.getByText('开始录音'));
    fireEvent.click(await screen.findByText('停止'));
    fireEvent.click(await screen.findByText('继续', { selector: '.sheet .btn:not([disabled]) *' }));
    await waitFor(async () => expect((await listRecordings(app.db)).map((r) => r.prompt)).toEqual([{ kind: 'sentence', wordId: 'b:很' }]));
    await waitFor(async () => expect((await allCards(app.db)).find((c) => c.id === 'b:很:sentence')).toBeTruthy());
  });
  it('a refused microphone drops it, and 练一练 carries on with taps', async () => {
    vi.mocked(startRecording).mockRejectedValue(new Error('denied'));
    const app = await setup();
    renderWithApp(<SessionScreen free={false} />, app);
    await untilSentence();
    fireEvent.click(screen.getByText('开始录音'));
    await waitFor(async () => {
      const rec = (await getSession(app.db, '2026-10-02'))!;
      expect(rec.practiceQueue!.slice(rec.practiceIndex).some((x) => x.ask === 'sentence')).toBe(false);
    });
    expect(await listRecordings(app.db)).toEqual([]);
    await waitFor(() => expect(document.querySelector('.say-sentence')).toBeNull());
  });
});
