export type Section = 'words' | 'chars' | 'pairs' | 'idioms' | 'sentences' | 'other'; // chars: a 生字 column, never joined into words

const HAN = /\p{Script=Han}/u;
const PAGE_CODE = /^[A-Z]\d+-L\d+/i;
const COPYRIGHT = /©|all rights reserved|版权所有|pte\.? ?ltd|^百力果$|^berries$/i; // and the publisher's logo text
const OPTIONS = /[（(]\s*\d+\s*[）)]/; // (1) 狼 (2) 很
const BLANK = /_{2,}|＿{2,}/; // exercise sentences with a blank
const INSTRUCTION = /选一选|填号码|请家长|请你|登录|签名|作答|通关密语|上网/; // always an instruction
// Words that are instructions only on their own line of directions: never a lone word (完成, 家长) or a line inside a passage (小朋友们在踢球).
const MAYBE_INSTRUCTION = /写一写|记一记|读一读|学一学|小朋友|完成|看图|家长|学堂|巩固|示范/;
const LONE_WORD = /^\p{Script=Han}{1,4}$/u;
const PROSE = /[，。！？；“”]/;
const CIRCLED = /^[\u2460-\u2473\u2776-\u277F]/; // numbered instructions: ①–⑳ and ❶–❿
const HEADER = /^(?:[一二三四五六七八九十]+、|>|➤|▶|\d+[.、])?\s*(.*)$/;

function sectionOf(heading: string): Section | null {
  if (/成语/.test(heading)) return 'idioms';
  if (/搭配/.test(heading)) return 'pairs';
  if (/重点句|佳句|句子/.test(heading)) return 'sentences';
  if (/生字/.test(heading)) return 'chars';
  if (/词语|复习|字/.test(heading)) return 'words';
  if (/朗读|阅读|短文/.test(heading)) return 'other';
  return null;
}

/**
 * Live Text output → content lines tagged with the section they sit in. Headings set the section and are dropped.
 * A heading without a marker (一、 > ➤ ▶) is one only when it isn't itself a word (名字 and 句子 are words in a table).
 */
export function cleanLines(text: string, isWord: (w: string) => boolean = () => false): { line: string; section: Section }[] {
  const out: { line: string; section: Section }[] = [];
  const beforeFirstHeading: { line: string; section: Section }[] = []; // brand and title lines atop a worksheet
  let section: Section = 'words';
  let seenHeading = false;
  let inPassage = false; // the last kept line was prose: what follows may continue it
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/[\u3000\t]+/g, ' ').trim();
    if (!line || !HAN.test(line)) continue; // pinyin-only and Latin lines
    if (PAGE_CODE.test(line) || COPYRIGHT.test(line) || OPTIONS.test(line) || BLANK.test(line) || INSTRUCTION.test(line) || CIRCLED.test(line)) continue;
    const heading = HEADER.exec(line)![1]!;
    if (/^第.+课$/.test(heading)) {
      out.push({ line: heading, section: 'other' }); // the lesson title names the import
      continue;
    }
    const marked = /^(?:[一二三四五六七八九十]+、|>|➤|▶)/.test(line);
    const isHeading = marked || (!/[。！？，]/.test(line) && sectionOf(heading) !== null && heading.length <= 10 && !isWord(heading));
    if (isHeading) {
      section = sectionOf(heading) ?? section;
      seenHeading = true;
      inPassage = false;
      continue;
    }
    if (!inPassage && !LONE_WORD.test(line) && MAYBE_INSTRUCTION.test(line)) continue;
    inPassage = PROSE.test(line) || Array.from(line).length > 12;
    (seenHeading ? out : beforeFirstHeading).push({ line, section });
  }
  // A page with section headings: what sits above the first one is the page's own title. Plain pasted text keeps everything.
  return seenHeading ? out : [...out, ...beforeFirstHeading];
}
