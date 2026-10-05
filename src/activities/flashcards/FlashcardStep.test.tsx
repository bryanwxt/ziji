import { wordCue } from './meaning';
import { bankFor } from '../../content/sentenceBank';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { glossFor } from '../../content/glossary';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../../content';
import { createEmptyCard, State } from 'ts-fsrs';
import { DEFAULT_KID } from '../../types';
import { FlashcardStep , introIdiom, shownOnCard } from './FlashcardStep';
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
    expect(onDone).toHaveBeenCalledWith({ correct: true, hard: false, responseMs: expect.any(Number), elapsedMs: expect.any(Number), inContext: false, asked: 'read', picked: he.pinyin });
  });

  it('a wrong answer reveals the right one', () => {
    const onDone = vi.fn();
    render(<FlashcardStep {...base} item={review} voice={false} onDone={onDone} />);
    const wrong = [...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!;
    fireEvent.click(wrong);
    expect(document.querySelector('.sheet__detail')?.textContent).toContain(he.pinyin);
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
    expect(document.querySelector('[data-q]')?.textContent).toBe('河马河');
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
      const usage = document.querySelector('.usage__text .label')?.getAttribute('data-zh') ?? '';
      const examples = [...document.querySelectorAll('.intro .example:not(.example--idiom) .label')].map((e) => e.getAttribute('data-zh')!);
      if (examples.some((e) => usage === e || usage.includes(e)) || new Set(examples).size !== examples.length) counts.push(`${w.text}: ${usage} | ${examples.join(' ')}`);
      unmount();
    }
    expect(counts).toEqual([]);
  });
});

