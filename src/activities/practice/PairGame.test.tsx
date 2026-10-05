import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import type { PairBoard } from '../../practice/pairs';
import { DEFAULT_KID } from '../../types';
import { PairGame } from './PairGame';

vi.mock('../../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn() }));
vi.mock('../../audio/sfx', () => ({ playSfx: vi.fn() }));

const board: PairBoard = { left: ['穿', '刷', '踢'], right: ['足球', '衣服', '牙'], pairs: [['穿', '衣服'], ['刷', '牙'], ['踢', '足球']], target: ['穿', '衣服'] };
const props = { board, kind: 'match' as const, kid: DEFAULT_KID, resting: 'sulk' as const };
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
