import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import type { PairBoard } from '../../practice/pairs';
import { DEFAULT_KID } from '../../types';
import { speak } from '../../audio/speech';
import { PairGame } from './PairGame';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));

const board: PairBoard = { left: ['穿', '刷', '踢'], right: ['足球', '衣服', '牙'], pairs: [['穿', '衣服'], ['刷', '牙'], ['踢', '足球']], target: ['穿', '衣服'] };
const props = { board, kind: 'match' as const, kid: DEFAULT_KID };
const tile = (t: string) => [...document.querySelectorAll<HTMLButtonElement>('.pair__tile')].find((b) => b.textContent === t)!;
const join = (l: string, r: string) => { fireEvent.click(tile(l)); fireEvent.click(tile(r)); };

describe('pairing (spec 2026-10-05 §3.2 rung 2)', () => {
  it('a right pair locks together; all three: right, then 继续', () => {
    const onDone = vi.fn();
    render(<PairGame {...props} onDone={onDone} />);
    join('穿', '衣服');
    expect(tile('穿').disabled).toBe(true);
    expect(tile('衣服').classList.contains('is-matched')).toBe(true);
    join('刷', '牙');
    join('踢', '足球');
    expect(document.querySelector('.sheet--good')).toBeTruthy();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
  it('after picking a left tile, only the right column can be tapped (so a pick is never lost)', () => {
    render(<PairGame {...props} onDone={vi.fn()} />);
    fireEvent.click(tile('穿'));
    expect(tile('刷').disabled).toBe(true);
    expect(tile('牙').disabled).toBe(false);
  });
  it('a wrong pair is a miss and lets go; any miss makes the board wrong, with the pairs and English on the sheet', () => {
    const onDone = vi.fn();
    render(<PairGame {...props} onDone={onDone} />);
    join('穿', '牙');
    expect(tile('穿').disabled).toBe(false);
    join('穿', '衣服');
    join('刷', '牙');
    join('踢', '足球');
    expect(document.querySelector('.sheet--oops')!.textContent).toContain('穿衣服');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });
  it('three misses on a tile show its match (review focus 3)', () => {
    render(<PairGame {...props} onDone={vi.fn()} />);
    join('穿', '牙');
    join('穿', '足球');
    join('穿', '牙');
    expect(tile('穿').classList.contains('is-shown')).toBe(true);
    expect(tile('衣服').classList.contains('is-shown')).toBe(true);
  });
});

describe('final review C1/I4: pairing', () => {

  it('a board with a doubled half (妈 + 妈) still finishes', () => {
    const doubled: PairBoard = { left: ['妈', '黑', '国'], right: ['外', '妈', '色'], pairs: [['妈', '妈'], ['黑', '色'], ['国', '外']], target: ['妈', '妈'] };
    const onDone = vi.fn();
    render(<PairGame {...props} board={doubled} kind="pair" onDone={onDone} />);
    const left = (t: string) => [...document.querySelectorAll<HTMLButtonElement>('.pairs__col--left .pair__tile')].find((b) => b.textContent === t)!;
    const right = (t: string) => [...document.querySelectorAll<HTMLButtonElement>('.pairs__col--right .pair__tile')].find((b) => b.textContent === t)!;
    for (const [l, r] of doubled.pairs) { fireEvent.click(left(l)); fireEvent.click(right(r)); }
    expect(document.querySelector('.sheet--good')).toBeTruthy();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
  it('every pair is graded (production practice spec §5): a miss on another pair makes the board wrong', () => {
    const onDone = vi.fn();
    render(<PairGame {...props} onDone={onDone} />);
    join('刷', '足球'); // a miss on an extra
    join('穿', '衣服');
    join('刷', '牙');
    join('踢', '足球');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });
  it('a picked tile can be tapped again to let go (a slip is not a miss)', () => {
    render(<PairGame {...props} onDone={vi.fn()} />);
    fireEvent.click(tile('刷'));
    expect(tile('刷').disabled).toBe(false);
    fireEvent.click(tile('刷'));
    expect(tile('穿').disabled).toBe(false);
    expect(document.querySelector('.is-picked')).toBeNull();
  });
  it("the time that counts is the word's own pair, not the whole board", () => {
    const onDone = vi.fn();
    render(<PairGame {...props} onDone={onDone} />);
    join('穿', '衣服');
    join('刷', '牙');
    join('踢', '足球');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone.mock.calls[0]![0].responseMs).toBeLessThan(6000);
  });
});

describe('decoy halves (production practice spec §5)', () => {
  // 火 + 山 = 火山; 公 + 园 = 公园; 先 + 生 = 先生; 鸟 and 木 pair with nothing here
  const eight: PairBoard = { left: ['公', '鸟', '火', '先'], right: ['山', '木', '生', '园'], pairs: [['火', '山'], ['公', '园'], ['先', '生']], target: ['火', '山'], decoys: ['鸟', '木'] };
  const p8 = { board: eight, kind: 'pair' as const, kid: DEFAULT_KID };
  it('eight halves, two columns of four; the three pairs end the board right, and the decoys then show as decoys', () => {
    const onDone = vi.fn();
    render(<PairGame {...p8} onDone={onDone} />);
    expect(document.querySelectorAll('.pairs--eight .pair__tile')).toHaveLength(8);
    expect(document.querySelector('.is-decoy')).toBeNull(); // nothing gives them away while he plays
    join('火', '山');
    join('公', '园');
    join('先', '生');
    expect([...document.querySelectorAll('.is-decoy')].map((t) => t.textContent).sort()).toEqual(['木', '鸟']);
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: true }));
  });
  it('a decoy tried is a miss: the board is wrong, and three tries set a left decoy aside', () => {
    const onDone = vi.fn();
    render(<PairGame {...p8} onDone={onDone} />);
    join('鸟', '山');
    expect(tile('鸟').disabled).toBe(false);
    join('鸟', '园');
    join('鸟', '生');
    expect(tile('鸟').disabled).toBe(true);
    expect(tile('鸟').classList.contains('is-decoy')).toBe(true);
    join('火', '山');
    join('公', '园');
    join('先', '生');
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });
  it('a right-hand decoy tried with a real half is a miss on that half', () => {
    const onDone = vi.fn();
    render(<PairGame {...p8} onDone={onDone} />);
    join('火', '木');
    join('火', '山');
    join('公', '园');
    join('先', '生');
    expect(document.querySelector('.sheet--oops')).toBeTruthy();
    fireEvent.click(screen.getByText('继续'));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
  });
});

