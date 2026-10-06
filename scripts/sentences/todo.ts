import { allowedChars, inScopeWords, sentenceProblems, sentencesFor } from '../../src/content/understand';
import { cardMeaning } from '../../src/content/glossary';
const [term = '一上', from = '0', count = '60'] = process.argv.slice(2);
const todo = inScopeWords(term).filter((w) => sentenceProblems(w.text, sentencesFor(w.text)).length > 0);
console.log(`${todo.length} words of ${term} still to write`);
for (const w of todo.slice(Number(from), Number(from) + Number(count))) console.log(`${w.text}\t${w.pinyin}\t${cardMeaning(w)}`);
console.log(`ALLOWED ${[...allowedChars(term)].join('')}`);
