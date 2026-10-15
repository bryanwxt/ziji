// Bound characters on the 认新字 card and in English questions (parent 2026-10-15): 番 is taught and asked through 番茄.
import { cleanup, fireEvent, render } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../audio/speech', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));
vi.mock('../../ui/motion', () => ({ burst: vi.fn(), flyAlong: vi.fn(async () => {}), reducedMotion: () => false }));
import { speak } from '../../audio/speech';
import { builtinWords } from '../../content';
import { BOUND_SAME_SENSE, boundChars, boundPair, isBound, kidGloss } from '../../content/kidGloss';
import { idiomsFor } from '../../content/chengyu';
import { pickExample } from '../writing/cue';
import { collectionCards } from '../../fun/collection';
import BUILTIN from '../../content/builtin.json';
import type { BuiltinChar } from '../../types';
import { ladderWords } from '../../content/ladder';
import { DEFAULT_KID, type Word } from '../../types';
import { firstSense } from './distractors';
import { FlashcardStep, introIdiom, introSpoken } from './FlashcardStep';

const pool: Word[] = [...builtinWords(0), ...ladderWords()];
const byText = new Map(builtinWords(0).map((w) => [w.text, w]));
const fan = byText.get('番')!;
const base = { pool, kid: DEFAULT_KID, resting: 'content' as const, combo: 0, closeupReady: false };
const step = (word: Word, extra: Record<string, unknown>) =>
  render(<FlashcardStep {...base} word={word} item={{ wordId: word.id, isNew: false, retry: false }} voice={false} onDone={vi.fn()} {...extra} />);

afterEach(() => { cleanup(); vi.mocked(speak).mockClear(); });

describe('a bound character\'s 认新字 card (番 / 番茄)', () => {
  it('leads with the pair, 番 picked out in it, its pinyin over it, the pair\'s English, and 番 alone beside the speak button', () => {
    render(<FlashcardStep {...base} word={fan} item={{ wordId: fan.id, isNew: true, retry: false }} voice={false} onDone={vi.fn()} />);
    const head = document.querySelector('.intro__head')!;
    expect(head.querySelector('.hanzi--pair')!.textContent).toBe('番茄');
    expect([...head.querySelectorAll('.bound__ch')].map((e) => e.textContent)).toEqual(['番']);
    expect(head.querySelector('.pinyin')!.textContent).toBe('fān qié');
    expect(head.querySelector('.intro__alone .hanzi')!.textContent).toBe('番');
    expect(document.querySelector('.intro__en')!.textContent).toBe('tomato');
    // the speak button says the pair; the card says it once, never again in its 词语 rows
    fireEvent.click(head.querySelector('.speak')!);
    expect(speak).toHaveBeenLastCalledWith('番茄');
    expect(introSpoken(fan, null)).not.toContain('番茄');
    const rows = [...document.querySelectorAll('.intro__group .label')].map((e) => e.getAttribute('data-zh'));
    expect(rows).toEqual([]); // its only other 组词 is 一番, another sense: no 组词 row at all
  });

  it('番 shows no 组词 in another sense: 一番 "a round of" never sits under "tomato"', () => {
    render(<FlashcardStep {...base} word={fan} item={{ wordId: fan.id, isNew: true, retry: false }} voice={false} onDone={vi.fn()} />);
    expect(document.body.textContent).not.toContain('一番');
    expect(document.body.textContent).not.toContain('a round of');
    expect(introSpoken(fan, null)).not.toContain('一番');
    expect(pickExample(fan)?.example.text).toBe('番茄'); // 写一写: 番，番茄的，番
  });

  it("no bound card shows a 组词, usage line or 成语 outside its pair's sense (only words with the pair, or BOUND_SAME_SENSE's)", () => {
    const bad: string[] = [];
    for (const ch of boundChars()) {
      const w = byText.get(ch)!;
      const pair = boundPair(ch)!;
      const ok = (t: string) => t.includes(pair) || (BOUND_SAME_SENSE[ch] ?? []).includes(t);
      const idiom = introIdiom(w, idiomsFor(w, 6, builtinWords(0)));
      render(<FlashcardStep {...base} word={w} item={{ wordId: w.id, isNew: true, retry: false }} voice={false} idiom={idiom} onDone={vi.fn()} />);
      const rows = [...document.querySelectorAll('.intro__group .label')].map((e) => e.getAttribute('data-zh')!).filter((t) => /\p{Script=Han}/u.test(t));
      for (const t of rows) if (!ok(t)) bad.push(`${ch} (${pair}): ${t}`);
      for (const t of introSpoken(w, idiom)) if (!ok(t)) bad.push(`${ch} (${pair}) says ${t}`);
      const cue = pickExample(w)?.example.text;
      if (cue && !ok(cue)) bad.push(`${ch} (${pair}) 写一写 cue ${cue}`);
      cleanup();
    }
    expect(bad).toEqual([]);
    // the allowlist only names bound characters, and its words contain their character
    for (const [ch, ws] of Object.entries(BOUND_SAME_SENSE)) {
      expect(isBound(ch), ch).toBe(true);
      for (const t of ws) expect(t.includes(ch), t).toBe(true);
    }
  });

  it('the collection tile shows a bound character with its pair', () => {
    const chars = (BUILTIN as unknown as { chars: BuiltinChar[] }).chars.filter((c) => c.char === '番');
    const [tile] = collectionCards(chars, { knownChars: new Set('番'), cardsById: new Map() } as never);
    expect(tile!.example).toBe('番茄');
  });

  it('an unbound character keeps its own card', () => {
    const he = byText.get('河')!;
    render(<FlashcardStep {...base} word={he} item={{ wordId: he.id, isNew: true, retry: false }} voice={false} onDone={vi.fn()} />);
    expect(document.querySelector('.hanzi--pair')).toBeNull();
    expect(document.querySelector('.intro__head .hanzi--xl')!.textContent).toBe('河');
  });
});

