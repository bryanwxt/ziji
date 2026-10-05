import { glossFor } from '../../content/glossary';

/**
 * After a wrong answer (spec 2026-10-05 §3.6): what the right answer means in English, then what he picked when that is a
 * real word ("根 root · 跟 to follow"). The question itself stays Chinese; this shows only on the sheet after a miss.
 */
export function MeaningNote({ right, picked = null }: { right: string; picked?: string | null }) {
  const mine = glossFor(right);
  const theirs = picked && picked !== right ? glossFor(picked) : undefined;
  if (!mine && !theirs) return null;
  return (
    <p class="sheet__en" lang="en">
      {mine && <span class="sheet__en-right">{right} {mine}</span>}
      {theirs && <span>{picked} {theirs}</span>}
    </p>
  );
}
