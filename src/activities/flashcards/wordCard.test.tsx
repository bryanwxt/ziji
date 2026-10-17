// The 认新词 card for a weekly list word (weekly list spec 2026-10-17 §7.1–7.2) and the re-teaching card (§2.1).
import { cleanup, fireEvent, render } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => false }));
import { speak } from '../../audio/speech';
import { builtinWords } from '../../content';
import { makeWord } from '../../test/fixtures';
import { DEFAULT_KID, type FlashItem, type ListCard, type Word } from '../../types';
import { FlashcardStep } from './FlashcardStep';

const pool: Word[] = builtinWords(0);
const chao = pool.find((w) => w.text === '炒')!;
const base = { pool, kid: DEFAULT_KID, resting: 'content' as const, combo: 0, closeupReady: false, voice: false };
const card = (word: Word, list: ListCard, item: Partial<FlashItem> = {}) =>
  render(<FlashcardStep {...base} word={word} item={{ wordId: word.id, isNew: true, retry: false, ...item }} onDone={vi.fn()} list={list} ask="read" />);
const cells = (sel: string) => [...document.querySelectorAll(`${sel} .label__cell--zh`)].map((c) => [c.querySelector('.label__py')!.textContent, c.querySelector('.label__ch')!.textContent]);

afterEach(() => { cleanup(); vi.mocked(speak).mockClear(); });

describe('the 认新词 card (spec §7.1)', () => {
  it('a 3-character ABB word on one line, a syllable over each character, its first new character marked, then its example', () => {
    const w = makeWord('亮晶晶', { id: 'p:亮晶晶', source: 'parent', pinyin: 'liàng jīng jīng', meaning: 'sparkly' });
    card(w, { example: { text: '天上的星星亮晶晶。', pinyin: 'tiān shàng de xīng xing liàng jīng jīng' }, mark: [1, 1] });
    const head = document.querySelector('.intro__word')!;
    expect((head as HTMLElement).style.getPropertyValue('--len').trim()).toBe('3');
    expect(cells('.intro__word')).toEqual([['liàng', '亮'], ['jīng', '晶'], ['jīng', '晶']]);
    expect([...head.querySelectorAll('.label__cell--mark .label__ch')].map((e) => e.textContent)).toEqual(['晶']);
    expect(document.querySelector('.intro__en')!.textContent).toBe('sparkly');
    // the example: pinyin over each character, the word picked out in it, its own speak button
    const ex = document.querySelector('.intro__example')!;
    expect(ex.querySelector('.label')!.getAttribute('data-zh')).toBe('天上的星星亮晶晶。');
    expect([...ex.querySelectorAll('.label__cell--mark .label__ch')].map((e) => e.textContent).join('')).toBe('亮晶晶');
    expect(ex.querySelector('.label__py')!.textContent).toBe('tiān');
    fireEvent.click(ex.querySelector('.speak')!);
    expect(speak).toHaveBeenLastCalledWith('天上的星星亮晶晶。', expect.anything());
  });
  it('its pinyin shows at once: a list card never delays or fades it', () => {
    card(makeWord('低下头', { id: 'p:低下头', source: 'parent', pinyin: 'dī xià tóu' }), {});
    expect(document.querySelector('.intro__card--list')).toBeTruthy();
    expect(cells('.intro__word')).toEqual([['dī', '低'], ['xià', '下'], ['tóu', '头']]);
    expect(document.querySelector('.pet__bubble .label')!.getAttribute('data-zh')).toBe('新词来了！'); // a word, not a character
    expect(document.querySelector('.intro__example')).toBeNull();
  });
  it('the card says the word, then its example', () => {
    card(makeWord('亮晶晶', { id: 'p:亮晶晶', pinyin: 'liàng jīng jīng' }), { example: { text: '天上的星星亮晶晶。', pinyin: 'tiān shàng de xīng xing liàng jīng jīng' } });
    expect(vi.mocked(speak).mock.calls.map((c) => c[0])).toEqual(['亮晶晶', '天上的星星亮晶晶。']);
  });
  it('without a list card, a 2-character word is the card it always was', () => {
    render(<FlashcardStep {...base} word={makeWord('干净', { pinyin: 'gān jìng' })} item={{ wordId: 'b:干净', isNew: true, retry: false }} onDone={vi.fn()} />);
    expect(document.querySelector('.intro__card--list')).toBeNull();
    expect(document.querySelector('.intro__example')).toBeNull();
  });
});

