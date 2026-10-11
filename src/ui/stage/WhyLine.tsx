import type { ComponentChildren } from 'preact';
import { getCharInfo, hanChars } from '../../content';
import { radicalMeaning } from '../../content/radicals';
import { differingParts, pinyinSlip } from '../../feedback/why';
import type { Word } from '../../types';
import { InkIcon } from '../icons/InkIcon';
import { Label } from '../Label';

/** "河 氵 water": a character, then each part only it has, with a meaningful radical's English. */
const partsText = (ch: string, parts: string[]) => [ch, ...parts.map((p) => (radicalMeaning(p) ? `${p} ${radicalMeaning(p)!.en}` : p))].join(' ');

function CharParts({ ch, parts, right = false }: { ch: string; parts: string[]; right?: boolean }) {
  return (
    <span class={`why__char${right ? ' why__char--right' : ''}`}>
      <span class="hanzi why__zh">{ch}</span>
      {parts.map((p) => {
        const m = radicalMeaning(p);
        return (
          <span key={p} class="why__part">
            <b class="hanzi">{p}</b>
            {m && <><InkIcon name={m.icon} size={20} /><span lang="en">{m.en}</span></>}
          </span>
        );
      })}
    </span>
  );
}

/**
 * A look-alike miss (spec 2026-10-12 §3): both characters, the right one first, each with the part only it has — 「河 氵water ·
 * 何 亻person」. Nothing to tell apart (no shared part, or only trivial strokes): `fallback`, today's sheet.
 */
export function LookAlikeWhy({ right, picked, fallback = null }: { right: string; picked: string; fallback?: ComponentChildren }) {
  const d = differingParts(right, picked);
  if (!d.right.length && !d.picked.length) return <>{fallback}</>;
  return (
    <p class="why why--look" data-text={`${partsText(right, d.right)} · ${partsText(picked, d.picked)}`}>
      <CharParts ch={right} parts={d.right} right />
      <span class="why__dot" aria-hidden="true">·</span>
      <CharParts ch={picked} parts={d.picked} />
    </p>
  );
}

/** One syllable with its initial or its final marked: the letters that differ. */
function Marked({ kind, syl, right }: { kind: 'initial' | 'final'; syl: [string, string]; right: boolean }) {
  return <span class={`why__syl later${right ? ' why__syl--right' : ''}`}>{kind === 'initial' ? <><mark>{syl[0]}</mark>{syl[1]}</> : <>{syl[0]}<mark>{syl[1]}</mark></>}</span>;
}

/** A pinyin miss (spec 2026-10-12 §3): 声调不同, the sound part's reading, or the letters that differ; another slip, nothing. */
export function PinyinWhy({ word, picked }: { word: Word; picked: string }) {
  const slip = pinyinSlip(word, picked);
  if (slip.kind === 'tone') {
    return (
      <p class="why why--tone" data-text={`声调不同 ${slip.right} ${slip.picked}`}>
        <span class="why__label"><Label zh="声调不同" /></span>
        <span class="why__syl why__syl--right later">{slip.right}</span>
        <span class="why__syl later">{slip.picked}</span>
      </p>
    );
  }
  if (slip.kind === 'soundPart') {
    return (
      <p class="why why--part" data-text={`${slip.part} 读 ${slip.partReading}，${slip.char} 读 ${slip.right}`}>
        <span class="hanzi why__zh">{slip.part}</span><Label zh="读" /><span class="why__syl later">{slip.partReading}</span>
        <span class="why__dot" aria-hidden="true">，</span>
        <span class="hanzi why__zh">{slip.char}</span><Label zh="读" /><span class="why__syl why__syl--right later">{slip.right}</span>
      </p>
    );
  }
  if (slip.kind === 'initial' || slip.kind === 'final') {
    return (
      <p class={`why why--${slip.kind}`} data-text={`${slip.right.join('')} ${slip.picked.join('')}`}>
        <Marked kind={slip.kind} syl={slip.right} right />
        <Marked kind={slip.kind} syl={slip.picked} right={false} />
      </p>
    );
  }
  return null;
}

/** A meaning miss (spec 2026-10-12 §3): 「氵 → water」 for a single character whose radical (not itself) has a meaning. */
export function RadicalHint({ text }: { text: string }) {
  const chars = hanChars(text);
  const radical = chars.length === 1 ? getCharInfo(chars[0]!)?.radical : undefined;
  const m = radical && radical !== chars[0] ? radicalMeaning(radical) : undefined;
  if (!radical || !m) return null;
  return (
    <p class="why why--radical" data-text={`${radical} → ${m.en}`}>
      <b class="hanzi">{radical}</b>
      <span aria-hidden="true">→</span>
      <InkIcon name={m.icon} size={20} />
      <span lang="en">{m.en}</span>
    </p>
  );
}