describe('each half is said at its reading in its own word (content audit 2026-10-15)', () => {
  const zuci: PairBoard = { left: ['长', '切', '月'], right: ['亮', '大', '菜'], pairs: [['长', '大'], ['切', '菜'], ['月', '亮']], target: ['长', '大'] };
  it("长 in 长大 is zhǎng, not its card's cháng; 切 in 切菜 qiē; the summary shows each word's own pinyin", () => {
    render(<PairGame board={zuci} kind="pair" kid={DEFAULT_KID} onDone={vi.fn()} />);
    fireEvent.click(tile('长'));
    expect(vi.mocked(speak)).toHaveBeenLastCalledWith('长', { reading: 'zhǎng' });
    fireEvent.click(tile('长'));
    fireEvent.click(tile('切'));
    expect(vi.mocked(speak)).toHaveBeenLastCalledWith('切', { reading: 'qiē' });
    fireEvent.click(tile('亮')); // a miss: the sheet explains every pair
    join('切', '菜');
    join('长', '大');
    join('月', '亮');
    const rows = [...document.querySelectorAll('.pair-summary .label')].map((l) => `${l.getAttribute('data-zh')} ${l.getAttribute('data-py')}`);
    expect(rows).toEqual(expect.arrayContaining(['切菜 qiē cài', '长大 zhǎng dà']));
  });
});
