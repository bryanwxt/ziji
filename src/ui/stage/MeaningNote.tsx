import { chengyuOf } from '../../content/chengyu';
import { glossFor } from '../../content/glossary';

/** English for a word on the sheet: a 成语's from the 成语 list, else the glossary's. */
const englishFor = (text: string): string | undefined => chengyuOf(text)?.meaning ?? glossFor(text);

/**
 * After a wrong answer (spec 2026-10-05 §3.6): what the right answer means in English, then what he picked when that is a
 * real word ("根 root · 跟 to follow"). The question itself stays Chinese; this shows only on the sheet after a miss.
 */
export function MeaningNote({ right, picked = null, rightMeaning }: { right: string; picked?: string | null; rightMeaning?: string }) {
  const mine = chengyuOf(right)?.meaning ?? rightMeaning ?? glossFor(right); // the 成语 list, then a school word's own meaning, then the glossary
  const theirs = picked && picked !== right ? englishFor(picked) : undefined;
  if (!mine && !theirs) return null;
  return (
    <p class="sheet__en" lang="en">
      {mine && <span class="sheet__en-right">{right} {mine}</span>}
      {theirs && <span>{picked} {theirs}</span>}
    </p>
  );
}
