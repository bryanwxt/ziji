import { fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logError } from '../app/errorLog';
import { Stage } from '../ui/stage/Stage';
import { flushReports, MAX_QUEUED, MAX_TEXT, queuedReports, report, reportTarget, setReportsOn } from './outbox';

const target = { url: 'https://x.supabase.co', key: 'pub' };
const ok = () => vi.fn(async () => new Response(null, { status: 201 }));

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('beta reports wait on the iPad and go in one insert', () => {
  it('a report carries a random device id, the version and device type, never the child', () => {
    report('lesson', { minutes: 14.5 });
    report('note', { text: 'hi' });
    const [a, b] = queuedReports();
    expect(a).toMatchObject({ kind: 'lesson', body: { minutes: 14.5 }, version: expect.any(String) });
    expect(a!.device).toBe(b!.device);
    expect(a!.device.length).toBeGreaterThan(8);
    expect(Object.keys(a!).sort()).toEqual(['at', 'body', 'device', 'kind', 'platform', 'version']);
  });

  it('flush posts the batch to the reports table and empties the queue; a refusal keeps it', async () => {
    report('note', { text: 'one' });
    report('note', { text: 'two' });
    const refused = vi.fn(async () => new Response(null, { status: 401 }));
    expect(await flushReports(target, refused as never)).toBe(0);
    expect(queuedReports()).toHaveLength(2);
    const send = ok();
    expect(await flushReports(target, send as never)).toBe(2);
    expect(queuedReports()).toHaveLength(0);
    const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://x.supabase.co/rest/v1/reports');
    expect((init.headers as Record<string, string>).apikey).toBe('pub');
    expect(JSON.parse(init.body as string)).toHaveLength(2);
  });

  it('offline (fetch throws) keeps everything for next time', async () => {
    report('note', { text: 'x' });
    expect(await flushReports(target, (async () => { throw new TypeError('offline'); }) as never)).toBe(0);
    expect(queuedReports()).toHaveLength(1);
  });

  it('no address in the build: nothing is sent, reports just wait', async () => {
    expect(reportTarget({})).toBeNull();
    expect(reportTarget({ VITE_REPORT_URL: 'https://x.supabase.co/', VITE_REPORT_KEY: 'k' })).toEqual({ url: 'https://x.supabase.co', key: 'k' });
    report('note', { text: 'x' });
    expect(await flushReports(null, ok() as never)).toBe(0);
    expect(queuedReports()).toHaveLength(1);
  });

  it('sharing off clears the queue and keeps nothing new', () => {
    report('note', { text: 'x' });
    setReportsOn(false);
    expect(queuedReports()).toHaveLength(0);
    report('note', { text: 'y' });
    expect(queuedReports()).toHaveLength(0);
    setReportsOn(true);
    report('note', { text: 'z' });
    expect(queuedReports()).toHaveLength(1);
  });

  it('long text is cut and the queue never passes its cap', () => {
    report('note', { text: 'a'.repeat(MAX_TEXT + 50) });
    expect((queuedReports()[0]!.body.text as string).length).toBe(MAX_TEXT + 1);
    for (let i = 0; i < MAX_QUEUED + 5; i++) report('note', { i });
    expect(queuedReports()).toHaveLength(MAX_QUEUED);
    expect(queuedReports().at(-1)!.body.i).toBe(MAX_QUEUED + 4);
  });

  it('an error is reported once while the same one waits; an interrupted sound is not reported', () => {
    logError(new Error('IDB write failed'));
    logError(new Error('IDB write failed'));
    logError(new DOMException('interrupted', 'AbortError'));
    const errors = queuedReports().filter((r) => r.kind === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.body.message).toBe('Error: IDB write failed');
  });
});

describe('the corner flag sends the question it sits on', () => {
  it('pick a reason, add a note, send: the report has the card text and activity', () => {
    render(<Stage activity="use" truffle={null} sheet={null}><p>哪个是“朋友”？</p></Stage>);
    fireEvent.click(screen.getByRole('button', { name: '这题有问题' }));
    const send = screen.getByRole('button', { name: /发送/ }) as HTMLButtonElement;
    expect(send.disabled).toBe(true); // a reason first
    fireEvent.click(screen.getByRole('button', { name: /意思不对/ }));
    fireEvent.input(screen.getByPlaceholderText(/Note for the ZiJi team/), { target: { value: '朋友 means friend' } });
    fireEvent.click(send);
    const [r] = queuedReports();
    expect(r).toMatchObject({ kind: 'mistake', body: { activity: 'use', reason: 'meaning', note: '朋友 means friend' } });
    expect(r!.body.card).toContain('朋友');
    expect(screen.getByText(/谢谢/)).toBeTruthy();
  });

  it('取消 closes it and sends nothing', () => {
    render(<Stage activity="flash" truffle={null} sheet={null}><p>山</p></Stage>);
    fireEvent.click(screen.getByRole('button', { name: '这题有问题' }));
    fireEvent.click(screen.getByRole('button', { name: /取消/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(queuedReports()).toHaveLength(0);
  });
});
