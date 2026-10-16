import { createContext, type ComponentChildren } from 'preact';
import { useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';

/** How long a tapped syllable shows (spec 2026-10-12 §4). */
export const PEEK_MS = 3000;

/** The readings each known character has in the words he reads (know.knownReadings): 只 → {zhī} from 一只. */
export type KnownReadings = ReadonlyMap<string, ReadonlySet<string>>;

const MARKS = /[\u0300\u0301\u0304\u030c]/g; // the four tone marks (not ü's dots)
const bare = (syl: string) => syl.normalize('NFD').replace(MARKS, '').normalize('NFC');
/** 一 and 不 change tone in speech without being another reading (as content's saysItAs). */
const SANDHI: Record<string, readonly string[]> = { 一: ['yī', 'yí', 'yì'], 不: ['bù', 'bú'] };

/** Is `syl` a reading of `ch` he knows: the same syllable, a 轻声 one of the same sound (杯子 zi), or 一/不's tone change. */
function knownAt(ch: string, syl: string, readings: ReadonlySet<string>): boolean {
  const s = syl.trim().toLowerCase().normalize('NFC');
  if (readings.has(s)) return true;
  if (bare(s) === s && [...readings].some((r) => bare(r) === s)) return true;
  return !!SANDHI[ch]?.includes(s) && [...readings].some((r) => SANDHI[ch]!.includes(r));
}

/**
 * Spec 2026-10-12 §4: a character's pinyin shows until its Read rung passes (`known`: know.knownChars); the switch off shows it
 * always. Per reading (final review I1): with its syllable here, a 多音字 hides only at a reading he knows (只 known as zhī in 一只
 * still shows over 只有 zhǐ). No syllable, or no reading on record for a known character (its word's pinyin didn't line up one
 * syllable per character): the character alone decides.
 */
export function showPinyin(ch: string, syl: string | undefined, known: ReadonlySet<string>, readings: KnownReadings | undefined, fade: boolean): boolean {
  if (!fade || !known.has(ch)) return true;
  const own = readings?.get(ch);
  if (syl === undefined || !own?.size) return false;
  return !knownAt(ch, syl, own);
}

export interface PinyinFadeValue {
  show: (ch: string, syl?: string) => boolean;
  peeked: { label: number; cell: number } | null; // the one syllable peeking now
  peek: (label: number, cell: number) => void;
}

export const PinyinFadeContext = createContext<PinyinFadeValue | null>(null);

/** Fading for the lines inside it that opt in (`<Label fade>`), and the one peek at a time (spec 2026-10-12 §4). */
export function PinyinFade({ known, readings, on, children }: { known: ReadonlySet<string>; readings?: KnownReadings; on: boolean; children: ComponentChildren }) {
  const [peeked, setPeeked] = useState<PinyinFadeValue['peeked']>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = useMemo(() => (ch: string, syl?: string) => showPinyin(ch, syl, known, readings, on), [known, readings, on]);
  const value = useMemo<PinyinFadeValue>(() => ({
    show,
    peeked,
    peek: (label, cell) => {
      clearTimeout(timer.current); // a new peek replaces the last and gets its own 3 s
      setPeeked({ label, cell });
      timer.current = setTimeout(() => setPeeked(null), PEEK_MS);
    },
  }), [show, peeked]);
  return <PinyinFadeContext.Provider value={value}>{children}</PinyinFadeContext.Provider>;
}

/** Characters whose pinyin always shows inside it (a passage's transliterated names, spec 2026-10-15 §3); the fade decides the rest. */
export function KeepPinyin({ chars, children }: { chars: ReadonlySet<string>; children: ComponentChildren }) {
  const outer = useContext(PinyinFadeContext);
  const value = useMemo(() => (outer && chars.size ? { ...outer, show: (ch: string, syl?: string) => chars.has(ch) || outer.show(ch, syl) } : outer), [outer, chars]);
  return <PinyinFadeContext.Provider value={value}>{children}</PinyinFadeContext.Provider>;
}
