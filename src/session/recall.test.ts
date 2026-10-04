import { describe, expect, it } from 'vitest';
import { noteRecall } from './recall';

describe('noteRecall', () => {
  it('counts right answers, in-context ones and any miss, per word', () => {
    let r = noteRecall(undefined, 'a', true, false);
    r = noteRecall(r, 'a', true, true);
    r = noteRecall(r, 'a', false, true);
    expect(r.a).toEqual({ right: 2, inContext: 1, missed: true });
    expect(noteRecall(r, 'b', true, false).a).toEqual(r.a);
  });
});
