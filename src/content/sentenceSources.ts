// Every sentence written for the app that a child sees or hears (bank gaps and misuses, the Understand rung's sentences, the 成语
// sentences, 朗读's built-in passages): what scripts/gen-pinyin.ts snapshots (sentencePinyin.json, test-only), so a fix or a pinyin-pro upgrade that
// changes how one reads shows up in contentGate.test.ts (content audit 2026-10-15: 教我 came out jiào, 切菜 qiè, 好好学习 hào).
import { splitSentences } from '../langdu/sentences';
import { CHENGYU } from './chengyu';
import { PASSAGES } from './index';
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
  for (const p of PASSAGES) for (const s of splitSentences(p.text)) out.add(s); // 朗读's (spec 2026-10-15 §2.2: pinyin reviewed once)
  return [...out];
}
