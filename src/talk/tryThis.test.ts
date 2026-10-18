// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { putWeekList, putWords, addTalk, addRecording, updateSettings, getSettings, saveSession } from '../store/repo';
import { freshDb, makeWord } from '../test/fixtures';
import { createSessionRecord } from '../session/runner';
import { loadTrySignals, tryThis, type TrySignals } from './tryThis';

const calm: TrySignals = { today: '2026-10-19', lists: [], lastTalk: '2026-10-19', takes: 0, backupDays: null, classLeft: null };
const gap = { name: '复习一', readyBy: '2026-10-21', homeworkDue: '2026-10-23', notReady: 4, total: 12, weak: ['街道', '闪闪亮', '雨伞', '风筝'] };

describe('"This week, try this": the first that applies (2026-10-18 update)', () => {
  it('a backup 30 days overdue goes first', () => {
    expect(tryThis({ ...calm, backupDays: 31, lists: [gap], lastTalk: null, takes: 3 })).toEqual({ text: 'No backup for 31 days. Save one to Files now; it takes a minute.', button: 'Back up now', place: 'backup' });
  });
  it('then a list checked within 2 days with words not ready', () => {
    expect(tryThis({ ...calm, lists: [gap], lastTalk: null, takes: 3, backupDays: 20 })).toEqual({ text: '复习一: 4 of 12 not ready for the check on Wednesday. Go over 街道, 闪闪亮, 雨伞 with him.', button: 'Open 本周词语', place: 'week', weakOf: '复习一' });
    // names no weak words (all not ready are blank): the readiness line keeps its own
    expect(tryThis({ ...calm, lists: [{ ...gap, weak: [] }] }).weakOf).toBeUndefined();
    expect(tryThis({ ...calm, today: '2026-10-21', lists: [gap] }).text).toBe('复习一: 4 of 12 not ready for the check today. Go over 街道, 闪闪亮, 雨伞 with him.');
  });
  it('then no talk logged today or yesterday (or ever)', () => {
    expect(tryThis({ ...calm, lastTalk: null, takes: 3 })).toEqual({ text: 'Try one of today’s talk prompts below, then tap ✓ 聊了.', button: 'Go to 聊一聊', place: 'talk' });
    expect(tryThis({ ...calm, lastTalk: '2026-10-17', takes: 3 }).text).toBe('No talk logged since Saturday. Try today’s shared reading questions at dinner.');
    expect(tryThis({ ...calm, lastTalk: '2026-10-18', takes: 3 }).place).toBe('listen');
  });
  it('then takes waiting, then a backup overdue, then class words behind', () => {
    expect(tryThis({ ...calm, takes: 1, backupDays: 15 })).toEqual({ text: '1 take waiting in Listen & confirm. His Say words move on once you confirm them.', button: 'Listen & confirm', place: 'listen' });
    expect(tryThis({ ...calm, backupDays: 15, classLeft: 4, lists: [{ ...gap, notReady: 0 }] }).place).toBe('backup');
    expect(tryThis({ ...calm, classLeft: 4, lists: [{ ...gap, notReady: 0 }] }).text).toBe('4 class words still to start before Friday.');
    expect(tryThis({ ...calm, classLeft: 11, lists: [{ ...gap, notReady: 0 }] }).text).toBe('He is behind his class. See where he is.');
  });
  it('then a list further off; else a calm line with no button', () => {
    expect(tryThis({ ...calm, lists: [{ ...gap, readyBy: '2026-10-22' }] }).text).toBe('复习一: 8 of 12 ready, check on Thursday.');
    expect(tryThis({ ...calm, lists: [{ ...gap, readyBy: '2026-10-22' }] }).weakOf).toBeUndefined(); // names none: the readiness line keeps them
    expect(tryThis(calm)).toEqual({ text: 'Nothing pressing. Enjoy today’s talk below.', button: null, place: null });
  });
});

describe('the signals from the stores', () => {
  it('lists, the last talk, takes, the backup', async () => {
    const db = await freshDb();
    await putWords(db, [makeWord('山')]);
    await putWeekList(db, { id: 'wl:a', name: '复习一', createdAt: 0, readyBy: '2026-10-21', homeworkDue: '2026-10-23', items: [{ wordId: 'b:山', text: '山', from: 'grid', addedStatus: 'new' }], pairs: [], fits: [] });
    await addTalk(db, { id: 'a', at: new Date(2026, 9, 17, 20).getTime() });
    await addRecording(db, { id: 'r', createdAt: 1, prompt: { kind: 'say', wordId: 'b:山' }, blob: new Blob(['x']), mime: 'audio/mp4', durationSec: 2 });
    await saveSession(db, { ...createSessionRecord({ steps: [], reviewWordIds: [], newWordIds: [], flashTimeBoxMs: 0, writeCandidates: [], writeCount: 0 }, '2026-09-01', 0) });
    await updateSettings(db, { lastBackupAt: null });
    const s = await loadTrySignals(db, new Date(2026, 9, 19, 20), await getSettings(db));
    expect(s).toMatchObject({ today: '2026-10-19', lastTalk: '2026-10-17', takes: 1, lists: [{ name: '复习一', notReady: 1, total: 1, weak: ['山'] }] });
    expect(s.backupDays).toBe(48);
  });
});
