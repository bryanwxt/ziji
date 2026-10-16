import { Check, X } from 'lucide-preact';
import type { ComponentChildren } from 'preact';
import { SpeakButton } from '../SpeakButton';
import { Label } from '../Label';
import { chengyuOf } from '../../content/chengyu';
import { choiceGloss, pickedNote, type PickedNote } from '../../practice/missNote';

/** The two rows' names, each with its pinyin over it like all he reads. */
export const RIGHT_LABEL = '正确答案';
export const PICKED_LABEL = '你选的';

/**
 * After a wrong answer (spec 2026-10-05 §3.6): what the right answer means in English, then what he picked with its English
 * (missNote.ts: a bound character as its pair, a pinyin or English choice as the word it belongs to, 都不对 said plainly). The
 * question itself stays Chinese; this shows only on the sheet after a miss.
 *
 * A two-row comparison (parent 2026-10-16: "can the formatting of the wrong answer section be improved"): name | Chinese |
 * English in aligned columns, ✓ 正确答案 with a small speak button at the end of its row, then ✗ 你选的, quieter. A note with
 * no pick and nothing to lead is just the answer and its English (组句's sheet, a 都不对 question answered right elsewhere).
 */
export function MeaningNote({ right, picked = null, rightMeaning, rightPinyin, lead = false, speak = true, why = null }: {
  right: string;
  /** a Chinese choice he picked (looked up), or the line for it already made; only ever passed after a miss */
  picked?: string | PickedNote | null;
  rightMeaning?: string; rightPinyin?: string;
  /** the note leads the sheet: the right answer is named (正确答案) and has its speak button even with no pick */
  lead?: boolean;
  /** false: the sheet already says the answer above the note (搭配's pair), so its row has no second speak button */
  speak?: boolean;
  /** the why-line (WhyLine.tsx: 不一样 扫 = 扌 + 彐 …), the third row, its name in the names' column */
  why?: ComponentChildren;
}) {
  const mine = chengyuOf(right)?.meaning ?? rightMeaning ?? choiceGloss(right); // the 成语 list, then a school word's own meaning, then the glossary (or a decoy's kid gloss)
  // what he picked: a real word with its English, or a single character he may not know how to say; never a made-up 组词
  const wrong = typeof picked === 'string' ? (picked !== right ? pickedNote(picked) : null) : picked;
  if (!mine && !wrong && !lead) return <>{why}</>;
  const named = lead || !!wrong;
  // a word of three characters or more (a 成语, 字典 picked as its pair…): on a phone its English goes under the Chinese, or the
  // English column would be a few letters wide
  const long = [right, wrong?.zh ?? ''].some((t) => Array.from(t).length >= 3);
  const text = [mine && `${right} ${mine}`, wrong && `${wrong.zh}${wrong.en ? ` ${wrong.en}` : ''}`].filter(Boolean).join(' ');
  // each with its pinyin over it: he may not know how to say the one he picked (parent, 2026-10-05). Every row keeps all its
  // cells (an empty one holds its column), so the two rows line up
  return (
    <div class={`sheet__en${named ? ' sheet__en--named' : ''}${long ? ' sheet__en--long' : ''}`} data-text={text}>
      <p class="sheet__en-line sheet__en-right">
        {named && <span class="sheet__en-label"><Check class="sheet__en-mark" size={18} strokeWidth={3.5} aria-hidden="true" /><Label zh={RIGHT_LABEL} /></span>}
        <span class="sheet__en-zh"><Label zh={right} py={rightPinyin} /></span>
        <span class="sheet__en-gloss" lang="en">{mine ?? ''}</span>
        {named && speak && <SpeakButton text={right} reading={rightPinyin} small />}
      </p>
      {wrong && (
        <p class="sheet__en-line sheet__en-picked">
          <span class="sheet__en-label"><X class="sheet__en-mark" size={18} strokeWidth={3.5} aria-hidden="true" /><Label zh={PICKED_LABEL} /></span>
          <span class="sheet__en-zh"><Label zh={wrong.zh} py={wrong.py} mark={wrong.mark} /></span>
          <span class="sheet__en-gloss" lang="en">{wrong.en ?? ''}</span>
        </p>
      )}
      {why}
    </div>
  );
}
