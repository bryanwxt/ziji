// Words that never take an English-meaning question (kid glosses, parent 2026-10-15: 吗 "question particle for yes-no
// questions", 个 "an individual"). Each is never the target of 听一听 / 这个词是什么意思, never one of its wrong choices, and
// never a placement listening item. They still show a short note on the 认新字 card (kidGloss.json), and the ladder passes
// them by reading, understanding and using them: a word with no English question skips the Hear rung (rungs.ts canAskRung).
// Reviewable: add a word to the group it belongs to, with nothing else to change.

const GROUPS: Record<string, string> = {
  /** End-of-sentence sounds and interjections: a feeling, not a meaning. */
  particles: '了吗呢吧啊呀哈哎',
  /** Aspect markers and structural words: grammar a child uses before he can name it. */
  structural: '的地得着过们么把被所而之以于及其并然者第才将当就',
  /** Measure words with nothing concrete to picture (只 "one (for animals)" is fine; 个 is for anything). */
  measure: '个',
  /** Only a name or a prefix in his lessons (陈 / 吴 / 李 are family names in 三上's names lesson; 阿 is 阿姨's). */
  names: '陈吴李丁阿',
};

/** Multi-character words of the same kinds (a 词语 can be grammar too). */
const WORDS: Record<string, string[]> = {
  structural: ['的话', '什么的'], // "if" and "and so on" only as a sentence's tail
};

export const NO_ENGLISH_GROUPS: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  [...new Set([...Object.keys(GROUPS), ...Object.keys(WORDS)])].map((g) => [g, [...Array.from(GROUPS[g] ?? ''), ...(WORDS[g] ?? [])]]),
);

/** Every word that never takes an English-meaning question. */
export const NO_ENGLISH: ReadonlySet<string> = new Set(Object.values(NO_ENGLISH_GROUPS).flat());

export const noEnglishQuestion = (text: string): boolean => NO_ENGLISH.has(text);
