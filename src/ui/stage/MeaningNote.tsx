import { SpeakButton } from '../SpeakButton';
import { Label } from '../Label';
import { chengyuOf } from '../../content/chengyu';
import { choiceGloss, pickedNote, type PickedNote } from '../../practice/missNote';

/**
 * After a wrong answer (spec 2026-10-05 §3.6): what the right answer means in English, then what he picked with its English
 * ("根 root · 跟 to follow"; missNote.ts: a bound character as its pair, a pinyin or English choice as the word it belongs to,
 * 都不对 said plainly). The question itself stays Chinese; this shows only on the sheet after a miss.
 */
export function MeaningNote({ right, picked = null, rightMeaning, rightPinyin, answerLabel }: {
  right: string;
  /** a Chinese choice he picked (looked up), or the line for it already made; only ever passed after a miss */
  picked?: string | PickedNote | null;
  rightMeaning?: string; rightPinyin?: string;
  /** "正确答案：": the right answer leads its own line, with a speak button, so it isn't shown twice (parent, 2026-10-05) */
  answerLabel?: string;
}) {
  const mine = chengyuOf(right)?.meaning ?? rightMeaning ?? choiceGloss(right); // the 成语 list, then a school word's own meaning, then the glossary (or a decoy's kid gloss)
  // what he picked: a real word with its English, or a single character he may not know how to say; never a made-up 组词
  const wrong = typeof picked === 'string' ? (picked !== right ? pickedNote(picked) : null) : picked;
  if (!mine && !wrong && !answerLabel) return null;
  const text = [mine && `${right} ${mine}`, wrong && `${wrong.zh}${wrong.en ? ` ${wrong.en}` : ''}`].filter(Boolean).join(' ');
  // each with its pinyin over it: he may not know how to say the one he picked (parent, 2026-10-05)
  return (
    <div class="sheet__en" data-text={text}>
      {(mine || answerLabel) && (
        <p class="sheet__en-line sheet__en-right">
          {answerLabel && <span class="sheet__en-label">{answerLabel}</span>}
          <span class="sheet__en-zh"><Label zh={right} py={rightPinyin} /></span>
          {answerLabel && <SpeakButton text={right} reading={rightPinyin} small />}
          {mine && <span lang="en">{mine}</span>}
        </p>
      )}
      {wrong && <p class="sheet__en-line sheet__en-picked"><span class="sheet__en-zh"><Label zh={wrong.zh} py={wrong.py} mark={wrong.mark} /></span>{wrong.en && <span lang="en">{wrong.en}</span>}</p>}
    </div>
  );
}
