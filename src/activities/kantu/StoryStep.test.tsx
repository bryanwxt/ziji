import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SCENES_KT, STORY_PARTS } from '../../kantu/scenes';
import { DEFAULT_KID } from '../../types';
import { BLOCKED_NOTE } from '../shared/recording';
import { StoryStep } from './StoryStep';

vi.mock('../../audio/recorder', () => ({ recordingSupported: vi.fn(() => true), startRecording: vi.fn() }));
vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));

import { recordingSupported, startRecording } from '../../audio/recorder';
import { speak } from '../../audio/speech';

const vase = SCENES_KT[0]!;

beforeEach(() => {
  vi.mocked(recordingSupported).mockReturnValue(true);
  vi.mocked(startRecording).mockReset();
  vi.mocked(startRecording).mockImplementation(async () => ({ stop: async () => ({ blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 4 }), cancel: vi.fn() }));
  vi.mocked(speak).mockClear();
});

async function recordOnce() {
  fireEvent.click(screen.getByText('开始录音'));
  fireEvent.click(await screen.findByText('停止'));
  await screen.findByText('听松露说');
}

describe('StoryStep', () => {
  it('walks the five parts, the whole story and the questions, then reports every recording once', async () => {
    const onDone = vi.fn();
    render(<StoryStep scene={vase} told={0} kid={DEFAULT_KID} onDone={onDone} />);
    for (const p of STORY_PARTS) {
      expect(screen.getByText(p.question)).toBeTruthy();
      expect(speak).toHaveBeenLastCalledWith(p.question);
      expect(screen.getByText(p.starter)).toBeTruthy();
      await recordOnce();
      fireEvent.click(screen.getByText('听松露说'));
      expect(speak).toHaveBeenLastCalledWith(vase.model[p.part]);
      expect(screen.getByText(vase.model[p.part])).toBeTruthy();
      fireEvent.click(screen.getByText('继续'));
    }
    expect(screen.getByText('看着图，把故事讲一遍')).toBeTruthy();
    await recordOnce();
    fireEvent.click(screen.getByText('继续'));
    for (const [i, q] of vase.questions.entries()) {
      expect(screen.getByText(q.q)).toBeTruthy();
      expect(speak).toHaveBeenLastCalledWith(q.q);
      await recordOnce();
      fireEvent.click(screen.getByText('听松露说'));
      expect(speak).toHaveBeenLastCalledWith(q.answer);
      fireEvent.click(screen.getByText(i === vase.questions.length - 1 ? '完成' : '继续'));
    }
    fireEvent.click(screen.queryByText('完成') ?? document.body); // a double tap
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    const r = onDone.mock.calls[0]![0];
    expect(Object.keys(r.parts).sort()).toEqual(['ending', 'events', 'opening', 'opinion', 'setting']);
    expect(r.whole).not.toBeNull();
    expect(r.answers).toHaveLength(2);
    expect(r.answers.every((a: unknown) => a !== null)).toBe(true);
  });

  it('after 8 stories the starter hides behind 提示', () => {
    render(<StoryStep scene={vase} told={8} kid={DEFAULT_KID} onDone={vi.fn()} />);
    expect(screen.queryByText('图上画的是…')).toBeNull();
    fireEvent.click(screen.getByText('提示'));
    expect(screen.getByText('图上画的是…')).toBeTruthy();
  });

  it('word chips speak their word', () => {
    render(<StoryStep scene={vase} told={0} kid={DEFAULT_KID} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '花瓶' }));
    expect(speak).toHaveBeenLastCalledWith('花瓶');
  });

  it('without a microphone every screen explains, still offers Truffle\'s model, and lets him finish', async () => {
    vi.mocked(recordingSupported).mockReturnValue(false);
    const onDone = vi.fn();
    render(<StoryStep scene={vase} told={0} kid={DEFAULT_KID} onDone={onDone} />);
    for (let i = 0; i < STORY_PARTS.length + 1 + vase.questions.length; i++) {
      expect(screen.getByText(BLOCKED_NOTE)).toBeTruthy();
      expect(screen.getByText('听松露说')).toBeTruthy();
      fireEvent.click(screen.getByText(i === STORY_PARTS.length + vase.questions.length ? '完成' : '继续'));
    }
    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ parts: {}, whole: null, answers: [null, null] }));
  });
  it('the picture stays in view while Truffle asks about it', async () => {
    vi.mocked(recordingSupported).mockReturnValue(false);
    render(<StoryStep scene={vase} told={0} kid={DEFAULT_KID} onDone={vi.fn()} />);
    for (let i = 0; i < STORY_PARTS.length + 1; i++) fireEvent.click(screen.getByText('继续'));
    expect(screen.getByText(vase.questions[0]!.q)).toBeTruthy();
    expect(screen.getByRole('img', { name: '打翻花瓶' })).toBeTruthy();
  });
  it('while 松露问你 asks, Truffle keeps still (sweep: spec §4.3 calm)', () => {
    vi.mocked(recordingSupported).mockReturnValue(false);
    const { container } = render(<StoryStep scene={vase} told={0} kid={DEFAULT_KID} onDone={vi.fn()} />);
    for (let i = 0; i < STORY_PARTS.length + 1; i++) fireEvent.click(screen.getByText('继续'));
    expect(container.querySelector('.kantu__ask .truffle')!.getAttribute('data-calm')).toBe('true');
  });
  it('a refused microphone is remembered for the rest of the story: no tapping 开始录音 on every screen', async () => {
    vi.mocked(startRecording).mockRejectedValue(new Error('denied'));
    render(<StoryStep scene={vase} told={0} kid={DEFAULT_KID} onDone={vi.fn()} />);
    fireEvent.click(screen.getByText('开始录音'));
    await screen.findByText(BLOCKED_NOTE);
    fireEvent.click(screen.getByText('继续'));
    expect(screen.getByText(BLOCKED_NOTE)).toBeTruthy();
    expect(screen.queryByText('开始录音')).toBeNull();
    expect((screen.getByText('继续').closest('button') as HTMLButtonElement).disabled).toBe(false);
    expect(startRecording).toHaveBeenCalledTimes(1);
  });
});
