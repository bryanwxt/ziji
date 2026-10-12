import { describe, expect, it } from 'vitest';
import { introLines } from './intro';
const oral = { name: '小明', age: '8', school: '光明小学', className: '二年级', customIntro: '' };
describe('self-introduction', () => {
  it('builds the standard script from Settings', () => {
    expect(introLines(oral)).toEqual({ hello: '老师好！', body: '我叫小明。我今年8岁。我在光明小学读二年级。', thanks: '谢谢老师！' });
  });
  it('a custom script replaces the body; missing details drop the body', () => {
    expect(introLines({ ...oral, customIntro: '大家好，我是小明。' }).body).toBe('大家好，我是小明。');
    expect(introLines({ ...oral, school: '' }).body).toBeNull();
  });
});