describe('English questions on a bound character ask about its pair', () => {
  it('这个词是什么意思: shows 番茄, 番 marked, with "tomato" among the choices', () => {
    step(fan, { ask: 'meaningRead' });
    const q = document.querySelector('[data-q]')!;
    expect(q.textContent).toBe('番茄');
    expect(q.querySelector('.bound__ch')!.textContent).toBe('番');
    expect([...document.querySelectorAll('.choice')].map((b) => b.textContent)).toContain('tomato');
  });

  it('听一听: the speak button says 番茄', () => {
    render(<FlashcardStep {...base} word={fan} item={{ wordId: fan.id, isNew: false, retry: false }} voice ask="hear" onDone={vi.fn()} />);
    vi.mocked(speak).mockClear();
    fireEvent.click(document.querySelector('.speak--big')!);
    expect(speak).toHaveBeenCalledWith('番茄');
    expect([...document.querySelectorAll('.choice')].map((b) => b.textContent)).toContain('tomato');
  });

  it('after the answer, the pair is not shown a second time under it', () => {
    step(fan, { ask: 'meaningRead' });
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')].find((b) => b.textContent === 'tomato')!);
    expect(document.querySelector('.flash__prompt .usage')).toBeNull();
  });

  it('都不对: the answer shown after is the pair and its meaning', () => {
    step(fan, { ask: 'meaningRead', noneOfThese: 'answer' });
    fireEvent.click([...document.querySelectorAll<HTMLButtonElement>('.choice')][0]!);
    const detail = document.querySelector('.sheet__detail')!.textContent ?? '';
    expect(detail).toContain('番茄');
    expect(detail).toContain('tomato');
  });

  it('no lone bound character is ever the prompt of an English question', () => {
    const lone: string[] = [];
    for (const ch of boundChars()) {
      const w = byText.get(ch)!;
      step(w, { ask: 'meaningRead' });
      const q = document.querySelector('[data-q]')?.textContent;
      const choices = [...document.querySelectorAll('.choice')].map((b) => b.textContent);
      if (q !== boundPair(ch) || !choices.includes(firstSense(kidGloss(boundPair(ch)!)!))) lone.push(`${ch}: ${q} [${choices.join(', ')}]`);
      cleanup();
    }
    expect(lone).toEqual([]);
  });

  it('听一听 find the character: the pair\'s other character is never a wrong choice (蚂蚁 said, 蚁 not offered)', () => {
    for (const ch of '蚂蚁狐狸垃圾咖啡蜜蜂') {
      for (let k = 0; k < 4; k++) {
        const w = byText.get(ch)!;
        render(<FlashcardStep {...base} word={w} item={{ wordId: w.id, isNew: false, retry: false }} voice ask="listen" onDone={vi.fn()} />);
        const other = Array.from(boundPair(ch)!).filter((c) => c !== ch);
        const choices = [...document.querySelectorAll('.choice')].map((b) => b.textContent);
        expect(choices, ch).toContain(ch);
        for (const o of other) expect(choices, `${ch}: ${choices.join('')}`).not.toContain(o);
        cleanup();
      }
    }
  });
});
