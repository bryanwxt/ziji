import { act, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CrashGuard } from './CrashGuard';
import { clearErrorLog, logError, readErrorLog } from './errorLog';

function Boom(): never {
  throw new Error('kaboom');
}

beforeEach(() => clearErrorLog());
afterEach(() => vi.restoreAllMocks());

describe('after boot, an error never strands the child (sleepy Truffle, one tap restarts)', () => {
  it('a screen that throws while drawing shows the restart screen, and the tap reloads the app', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const restart = vi.fn();
    render(<CrashGuard restart={restart}><Boom /></CrashGuard>);
    expect(screen.getByText('松露睡着了')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '重新开始' }));
    expect(restart).toHaveBeenCalled();
    expect(readErrorLog()[0]).toMatchObject({ message: 'Error: kaboom' });
  });

  it('a promise nobody caught (say, a failed save mid-lesson) shows it too, and is logged', () => {
    render(<CrashGuard restart={vi.fn()}><p>lesson</p></CrashGuard>);
    expect(screen.getByText('lesson')).toBeTruthy();
    act(() => { window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: new Error('IDB write failed') })); });
    expect(screen.getByText('松露睡着了')).toBeTruthy();
    expect(screen.queryByText('lesson')).toBeNull();
    const [entry] = readErrorLog();
    expect(entry).toMatchObject({ message: 'Error: IDB write failed' });
    expect(typeof entry!.at).toBe('number');
    expect(entry!.stack).toMatch(/crashGuard\.test/);
  });

  it('an uncaught error event (a tap handler that throws) shows it too', () => {
    render(<CrashGuard restart={vi.fn()}><p>lesson</p></CrashGuard>);
    act(() => { window.dispatchEvent(Object.assign(new Event('error'), { error: new TypeError('x is undefined'), message: 'x is undefined' })); });
    expect(screen.getByText('松露睡着了')).toBeTruthy();
    expect(readErrorLog()[0]!.message).toBe('TypeError: x is undefined');
  });

  it('a harmless interrupted sound is only logged, not shown', () => {
    render(<CrashGuard restart={vi.fn()}><p>lesson</p></CrashGuard>);
    act(() => { window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: new DOMException('The play() request was interrupted', 'AbortError') })); });
    expect(screen.getByText('lesson')).toBeTruthy();
    expect(readErrorLog()).toHaveLength(1);
  });

  it('stops listening once it is gone', () => {
    const { unmount } = render(<CrashGuard restart={vi.fn()}><p>lesson</p></CrashGuard>);
    unmount();
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: new Error('late') }));
    expect(readErrorLog()).toEqual([]);
  });
});

describe('the error log', () => {
  it('keeps the last 20 entries: time, message and the first stack line', () => {
    for (let i = 0; i < 25; i++) logError(new Error(`e${i}`), i);
    const log = readErrorLog();
    expect(log).toHaveLength(20);
    expect(log[0]).toMatchObject({ at: 24, message: 'Error: e24' });
    expect(log[19]!.message).toBe('Error: e5');
    expect(log[0]!.stack).not.toContain('\n');
    logError('just a string', 99);
    expect(readErrorLog()[0]).toEqual({ at: 99, message: 'just a string', stack: '' });
  });
  it('never throws when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(() => logError(new Error('x'))).not.toThrow();
    expect(readErrorLog()).toEqual([]);
  });
});
