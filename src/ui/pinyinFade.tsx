import { createContext, type ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

/** How long a tapped syllable shows (spec 2026-10-12 §4). */
export const PEEK_MS = 3000;

/** Spec 2026-10-12 §4: a character's pinyin shows until its Read rung passes (`known`: know.knownChars); the switch off shows it always. */
export function showPinyin(ch: string, known: ReadonlySet<string>, fade: boolean): boolean {
  return !fade || !known.has(ch);
}

export interface PinyinFadeValue {
  show: (ch: string) => boolean;
  peeked: { label: number; cell: number } | null; // the one syllable peeking now
  peek: (label: number, cell: number) => void;
}

export const PinyinFadeContext = createContext<PinyinFadeValue | null>(null);

/** Fading for the lines inside it that opt in (`<Label fade>`), and the one peek at a time (spec 2026-10-12 §4). */
export function PinyinFade({ known, on, children }: { known: ReadonlySet<string>; on: boolean; children: ComponentChildren }) {
  const [peeked, setPeeked] = useState<PinyinFadeValue['peeked']>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = useMemo(() => (ch: string) => showPinyin(ch, known, on), [known, on]);
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
