// The miss sheet names what he picked, with its English, in every 练一练 question (parent 2026-10-16: "when a wrong answer is
// given sometimes the English meaning is not shown beside the wrong words").
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => false }));
import { builtinWords } from '../../content';
import { builtinIdiom } from '../../content/chengyu';
import { CHOICE_GLOSS } from '../../content/choiceGloss';
import { DAPEI } from '../../content/dapei';
import { questionMeaning } from '../../content/glossary';
import { bankFor } from '../../content/sentenceBank';
import { mulberry32 } from '../../lib/random';
import { cuePickNote, meaningPickNote, NONE_PICKED_EN, pickedNote, pinyinPickNote } from '../../practice/missNote';
import { idiomGap } from '../../practice/idioms';
import { DEFAULT_KID } from '../../types';
import { firstSense } from '../flashcards/distractors';
import { FlashcardStep } from '../flashcards/FlashcardStep';
import { wordCue } from '../flashcards/meaning';
import { UseQuestion } from '../choose/UseQuestion';
import { ComponentsStep } from '../components/ComponentsStep';
import { IdiomQuestion } from './IdiomQuestion';
import { MatchQuestion } from './MatchQuestion';
import { PairGame } from './PairGame';

const pool = builtinWords(0);
const he = pool.find((w) => w.text === '河')!;
const base = { word: he, pool, kid: DEFAULT_KID, resting: 'neutral' as const, combo: 0, closeupReady: false, voice: false, onDone: vi.fn() };
const review = { wordId: he.id, isNew: false, retry: false };
const choices = () => [...document.querySelectorAll<HTMLButtonElement>('.choice')];
const sheetEn = () => document.querySelector('.sheet--oops .sheet__en')?.getAttribute('data-text') ?? '';

