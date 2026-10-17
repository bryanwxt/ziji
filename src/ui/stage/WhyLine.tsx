import { Lightbulb } from 'lucide-preact';
import { Fragment, type ComponentChildren } from 'preact';
import { getCharInfo, hanChars } from '../../content';
import { radicalMeaning } from '../../content/radicals';
import { lookAlike, partsToShow, pinyinSlip } from '../../feedback/why';
import type { Word } from '../../types';
import { InkIcon } from '../icons/InkIcon';
import { Label } from '../Label';

/** "河 氵 water": a character, then each part only it has that the line shows, with a meaningful radical's English. */
const partsText = (ch: string, shown: Shown) => {
  const own = !shown ? [] : shown.kind === 'sum' ? shown.parts.filter((s) => s.own).map((s) => s.part) : shown.parts;
  return [ch, ...own.map((p) => (radicalMeaning(p) ? `${p} ${radicalMeaning(p)!.en}` : p))].join(' ');
};

type Shown = ReturnType<typeof partsToShow>;

/** The hint row's name (the miss sheet's third row, under ✓ 正确答案 and ✗ 你选的): a bulb and the words, with their pinyin. */
function WhyLabel({ zh }: { zh: string }) {
  return <span class="why__label"><Lightbulb class="why__mark" size={18} strokeWidth={3} aria-hidden="true" /><Label zh={zh} /></span>;
}

/** 「扫 = 扌 + 彐」: a character as the sum of its two parts, its own part coloured (the right one green, the picked one
 *  orange); else the parts only it has. Only parts a P1–P3 child knows (review 2026-10-17): with any other, the character
 *  alone. A radical's meaning follows. */
function CharParts({ ch, shown, right = false }: { ch: string; shown: Shown; right?: boolean }) {
  const own = !shown ? [] : shown.kind === 'sum' ? shown.parts.filter((s) => s.own).map((s) => s.part) : shown.parts;
  const meant = own.filter((p) => radicalMeaning(p));
  return (
    <span class={`why__char${right ? ' why__char--right' : ''}`}>
      <span class="hanzi why__zh">{ch}</span>
      {shown?.kind === 'sum' ? (
        <span class="why__sum">
          <span class="why__op" aria-hidden="true">=</span>
          {shown.parts.map((s, i) => (
            <Fragment key={s.part}>
              {i > 0 && <span class="why__op" aria-hidden="true">+</span>}
              {s.own ? <b class="hanzi why__own">{s.part}</b> : <span class="hanzi why__shared">{s.part}</span>}
            </Fragment>
          ))}
        </span>
      ) : own.map((p) => <b key={p} class="hanzi why__own">{p}</b>)}
      {meant.map((p) => {
        const m = radicalMeaning(p)!;
        return <span key={p} class="why__part"><InkIcon name={m.icon} size={20} /><span lang="en">{m.en}</span></span>;
      })}
    </span>
  );
}

/**
 * A look-alike miss (spec 2026-10-12 §3): 不一样 and both characters, the right one first, each as the sum of its parts with
 * the part only it has coloured — 「河 = 氵 + 可 · 何 = 亻 + 可」 (parent 2026-10-16: "扫 彐 扬 昜" read as a stray row).
 * Nothing to tell apart, characters that don't really look alike (衣 · 商), or no part he knows to show: `fallback`, today's
 * sheet (review 2026-10-17).
 */
export function LookAlikeWhy({ right, picked, fallback = null }: { right: string; picked: string; fallback?: ComponentChildren }) {
  if (!lookAlike(right, picked)) return <>{fallback}</>;
  const mine = partsToShow(right, picked);
  const theirs = partsToShow(picked, right);
  if (!mine && !theirs) return <>{fallback}</>;
  return (
    <p class="why why--look" data-text={`${partsText(right, mine)} · ${partsText(picked, theirs)}`}>
      <WhyLabel zh="不一样" />
      <span class="why__body">
        <CharParts ch={right} shown={mine} right />
        <span class="why__dot" aria-hidden="true">·</span>
        <CharParts ch={picked} shown={theirs} />
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
