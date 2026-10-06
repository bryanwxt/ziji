// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { chapterProblems, outlineProblems, seasonReport, storyWords } from './check';
import { parseChapter, type OutlineRow } from './format';

const page = (body: string) => `### Page 1\n${body}\n`;
const make = (o: { slots?: string; setup?: string; granny?: string; listen?: string; payoff?: string; chapter?: number } = {}) => parseChapter(`---
chapter: ${o.chapter ?? 1}
title: T
place: hdb
slots: [${o.slots ?? '门, 车, 鱼, 书, 猫, 狗'}]
---
## Setup
${page(o.setup ?? 'The {门|door}, the {车|car}, the {鱼|fish}, the {书|book}, the {猫|cat} and the {狗|dog}.')}
## Granny
${o.granny ?? '龙奶奶: 你好！ | Hello!'}
## Listen
${o.listen ?? '龙奶奶: 小猫在门口。 | The kitten is at the door.\n龙奶奶: 门不开。 | The door won\'t open.\n龙奶奶: 小猫很饿。 | The kitten is hungry.\n? 谁在门口？ | Who is at the door? = 小猫 | 小狗 | 小鸟'}
## Payoff
${page(o.payoff ?? '[rescued] The words fly home.')}
`);

describe('chapter rules (spec 3a §7)', () => {
  it('a good chapter has no problems', () => {
    expect(chapterProblems(make())).toEqual([]);
  });
  it('Granny and 听一听 use only characters taught by 二上', () => {
    expect(chapterProblems(make({ granny: '龙奶奶: 我们去旅游吧。 | Let us travel.' })).join()).toMatch(/not taught by 二上/);
  });
  it('slot words must be real and taught by 二上', () => {
    const ps = chapterProblems(make({ slots: '门, 车, 鱼, 书, 猫, 旅游', setup: 'The {门|door}, {车|car}, {鱼|fish}, {书|book}, {猫|cat}, {旅游|travel}.' }));
    expect(ps.join()).toMatch(/旅游/);
  });
  it('6–10 slots, none repeated, and the frontmatter lists exactly the slots used', () => {
    expect(chapterProblems(make({ slots: '门', setup: 'The {门|door}.' })).join()).toMatch(/6–10/);
    expect(chapterProblems(make({ setup: 'The {门|door} and {门|door}, {车|car}, {鱼|fish}, {书|book}, {猫|cat}, {狗|dog}.' })).join()).toMatch(/twice/);
    expect(chapterProblems(make({ slots: '门, 车, 鱼, 书, 猫, 狗, 家' })).join()).toMatch(/frontmatter/);
  });
  it('a page has at most 60 English words and 4 speech lines', () => {
    const long = Array.from({ length: 61 }, () => 'word').join(' ');
    expect(chapterProblems(make({ payoff: `[rescued] Home.\n${long}` })).join()).toMatch(/60/);
    const talk = Array.from({ length: 5 }, () => '> Dog: Hi!').join('\n');
    expect(chapterProblems(make({ payoff: `[rescued] Home.\n${talk}` })).join()).toMatch(/speech/);
  });
  it('听一听 has 3–5 lines, 1–2 questions, 3 distinct choices, the answer in the scene; 为什么 only from chapter 10', () => {
    expect(chapterProblems(make({ listen: '龙奶奶: 门不开。 | The door is stuck.\n? 谁在门口？ | Who? = 小猫 | 小狗 | 小鸟' })).join()).toMatch(/3–5 lines/);
    expect(chapterProblems(make({ listen: '龙奶奶: 小猫在门口。 | x\n龙奶奶: 门不开。 | y\n龙奶奶: 小猫很饿。 | z\n? 谁在门口？ | Who? = 小狗 | 小猫 | 小鸟' })).join()).toMatch(/answer/);
    expect(chapterProblems(make({ listen: '龙奶奶: 小猫在门口。 | x\n龙奶奶: 门不开。 | y\n龙奶奶: 小猫很饿。 | z\n? 小猫为什么在门口？ | Why? = 很饿 | 很高 | 很大' })).join()).toMatch(/为什么/);
    expect(chapterProblems(make({ chapter: 10, listen: '龙奶奶: 小猫在门口。 | x\n龙奶奶: 门不开。 | y\n龙奶奶: 小猫很饿。 | z\n? 小猫为什么在门口？ | Why? = 很饿 | 很高 | 很大' }))).toEqual([]);
  });
  it('exactly one [rescued], in the payoff', () => {
    expect(chapterProblems(make({ payoff: 'The words fly home.' })).join()).toMatch(/\[rescued\]/);
  });
  it('a broken slot or Chinese outside a slot is flagged (final review I2)', () => {
    expect(chapterProblems(make({ payoff: '[rescued] Home. The {太阳|sun warmed him.' })).join()).toMatch(/stray/);
    expect(chapterProblems(make({ payoff: '[rescued] Home. The 太阳 warmed him.' })).join()).toMatch(/Chinese outside a slot/);
    expect(chapterProblems(make({ payoff: '[rescued] Home.\n> Truffle: 哼！' })).join()).toMatch(/Chinese outside a slot/);
    expect(chapterProblems(make({ setup: 'The {门|door|gate}, the {车|car}, the {鱼|fish}, the {书|book}, the {猫|cat} and the {狗|dog}.' })).join()).toMatch(/stray|\|/);
  });
  it('no real brand names', () => {
    expect(chapterProblems(make({ payoff: '[rescued] They went to McDonald\'s.' })).join()).toMatch(/brand/);
  });
  it("a chapter's slots must match its outline row", () => {
    const row: OutlineRow = { chapter: 1, place: 'hdb', slots: ['门', '车', '鱼', '书', '猫', '家'] };
    expect(chapterProblems(make(), row).join()).toMatch(/outline/);
  });
});

describe('the outline (spec 3a §4–5)', () => {
  const row = (chapter: number, slots: string[]): OutlineRow => ({ chapter, place: 'hdb', slots });
  it('18 chapters, slots planned once each, no 二上 slot before chapter 7', () => {
    expect(outlineProblems([row(1, ['门'])]).join()).toMatch(/18/);
    const rows = Array.from({ length: 18 }, (_, i) => row(i + 1, []));
    rows[0] = row(1, ['门', '车']);
    rows[1] = row(2, ['门']);
    rows[2] = row(3, ['树']); // 树 is 二上
    const ps = outlineProblems(rows).join();
    expect(ps).toMatch(/门.*chapters 1 and 2/);
    expect(ps).toMatch(/树/);
  });
});

describe('season words', () => {
  it('counts 门口 as one word, not 门 and 口', () => {
    expect(storyWords('小猫在门口。')).toEqual(['小猫', '在', '门口']);
  });
  it('reports distinct slot words by term and the words in Granny and 听一听', () => {
    const r = seasonReport([make()], []);
    expect(r.slotWords).toBe(6);
    expect(r.byTerm['一上']).toBeGreaterThan(0);
    expect(r.mandarinWords).toBeGreaterThan(3);
  });
});
