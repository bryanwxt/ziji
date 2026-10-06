// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseChapter, parseOutline, plainText, slotsIn } from './format';

const CH = `---
chapter: 1
title: The Silent Street
place: hdb
slots: [门, 电梯]
---

## Setup

### Page 1
@scene hdb-morning
Truffle stretched. The {门|door} would not open.
> Truffle: Press the {电梯|lift} button, then!

## Granny
龙奶奶: 你们饿了吗？ | Are you hungry?

## Listen
龙奶奶: 小猫在门口。 | The kitten is at the door.
龙奶奶: 门不开。 | The door won't open.
龙奶奶: 小猫很饿。 | The kitten is hungry.
? 谁在门口？ | Who is at the door? = 小猫 | 小狗 | 龙奶奶

## Payoff

### Page 1
[rescued] The words fly home.
> Truffle: 哼！ My plan worked.
`;

describe('story chapter format (spec 3a §6)', () => {
  it('reads the frontmatter, pages, speech, scenes, Granny lines, the 听一听 scene and [rescued]', () => {
    const c = parseChapter(CH);
    expect(c).toMatchObject({ chapter: 1, title: 'The Silent Street', place: 'hdb', slots: ['门', '电梯'] });
    expect(c.setup).toHaveLength(1);
    expect(c.setup[0]!.lines).toEqual([
      { kind: 'scene', id: 'hdb-morning' },
      { kind: 'text', text: 'Truffle stretched. The {门|door} would not open.' },
      { kind: 'speech', who: 'Truffle', text: 'Press the {电梯|lift} button, then!' },
    ]);
    expect(c.granny).toEqual([{ who: '龙奶奶', zh: '你们饿了吗？', en: 'Are you hungry?' }]);
    expect(c.listen.lines).toHaveLength(3);
    expect(c.listen.questions).toEqual([{ zh: '谁在门口？', en: 'Who is at the door?', answer: '小猫', wrong: ['小狗', '龙奶奶'] }]);
    expect(c.payoff[0]!.lines[0]).toEqual({ kind: 'rescued', text: 'The words fly home.' });
  });
  it('a slot inside speech, with punctuation after it', () => {
    expect(slotsIn('> Truffle: Open the {门|door}! Now, {电梯|lift}.')).toEqual([{ zh: '门', en: 'door' }, { zh: '电梯', en: 'lift' }]);
    expect(plainText('Open the {门|door}!')).toBe('Open the door!');
  });
  it("splits a Mandarin line on its first ' | '", () => {
    const c = parseChapter(CH.replace('Are you hungry?', 'Hungry? | Very?'));
    expect(c.granny[0]).toEqual({ who: '龙奶奶', zh: '你们饿了吗？', en: 'Hungry? | Very?' });
  });
  it('CRLF and trailing blank lines parse the same', () => {
    expect(parseChapter(CH.replace(/\n/g, '\r\n') + '\r\n\r\n')).toEqual(parseChapter(CH));
  });
  it('says which line it cannot read', () => {
    expect(() => parseChapter(CH.replace('? 谁在门口？ | Who is at the door? = 小猫 | 小狗 | 龙奶奶', '? 谁在门口？ no answers'))).toThrow(/line \d+/);
    expect(() => parseChapter(CH.replace('龙奶奶: 你们饿了吗？ | Are you hungry?', '龙奶奶 你们饿了吗？'))).toThrow(/line \d+/);
  });
  it('reads the outline table', () => {
    const md = `# Season 1\n\n| Ch | Place | Problem | Rule / gag | Slots | Hint |\n|---|---|---|---|---|---|\n| 1 | hdb | The door is stuck | — | 门, 电梯, 信 | — |\n| 2 | hdb | x | y | 家 | — |\n`;
    expect(parseOutline(md)).toEqual([{ chapter: 1, place: 'hdb', slots: ['门', '电梯', '信'] }, { chapter: 2, place: 'hdb', slots: ['家'] }]);
  });
});
