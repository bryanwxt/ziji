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
    await waitFor(() => expect(boatX()).toBe('translateX(244px)'));
    await waitFor(() => expect(arrived).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(document.querySelector('svg.river')!.getAttribute('data-halves')).toBe('2');
  });
  it('with reduced motion it is there at once', () => {
    motion.reduced = true;
    const arrived = vi.fn();
    render(<RiverTrack from={0} to={1} onArrive={arrived} />);
    expect(boatX()).toBe('translateX(122px)');
  });
  it('is drawn in light cel: the paper boat, no gradient, no clip-path', () => {
    const { container } = render(<RiverTrack from={1} to={1} mini />);
    expect(container.querySelector('svg.river--mini')).toBeTruthy();
    expect(container.innerHTML).not.toMatch(/clip-path|Gradient|filter/);
    expect(container.querySelector('svg.river')!.getAttribute('aria-label')).toBe('小船走到一半了');
  });
});
