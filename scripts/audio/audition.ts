// The voice audition (spec 2026-10-06 §4): the same 20 hard items from each engine, for the parent to listen to on the iPad.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pinyin } from 'pinyin-pro';
import { engineText, type ClipJob, type ClipKind } from './inventory-lib';

const sentence = (t: string) => pinyin(t, { type: 'array', nonZh: 'removed' }).join(' ');
const S = (id: string, label: string, text: string) => ({ id, label, text, expected: sentence(text), kind: 'sentence' as ClipKind });
const W = (id: string, label: string, text: string, expected: string) =>
  ({ id, label, text, expected, kind: (Array.from(text).length === 1 ? 'char' : 'word') as ClipKind });

export const AUDITION = [
  W('a01', 'A plain word', '门', 'mén'),
  W('a02', '多音字 on its own: tiáo, not diào', '调', 'tiáo'),
  W('a03', '多音字 in a word: kōng tiáo', '空调', 'kōng tiáo'),
  W('a04', '多音字 in a word: zhǎng dà', '长大', 'zhǎng dà'),
  W('a05', '多音字 in a word: yín háng', '银行', 'yín háng'),
  W('a06', '一 sandhi: yì qǐ', '一起', 'yì qǐ'),
  W('a07', '一 sandhi: yí gè', '一个', 'yí gè'),
  W('a08', '不 sandhi: bú duì', '不对', 'bú duì'),
  W('a09', 'Third-tone sandhi: ní hǎo', '你好', 'nǐ hǎo'),
  W('a10', 'Three third tones in a row', '展览馆', 'zhǎn lǎn guǎn'),
  W('a11', '轻声: dōng xi', '东西', 'dōng xi'),
  W('a12', '儿化: nǎr', '哪儿', 'nǎ r'),
  W('a13', '儿化 in a word: hǎo wánr', '好玩儿', 'hǎo wán r'),
  W('a14', 'A 成语', '四面八方', 'sì miàn bā fāng'),
  W('a15', '轻声 in a word: xiào hua', '笑话', 'xiào hua'),
  S('a16', 'A short sentence', '我们一起去公园玩儿吧！'),
  S('a17', 'A sentence with pauses', '妈妈说，下雨了，我们不要出去。'),
  S('a18', 'A question (rising, friendly)', '你今天在学校做了什么？'),
  S('a19', '听写 cue: cháng, as a teacher says it', '长，长城的长'),
  S('a20', 'A story paragraph', '小猫看见一条小鱼在水里游来游去。它想：“我要是能抓到它就好了！”可是小鱼太快了，小猫怎么也抓不到。'),
];

export function auditionJobs(): (ClipJob & { label: string })[] {
  return AUDITION.map((a) => {
    const e = a.kind === 'sentence' ? { text: a.text, sure: true } : engineText(a.text, a.expected);
    return { ...a, key: a.id, engineText: e.text, sure: e.sure };
  });
}

if (process.argv[1]?.endsWith('audition.ts')) {
  const out = process.argv[2] ?? 'build/audio/audition-jobs.json';
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(auditionJobs(), null, 1));
  console.log(`audition: ${AUDITION.length} items → ${out}`);
}
