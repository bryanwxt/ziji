import { Lightbulb } from 'lucide-preact';
import { Fragment, type ComponentChildren } from 'preact';
import { getCharInfo, hanChars } from '../../content';
import { radicalMeaning } from '../../content/radicals';
import { differingParts, partsSum, pinyinSlip } from '../../feedback/why';
import type { Word } from '../../types';
import { InkIcon } from '../icons/InkIcon';
import { Label } from '../Label';

/** "河 氵 water": a character, then each part only it has, with a meaningful radical's English. */
const partsText = (ch: string, parts: string[]) => [ch, ...parts.map((p) => (radicalMeaning(p) ? `${p} ${radicalMeaning(p)!.en}` : p))].join(' ');

/** The hint row's name (the miss sheet's third row, under ✓ 正确答案 and ✗ 你选的): a bulb and the words, with their pinyin. */
function WhyLabel({ zh }: { zh: string }) {
  return <span class="why__label"><Lightbulb class="why__mark" size={18} strokeWidth={3} aria-hidden="true" /><Label zh={zh} /></span>;
}

/** 「扫 = 扌 + 彐」: a character as the sum of its two parts, its own part coloured (the right one green, the picked one
 *  orange). Anything else (no shared part to show, or parts that overlap: 商's 口 inside its 冏) is no clean sum: the character
 *  and its own parts, as before. A radical's meaning follows. */
function CharParts({ ch, other, parts, right = false }: { ch: string; other: string; parts: string[]; right?: boolean }) {
  const sum = partsSum(ch, other);
  const meant = parts.filter((p) => radicalMeaning(p));
  return (
    <span class={`why__char${right ? ' why__char--right' : ''}`}>
      <span class="hanzi why__zh">{ch}</span>
      {sum.length === 2 ? (
        <span class="why__sum">
          <span class="why__op" aria-hidden="true">=</span>
          {sum.map((s, i) => (
            <Fragment key={s.part}>
              {i > 0 && <span class="why__op" aria-hidden="true">+</span>}
              {s.own ? <b class="hanzi why__own">{s.part}</b> : <span class="hanzi why__shared">{s.part}</span>}
            </Fragment>
          ))}
        </span>
      ) : parts.map((p) => <b key={p} class="hanzi why__own">{p}</b>)}
      {meant.map((p) => {
        const m = radicalMeaning(p)!;
        return <span key={p} class="why__part"><InkIcon name={m.icon} size={20} /><span lang="en">{m.en}</span></span>;
      })}
    </span>
  );
}

/**
 * A look-alike miss (spec 2026-10-12 §3): 不一样 and both characters, the right one first, each as the sum of its parts with
 * the part only it has coloured — 「扫 = 扌 + 彐 · 扬 = 扌 + 昜」 (parent 2026-10-16: "扫 彐 扬 昜" read as a stray row).
 * Nothing to tell apart (no shared part, or only trivial strokes): `fallback`, today's sheet.
 */
export function LookAlikeWhy({ right, picked, fallback = null }: { right: string; picked: string; fallback?: ComponentChildren }) {
  const d = differingParts(right, picked);
  if (!d.right.length && !d.picked.length) return <>{fallback}</>;
  return (
    <p class="why why--look" data-text={`${partsText(right, d.right)} · ${partsText(picked, d.picked)}`}>
      <WhyLabel zh="不一样" />
      <span class="why__body">
        <CharParts ch={right} other={picked} parts={d.right} right />
        <span class="why__dot" aria-hidden="true">·</span>
        <CharParts ch={picked} other={right} parts={d.picked} />
      </span>
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
        <WhyLabel zh="声调不同" />
        <span class="why__body">
          <span class="why__syl why__syl--right later">{slip.right}</span>
          <span class="why__syl later">{slip.picked}</span>
        </span>
      </p>
    );
  }
  if (slip.kind === 'soundPart') {
    return (
      <p class="why why--part" data-text={`${slip.part} 读 ${slip.partReading}，${slip.char} 读 ${slip.right}`}>
        <WhyLabel zh="读音" />
        <span class="why__body">
          <span class="why__clause"><span class="hanzi why__zh">{slip.part}</span><Label zh="读" /><span class="why__syl later">{slip.partReading}</span></span>
          <span class="why__dot" aria-hidden="true">，</span>
          <span class="why__clause"><span class="hanzi why__zh">{slip.char}</span><Label zh="读" /><span class="why__syl why__syl--right later">{slip.right}</span></span>
        </span>
      </p>
    );
  }
  if (slip.kind === 'initial' || slip.kind === 'final') {
    return (
      <p class={`why why--${slip.kind}`} data-text={`${slip.right.join('')} ${slip.picked.join('')}`}>
        <WhyLabel zh="读音" />
        <span class="why__body">
          <Marked kind={slip.kind} syl={slip.right} right />
          <Marked kind={slip.kind} syl={slip.picked} right={false} />
        </span>
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
      <WhyLabel zh="部首" />
      <span class="why__body">
        <b class="hanzi">{radical}</b>
        <span aria-hidden="true">→</span>
        <InkIcon name={m.icon} size={20} />
        <span lang="en">{m.en}</span>
      </span>
    </p>
  );
}
