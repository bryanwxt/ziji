// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseChapter } from './format';
import { lessonScene } from './lessonScene';

const ch = (n: number, setup: string, payoff: string) => parseChapter(`---
chapter: ${n}
title: T
place: hdb
slots: []
---
## Setup
### Page 1
@scene ${setup}
Words.
## Go
Go on.
## Payoff
### Page 1
@scene ${payoff}
More.
`);
const chapters = [ch(1, 'hdb-morning', 'hdb-night'), ch(2, 'hdb-voiddeck', 'school-field')];

describe('the painting behind the lesson', () => {
  it("is where today's setup ended while its payoff is owed", () => {
    expect(lessonScene({ chapter: 1, setupDone: true, payoffDone: false }, chapters)).toBe('hdb-voiddeck');
  });
  it('is where the last finished chapter ended on an extra lesson', () => {
    expect(lessonScene({ chapter: 1, setupDone: true, payoffDone: true }, chapters)).toBe('hdb-night');
  });
  it('is none before any chapter (the old world shows)', () => {
    expect(lessonScene(undefined, chapters)).toBeNull();
    expect(lessonScene({ chapter: 0 }, chapters)).toBeNull();
  });
});
