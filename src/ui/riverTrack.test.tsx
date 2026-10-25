import { render, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
const motion = { reduced: false };
vi.mock('./motion', () => ({ reducedMotion: () => motion.reduced }));
import { RiverTrack } from './RiverTrack';

const boatX = () => (document.querySelector('.river__boat') as SVGGElement).style.transform;

describe('the river track (rewards spec §3)', () => {
  it('the boat sails from its old spot to its new one, then says it has arrived', async () => {
    motion.reduced = false;
    const arrived = vi.fn();
    render(<RiverTrack from={0} to={2} onArrive={arrived} />);
    expect(boatX()).toBe('translateX(0px)');
    await waitFor(() => expect(boatX()).toBe('translateX(210px)'));
    await waitFor(() => expect(arrived).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(document.querySelector('svg.river')!.getAttribute('data-halves')).toBe('2');
  });
  it('with reduced motion it is there at once', () => {
    motion.reduced = true;
    const arrived = vi.fn();
    render(<RiverTrack from={0} to={1} onArrive={arrived} />);
    expect(boatX()).toBe('translateX(105px)');
  });
  it('is drawn in light cel: the paper boat, no gradient, no clip-path', () => {
    const { container } = render(<RiverTrack from={1} to={1} mini />);
    expect(container.querySelector('svg.river--mini')).toBeTruthy();
    expect(container.innerHTML).not.toMatch(/clip-path|Gradient|filter/);
    expect(container.querySelector('svg.river')!.getAttribute('aria-label')).toBe('小船走到一半了');
  });
  it('sails again when the meter it shows changes (Home after a lesson)', async () => {
    motion.reduced = false;
    const { rerender } = render(<RiverTrack mini from={0} to={0} />);
    expect(boatX()).toBe('translateX(0px)');
    rerender(<RiverTrack mini from={1} to={1} />);
    await waitFor(() => expect(boatX()).toBe('translateX(105px)'));
    expect(document.querySelector('svg.river')!.getAttribute('data-halves')).toBe('1');
  });
  it('a full meter shows the chest glinting, still with reduced motion; a part-full one does not', () => {
    motion.reduced = true;
    const { container, rerender } = render(<RiverTrack mini from={1} to={1} />);
    expect(container.querySelector('.river__glint')).toBeNull();
    expect(container.querySelector('svg.river--still')).toBeTruthy(); // the CSS holds the sparkle still
    rerender(<RiverTrack mini from={2} to={2} />);
    expect(container.querySelector('svg.river--full .river__chest .river__glint')).toBeTruthy();
  });
  it('the water already sailed grows with the boat', () => {
    motion.reduced = true;
    const sailed = () => (document.querySelector('.river__sailed') as SVGRectElement).style.transform;
    const { rerender } = render(<RiverTrack from={0} to={0} />);
    expect(sailed()).toBe('scaleX(0)');
    rerender(<RiverTrack from={2} to={2} />);
    expect(sailed()).toBe('scaleX(1)');
  });
});