describe('练一练 miss sheet: what he picked, with its English', () => {
  it('读音: a pinyin choice names the character or word read so, with its English', () => {
    render(<FlashcardStep {...base} item={review} ask="read" />);
    const pick = choices().find((b) => b.textContent !== he.pinyin && pinyinPickNote(he, b.textContent!, pool)?.en)!;
    expect(pick).toBeTruthy();
    const note = pinyinPickNote(he, pick.textContent!, pool)!;
    fireEvent.click(pick);
    expect(sheetEn()).toContain(`${note.zh} ${note.en}`);
  });
  it('意思: a wrong English meaning names its Chinese word', () => {
    render(<FlashcardStep {...base} item={review} ask="meaningRead" />);
    const real = firstSense(questionMeaning(he)!);
    const pick = choices().find((b) => b.textContent !== real)!;
    const note = meaningPickNote(pick.textContent!, he, pool)!;
    fireEvent.click(pick);
    expect(note.zh).not.toBe(he.text);
    expect(sheetEn()).toContain(`${note.zh} ${pick.textContent}`);
  });
  it('组词 cue: the character he picked with its English, never the made-up word', () => {
    const w = pool.find((x) => bankFor(x.text) && wordCue(x))!;
    const cue = wordCue(w)!;
    render(<FlashcardStep {...base} word={w} item={{ wordId: w.id, isNew: false, retry: false, mode: 'meaning' }} ask="word" />);
    const pick = choices().find((b) => b.textContent !== w.text)!;
    const note = cuePickNote(cue, pick.textContent!, pool)!;
    fireEvent.click(pick);
    expect(note.en).toBeTruthy();
    expect(sheetEn()).toContain(`${note.zh} ${note.en}`);
  });
  it('都不对 picked when the answer was there: says so plainly', () => {
    const w = pool.find((x) => bankFor(x.text) && wordCue(x))!;
    render(<FlashcardStep {...base} word={w} item={{ wordId: w.id, isNew: false, retry: false, mode: 'meaning' }} ask="word" noneOfThese="decoy" />);
    fireEvent.click(screen.getByRole('button', { name: '都不对' }));
    expect(sheetEn()).toContain(`都不对 ${NONE_PICKED_EN}`);
  });
  it('都不对 on an English question, picked wrongly, says so too', () => {
    render(<FlashcardStep {...base} item={review} ask="meaningRead" noneOfThese="decoy" />);
    fireEvent.click(screen.getByRole('button', { name: '都不对' }));
    expect(sheetEn()).toContain(`都不对 ${NONE_PICKED_EN}`);
  });
  it('成语 gap: the character he picked, with its English', () => {
    const gap = idiomGap(builtinIdiom('五颜六色')!, '颜', mulberry32(1))!;
    render(<IdiomQuestion gap={gap} kid={DEFAULT_KID} onDone={vi.fn()} />);
    const wrong = gap.options.find((o) => o !== '颜')!;
    fireEvent.click(screen.getByRole('button', { name: wrong }));
    expect(sheetEn()).toContain(`${pickedNote(wrong)!.zh} ${pickedNote(wrong)!.en}`);
  });
  it('搭配: a written wrong partner with no dictionary English gets a kid gloss', () => {
    const wrong = '气球';
    render(<MatchQuestion question={{ verb: '吃', noun: '面条', options: ['面条', '气球', '日记', '网球'] }} kid={DEFAULT_KID} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: wrong }));
    expect(sheetEn()).toContain(`${wrong} ${CHOICE_GLOSS[wrong]}`);
  });
  it('搭配 with 都不对: wrong says so; right (the answer left out) does not', () => {
    const d = DAPEI[0]!;
    const q = { verb: d.verb, noun: d.noun, options: [d.noun, ...d.wrong] };
    const { unmount } = render(<MatchQuestion question={q} kid={DEFAULT_KID} none="decoy" onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '都不对' }));
    expect(sheetEn()).toContain(NONE_PICKED_EN);
    unmount();
    render(<MatchQuestion question={q} kid={DEFAULT_KID} none="answer" onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '都不对' }));
    expect(document.querySelector('.sheet--good')!.textContent).not.toContain(NONE_PICKED_EN);
  });
  it('选一选: a decoy word with no dictionary English gets a kid gloss', () => {
    const item = { kind: 'fit' as const, wordId: null, word: '没关系', before: '', after: '！', options: ['没关系', '对不起', '不客气', '星期天'] };
    render(<UseQuestion item={item} kid={DEFAULT_KID} onAnswer={vi.fn()} onNext={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '对不起' }));
    expect(sheetEn()).toContain(`对不起 ${CHOICE_GLOSS['对不起']}`);
  });
  it('钓鱼: a look-alike beyond his lists gets a kid gloss', () => {
    const item = { wordId: 'b:波', word: '波浪', index: 0, answer: '波', options: ['波', '玻', '坡', '破'] };
    render(<ComponentsStep items={[item]} kid={DEFAULT_KID} onAnswer={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '玻' }));
    expect(sheetEn()).toContain(`玻 ${CHOICE_GLOSS['玻']}`);
  });
  it('连一连: every 组词 on the summary has English, a board word with none in the dictionary too', () => {
    const board = { left: ['学', '面', '日'], right: ['条', '记', '生'], pairs: [['学', '生'], ['面', '条'], ['日', '记']] as [string, string][], target: ['学', '生'] as [string, string] };
    render(<PairGame board={board} kind="pair" kid={DEFAULT_KID} onDone={vi.fn()} />);
    const tile = (t: string) => screen.getByRole('button', { name: t });
    fireEvent.click(tile('学')); fireEvent.click(tile('条')); // a miss
    for (const [l, r] of board.pairs) { fireEvent.click(tile(l)); fireEvent.click(tile(r)); }
    const rows = [...document.querySelectorAll('.pair-summary__row')];
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row.querySelector('[lang="en"]')?.textContent).toBeTruthy();
    expect(document.querySelector('.pair-summary')!.textContent).toContain(CHOICE_GLOSS['学生']);
  });
});
