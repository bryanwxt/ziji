// Every sentence written for the app that a child sees or hears (bank gaps and misuses, the Understand rung's sentences, the 成语
// sentences): what scripts/gen-pinyin.ts reads in context once and stores (sentencePinyin.json), so pinyin-pro never reads a
// sentence again on the iPad (content audit 2026-10-15: 教我 came out jiào, 切菜 qiè, 好好学习 hào).
import { CHENGYU } from './chengyu';
import { fillGap, SENTENCE_BANK } from './sentenceBank';
import s1a from './sentences/一上.json';
import s1b from './sentences/一下.json';
import s2a from './sentences/二上.json';
import s2b from './sentences/二下.json';

export function shownSentences(): string[] {
  const out = new Set<string>();
  for (const b of SENTENCE_BANK) {
    for (const g of b.gaps) out.add(fillGap(g, b.word));
    out.add(b.misuse);
  }
  for (const r of [s1a, s1b, s2a, s2b].flat() as { s: { zh: string }[] }[]) for (const s of r.s) out.add(s.zh);
  for (const c of CHENGYU) for (const s of c.sentences) out.add(s);
  return [...out];
}
