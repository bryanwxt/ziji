// src/ui/pet.test.tsx
import { act, fireEvent, render } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_KID } from '../types';
import { Pet } from './Pet';
import { requestGreeting } from './truffle/greeting';

vi.mock('../audio/sfx', () => ({ playSfx: vi.fn(), startPurr: vi.fn(), stopPurr: vi.fn() }));
import { startPurr } from '../audio/sfx';

const tap = (el: Element) => { fireEvent.pointerDown(el, { clientX: 10, clientY: 10, pointerId: 1 }); fireEvent.pointerUp(el, { clientX: 10, clientY: 10, pointerId: 1 }); };

describe('touching Truffle (spec §4.5)', () => {
  it('a question coming up clears what a touch made him say, and a line still on its way (sweep)', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<Pet kid={DEFAULT_KID} />);
    tap(container.querySelector('[data-part="headpos"]')!);
    expect(container.querySelector('.pet__bubble')!.textContent).toContain('哼');
    rerender(<Pet kid={DEFAULT_KID} calm />);
    expect(container.querySelector('.pet__bubble')).toBeNull();
    rerender(<Pet kid={DEFAULT_KID} />);
    tap(container.querySelector('[data-part="tail"]')!);
    rerender(<Pet kid={DEFAULT_KID} calm />);
    act(() => { vi.advanceTimersByTime(500); }); // the 喵！ after the pounce never lands on the question
    vi.useRealTimers();
    expect(container.querySelector('.pet__bubble')).toBeNull();
  });
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

describe('final review I1', () => {
  it('stroking him for a few seconds: his eyes stay closed in content the whole time (not back to his grumpy face)', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<Pet kid={DEFAULT_KID} mood="sulk" />);
      const head = container.querySelector('[data-part="headpos"]')!;
      fireEvent.pointerDown(head, { clientX: 0, clientY: 0, pointerId: 1 });
      const seen = new Set<string>();
      for (let i = 1; i <= 150; i++) {
        fireEvent.pointerMove(head, { clientX: (i % 2) * 40, clientY: 0, pointerId: 1 });
        act(() => { vi.advanceTimersByTime(16); });
        if (i > 20) seen.add(container.querySelector('svg.truffle')!.getAttribute('data-expression')!);
      }
      expect([...seen]).toEqual(['content']);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('greetings (spec 2026-10-04 §4.6)', () => {
  it('the next live Truffle waves and says the greeting once; the one after does not', () => {
    requestGreeting('你好！我们开始吧！');
    const first = render(<Pet kid={DEFAULT_KID} />);
    expect(first.container.querySelector('.pet__bubble')?.textContent).toContain('你好！我们开始吧！');
    expect(first.container.querySelector('svg.truffle')?.getAttribute('data-react')).toBe('hello');
    first.unmount();
    const second = render(<Pet kid={DEFAULT_KID} bubble="新字来了！" />);
    expect(second.container.querySelector('.pet__bubble')?.textContent).not.toContain('你好');
    expect(second.container.querySelector('svg.truffle')?.getAttribute('data-react')).toBeNull();
  });
});

describe('his answer lines (sweep: spec §4.4 对了！ / 嗯？)', () => {
  it('a right answer: 对了！ or another cheer; a wrong one: 嗯？ — and the screen\'s own line wins', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<Pet kid={DEFAULT_KID} />);
    rerender(<Pet kid={DEFAULT_KID} react={{ kind: 'right', key: 1 }} />);
    const said = container.querySelector('.pet__bubble')!.textContent!;
    expect(['对了', '真棒', '好厉害'].some((w) => said.includes(w))).toBe(true);
    rerender(<Pet kid={DEFAULT_KID} react={{ kind: 'wrong', key: 2 }} />);
    expect(container.querySelector('.pet__bubble')!.textContent).toContain('嗯？');
    act(() => { vi.advanceTimersByTime(1500); });
    expect(container.querySelector('.pet__bubble')).toBeNull(); // a short line
    rerender(<Pet kid={DEFAULT_KID} bubble="明天再来！" react={{ kind: 'right', key: 3 }} />);
    expect(container.querySelector('.pet__bubble')!.textContent).toContain('明天再来');
    vi.useRealTimers();
  });
  it('final review: the same line twice in a row stays its full time', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0); // 对了！ both times
    const { container, rerender } = render(<Pet kid={DEFAULT_KID} />);
    rerender(<Pet kid={DEFAULT_KID} react={{ kind: 'right', key: 1 }} />);
    act(() => { vi.advanceTimersByTime(800); });
    rerender(<Pet kid={DEFAULT_KID} react={{ kind: 'right', key: 2 }} />);
    act(() => { vi.advanceTimersByTime(600); }); // the first line's timer is due now
    expect(container.querySelector('.pet__bubble')).not.toBeNull();
    vi.mocked(Math.random).mockRestore();
    vi.useRealTimers();
  });
  it('three in a row: hearts float up', () => {
    const { container, rerender } = render(<Pet kid={DEFAULT_KID} />);
    rerender(<Pet kid={DEFAULT_KID} react={{ kind: 'streak', key: 1 }} />);
    expect(container.querySelectorAll('.pet__heart').length).toBeGreaterThanOrEqual(3);
  });
});

