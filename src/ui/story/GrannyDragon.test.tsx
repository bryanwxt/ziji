import { render } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { GRANNY_POSES, GrannyDragon } from './GrannyDragon';

vi.mock('../motion', () => ({ reducedMotion: vi.fn(() => false) }));

describe('Granny Dragon (spec 3b §6)', () => {
  it('draws each of her six poses, labelled 龙奶奶', () => {
    expect(GRANNY_POSES).toEqual(['smile', 'listen', 'surprised', 'laugh', 'point', 'worried']);
    for (const pose of GRANNY_POSES) {
      const { container, unmount } = render(<GrannyDragon pose={pose} />);
      const svg = container.querySelector('svg.granny')!;
      expect(svg.getAttribute('data-pose')).toBe(pose);
      expect(svg.getAttribute('aria-label')).toBe('龙奶奶');
      unmount();
    }
  });
  it('no hard black outlines; her gradients are her own', () => {
    const { container } = render(<div><GrannyDragon /><GrannyDragon /></div>);
    const [a, b] = [...container.querySelectorAll('svg.granny')];
    expect(a!.outerHTML).not.toContain('#2a2630');
    const ids = (s: Element) => [...s.querySelectorAll('linearGradient, radialGradient')].map((g) => g.id);
    expect(ids(a!).some((i) => ids(b!).includes(i))).toBe(false);
    for (const s of [a!, b!]) for (const m of s.outerHTML.matchAll(/url\(#([^)]+)\)/g)) expect(s.querySelector(`[id="${m[1]}"]`)).toBeTruthy();
  });
  it('talking moves her mouth; mirrored she faces the other way', () => {
    const { container } = render(<GrannyDragon talking mirror />);
    expect(container.querySelector('.granny__mouth--talking')).toBeTruthy();
    expect(container.querySelector('svg.granny')!.classList.contains('granny--mirror')).toBe(true);
  });
  it('reduced motion: talking draws a still, closed mouth', async () => {
    const motion = await import('../motion');
    vi.mocked(motion.reducedMotion).mockReturnValue(true);
    const { container } = render(<GrannyDragon talking />);
    expect(container.querySelector('.granny__mouth--talking')).toBeNull();
    vi.mocked(motion.reducedMotion).mockReturnValue(false);
  });
});
