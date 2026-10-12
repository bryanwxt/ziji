import { describe, expect, it } from 'vitest';
import { displayText } from './phrases';
describe('displayText', () => {
  it("drops the parent's / marks", () => {
    expect(displayText('今天天气很好 / 我们去公园玩。')).toBe('今天天气很好我们去公园玩。');
  });
});
