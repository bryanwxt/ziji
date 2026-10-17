// The day's three talk cards (parent loop spec §4, 2026-10-18 update): his word (this week's list first, then his new class
// words), shared reading of today's 朗读 passage (谁 / 为什么 / 你觉得), and a rotating theme. Pure: load.ts reads the stores and
// keeps the day's picks in settings, so the same three show all day.
import { TALK_PROMPTS, TALK_THEMES } from '../content/talkPrompts';
import { parseDateKey } from '../lib/date';
import { mulberry32, seedFromString, shuffle, type Rng } from '../lib/random';
import type { PassageQuestion, TalkCard, TalkKind, TalkPrompt, TalkTheme } from '../types';

/** A card shown fewer than this many days ago (0–13) comes back only when its kind has nothing else (spec §4); 14 days ago can. */
export const NO_REPEAT_DAYS = 14;
/** A theme used this many days ago or fewer waits while another theme hasn't been (spec §4). */
export const THEME_GAP_DAYS = 6;
/** What was shown is remembered this long. */
export const SEEN_KEEP_DAYS = 60;
/** The day's three slots, in order. */
export const SLOTS: readonly TalkKind[] = ['word', 'reading', 'theme'];
export const KIND_LABEL: Readonly<Record<TalkKind, string>> = { word: '他的词', reading: '一起读', theme: '话题' };
export const KIND_EN: Readonly<Record<TalkKind, string>> = { word: 'His words', reading: 'Shared reading', theme: 'Topic' };

/** A word to talk about: its text, the parent's English, a sentence that uses it, its 组词, and where it came from. */
export interface TalkWord { text: string; gloss?: string; example?: string; zuci: string[]; from: 'list' | 'class' }
/** Today's 朗读 passage: its title and meaning questions (a parent text has one or none). */
export interface TalkPassage { id: string; title: string; questions: readonly PassageQuestion[] }
export interface PickInput {
  today: string; // local YYYY-MM-DD
  seen: Readonly<Record<string, string>>; // card id → last day shown
  words: readonly TalkWord[]; // best first: this week's list, then his new class words
  passage: TalkPassage | null; // null: 朗读 off, or nothing read today or yesterday
  bank?: readonly TalkPrompt[];
}

const daysAgo = (day: string, today: string) => Math.round((parseDateKey(today).getTime() - parseDateKey(day).getTime()) / 86_400_000);
const fresh = (id: string, seen: PickInput['seen'], today: string) => !seen[id] || daysAgo(seen[id]!, today) >= NO_REPEAT_DAYS;

/** Characters too common to say what a longer hook is about: 子 is not about 粽子, nor 人 about 机器人 (review 2026-10-18). */
const COMMON = new Set(Array.from('一不子人上下中小大心天气生学开会日了的是有在和我你他她它们个来去说看好多家年月水火山出地时后前里头老能要到这那就也都'));

/** How well a starter's hook fits his word:
 *  - 0: the same word;
 *  - 1: the hook doubles his character (爷爷 for 爷);
 *  - 2: his word holds a hook of two or more characters (新年 in 过新年);
 *  - 3: the hook starts with his character, unless it is a common one (鸡蛋 for 鸡; not 生气 for 生). It ranks after his own
 *    word starter (wordOptions);
 *  - null: none. A one-character hook never matches inside a longer word, and a character never matches the end of a hook. */
export function hookRank(hook: string, word: string): 0 | 1 | 2 | 3 | null {
  if (hook === word) return 0;
  const h = Array.from(hook), w = Array.from(word);
  if (w.length === 1 && h.every((c) => c === word)) return 1;
  if (h.length >= 2 && word.includes(hook)) return 2;
  if (w.length === 1 && h[0] === word && !COMMON.has(word)) return 3;
  return null;
}
/** Hook ranks his own word starter goes ahead of. */
const WEAK_HOOK = 3;
const bestHook = (p: TalkPrompt, word: string): number | null => {
  const ranks = p.hooks.map((h) => hookRank(h, word)).filter((r): r is 0 | 1 | 2 | 3 => r !== null);
  return ranks.length ? Math.min(...ranks) : null;
};

/** The theme whose starters are about the most of `words` (the weekly focus line); null when none is. */
export function themeForWords(words: readonly string[], bank: readonly TalkPrompt[] = TALK_PROMPTS): TalkTheme | null {
  let best: TalkTheme | null = null, most = 0;
  for (const t of TALK_THEMES) {
    const n = words.filter((w) => bank.some((p) => p.theme === t && bestHook(p, w) !== null)).length;
    if (n > most) { best = t; most = n; }
  }
  return best;
}

const fromPrompt = (p: TalkPrompt, kind: TalkKind, word?: string): TalkCard => ({
  kind, id: p.id, theme: p.theme, ...(word ? { word } : {}), open: p.open, en: p.en, followUps: [...p.followUps], pattern: p.pattern, sample: p.sample,
});

