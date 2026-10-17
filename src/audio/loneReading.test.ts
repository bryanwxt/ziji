// Every place the app speaks gives a lone character its taught reading (parent 2026-10-15: 爪 said zhuǎ on its card, zhǎo
// alone; 长 on its card cháng, its speaker zhǎng). A new speak() or <SpeakButton> without `reading` fails here until it passes
// one, or is listed below as never a lone character.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');

/** `file: expression` said without a reading, and why it is never a lone character. */
const NEVER_LONE: Record<string, string> = {
  'ui/SpeakButton.tsx: text': 'passes `reading` when it is given one',
  'ui/worlds/WorldProps.tsx: o.speak': "a moment's line",
  'app/HomeScreen.tsx: wotdExample.text': 'a 组词',
  'parent/ListenPanel.tsx: model': 'a model sentence',
  'activities/choose/UseQuestion.tsx: fullSentence(item)': 'a sentence',
  'activities/choose/UseQuestion.tsx: s': 'a sentence',
  'activities/choose/UseQuestion.tsx: done ? fullSentence(item) : `${item.before}，，${item.after}`': 'a sentence, or one around its gap',
  'activities/say/SentenceCard.tsx: model': 'a model sentence',
  'activities/practice/FamilyQuestion.tsx: t': 'a board tile: a word',
  'activities/practice/IdiomQuestion.tsx: text': 'a 成语',
  'activities/practice/BuildSentence.tsx: item.full': 'a sentence',
  'activities/practice/PairGame.tsx: board.left[l]! + board.right[r]!': 'a joined word',
  'activities/practice/UnderstandQuestion.tsx: item.zh': 'a sentence',
  'activities/practice/MatchQuestion.tsx: pair': 'a word',
  'activities/components/ComponentsStep.tsx: item.word': 'a word with a gap',
  'activities/kantu/StoryStep.tsx: screen.question': 'a question',
  'activities/kantu/StoryStep.tsx: screen.model': 'a model sentence',
  'activities/kantu/StoryStep.tsx: w': "a scene's word",
  'activities/langdu/LangduStep.tsx: sentences[answerAt]!': 'a sentence',
  'activities/langdu/LangduStep.tsx: thanksLine': 'the warm-up thank-you line',
  'langdu/useModelReader.ts: list.current[i]!': 'a sentence',
  'activities/flashcards/FlashcardStep.tsx: text': "the card's 组词 and usage line (introSpoken)",
  'activities/flashcards/FlashcardStep.tsx: quiz.cue.kind === \'sentence\' ? `${quiz.cue.before}，，${quiz.cue.after}` : quiz.cue.full': 'a cue line',
  'activities/flashcards/FlashcardStep.tsx: quiz.cue.full': 'a cue line',
  'activities/flashcards/FlashcardStep.tsx: phase === \'feedback\' ? quiz.cue.full : `${quiz.cue.before}，，${quiz.cue.after}`': 'a cue line',
  'story/StoryScreen.tsx: zh': "a story line",
  'story/StoryScreen.tsx: question.zh': 'a question',
  'story/StoryScreen.tsx: c': "a question's choice, keyed by its text in the clip inventory",
};

const sources = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  if (statSync(p).isDirectory()) return sources(p);
  return /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : [];
});

/** The text from `open` to its matching close (strings and template literals kept whole). */
function balanced(s: string, at: number, open: string, close: string): string {
  let depth = 0;
  for (let i = at; i < s.length; i++) {
    const c = s[i]!;
    if (c === "'" || c === '"' || c === '`') { i = s.indexOf(c, i + 1); continue; }
    if (c === open) depth++;
    else if (c === close && --depth === 0) return s.slice(at + 1, i);
  }
  return s.slice(at + 1);
}

/** The first argument of a call, up to its first top-level comma. */
function firstArg(args: string): string {
  let depth = 0;
  for (let i = 0; i < args.length; i++) {
    const c = args[i]!;
    if (c === "'" || c === '"' || c === '`') { i = args.indexOf(c, i + 1); continue; }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ',' && depth === 0) return args.slice(0, i).trim();
  }
  return args.trim();
}

/** Every speak() and <SpeakButton> said without a reading, as `file: expression`. */
export function unreadSpeech(file: string, code: string): string[] {
  const src = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const out: string[] = [];
  for (const m of src.matchAll(/(?<![\w.])speak\(/g)) {
    const args = balanced(src, m.index + m[0].length - 1, '(', ')');
    if (/\breading\b/.test(args)) continue;
    out.push(`${file}: ${firstArg(args)}`);
  }
  for (const m of src.matchAll(/<SpeakButton\b/g)) {
    const end = src.indexOf('/>', m.index);
    const tag = src.slice(m.index, end);
    if (/\breading=/.test(tag)) continue;
    const at = tag.indexOf('text={');
    out.push(`${file}: ${at < 0 ? tag : balanced(tag, at + 5, '{', '}')}`);
  }
  // a literal of two or more characters is never a lone character
  return out.filter((x) => !/: (['"`])[^'"`]{2,}\1$/.test(x) || x.includes('${'));
}

describe('a lone character is never spoken without its reading', () => {
  it('finds speech said without a reading', () => {
    expect(unreadSpeech('x.tsx', 'speak(word.text); speak(a, { reading: r }); speak(\'你好！\'); speak(`${ch}`); <SpeakButton text={c.char} /> <SpeakButton text={c.char} reading={c.pinyin} />'))
      .toEqual(['x.tsx: word.text', 'x.tsx: `${ch}`', 'x.tsx: c.char']);
    expect(unreadSpeech('x.tsx', '// speak(x)\n/* speak(y) */ stopSpeaking(); u.speak(z)')).toEqual([]);
  });
  it('every speak() and <SpeakButton> in the app passes a reading, or says only words and sentences', () => {
    const found = sources(ROOT).flatMap((p) => unreadSpeech(relative(ROOT, p).split('\\').join('/'), readFileSync(p, 'utf8')));
    expect(found.filter((x) => !(x in NEVER_LONE))).toEqual([]);
    expect(Object.keys(NEVER_LONE).filter((k) => !found.includes(k))).toEqual([]); // no stale entries
  });
});
