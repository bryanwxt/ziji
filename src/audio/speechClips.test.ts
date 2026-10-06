import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClipStep } from './clips';
import { setClipIndex } from './clips';
import type { ClipPlayer, PlayResult } from './clipPlayer';
import { prefetchWords, setClipPlayer, speak, stopSpeaking } from './speech';
import { onSpeaking, settleIfSilent } from './speaking';

type Call = { steps: ClipStep[]; resolve: (r: PlayResult) => void; onStart?: () => void };
let calls: Call[];
let player: { play: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; prefetch: ReturnType<typeof vi.fn> };
let spoken: string[];
const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  calls = [];
  player = {
    play: vi.fn((steps: ClipStep[], onStart?: () => void) => new Promise<PlayResult>((resolve) => calls.push({ steps, resolve, onStart }))),
    stop: vi.fn(() => { for (const c of calls) c.resolve('stopped'); }),
    prefetch: vi.fn(),
  };
  setClipPlayer(player as unknown as ClipPlayer);
  setClipIndex({ v: 1, voice: 't', clips: { 门: 'm', 大门: 'd', '调|tiáo': 't' } });
  spoken = [];
  vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: (u: { text: string }) => spoken.push(u.text), getVoices: () => [], speaking: false, pending: false });
  vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; lang = ''; rate = 1; voice = null; onstart: (() => void) | null = null; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(t: string) { this.text = t; } });
});
afterEach(() => { stopSpeaking(); setClipIndex(null); vi.unstubAllGlobals(); });

describe('speak, with clips', () => {
  it('a line with a clip plays the clip, not the iPad voice', () => {
    speak('调', { reading: 'tiáo' });
    expect(calls[0]!.steps).toEqual([{ id: 't' }]);
    expect(spoken).toEqual([]);
  });
  it('a clip that fails: the iPad voice says the whole line', async () => {
    speak('调', { reading: 'tiáo' });
    calls[0]!.resolve('failed');
    await tick();
    expect(spoken).toEqual(['条']); // the iPad voice's own 多音字 stand-in (spokenAs)
  });
  it('queued lines wait their turn behind a clip, in order', async () => {
    speak('门');
    speak('大门', { queue: true });
    expect(calls).toHaveLength(1);
    calls[0]!.resolve('ended');
    await tick();
    expect(calls[1]!.steps).toEqual([{ id: 'd' }]);
  });
  it('a queued line with no clip goes to the iPad voice after the clip', async () => {
    speak('门');
    speak('小门', { queue: true });
    expect(spoken).toEqual([]);
    calls[0]!.resolve('ended');
    await tick();
    expect(spoken).toEqual(['小门']);
  });
  it('stopSpeaking stops the clip and drops what was queued', async () => {
    speak('门');
    speak('大门', { queue: true });
    stopSpeaking();
    expect(player.stop).toHaveBeenCalled();
    await tick();
    expect(calls).toHaveLength(1);
  });
  it("Truffle's mouth stays open while a clip plays, though the iPad voice is idle", () => {
    const states: boolean[] = [];
    const off = onSpeaking((on) => states.push(on));
    speak('门');
    calls[0]!.onStart!();
    settleIfSilent();
    expect(states).toEqual([true]);
    off();
  });
  it('prefetchWords fetches the clips of the words and their 组词', () => {
    prefetchWords([{ text: '调', pinyin: 'tiáo', examples: [{ text: '大门' }, { text: '没有' }] }]);
    expect(player.prefetch).toHaveBeenCalledWith(['t', 'd']);
  });
});

describe('speak, clips and the iPad voice mixed (final review)', () => {
  it('a tap on a line with no clip stops the clip playing and drops what was queued behind it (C1)', async () => {
    const utterances: { text: string; onend: (() => void) | null }[] = [];
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: (u: { text: string; onend: (() => void) | null }) => utterances.push(u), getVoices: () => [], speaking: false, pending: false });
    speak('门');
    speak('大门', { queue: true });
    player.stop.mockClear();
    speak('小猫'); // no clip: the iPad voice
    expect(player.stop).toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 200)); // the iPad voice waits a moment after a cancel
    expect(utterances.map((u) => u.text)).toEqual(['小猫']);
    utterances[0]!.onend!();
    await tick();
    expect(calls).toHaveLength(1); // 大门 is never said
  });
  it('a cancelled iPad-voice line ending late does not close Truffle\'s mouth during a clip (I1)', () => {
    const utterances: { text: string; onend: (() => void) | null }[] = [];
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: (u: { text: string; onend: (() => void) | null }) => utterances.push(u), getVoices: () => [], speaking: false, pending: false });
    const states: boolean[] = [];
    const off = onSpeaking((on) => states.push(on));
    speak('小猫'); // the iPad voice
    speak('门'); // a clip: cancels it
    calls[0]!.onStart!();
    utterances[0]!.onend!(); // Safari reports the cancelled line's end, late
    expect(states[states.length - 1]).toBe(true);
    off();
  });
});
