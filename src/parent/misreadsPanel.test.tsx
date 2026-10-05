import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addRecording, getCard, getKid, listRecordings, putCards, putWords, saveKid, saveParentPassage } from '../store/repo';
import { DEFAULT_KID } from '../types';
import { makeCard, makeWord } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { RecordingsPanel } from './RecordingsPanel';

const rec = (passageId: string) => ({ id: `r-${passageId}`, createdAt: 1, prompt: { kind: 'passage' as const, passageId }, blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 8 });

// fake-indexeddb hands Blobs back as plain objects; the panel only needs a URL for the audio player
beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

describe('RecordingsPanel misreads', () => {
  it('marks misread characters on a 朗读 recording and makes them priority words', async () => {
    const now = new Date(2026, 9, 5, 17);
    const app = await makeAppData({ now: () => now });
    await putWords(app.db, [makeWord('大'), makeWord('人')]);
    await putCards(app.db, [makeCard('b:大', 'recognise', new Date(2026, 10, 1), true)]);
    await saveParentPassage(app.db, { id: 'pp:1', title: '大人', text: '大人，大人。', createdAt: 1 });
    await addRecording(app.db, rec('pp:1'));
    renderWithApp(<RecordingsPanel />, app);
    fireEvent.click(await screen.findByText('Mark misreads'));
    const chars = [...document.querySelectorAll('button.misread-ch')];
    expect(chars.map((b) => b.textContent)).toEqual(['大', '人', '大', '人']);
    fireEvent.click(chars[0]!);
    expect(chars[0]!.getAttribute('aria-pressed')).toBe('true');
    expect(chars[2]!.getAttribute('aria-pressed')).toBe('true'); // the same character everywhere in the text
    fireEvent.click(screen.getByText('Save misread characters'));
    await waitFor(async () => expect((await getCard(app.db, 'b:大:recognise'))!.fsrs.due.getTime()).toBe(now.getTime()));
    expect((await listRecordings(app.db))[0]!.misread).toEqual(['大']);
    expect(await screen.findByText(/1 character will come up in practice/)).toBeTruthy();
  });

  it('final review: a double tap on Save gives the passage one extra day, not two', async () => {
    const now = new Date(2026, 9, 5, 17);
    const app = await makeAppData({ now: () => now });
    await putWords(app.db, [makeWord('大'), makeWord('人')]);
    await saveParentPassage(app.db, { id: 'pp:1', title: '大人', text: '大人，大人。', createdAt: 1 });
    await addRecording(app.db, rec('pp:1'));
    await saveKid(app.db, { ...DEFAULT_KID, reading: { passageId: 'pp:1', days: 3, extra: 0, lastDay: '2026-10-05', lastRead: {}, warmups: 0 } });
    renderWithApp(<RecordingsPanel />, app);
    fireEvent.click(await screen.findByText('Mark misreads'));
    fireEvent.click(document.querySelector('button.misread-ch')!);
    fireEvent.click(screen.getByText('Save misread characters'));
    fireEvent.click(screen.getByText('Save misread characters'));
    await screen.findByText(/will come up in practice/);
    expect((await getKid(app.db))!.reading.extra).toBe(1);
  });

  it('a recording of a deleted text still lists, with a fallback title and nothing to mark', async () => {
    const app = await makeAppData();
    await addRecording(app.db, rec('pp:gone'));
    renderWithApp(<RecordingsPanel />, app);
    expect(await screen.findByText('📖 (deleted text)')).toBeTruthy();
    expect(screen.queryByText('Mark misreads')).toBeNull();
  });
});
