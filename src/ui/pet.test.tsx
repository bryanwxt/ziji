// src/ui/pet.test.tsx
import { act, fireEvent, render } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../types';
import { Pet } from './Pet';

vi.mock('../audio/sfx', () => ({ playSfx: vi.fn(), startPurr: vi.fn(), stopPurr: vi.fn() }));
import { startPurr } from '../audio/sfx';

const tap = (el: Element) => { fireEvent.pointerDown(el, { clientX: 10, clientY: 10, pointerId: 1 }); fireEvent.pointerUp(el, { clientX: 10, clientY: 10, pointerId: 1 }); };

describe('touching Truffle (spec §4.5)', () => {
  it('a tap on his head: a grumpy 哼！', () => {
    const { container } = render(<Pet kid={DEFAULT_KID} />);
    tap(container.querySelector('[data-part="headpos"]')!);
    expect(container.querySelector('.pet__bubble')!.textContent).toContain('哼');
  });
  it('a tap on his tail: 喵！', () => {
    vi.useFakeTimers();
    const { container } = render(<Pet kid={DEFAULT_KID} />);
    tap(container.querySelector('[data-part="tail"]')!);
    act(() => { vi.advanceTimersByTime(500); }); // he pounces first, then meows
    vi.useRealTimers();
    expect(container.querySelector('.pet__bubble')!.textContent).toContain('喵');
  });
  it('stroking him: he purrs and hearts float up (drawn, not emoji)', () => {
    const { container } = render(<Pet kid={DEFAULT_KID} />);
    const head = container.querySelector('[data-part="headpos"]')!;
    fireEvent.pointerDown(head, { clientX: 0, clientY: 0, pointerId: 1 });
    for (let x = 10; x <= 90; x += 10) fireEvent.pointerMove(head, { clientX: x, clientY: 0, pointerId: 1 });
    expect(startPurr).toHaveBeenCalled();
    expect(container.querySelector('.pet__heart svg')).toBeTruthy();
  });
  it('touch is ignored while calm (review focus 3)', () => {
    const { container } = render(<Pet kid={DEFAULT_KID} calm />);
    tap(container.querySelector('[data-part="headpos"]')!);
    expect(container.querySelector('.pet__bubble')).toBeNull();
  });
});
