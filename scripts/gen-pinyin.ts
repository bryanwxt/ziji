// Writes src/content/sentencePinyin.json: each sentence written for the app with its pinyin read in context (pinyin-pro and the
// app's fixes, src/content/pinyinFixes.ts), one syllable per Han character. Run after changing a sentence or a fix:
//   npm run pinyin
// src/content/contentGate.test.ts fails while the stored pinyin and a fresh reading disagree (a new sentence, or a pinyin-pro
// upgrade that reads one differently): check the change, then run this again.
import { writeFileSync } from 'node:fs';
import { sentenceReading } from '../src/content/wordGate';
import { shownSentences } from '../src/content/sentenceSources';

const sentences = shownSentences();
const body = sentences.map((s) => `  ${JSON.stringify(s)}: ${JSON.stringify(sentenceReading(s))}`).join(',\n');
writeFileSync(new URL('../src/content/sentencePinyin.json', import.meta.url), `{\n "sentences": {\n${body}\n }\n}\n`);
console.log(`Wrote the pinyin of ${sentences.length} sentences`);
