import { pinyin } from 'pinyin-pro';
import '../content/pinyinFixes';
import { storedPinyin } from '../content/storedPinyin';
import { useContext, useMemo, useRef } from 'preact/hooks';
import { speak } from '../audio/speech';
import { PinyinFadeContext } from './pinyinFade';

interface Cell {
  py: string; // its syllable, kept even when hidden (a peek shows it)
  ch: string;
  blank?: boolean;
  zh?: boolean; // a Han character (keeps its slot even when its pinyin is hidden)
  hidden?: boolean; // its pinyin is faded: he reads it (spec 2026-10-12 §4)
}

const BLANK = '＿';
/** The text as a screen reader should say it: a blank is 空格, not "full-width low line". */
export const spokenBlanks = (zh: string) => zh.replaceAll(BLANK, '空格');

let labels = 0; // each Label's own number: one peek shows at a time across the lesson screen

/** Chinese text with each syllable shown small directly above its own character, for a P2 reader. */
export function Label({ zh, py: given, pinyinFor, mark, fade = false, peek = true }: {
  zh: string;
  /** Han characters to highlight, as [first, count] counted in Han characters (the word inside a usage line) */
  mark?: [number, number];
  /** syllables for its Han characters, from context (子 in 儿子 is zi) */
  py?: string;
  /** which characters show their pinyin (all when omitted) — for fading pinyin as he learns; `syl`: its syllable here */
  pinyinFor?: (ch: string, syl: string) => boolean;
  /** a line inside a question (spec 2026-10-12 §4): under a <PinyinFade>, characters he reads lose their pinyin, slot kept */
  fade?: boolean;
  /** false inside a button (a usage option, a placed 组句 tile): a tap there answers, so it never peeks */
  peek?: boolean;
}) {
  const fader = useContext(PinyinFadeContext);
  const own = useRef(0);
  if (!own.current) own.current = ++labels;
  const showFor = pinyinFor ?? (fade && fader ? fader.show : undefined);
  const { cells, py } = useMemo(() => {
    const out: Cell[] = [];
    const all = pinyin(zh, { type: 'all' });
    // a sentence written for the app carries its pinyin read once in context (content audit 2026-10-15: 教我 jiāo, not jiào)
    const ctx = (given ?? storedPinyin(zh))?.trim().split(/\s+/);
    const zhCount = all.filter((d) => d.isZh).length;
    const fits = ctx && ctx.length === zhCount;
    // syllables for the blanks too: the gap's sound is the clue in a 组词 with its character missing (parent, 2026-10-05)
    const withBlanks = ctx && !fits && ctx.length === zhCount + (zh.match(/＿/g) ?? []).length;
    let k = 0;
    for (const d of all) {
      if (d.isZh) {
        const syl = fits || withBlanks ? ctx[k++]! : d.pinyin;
        out.push({ py: syl, ch: d.origin, zh: true, ...(showFor && !showFor(d.origin, syl) ? { hidden: true } : {}) });
        continue;
      }
      // pinyin-pro may hand a run like "＿！" over as one piece; split out each blank. Spaces around a number go: its own
      // slot keeps it apart, so "得到了 4 颗星" doesn't get wide gaps (parent, 2026-10-05)
      for (const part of d.origin.split(/(＿)/).map((p) => (/\d/.test(p) ? p.trim() : p)).filter((p) => p.trim() || p === BLANK)) {
        const prev = out[out.length - 1];
        if (part === BLANK) out.push({ py: withBlanks ? ctx[k++]! : '', ch: BLANK, blank: true });
        else if (prev && !prev.zh && !prev.blank) prev.ch += part; // keep "45" or "！" runs together
        else out.push({ py: '', ch: part });
      }
    }
    // data-py: the syllables shown plus any numbers or Latin text, without punctuation
    const py = out.map((c) => (c.zh ? (c.hidden ? '' : c.py) : !c.blank && /[\p{L}\p{N}]/u.test(c.ch) ? c.ch.trim() : '')).filter(Boolean).join(' ');
    return { cells: out, py };
  }, [zh, given, showFor]);
  const canPeek = fade && peek && !pinyinFor && !!fader;
  const open = canPeek ? fader!.peeked : null;
  const peeked = open && open.label === own.current ? open.cell : -1;
  let han = -1;
  const marked = (c: Cell) => !!mark && !!c.zh && (++han, han >= mark[0] && han < mark[0] + mark[1]);
  return (
    <span class="label" data-py={py} data-zh={zh}>
      {/* one cell already reads as the whole text; several get a single readable copy so 你好 isn't read 你…好 */}
      {cells.length > 1 && <span class="sr-only">{spokenBlanks(zh)}</span>}
      <span class="label__cells" aria-hidden={cells.length > 1 ? 'true' : undefined}>
        {cells.map((c, i) => {
          // a faded syllable peeks for 3 s when tapped, and is said (spec 2026-10-12 §4); a peek never grades anything
          const tap = c.hidden && canPeek ? () => { fader!.peek(own.current, i); speak(c.ch, { reading: c.py }); } : undefined;
          return (
            <span key={i} class={`${c.blank ? 'label__cell label__cell--blank' : c.zh ? 'label__cell label__cell--zh' : 'label__cell'}${marked(c) ? ' label__cell--mark' : ''}${c.hidden ? ' label__cell--hidden' : ''}${i === peeked ? ' label__cell--peek' : ''}`} onClick={tap}>
              <small class="label__py" aria-hidden="true">{c.hidden && i !== peeked ? '' : c.py}</small>
              <span class="label__ch">{c.ch}</span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
