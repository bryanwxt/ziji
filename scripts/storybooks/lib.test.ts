// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hanChars } from '../../src/content';
import imported from '../../src/content/storybooks.json';
import { termIndex } from '../../src/langdu/level';
import type { Passage } from '../../src/types';
import { applyEdits, blockedIn, chunkPages, importAll, importStory, parseStory, type Manifest } from './lib';

const md = (title: string, pages: string[], licence = 'CC-BY') =>
  `# ${title}\n\n${pages.map((p) => `##\n${p}\n`).join('\n')}\n##\n* License: [${licence}]\n* Text: A. Writer\n* Illustration: B. Painter\n* Translation: C. Translator\n* Language: zh\n`;
const EASY = '我爸爸妈妈。'.repeat(12); // 60 characters read in 一上
const HARD = '魑魅魍魉饕。'.repeat(12); // 60 characters on no list

describe('parseStory (spec 2026-10-15 §2.1)', () => {
  it('reads the title, one page a ## block, and the credit list', () => {
    const s = parseStory(md('两个', ['两只手用来拿东西。', '两只脚\n用来踢踢球。'], 'CC-BY-NC'));
    expect(s).toEqual({ title: '两个', pages: ['两只手用来拿东西。', '两只脚用来踢踢球。'], licence: 'CC BY-NC 3.0', text: 'A. Writer', illustration: 'B. Painter', translation: 'C. Translator' });
  });
  it('an unknown licence, or no credit list, fails the import', () => {
    expect(() => parseStory(md('x', ['我。'], 'CC-BY-SA'))).toThrow(/unknown licence/);
    expect(() => parseStory('# x\n\n##\n我。\n')).toThrow(/no credit list/);
  });
});

describe('applyEdits', () => {
  const e = (from: string) => ({ from, to: '一点', why: 'Singapore usage' });
  it('replaces an edit found exactly once', () => {
    expect(applyEdits(['多给了一点儿。', '好。'], [e('一点儿')])).toEqual(['多给了一点。', '好。']);
  });
  it('a missing or ambiguous edit fails', () => {
    expect(() => applyEdits(['好。'], [e('一点儿')])).toThrow(/found 0 times/);
    expect(() => applyEdits(['一点儿。', '一点儿。'], [e('一点儿')])).toThrow(/found 2 times/);
  });
});

describe('chunkPages: page-aligned passages of 40–110 characters', () => {
  const page = (n: number) => '我'.repeat(n - 1) + '。';
  it('fills a passage up to 110 characters, then starts the next at a page', () => {
    expect(chunkPages([page(30), page(30), page(30), page(30), page(30)]).map((c) => [c.firstPage, c.text.length])).toEqual([[1, 90], [4, 60]]);
  });
  it('a short tail joins the passage before it', () => {
    expect(chunkPages([page(100), page(20)]).map((c) => c.text.length)).toEqual([120]);
  });
  it('a page over 110 characters is cut at its sentences', () => {
    const long = '我爱爸爸妈。'.repeat(30); // 150 characters, 30 sentences of 5
    expect(chunkPages([long]).map((c) => [c.firstPage, hanChars(c.text).length])).toEqual([[1, 110], [1, 40]]);
  });
});

describe('importStory', () => {
  const entry = { level: 1 as const, names: [] };
  it('one passage a chunk with its picture, its part and the credit; a single part keeps the plain title', () => {
    const s = importStory('9001_好.md', md('好', [EASY]), entry);
    expect(s.passages).toEqual([{ id: 'gsb:9001-1', title: '好', text: EASY, term: '一上', source: 'gsb', image: 'passages/gsb-9001-1.webp', story: { id: '9001', part: 1, parts: 1 }, credit: { title: '好', text: 'A. Writer', illustration: 'B. Painter', translation: 'C. Translator', licence: 'CC BY 3.0', adapted: false, source: 'https://github.com/global-asp/sbc-source/blob/be28dab38ac55e8eb2185edb6631b11615d02185/zh/9001_%E5%A5%BD.md' } }]);
    expect(s.images).toEqual([{ out: 'passages/gsb-9001-1.webp', page: '9001/02.jpg' }]);
  });
  it('a whole story: every chunk a part, in order, titled （1）（2）…', () => {
    const s = importStory('9002_好.md', md('好', [EASY, EASY]), entry);
    expect(s.passages.map((p) => [p.id, p.title, p.story])).toEqual([['gsb:9002-1', '好（1）', { id: '9002', part: 1, parts: 2 }], ['gsb:9002-2', '好（2）', { id: '9002', part: 2, parts: 2 }]]);
  });
  it('a story is kept only whole: one chunk he cannot read, at the start, in the middle or at the end, drops it all', () => {
    expect(importStory('9002_好.md', md('好', [EASY, HARD, EASY]), entry).passages).toEqual([]);
    expect(importStory('9003_好.md', md('好', [EASY, EASY, HARD]), entry).passages).toEqual([]);
    expect(importStory('9004_好.md', md('好', [HARD, EASY, EASY]), entry).passages).toEqual([]);
  });
  it('a chunk with a word from the blocklist is dropped like a chunk beyond 三上 (D2 allows no rewording)', () => {
    expect(blockedIn('孩子们说：“我们不是傻瓜。”')).toEqual(['傻瓜']);
    expect(blockedIn('兔子朝着河马大喊：“该死的河马！”')).toEqual(['该死']); // a curse: 0111's opening (excluded on theme)
    expect(blockedIn('他们住在一个富人的土地上。')).toEqual(['富人']); // a particle on the word: 0315
    expect(blockedIn('我们祝老师生日快乐。')).toEqual(['师生']); // the raw text too: a crossing drops a chunk, which errs safe
    const blocked = '我们不是傻瓜。'.repeat(10);
    expect(importStory('9006_好.md', md('好', [EASY, blocked, EASY]), entry).passages).toEqual([]);
  });
  it("the manifest gives a CC BY story's licence version (the Markdown says only CC-BY); it may not turn BY-NC into BY", () => {
    expect(importStory('9007_好.md', md('好', [EASY]), { ...entry, licence: 'CC BY 4.0' }).passages[0]!.credit!.licence).toBe('CC BY 4.0');
    expect(() => importStory('9008_好.md', md('好', [EASY], 'CC-BY-NC'), { ...entry, licence: 'CC BY 4.0' })).toThrow(/licence/);
  });
  it("a name in the story's title is on every passage, since the title shows with each", () => {
    const s = importStory('9009_卡莱.md', md('卡莱', [EASY, EASY]), { level: 1, names: ['卡莱'] });
    expect(s.passages.map((p) => p.names)).toEqual([['卡莱'], ['卡莱']]);
  });
  it('names are left out of the level and kept on the passage that has them; an edited story is adapted', () => {
    const s = importStory('9005_好.md', md('好', [EASY + '卡莱'.repeat(10) + '斑馬。']), { level: 1, names: ['卡莱', '旺加里'], edits: [{ from: '斑馬', to: '斑马', why: 'a traditional character' }] });
    expect(s.passages[0]).toMatchObject({ term: '一上', names: ['卡莱'], credit: { adapted: true } }); // counted, the 20 name characters would leave it unlevelled
    expect(s.passages[0]!.text.endsWith('斑马。')).toBe(true);
  });
});