describe('new-word card in English too (parent, 2026-10-04)', () => {
  it("shows the character's English meaning and each phrase's", () => {
    const er = pool.find((w) => w.text === '儿')!;
    render(<FlashcardStep {...base} word={er} item={{ wordId: er.id, isNew: true, retry: false }} voice={false} onDone={vi.fn()} />);
    const en = [...document.querySelectorAll('.intro [lang="en"]')].map((e) => e.textContent);
    expect(en[0]).toMatch(/child|son/);
    const phrases = [...document.querySelectorAll('.intro .usage__text .label, .intro .example .label')].map((e) => e.getAttribute('data-zh')!);
    expect(phrases.length).toBeGreaterThan(0);
    expect(en.length).toBe(1 + phrases.length); // one English line per phrase as well
  });
  it('the character\'s English is its everyday sense at its own reading (他 is "he", not "other, another")', () => {
    const ta = pool.find((w) => w.text === '他')!;
    render(<FlashcardStep {...base} word={ta} item={{ wordId: ta.id, isNew: true, retry: false }} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.intro__en')!.textContent).toMatch(/^he\b/);
  });
  it('one 组词 besides the usage line, so the card fits above 我记住了 on every screen', () => {
    const ta = pool.find((w) => w.text === '他')!;
    render(<FlashcardStep {...base} word={ta} item={{ wordId: ta.id, isNew: true, retry: false }} voice={false} onDone={vi.fn()} />);
    expect(document.querySelectorAll('.intro .example')).toHaveLength(1);
  });
  it('says the new character, then its usage line queued after it (not cutting it off)', () => {
    vi.mocked(speak).mockClear();
    const ta = pool.find((w) => w.text === '他')!;
    render(<FlashcardStep {...base} word={ta} item={{ wordId: ta.id, isNew: true, retry: false }} voice={false} onDone={vi.fn()} />);
    expect(vi.mocked(speak).mock.calls[0]).toEqual(['他', { reading: 'tā' }]); // its reading goes too: a 多音字 is said the way its card teaches
    expect(vi.mocked(speak).mock.calls[1]![1]).toEqual({ queue: true });
  });
  it('English stays on the new-word card: the quiz that follows has none', () => {
    render(<FlashcardStep {...base} item={review} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('[lang="en"]')).toBeNull();
  });
});

describe('Truffle reactions', () => {
  const mood = () => document.querySelector('svg.truffle')!.getAttribute('data-mood');
  const relearn = () => ({ id: `${he.id}:recognise`, wordId: he.id, kind: 'recognise' as const, fsrs: { ...createEmptyCard(new Date()), state: State.Relearning } });
  // the reaction lives in the rig now (stage spec §4.4): data-expression holds it, data-mood stays his resting mood
  const expression = () => document.querySelector('svg.truffle')!.getAttribute('data-expression');
  it('rests during the quiz, is curious at a wrong answer and overjoyed at a hard one', () => {
    const { unmount } = render(<FlashcardStep {...base} card={relearn()} item={review} voice={false} onDone={vi.fn()} />);
    expect(mood()).toBe('sulk');
    fireEvent.click(screen.getByRole('button', { name: he.pinyin }));
    expect(expression()).toBe('joy');
    expect(mood()).toBe('sulk');
    unmount();
    render(<FlashcardStep {...base} item={review} voice={false} onDone={vi.fn()} />);
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!);
    expect(expression()).toBe('curious');
  });
  it('a reaction is short (REACTIONS.wrong.holdMs), then he rests again while the answer stays up', async () => {
    vi.useFakeTimers();
    try {
      render(<FlashcardStep {...base} item={review} voice={false} onDone={vi.fn()} />);
      fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!);
      expect(expression()).toBe('curious');
      await act(async () => { vi.advanceTimersByTime(1800); });
      expect(expression()).toBe('grumpy'); // back to his resting (sulk) face
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
    expect(document.querySelector('.sheet--neutral button')!.hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: he.pinyin }));
    expect(document.querySelector('.sheet--good')).toBeTruthy();
    unmount();
    render(<FlashcardStep {...base} item={review} voice={false} onDone={vi.fn()} />);
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!);
    expect(document.querySelector('.sheet--oops')!.textContent).toContain('正确答案');
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
    // the gap is a dashed box with its syllable over it, the other characters with theirs (parent, 2026-10-05)
    const blank = document.querySelector('.meaning-cue .label__cell--blank')!;
    expect(blank).toBeTruthy();
    expect(blank.querySelector('.label__py')!.textContent).toBe('xī');
    expect(document.querySelector('.meaning-cue .label__cell--zh .label__py')!.textContent).toBe('zhēn');
    expect(speak).toHaveBeenCalledWith('珍惜');
    expect(document.body.textContent).not.toContain('cherish');
    expect(document.querySelectorAll('.choice')).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: '惜' }));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
  it("a new word's intro shows its 组词, with English beside them (the parent asked for it on 2026-10-04)", () => {
    render(<FlashcardStep {...base} word={xi} item={{ wordId: 'b:惜', isNew: true, retry: false }} voice={false} onDone={vi.fn()} />);
    expect(document.body.textContent).toContain('珍惜');
    expect(document.querySelector('.intro [lang="en"]')).toBeTruthy();
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
    expect(document.querySelector('.flash__prompt .usage .label')?.getAttribute('data-zh')).toBe('这个书包很大。');
    expect([...document.querySelectorAll('.usage .label__cell--mark .label__ch')].map((e) => e.textContent).join('')).toBe('很'); // the word picked out, its pinyin over it
    expect(document.querySelector('.usage .label__cell--mark .label__py')?.textContent).toBe('hěn');
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

describe('认一认 on the stage (spec 2026-10-04 §3)', () => {
  it('renders inside the stage: Truffle in his spot, the question on the card, the sheet underneath', () => {
    render(<FlashcardStep {...base} item={review} voice={false} onDone={vi.fn()} />);
    const stage = document.querySelector('.stage[data-stage="flash"]')!;
    expect(stage.querySelector('.stage__truffle .pet svg.truffle')).toBeTruthy();
    expect(stage.querySelector('.stage__card [data-q]')!.textContent).toBe(he.text);
    expect(stage.querySelector('.stage__card .choices')).toBeTruthy();
    expect(stage.querySelector('.stage__sheet .sheet')).toBeTruthy();
  });
  it('the new-word card is on the stage too', () => {
    render(<FlashcardStep {...base} item={{ ...review, isNew: true }} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.stage .stage__card .intro')).toBeTruthy();
  });
  it('a sentence cue shows pinyin over its characters and has a speaker that does not give the word away', () => {
    vi.mocked(speak).mockClear();
    const w = { ...makeWord('保持', { id: 'p:1', pinyin: 'bǎo chí' }), sentences: [{ text: '图书馆里要保持安静。', pinyin: 'x' }] };
    render(<FlashcardStep {...base} word={w} pool={[w, ...pool]} item={{ wordId: 'p:1', isNew: false, retry: false, mode: 'meaning' }} voice={false} onDone={vi.fn()} />);
    const cue = document.querySelector('.meaning-cue--sentence')!;
    expect(cue.querySelector('.label__py')).toBeTruthy();
    vi.mocked(speak).mockClear();
    fireEvent.click(cue.querySelector('.speak')!);
    expect(vi.mocked(speak).mock.calls.at(-1)![0]).not.toContain('保持');
  });
});

describe('Truffle in 认一认 (spec 2026-10-04 §4.3–4.4)', () => {
  it('is calm while the question is up, and reacts after the answer', () => {
    render(<FlashcardStep {...base} item={review} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.stage__truffle svg.truffle')!.getAttribute('data-calm')).toBe('true');
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!);
    const svg = document.querySelector('.stage__truffle svg.truffle')!;
    expect(svg.getAttribute('data-calm')).toBeNull();
    expect(svg.getAttribute('data-expression')).toBe('curious'); // a wrong answer: curious, never sad
  });
  it('a new word: surprised when it is shown', () => {
    render(<FlashcardStep {...base} item={{ ...review, isNew: true }} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.stage__truffle svg.truffle')!.getAttribute('data-expression')).toBe('surprised');
  });
});

describe('asked by the round (spec 2026-10-05 §3.2)', () => {
  it("ask 'word': the 组词 gap, even for a word that has a sentence", () => {
    const w = pool.find((x) => bankFor(x.text) && wordCue(x))!;
    const cue = wordCue(w)!;
    render(<FlashcardStep {...base} word={w} item={{ wordId: w.id, isNew: false, retry: false, mode: 'meaning' }} ask="word" voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.stage__card')!.textContent).toContain(cue.before || cue.after);
    expect(screen.getByRole('button', { name: w.text })).toBeTruthy();
  });
  it("ask 'read': pick the pinyin, even with the voice on and an even review count", () => {
    render(<FlashcardStep {...base} item={review} ask="read" voice onDone={vi.fn()} />);
    expect(screen.getByRole('button', { name: he.pinyin })).toBeTruthy();
  });
  it("ask 'listen': hear it, find the character", () => {
    const w = pool.find((x) => x.text === '他')!;
    render(<FlashcardStep {...base} word={w} item={{ wordId: w.id, isNew: false, retry: false }} ask="listen" voice onDone={vi.fn()} />);
    expect(screen.getByRole('button', { name: '他' })).toBeTruthy();
  });
});

describe('认新字: a missed word is shown again (spec 2026-10-05 §2.1)', () => {
  it('after a miss, 继续 shows the card again; 我记住了！ then moves on, once', () => {
    const onDone = vi.fn();
    render(<FlashcardStep {...base} item={{ ...review, isNew: true }} ask="read" reintroOnMiss voice={false} onDone={onDone} />);
    fireEvent.click(screen.getByText('我记住了！'));
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!);
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByText('我记住了！')).toBeTruthy(); // the card again
    fireEvent.click(screen.getByText('我记住了！'));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0]![0]).toMatchObject({ correct: false, asked: 'read' });
  });
  it('a right answer moves straight on', () => {
    const onDone = vi.fn();
    render(<FlashcardStep {...base} item={{ ...review, isNew: true }} ask="read" reintroOnMiss voice={false} onDone={onDone} />);
    fireEvent.click(screen.getByText('我记住了！'));
    fireEvent.click(screen.getByRole('button', { name: he.pinyin }));
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('the sheet explains a miss in English (spec 2026-10-05 §3.6)', () => {
  it('after a wrong hear-and-find answer: both characters, in English', () => {
    const w = pool.find((x) => x.text === '他')!;
    render(<FlashcardStep {...base} word={w} item={{ wordId: w.id, isNew: false, retry: false }} ask="listen" voice onDone={vi.fn()} />);
    // a wrong choice with a gloss (the distractors are random; a rare one like 俱 has none, and then only 他 is explained)
    const wrong = [...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== '他' && glossFor(b.textContent!))!;
    fireEvent.click(wrong);
    const en = document.querySelector('.sheet .sheet__en')!.getAttribute('data-text')!;
    expect(en).toContain('他');
    expect(en).toContain(wrong.textContent!);
  });
  it('a right answer shows no English', () => {
    render(<FlashcardStep {...base} item={review} ask="read" voice={false} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: he.pinyin }));
    expect(document.querySelector('[lang="en"]')).toBeNull();
  });
  it('a wrong pinyin answer explains the character, never the pinyin', () => {
    render(<FlashcardStep {...base} item={review} ask="read" voice={false} onDone={vi.fn()} />);
    const wrong = [...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent !== he.pinyin)!;
    fireEvent.click(wrong);
    const en = document.querySelector('.sheet .sheet__en')?.getAttribute('data-text') ?? '';
    expect(en).toContain('河');
    expect(en).not.toContain(wrong.textContent!);
  });
});

describe('a 成语 on the 认新字 card (spec 2026-10-05 §2.1, phase C)', () => {
  it('its 组词 come first, with their English, then the 成语 (parent, 2026-10-05: a card showed only a 成语)', async () => {
    const { builtinIdiom } = await import('../../content/chengyu');
    const yi = pool.find((w) => w.text === '一')!;
    const idiom = builtinIdiom('一心一意')!;
    render(<FlashcardStep {...base} word={yi} idiom={idiom} item={{ wordId: yi.id, isNew: true, retry: false }} voice={false} onDone={vi.fn()} />);
    const shown = [...document.querySelectorAll('.intro .example')];
    const words = shown.filter((e) => !e.classList.contains('example--idiom'));
    expect(words.length).toBeGreaterThanOrEqual(1);
    expect(words.length).toBeLessThanOrEqual(2);
    expect(words.every((e) => e.querySelector('[lang="en"]'))).toBe(true);
    expect(shown.at(-1)!.classList.contains('example--idiom')).toBe(true); // the 成语 comes after them
  });
  it('shows the 成语 with its pinyin, English and a sentence', async () => {
    const { builtinIdiom, chengyuOf } = await import('../../content/chengyu');
    const yan = pool.find((w) => w.text === '颜')!;
    const idiom = builtinIdiom('五颜六色')!;
    render(<FlashcardStep {...base} word={yan} idiom={idiom} item={{ wordId: yan.id, isNew: true, retry: false }} voice={false} onDone={vi.fn()} />);
    const box = document.querySelector('.intro__idiom')!;
    expect(box.querySelector('.label')!.getAttribute('data-zh')).toBe('五颜六色');
    expect([...box.querySelectorAll('.label__py')].map((e) => e.textContent)).toEqual(['wǔ', 'yán', 'liù', 'sè']); // each syllable over its own character
    expect(box.querySelector('[lang="en"]')!.textContent).toBe(idiom.meaning);
    expect(box.querySelector('.intro__idiom-sentence')!.textContent).toBe(idiom.sentences[0]);
  });
  it('without one, the card is as before', () => {
    const ta = pool.find((w) => w.text === '他')!;
    render(<FlashcardStep {...base} word={ta} idiom={null} item={{ wordId: ta.id, isNew: true, retry: false }} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.intro__idiom')).toBeNull();
    expect(document.querySelectorAll('.intro .example')).toHaveLength(1);
  });
});

describe('a hard question (spec 2026-10-04 §4.6, phase E)', () => {
  it('a word he missed comes back: Truffle covers his eyes and peeks', () => {
    render(<FlashcardStep {...base} item={{ wordId: he.id, isNew: false, retry: true }} peek ask="read" voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('svg.truffle')?.getAttribute('data-react')).toBe('peek');
  });
  it('a first try does not, nor a practice-only question (free play marks every item retry)', () => {
    render(<FlashcardStep {...base} item={{ wordId: he.id, isNew: false, retry: true }} ask="read" voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('svg.truffle')?.getAttribute('data-react')).not.toBe('peek');
  });
});


describe('nothing on the 认新字 card twice (parent, 2026-10-05: 四面八方 as both the usage line and the 成语 on 八)', () => {
  it('八 gets a 成语 the card does not already show, or none', async () => {
    const { idiomsFor } = await import('../../content/chengyu');
    const ba = pool.find((w) => w.text === '八')!;
    const pick = introIdiom(ba, idiomsFor(ba, 1, pool));
    expect(shownOnCard(ba).some((t) => pick && t.includes(pick.text))).toBe(false);
  });
  it('for every built-in character at every level, the card never repeats a phrase', async () => {
    const { idiomsFor } = await import('../../content/chengyu');
    const twice: string[] = [];
    for (const w of pool.filter((x) => Array.from(x.text).length === 1)) {
      for (const level of [1, 3, 6]) {
        const pick = introIdiom(w, idiomsFor(w, level, pool));
        if (pick && shownOnCard(w).some((t) => t.includes(pick.text))) twice.push(`${w.text}: ${pick.text}`);
      }
    }
    expect(twice).toEqual([]);
  });
  it('the card itself drops a 成语 it already shows, whoever picked it', async () => {
    const { builtinIdiom } = await import('../../content/chengyu');
    const ba = pool.find((w) => w.text === '八')!;
    const dup = builtinIdiom('四面八方');
    if (!dup || !shownOnCard(ba).some((t) => t.includes('四面八方'))) return; // only meaningful while 八's usage line is 四面八方
    render(<FlashcardStep {...base} word={ba} idiom={dup} item={{ wordId: ba.id, isNew: true, retry: false }} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.intro__idiom')).toBeNull();
  });
});
