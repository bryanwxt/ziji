import { screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { builtinWords } from '../content';
import { putCards, putWords } from '../store/repo';
import { makeCard } from '../test/fixtures';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { CollectionScreen } from './CollectionScreen';

vi.mock('../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));

// review 2026-10-17: a card's stars were ~10px and pale
describe("字卡's stars are readable", () => {
  it('each caught card shows three star slots at 20px, the earned ones filled', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    await putCards(app.db, [makeCard('b:河', 'recognise', new Date(2026, 9, 20), true)]);
    renderWithApp(<CollectionScreen />, app);
    const card = await screen.findByRole('button', { name: '河' });
    const stars = [...card.querySelectorAll('.zika__stars svg')];
    expect(stars).toHaveLength(3);
    for (const s of stars) expect(Number(s.getAttribute('width'))).toBeGreaterThanOrEqual(20);
    expect(stars.filter((s) => s.getAttribute('data-icon') === 'star').length).toBeGreaterThanOrEqual(1);
  });
});