/** A word no starter is about (spec §4): one template, the word put to use in his own life. */
export function wordStarter(w: TalkWord): TalkCard {
  const x = `『${w.text}』`;
  const followUps = w.example
    ? [`用${x}说一说你自己的事。`, `${w.from === 'list' ? '书上有一句' : '有一句话'}：「${w.example}」你也用${x}说一句。`, `${x}还可以和哪些字一起用？`]
    : [`用${x}说一说你自己的事。`, `${x}可以和哪些字一起用？`];
  const where = w.from === 'list' ? "This week's list word" : 'A new word from class';
  return {
    kind: 'word', id: `w:${w.text}`, word: w.text,
    open: `你在哪里看到过${x}，或者听人说过${x}？`,
    en: `${where}: ${w.text}${w.gloss ? ` (${w.gloss})` : ''}. Where has he met it? Get him using it about his own day.`,
    followUps,
    pattern: `…${w.text}…`,
    sample: w.example ?? (w.zuci.length ? w.zuci.slice(0, 2).join('、') : w.text),
  };
}

/** The 你觉得 question a shared-reading card ends on; 「换一个」 moves to the next. */
export const THINK: readonly { zh: string; en: string }[] = [
  { zh: '你觉得书里谁做得最好？为什么？', en: 'Who in the story did best? Why?' },
  { zh: '如果你是书里的人，你会怎么做？', en: 'If he were in the story, what would he do?' },
  { zh: '你有没有碰到过这样的事？说一说。', en: 'Has something like this happened to him?' },
  { zh: '你觉得书里的事后来会怎么样？', en: 'What does he think happens next?' },
];
const WHY_OPEN = '书里的人做了一件什么事？他为什么这样做？你从哪一句知道的？';

/** A passage told as 「我」 (38 of 88): read aloud by the parent, 我 would mean the parent. Say whose 我 it is: 「我」家有… →
 *  书里的「我」家有…; 谁给我… → 书里，谁给「我」…. */
export function bookVoice(q: string): string {
  // a 我 inside someone's words (“别怕，我在你身边”) is theirs, and stays as it is
  const quoted = q.split(/(“[^”]*”)/).map((part) => (part.startsWith('“') ? part : part.replace(/我们|我/g, (m) => `「${m}」`))).join('');
  if (quoted === q) return q;
  return quoted.startsWith('「我') ? `书里的${quoted}` : `书里，${quoted}`;
}

/**
 * Shared reading of today's passage (spec §4, dialogic reading): read it together, then 谁 — the passage's 谁 question, else its
 * first other question, else 「《title》里有谁？」; 为什么 — its 为什么 question, else an open why that points back to the text;
 * 你觉得 — THINK[k]. `answers`: the passage's answer to each, null where the question is open.
 */
export function readingCard(p: TalkPassage, k: number): TalkCard {
  const isWhy = (q: PassageQuestion) => q.q.includes('为什么');
  const answer = (q: PassageQuestion) => q.choices[q.answer];
  const facts = p.questions.filter((q) => !isWhy(q));
  const who = facts.find((q) => q.q.includes('谁')) ?? facts[0];
  const why = p.questions.find(isWhy);
  const think = THINK[k % THINK.length]!;
  return {
    kind: 'reading', id: `r:${p.id}:${k % THINK.length}`, passageId: p.id,
    open: who ? bookVoice(who.q) : `《${p.title}》里有谁？`,
    en: `Shared reading: read 《${p.title}》 together, taking turns a sentence each, then ask who, why, and what he thinks. Last question: ${think.en}`,
    followUps: [why ? bookVoice(why.q) : WHY_OPEN, think.zh],
    pattern: '我觉得…因为…',
    sample: '',
    answers: [who ? answer(who) : null, why ? answer(why) : null, null],
  };
}

/** A slot's candidates in preference order: the first not shown in NO_REPEAT_DAYS wins, else the least recently shown. */
function pickFrom(options: readonly TalkCard[], input: PickInput, onScreen: ReadonlySet<string>): TalkCard | null {
  const open = options.filter((c) => !onScreen.has(c.id));
  const first = open.find((c) => fresh(c.id, input.seen, input.today));
  if (first) return first;
  return open.reduce<TalkCard | null>((best, c) => (!best || (input.seen[c.id] ?? '') < (input.seen[best.id] ?? '') ? c : best), null);
}

const lastShown = (ids: readonly string[], seen: PickInput['seen']) => ids.reduce((m, id) => ((seen[id] ?? '') > m ? seen[id]! : m), '');

/** His words' cards: for each word in order, the starters about it (best hook, then least recently shown), with its own word
 *  starter ahead of the weak ones (a hook his character only starts). */
