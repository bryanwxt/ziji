// The early town map (spec 2026-10-06 §3.7): 字己镇's places (§5.9), each with six words he meets in 一上–二下. A word's window lights
// when it passes Hear and glows when he owns it; a place is part lit with one heard word, fully lit when he owns all six.
// Sub-project 3 replaces this with the painted town.
import { isOwned } from '../ladder/rungs';
import type { Knowledge } from '../stats/stats';

export interface Place { id: string; zh: string; words: string[] }
export type Window = 0 | 1 | 2; // dark, heard, owned

export const PLACES: Place[] = [
  { id: 'hdb', zh: '组屋', words: ['b:家', 'b:门', 'b:窗', 'b:床', 'w:房间', 'w:电梯'] },
  { id: 'hawker', zh: '小贩中心', words: ['b:吃', 'b:饭', 'b:面', 'b:茶', 'w:好吃', 'w:咖啡'] },
  { id: 'market', zh: '巴刹', words: ['b:鱼', 'b:菜', 'b:肉', 'b:买', 'b:蛋', 'w:水果'] },
  { id: 'mrt', zh: '地铁站', words: ['b:车', 'b:站', 'b:坐', 'b:走', 'b:快', 'w:火车'] },
  { id: 'school', zh: '学校', words: ['b:书', 'b:写', 'b:读', 'w:学校', 'w:老师', 'w:同学'] },
  { id: 'playground', zh: '游乐场', words: ['b:玩', 'b:跑', 'b:跳', 'b:笑', 'b:球', 'w:朋友'] },
  { id: 'garden', zh: '花园', words: ['b:花', 'b:草', 'b:树', 'b:叶', 'b:鸟', 'b:虫'] },
  { id: 'sea', zh: '海边', words: ['b:海', 'b:沙', 'b:船', 'b:天', 'b:云', 'w:太阳'] },
  { id: 'chinatown', zh: '牛车水', words: ['b:灯', 'b:红', 'b:年', 'b:龙', 'w:月亮', 'w:新年'] },
];

export function placeLight(know: Pick<Knowledge, 'passedRungs' | 'wordsById' | 'ladderById'>, place: Place): { windows: Window[]; level: 'dark' | 'part' | 'full' } {
  const windows = place.words.map((id): Window => {
    const passed = know.passedRungs.get(id);
    const word = know.wordsById.get(id) ?? know.ladderById.get(id);
    if (!passed || !word) return 0;
    return isOwned(word, passed) ? 2 : passed.has('hear') ? 1 : 0;
  });
  return { windows, level: windows.every((w) => w === 2) ? 'full' : windows.some((w) => w > 0) ? 'part' : 'dark' };
}
