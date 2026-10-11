import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { allWords, getSettings, seedBuiltinWords } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { SettingsPanel } from './SettingsPanel';

describe('Course: both tracks (spec 2026-10-11 §6)', () => {
  it('is the default, labelled 华文 + 高级华文, and writes every character either list writes', async () => {
    const app = await makeAppData();
    await seedBuiltinWords(app.db, builtinWords(0, 'cl'), true);
    renderWithApp(<SettingsPanel />, app);
    const course = screen.getByLabelText('Course') as HTMLSelectElement;
    expect(course.value).toBe('both');
    expect(course.selectedOptions[0]!.textContent).toBe('华文 + 高级华文');
    fireEvent.change(course, { target: { value: 'hcl' } });
    await waitFor(async () => expect((await getSettings(app.db)).course).toBe('hcl'));
    fireEvent.change(course, { target: { value: 'both' } });
    await waitFor(async () => expect((await getSettings(app.db)).contentCourse).toBe('both'));
    expect((await allWords(app.db)).find((w) => w.text === '井')?.writeable).toBe(true);
  });
});
