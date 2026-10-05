import { SpeakButton } from '../SpeakButton';
import { Label } from '../Label';
import { chengyuOf } from '../../content/chengyu';
import { glossFor } from '../../content/glossary';

/** English for a word on the sheet: a 成语's from the 成语 list, else the glossary's. */
const englishFor = (text: string): string | undefined => chengyuOf(text)?.meaning ?? glossFor(text);

/**
 * After a wrong answer (spec 2026-10-05 §3.6): what the right answer means in English, then what he picked when that is a
 * real word ("根 root · 跟 to follow"). The question itself stays Chinese; this shows only on the sheet after a miss.
 */
export function MeaningNote({ right, picked = null, rightMeaning, rightPinyin, answerLabel }: {
  right: string; picked?: string | null; rightMeaning?: string; rightPinyin?: string;
  /** "正确答案：": the right answer leads its own line, with a speak button, so it isn't shown twice (parent, 2026-10-05) */
  answerLabel?: string;
}) {
  const mine = chengyuOf(right)?.meaning ?? rightMeaning ?? glossFor(right); // the 成语 list, then a school word's own meaning, then the glossary
  const theirs = picked && picked !== right ? englishFor(picked) : undefined;
  // what he picked: a real word with its English, or a single character he may not know how to say; never a made-up 组词 or a pinyin choice
  const wrong = picked && picked !== right && (theirs || /^\p{Script=Han}$/u.test(picked)) ? picked : null;
  if (!mine && !wrong && !answerLabel) return null;
  const text = [mine && `${right} ${mine}`, wrong && `${wrong}${theirs ? ` ${theirs}` : ''}`].filter(Boolean).join(' ');
  // each with its pinyin over it: he may not know how to say the one he picked (parent, 2026-10-05)
  return (
    <div class="sheet__en" data-text={text}>
      {(mine || answerLabel) && (
        <p class="sheet__en-line sheet__en-right">
          {answerLabel && <span class="sheet__en-label">{answerLabel}</span>}
          <span class="sheet__en-zh"><Label zh={right} py={rightPinyin} /></span>
          {answerLabel && <SpeakButton text={right} small />}
          {mine && <span lang="en">{mine}</span>}
        </p>
      )}
      {wrong && <p class="sheet__en-line"><span class="sheet__en-zh"><Label zh={wrong} /></span>{theirs && <span lang="en">{theirs}</span>}</p>}
    </div>
  );
}