function wordOptions(input: PickInput, rng: Rng): TalkCard[] {
  const bank = input.bank ?? TALK_PROMPTS;
  const out: TalkCard[] = [];
  const have = new Set<string>();
  for (const w of input.words) {
    const hooked = shuffle(bank, rng)
      .map((p) => ({ p, rank: bestHook(p, w.text) }))
      .filter((x): x is { p: TalkPrompt; rank: number } => x.rank !== null)
      .sort((a, b) => a.rank - b.rank || (input.seen[a.p.id] ?? '').localeCompare(input.seen[b.p.id] ?? ''));
    const push = (c: TalkCard) => { if (!have.has(c.id)) { have.add(c.id); out.push(c); } };
    for (const { p } of hooked.filter((x) => x.rank < WEAK_HOOK)) push(fromPrompt(p, 'word', w.text));
    push(wordStarter(w));
    for (const { p } of hooked.filter((x) => x.rank >= WEAK_HOOK)) push(fromPrompt(p, 'word', w.text));
  }
  return out;
}

/** Theme starters: themes not used in THEME_GAP_DAYS first, then the least recently used; on-screen themes last. Within a
 *  theme, the least recently shown first. Ties go by a shuffle seeded from the day. */
function themeOptions(input: PickInput, rng: Rng, busy: ReadonlySet<TalkTheme>): TalkCard[] {
  const bank = input.bank ?? TALK_PROMPTS;
  const used = (t: TalkTheme) => lastShown(bank.filter((p) => p.theme === t).map((p) => p.id), input.seen);
  const rested = (t: TalkTheme) => !used(t) || daysAgo(used(t), input.today) > THEME_GAP_DAYS;
  const themes = shuffle(TALK_THEMES, rng).sort((a, b) => Number(busy.has(a)) - Number(busy.has(b)) || Number(rested(b)) - Number(rested(a)) || used(a).localeCompare(used(b)));
  return themes.flatMap((t) =>
    shuffle(bank.filter((p) => p.theme === t), rng)
      .sort((a, b) => (input.seen[a.id] ?? '').localeCompare(input.seen[b.id] ?? ''))
      .map((p) => fromPrompt(p, 'theme')),
  );
}

const readingOptions = (input: PickInput): TalkCard[] => (input.passage ? THINK.map((_, k) => readingCard(input.passage!, k)) : []);

function fill(slot: number, cards: readonly (TalkCard | null)[], input: PickInput, rng: Rng, swapping = false): TalkCard | null {
  // a swap never gives back the card it replaces
  const onScreen = new Set(cards.filter((c, i): c is TalkCard => !!c && (swapping || i !== slot)).map((c) => c.id));
  const busy = new Set(cards.filter((c, i): c is TalkCard => !!c && i !== slot && !!c.theme).map((c) => c.theme!));
  const kind = SLOTS[slot]!;
  const own = kind === 'word' ? wordOptions(input, rng) : kind === 'reading' ? readingOptions(input) : [];
  // a slot with nothing of its own falls back to a theme starter (spec §4: 朗读 off; no words yet)
  return pickFrom(own, input, onScreen) ?? pickFrom(themeOptions(input, rng, busy), input, onScreen);
}

/** The day's three: the same input always picks the same three (the shuffle is seeded from the day). */
export function pickDay(input: PickInput): TalkCard[] {
  const rng = mulberry32(seedFromString(input.today));
  const cards: (TalkCard | null)[] = [null, null, null];
  for (let slot = 0; slot < SLOTS.length; slot++) cards[slot] = fill(slot, cards, input, rng);
  return cards.filter((c): c is TalkCard => !!c);
}

/** 「换一个」: the slot's next candidate (the cards on screen were shown today, so `input.seen` has them); nothing left, unchanged. */
export function swapCard(cards: readonly TalkCard[], slot: number, input: PickInput): TalkCard[] {
  const rng = mulberry32(seedFromString(`${input.today}#${slot}`));
  const next = fill(slot, cards, { ...input, seen: { ...input.seen, ...Object.fromEntries(cards.map((c) => [c.id, input.today])) } }, rng, true);
  return next ? cards.map((c, i) => (i === slot ? next : c)) : [...cards];
}

/** The reading slot once today's passage is read (load.ts): picked again for the passage when it shows anything else. */
export function followPassage(cards: readonly TalkCard[], input: PickInput): TalkCard[] {
  const slot = SLOTS.indexOf('reading');
  if (!input.passage || cards[slot]?.passageId === input.passage.id) return [...cards];
  const next = fill(slot, cards, input, mulberry32(seedFromString(`${input.today}#${slot}`)));
  return next ? cards.map((c, i) => (i === slot ? next : c)) : [...cards];
}

/** What was shown: today's cards marked, anything not shown in SEEN_KEEP_DAYS forgotten. */
export function markSeen(seen: Readonly<Record<string, string>>, cards: readonly Pick<TalkCard, 'id'>[], today: string): Record<string, string> {
  const kept = Object.entries(seen).filter(([, day]) => daysAgo(day, today) < SEEN_KEEP_DAYS);
  return { ...Object.fromEntries(kept), ...Object.fromEntries(cards.map((c) => [c.id, today])) };
}