describe('the vendored stories (scripts/storybooks/zh at be28dab)', () => {
  const manifest = JSON.parse(readFileSync('scripts/storybooks/manifest.json', 'utf8')) as Manifest;
  const files = readdirSync('scripts/storybooks/zh').filter((f) => f.endsWith('.md')).sort();
  const passages = (imported as unknown as { passages: Passage[] }).passages;
  it('all 40 are vendored and in the manifest', () => {
    expect(files).toHaveLength(40);
    expect(files.map((f) => f.slice(0, 4))).toEqual(Object.keys(manifest).sort());
  });
  it('storybooks.json is exactly what the import makes of them (deterministic, nothing hand-edited)', () => {
    expect(importAll(manifest, files.map((file) => ({ file, md: readFileSync(`scripts/storybooks/zh/${file}`, 'utf8') }))).flatMap((s) => s.passages)).toEqual(passages);
  });
  it('all read by 三上, each credited and licensed, each with its picture within budget', () => {
    expect(passages.filter((p) => termIndex(p.term) < 0 || termIndex(p.term) > termIndex('三上'))).toEqual([]);
    expect(passages.filter((p) => !p.credit || !['CC BY 3.0', 'CC BY 4.0', 'CC BY-NC 3.0'].includes(p.credit.licence) || !p.credit.text || !p.credit.illustration || !p.credit.translation)).toEqual([]);
    const sizes = passages.map((p) => statSync(`public/${p.image}`).size);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(60_000);
    expect(sizes.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(1_500_000);
  });
  it('the CC BY-NC stories are the eleven the spec lists (D1: included)', () => {
    const nc = files.filter((f) => parseStory(readFileSync(`scripts/storybooks/zh/${f}`, 'utf8')).licence === 'CC BY-NC 3.0').map((f) => f.slice(0, 4));
    expect(nc).toEqual(['0002', '0003', '0009', '0030', '0067', '0112', '0120', '0129', '0231', '0234', '0271']);
  });
  it("the CC BY 4.0 stories are the nine Global ASP's master index gives 4.0 (global-asp/global-asp MASTER.md at 54c9b23; the site agrees)", () => {
    expect(Object.entries(manifest).filter(([, e]) => e.licence === 'CC BY 4.0').map(([id]) => id)).toEqual(['0027', '0089', '0110', '0201', '0243', '0262', '0296', '0315', '0324']);
  });
  it('the stories excluded stay out, each with its reason: on theme 0004 0052 0066 0072 0111 0342; needing the pictures 0003 0112', () => {
    const out = ['0003', '0004', '0052', '0066', '0072', '0111', '0112', '0342'];
    expect(Object.entries(manifest).filter(([, e]) => e.include === false).map(([id]) => id)).toEqual(out);
    expect(Object.entries(manifest).filter(([, e]) => e.include === false && !e.why).map(([id]) => id)).toEqual([]);
    expect(passages.filter((p) => out.includes(p.story!.id))).toEqual([]);
  });
  it('every story is whole: parts 1…n, none missing (fix round 2026-10-15: no holes, no dropped ending)', () => {
    const parts = new Map<string, number[]>();
    for (const p of passages) parts.set(p.story!.id, [...(parts.get(p.story!.id) ?? []), p.story!.part]);
    expect([...parts].filter(([id, ps]) => ps.join() !== ps.map((_, i) => i + 1).join() || passages.find((p) => p.story!.id === id)!.story!.parts !== ps.length)).toEqual([]);
    expect(passages).toHaveLength(15);
  });
  it('every edited story is marked adapted, and only those', () => {
    const edited = new Set(Object.entries(manifest).filter(([, e]) => e.edits?.length).map(([id]) => id));
    expect(passages.filter((p) => p.credit!.adapted !== edited.has(p.story!.id)).map((p) => p.id)).toEqual([]);
  });
});
