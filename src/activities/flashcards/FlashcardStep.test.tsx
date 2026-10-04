import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../../content';
import { createEmptyCard, State } from 'ts-fsrs';
import { DEFAULT_KID } from '../../types';
import { FlashcardStep } from './FlashcardStep';
import { makeWord } from '../../test/fixtures';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => false }));
import { burst, flyAlong } from '../../ui/motion';
import { speak } from '../../audio/speech';

const pool = builtinWords(0);
const he = pool.find((w) => w.text === '河')!;
const base = { word: he, pool, kid: DEFAULT_KID, resting: 'sulk' as const, combo: 0, closeupReady: false };
const review = { wordId: he.id, isNew: false, retry: false };

describe('FlashcardStep', () => {
  it('introduces a new word before quizzing it', () => {
    render(<FlashcardStep {...base} item={{ ...review, isNew: true }} voice={false} onDone={vi.fn()} />);
    fireEvent.click(screen.getByText('我记住了！'));
    expect(document.querySelectorAll('.choice')).toHaveLength(4);
  });

  it('read mode: a correct pinyin answer reports correct with timings', () => {
    const onDone = vi.fn();
    render(<FlashcardStep {...base} item={review} voice={false} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: he.pinyin }));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith({ correct: true, hard: false, responseMs: expect.any(Number), elapsedMs: expect.any(Number), inContext: false, asked: 'read' });
  });

  it('a wrong answer reveals the right one', () => {
    const onDone = vi.fn();
    render(<FlashcardStep {...base} item={review} voice={false} onDone={onDone} />);
    const wrong = [...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!;
    fireEvent.click(wrong);
    expect(document.querySelector('.bottombar__detail')?.textContent).toContain(he.pinyin);
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });

  it('listen mode offers single characters including the answer', () => {
    render(<FlashcardStep {...base} item={review} voice onDone={vi.fn()} />);
    const options = [...document.querySelectorAll('.choice')].map((b) => b.textContent ?? '');
    expect(options).toContain('河');
    expect(options.every((o) => Array.from(o).length === 1)).toBe(true);
  });

  it('falls back to read mode when no same-length look-alikes exist', () => {
    const target = { ...he, id: 'p:x', text: '河马河', pinyin: 'hé mǎ hé' };
    render(<FlashcardStep {...base} word={target} item={{ ...review, wordId: 'p:x' }} voice onDone={vi.fn()} />);
    expect(document.querySelector('.hanzi--xl')?.textContent).toBe('河马河');
    expect(new Set([...document.querySelectorAll('.choice')].map((b) => b.textContent)).size).toBe(4);
  });
});

describe('intro meanings', () => {
  it('labels only the radical with a meaning', () => {
    const ri = pool.find((w) => w.text === '日')!;
    render(<FlashcardStep {...base} word={ri} item={{ wordId: ri.id, isNew: true, retry: false }} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.intro svg[data-icon="mouth"]')).toBeNull();
    cleanup();
    render(<FlashcardStep {...base} item={{ wordId: he.id, isNew: true, retry: false }} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.intro svg[data-icon="drop"]')).toBeTruthy();
  });
});

describe('feedback effects', () => {
  it('bursts and feeds the tile to Truffle on a correct answer, once', () => {
    vi.mocked(burst).mockClear();
    vi.mocked(flyAlong).mockClear();
    const onDone = vi.fn();
    render(<FlashcardStep {...base} item={review} voice={false} onDone={onDone} />);
    const right = screen.getByRole('button', { name: he.pinyin });
    fireEvent.click(right);
    fireEvent.click(right);
    expect(burst).toHaveBeenCalledTimes(1);
    expect(flyAlong).toHaveBeenCalledWith(right, expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }), expect.anything());
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
  it('does not celebrate a wrong answer', () => {
    vi.mocked(burst).mockClear();
    render(<FlashcardStep {...base} item={review} voice={false} onDone={vi.fn()} />);
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!);
    expect(burst).not.toHaveBeenCalled();
  });
});

describe('new-word card (parent report: it repeated the example phrases)', () => {
  it('never shows the same phrase twice: an example already in the usage line is not listed again', () => {
    const counts: string[] = [];
    for (const w of pool.filter((x) => (x.examples?.length ?? 0) >= 2).slice(0, 300)) {
      const { unmount } = render(<FlashcardStep {...base} word={w} item={{ wordId: w.id, isNew: true, retry: false }} voice={false} onDone={vi.fn()} />);
      const usage = document.querySelector('.usage__text')?.textContent ?? '';
      const examples = [...document.querySelectorAll('.intro .example .hanzi')].map((e) => e.textContent!);
      if (examples.some((e) => usage === e || usage.includes(e)) || new Set(examples).size !== examples.length) counts.push(`${w.text}: ${usage} | ${examples.join(' ')}`);
      unmount();
    }
    expect(counts).toEqual([]);
  });
});

describe('Truffle reactions', () => {
  const mood = () => document.querySelector('svg.truffle')!.getAttribute('data-mood');
  const relearn = () => ({ id: `${he.id}:recognise`, wordId: he.id, kind: 'recognise' as const, fsrs: { ...createEmptyCard(new Date()), state: State.Relearning } });
  it('rests during the quiz, side-eyes a wrong answer and goes wide-eyed for a hard one', () => {
    const { unmount } = render(<FlashcardStep {...base} card={relearn()} item={review} voice={false} onDone={vi.fn()} />);
    expect(mood()).toBe('sulk');
    fireEvent.click(screen.getByRole('button', { name: he.pinyin }));
    expect(mood()).toBe('wow');
    unmount();
    render(<FlashcardStep {...base} item={review} voice={false} onDone={vi.fn()} />);
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!);
    expect(mood()).toBe('side');
  });
  it('a reaction is short (spec: about a second), then he rests again while the answer stays up', async () => {
    vi.useFakeTimers();
    try {
      render(<FlashcardStep {...base} item={review} voice={false} onDone={vi.fn()} />);
      fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!);
      expect(mood()).toBe('side');
      await act(async () => { vi.advanceTimersByTime(1100); });
      expect(mood()).toBe('sulk');
      expect(screen.getByText('继续')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
  it('shows the close-up only when allowed, and reports hard', () => {
    const onDone = vi.fn();
    const { unmount } = render(<FlashcardStep {...base} card={relearn()} item={review} voice={false} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: he.pinyin }));
    expect(document.querySelector('.closeup')).toBeNull();
    unmount();
    render(<FlashcardStep {...base} card={relearn()} closeupReady item={review} voice={false} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: he.pinyin }));
    expect(document.querySelector('.closeup')).toBeTruthy();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true, hard: true }));
  });
});

