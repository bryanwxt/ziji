import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { PASSAGES } from '../content';
import { Credits } from './Credits';

describe('Credits', () => {
  it('credits the lucide icons the app ships (ISC licence requires attribution)', () => {
    render(<Credits />);
    expect(screen.getByText(/Lucide icons — ISC License/)).toBeTruthy();
  });
  it('credits CC-CEDICT for the English on the 认字 card (CC BY-SA 4.0 requires attribution)', () => {
    render(<Credits />);
    expect(screen.getByText(/CC-CEDICT .*CC BY-SA 4\.0/)).toBeTruthy();
  });
  it('credits each Global Storybooks story it reads from: title, people, licence, adapted (CC BY requires attribution)', () => {
    render(<Credits />);
    expect(screen.getByText('Passages marked ZiJi were written for this app.')).toBeTruthy();
    const items = [...document.querySelectorAll('.credits__stories li')];
    const stories = items.map((li) => li.textContent);
    expect(stories.length).toBe(new Set(PASSAGES.filter((p) => p.source === 'gsb').map((p) => p.story!.id)).size);
    expect(stories).toContain('一个很高的人 — text Cornelius Gulere, illustration Catherine Groenewald, translation dohliam — CC BY 3.0');
    expect(stories.find((s) => s!.startsWith('数数动物'))).toMatch(/adapted$/);
    const kalai = items.find((li) => li.textContent!.startsWith('和植物聊天的卡莱'))!;
    expect([...kalai.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([PASSAGES.find((p) => p.story?.id === '0089')!.credit!.source, 'https://creativecommons.org/licenses/by/4.0/']); // the title links its source
  });
});
