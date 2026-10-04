import { act, render } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { DEFAULT_KID } from '../types';
import { Closeup } from './Closeup';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('Closeup', () => {
  it('hides itself after its moment', () => {
    render(<Closeup kid={DEFAULT_KID} ms={900} />);
    expect(document.querySelector('.closeup')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(900); });
    expect(document.querySelector('.closeup')).toBeNull();
  });
});