describe('feedback sheet', () => {
  it('slides up green with a cheer when right, orange with the answer when wrong', () => {
    const { unmount } = render(<FlashcardStep {...base} item={review} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.bottombar--neutral button')!.hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: he.pinyin }));
    expect(document.querySelector('.bottombar--good')).toBeTruthy();
    unmount();
    render(<FlashcardStep {...base} item={review} voice={false} onDone={vi.fn()} />);
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!);
    expect(document.querySelector('.bottombar--oops')!.textContent).toContain('正确答案');
  });
});

describe('FlashcardStep listen mode', () => {
  it('uses read mode when there are fewer than 3 look-alike characters to choose from', () => {
    const tiny = [he, pool.find((w) => w.text === '大')!];
    for (let i = 0; i < 5; i++) {
      cleanup();
      render(<FlashcardStep {...base} pool={tiny} item={review} voice onDone={vi.fn()} />);
      expect(document.querySelector('.choices--hanzi')).toBeNull();
    }
  });
});

describe('wrong-answer bubble', () => {
  it('says remember it (not think again) once the answer is shown', () => {
    render(<FlashcardStep {...base} item={review} voice={false} onDone={vi.fn()} />);
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!);
    expect(document.querySelector('.pet__bubble')?.textContent).toContain('记住它');
    expect(document.querySelector('.pet__bubble')?.textContent).not.toContain('再想想');
  });
});

describe('close-up keeps what Truffle is wearing', () => {
  it('shows his power in the close-up', () => {
    const relearn = { id: `${he.id}:recognise`, wordId: he.id, kind: 'recognise' as const, fsrs: { ...createEmptyCard(new Date()), state: State.Relearning } };
    const kid = { ...DEFAULT_KID, activePower: 'water', powerTiersSeen: { water: 2 } };
    render(<FlashcardStep {...base} kid={kid} card={relearn} closeupReady item={review} voice={false} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: he.pinyin }));
    expect(document.querySelector('.closeup svg.truffle')?.getAttribute('data-power')).toBe('water');
  });
});