describe('a verb taught through its pair (spec §7.2)', () => {
  const lead: ListCard = { lead: '炒青菜', leadReading: 'chǎo qīng cài', leadGloss: 'stir-fry leafy greens', mark: [0, 1] };
  it('the card leads with the pair, the verb marked, the pair reading over it and the pair English', () => {
    card(chao, lead);
    const head = document.querySelector('.intro__word')!;
    expect(head.querySelector('.label')!.getAttribute('data-zh')).toBe('炒青菜');
    expect(cells('.intro__word')).toEqual([['chǎo', '炒'], ['qīng', '青'], ['cài', '菜']]);
    expect([...head.querySelectorAll('.label__cell--mark .label__ch')].map((e) => e.textContent)).toEqual(['炒']);
    expect(document.querySelector('.intro__en')!.textContent).toBe('stir-fry leafy greens');
  });
  it('the audio leads with the pair too: the card and its speak button say 炒青菜 at its reading', () => {
    card(chao, lead);
    expect(vi.mocked(speak).mock.calls[0]).toEqual(['炒青菜', expect.objectContaining({ reading: 'chǎo qīng cài' })]);
    vi.mocked(speak).mockClear();
    fireEvent.click(document.querySelector('.intro__head .speak')!);
    expect(speak).toHaveBeenLastCalledWith('炒青菜', expect.objectContaining({ reading: 'chǎo qīng cài' }));
  });
  it('asked to read after the card, and the answer said as the pair', () => {
    card(chao, lead);
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.sheet .btn')].find((b) => b.textContent?.includes('我记住了'))!);
    expect(document.querySelector('[data-q]')!.textContent).toBe('炒'); // the read question asks the character, as a bound one's does
    vi.mocked(speak).mockClear();
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent === 'chǎo')!);
    expect(speak).toHaveBeenCalledWith('炒青菜', expect.objectContaining({ reading: 'chǎo qīng cài' }));
  });
});

describe('the re-teaching card (spec §2.1)', () => {
  it('opens on the card, 再认一次！, then asks', () => {
    const w = makeWord('亮晶晶', { id: 'p:亮晶晶', source: 'parent', pinyin: 'liàng jīng jīng' });
    card(w, {}, { isNew: false, retry: true, reteach: true });
    expect(document.querySelector('.intro__card')).toBeTruthy();
    expect(document.querySelector('.pet__bubble .label')!.getAttribute('data-zh')).toBe('再认一次！');
  });
});

describe('a list verb\'s questions (fix round 2026-10-17)', () => {
  const lead: ListCard = { lead: '炒青菜', leadReading: 'chǎo qīng cài', leadGloss: 'stir-fry → leafy greens', mark: [0, 1] };
  const ask = (a: 'read' | 'meaningRead', word = chao, list: ListCard | undefined = lead) =>
    render(<FlashcardStep {...base} word={word} item={{ wordId: word.id, isNew: false, retry: false }} onDone={vi.fn()} list={list} ask={a} />);
  it('its English question shows the pair, the verb picked out, as a bound character\'s does', () => {
    ask('meaningRead');
    const q = document.querySelector('[data-q]')!;
    expect(q.textContent).toBe('炒青菜');
    expect(q.querySelector('.bound__ch')!.textContent).toBe('炒');
  });
  it('its read question keeps the bare character, and asks 这个字怎么读？', () => {
    ask('read');
    expect(document.querySelector('[data-q]')!.textContent).toBe('炒');
    expect(document.querySelector('.pet__bubble .label')!.getAttribute('data-zh')).toBe('这个字怎么读？');
  });
  it('a word of more than one character asks 这个词怎么读？', () => {
    ask('read', makeWord('低下头', { id: 'p:低下头', source: 'parent', pinyin: 'dī xià tóu' }), undefined);
    expect(document.querySelector('.pet__bubble .label')!.getAttribute('data-zh')).toBe('这个词怎么读？');
  });
});
