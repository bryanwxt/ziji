import { waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../content';
import { putCards, putWords, updateSettings } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { SessionScreen } from './SessionScreen';

vi.mock('hanzi-writer', () => ({
  default: { create: vi.fn(() => ({ quiz: () => Promise.resolve(), cancelQuiz: vi.fn(), highlightStroke: vi.fn(), updateDimensions: vi.fn() })) },
}));
vi.mock('../audio/speech', () => ({ prefetchWords: vi.fn(), stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));
vi.mock('../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../ui/confetti', () => ({ celebrate: vi.fn() }));

const w = (t: string) => builtinWords(0).find((x) => x.text === t)!;
/** 门 to write (its cue is ＿口), both 门 and 口 read. */
async function lesson(fadePinyin?: boolean) {
  const app = await makeAppData();
  await putWords(app.db, [{ ...w('门'), writeable: true }, { ...w('口'), writeable: false }]);
  await putCards(app.db, [makeCard('b:门', 'recognise', new Date(2026, 9, 20), true), makeCard('b:门', 'write', new Date(2026, 9, 1)), makeCard('b:口', 'recognise', new Date(2026, 9, 20), true)]);
  await updateSettings(app.db, { activities: { newwords: false, practice: false, writing: true, speaking: false }, ...(fadePinyin === undefined ? {} : { fadePinyin }) });
  renderWithApp(<SessionScreen free={false} />, app);
  await waitFor(() => expect(document.querySelector('.write__blank')).toBeTruthy());
  return {
    gap: document.querySelector('.write__blank .label__cell--blank .label__py')!.textContent,
    other: document.querySelector('.write__blank .label__cell--zh .label__py')!.textContent,
  };
}

describe('pinyin fading in a lesson (spec 2026-10-12 §4)', () => {
  it("the writing cue fades a known character but keeps the gap's sound (the setting absent: on)", async () => {
    expect(await lesson()).toEqual({ gap: 'mén', other: '' });
  });
  it('with the switch off every syllable shows', async () => {
    expect(await lesson(false)).toEqual({ gap: 'mén', other: 'kǒu' });
  });
});