describe('认一认 meaning questions (spec §19)', () => {
  const xi = { ...makeWord('惜', { id: 'b:惜', pinyin: 'xī', meaning: 'to cherish' }), examples: [{ text: '珍惜', pinyin: 'zhēn xī' }] };
  it('a meaning item asks which character fits the 组词 word, reads the word aloud, and shows no English', () => {
    const onDone = vi.fn();
    render(<FlashcardStep {...base} word={xi} item={{ wordId: 'b:惜', isNew: false, retry: false, mode: 'meaning' }} voice onDone={onDone} />);
    expect(document.querySelector('.meaning-cue')?.textContent).toContain('珍');
    expect(document.querySelector('.meaning-cue__blank')).toBeTruthy();
    expect(speak).toHaveBeenCalledWith('珍惜');
    expect(document.body.textContent).not.toContain('cherish');
    expect(document.querySelectorAll('.choice')).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: '惜' }));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
  it("a new word's intro shows its 组词, never an English meaning", () => {
    render(<FlashcardStep {...base} word={xi} item={{ wordId: 'b:惜', isNew: true, retry: false }} voice={false} onDone={vi.fn()} />);
    expect(document.body.textContent).toContain('珍惜');
    expect(document.body.textContent).not.toContain('cherish');
  });
  it('a long 组词 (四面八方) stays on one line: the cue knows its length', () => {
    const ba = { ...makeWord('八', { id: 'b:八', pinyin: 'bā' }), examples: [{ text: '四面八方', pinyin: 'sì miàn bā fāng' }] };
    render(<FlashcardStep {...base} word={ba} item={{ wordId: 'b:八', isNew: false, retry: false, mode: 'meaning' }} voice onDone={vi.fn()} />);
    expect(document.querySelector<HTMLElement>('.meaning-cue')!.style.getPropertyValue('--len')).toBe('4');
  });
it('a sentence cue reads as a sentence (wrapping, smaller type) with the word blanked', () => {
  const w = { ...makeWord('保持', { id: 'p:1', pinyin: 'bǎo chí' }), sentences: [{ text: '图书馆里要保持安静。', pinyin: 'x' }] };
  render(<FlashcardStep {...base} word={w} pool={[w, ...pool]} item={{ wordId: 'p:1', isNew: false, retry: false, mode: 'meaning' }} voice onDone={vi.fn()} />);
  expect(document.querySelector('.meaning-cue--sentence')?.textContent).toContain('图书馆里要');
  expect(speak).not.toHaveBeenCalledWith('图书馆里要保持安静。'); // saying the word before he answers would give it away
  expect(speak).toHaveBeenCalledWith('图书馆里要，，安静。');
  const right = [...document.querySelectorAll<HTMLButtonElement>('.choices button')].find((b) => b.textContent?.includes('保持'))!;
  right.click();
  expect(speak).toHaveBeenLastCalledWith('图书馆里要保持安静。'); // the whole sentence once he has answered
});
});

describe('the usage line (spec §20 part 1)', () => {
  const hen = { ...pool.find((w) => w.text === '很')!, examples: [] };
  it('shows after a reading answer, right or wrong, under the character, and speaks only on tap', () => {
    vi.mocked(speak).mockClear();
    render(<FlashcardStep {...base} word={hen} item={{ wordId: hen.id, isNew: false, retry: false }} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.usage')).toBeNull(); // not before he answers
    fireEvent.click(document.querySelector<HTMLButtonElement>('.choices button')!);
    expect(document.querySelector('.flash__prompt .usage')?.textContent).toContain('这个书包很大。');
    expect(document.querySelector('.usage__word')?.textContent).toBe('很');
    expect(speak).not.toHaveBeenCalledWith('这个书包很大。');
    cleanup();
  });
  it('leads the new-word intro and is read after the character', () => {
    vi.mocked(speak).mockClear();
    render(<FlashcardStep {...base} word={hen} item={{ wordId: hen.id, isNew: true, retry: false }} voice onDone={vi.fn()} />);
    expect(document.querySelector('.intro .usage')?.textContent).toContain('这个书包很大。');
    expect(vi.mocked(speak).mock.calls.map((c) => c[0])).toEqual(['很', '这个书包很大。']);
    cleanup();
  });
  it('with a sentence, the intro keeps one 组词 word so it fits a phone', () => {
    const w = { ...hen, examples: [{ text: '很多', pinyin: 'hěn duō' }, { text: '很好', pinyin: 'hěn hǎo' }] };
    render(<FlashcardStep {...base} word={w} item={{ wordId: hen.id, isNew: true, retry: false }} voice onDone={vi.fn()} />);
    expect(document.querySelectorAll('.intro .example')).toHaveLength(1);
    cleanup();
  });
  it('no usage line for a word with nothing to show', () => {
    const w = makeWord('欺负', { id: 'p:9', pinyin: 'qī fu', level: null, source: 'parent' });
    render(<FlashcardStep {...base} word={w} pool={[w, ...pool]} item={{ wordId: 'p:9', isNew: false, retry: false }} voice={false} onDone={vi.fn()} />);
    fireEvent.click(document.querySelector<HTMLButtonElement>('.choices button')!);
    expect(document.querySelector('.usage')).toBeNull();
    cleanup();
  });
});

describe('what was asked (deferred minor, plan 11)', () => {
  it('a meaning item for a word with no cue asks for its reading, and says so, so the reading card is the one rated', () => {
    const w = makeWord('欺负', { id: 'p:9', pinyin: 'qī fu', level: null, source: 'parent' });
    const onDone = vi.fn();
    render(<FlashcardStep {...base} word={w} pool={[w, ...pool]} item={{ wordId: 'p:9', isNew: false, retry: false, mode: 'meaning' }} voice={false} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'qī fu' }));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ asked: 'read' }));
    cleanup();
  });
});
