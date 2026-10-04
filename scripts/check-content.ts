import type { BuiltinChar, Passage } from '../src/types';

const HAN = /\p{Script=Han}/u;

export function checkContent(chars: BuiltinChar[], passages: Passage[], hasStrokeFile: (char: string) => boolean): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const c of chars) {
    if (seen.has(c.char)) problems.push(`duplicate ${c.char}`);
    seen.add(c.char);
    if (!c.pinyin.trim()) problems.push(`${c.char}: no pinyin`);
    if (!c.meaning.trim()) problems.push(`${c.char}: no meaning`);
    if (!c.radical) problems.push(`${c.char}: no radical`);
    if (!hasStrokeFile(c.char)) problems.push(`${c.char}: no stroke data`);
  }
  for (const level of [1, 2, 3, 4, 5, 6, 7] as const) {
    const n = chars.filter((c) => c.level === level).length;
    const expected = level === 7 ? 1200 : 300; // HSK 3.0: 300 per level for 1–6, 1,200 for 七—九级
    if (n !== expected) problems.push(`level ${level} has ${n} characters, expected ${expected}`);
  }

  const easy = new Set(chars.filter((c) => c.level <= 2).map((c) => c.char));
  const ids = new Set<string>();
  for (const p of passages) {
    if (ids.has(p.id)) problems.push(`duplicate passage ${p.id}`);
    ids.add(p.id);
    const han = Array.from(p.text).filter((ch) => HAN.test(ch));
    if (han.length < 30 || han.length > 80) problems.push(`${p.id}: ${han.length} characters, expected 30–80`);
    const outside = [...new Set(han.filter((ch) => !easy.has(ch)))];
    if (outside.length) problems.push(`${p.id}: uses ${outside.join('')} outside levels 1–2`);
  }
  return problems;
}
