import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_KID } from '../types';
import { WORLDS } from '../fun/worlds';
import { Wardrobe } from './Wardrobe';

vi.mock('../audio/speech', () => ({ stopSpeaking: vi.fn(), speak: vi.fn(), primeSpeech: vi.fn() }));

const zh = (el: Element | null) => el?.querySelector('.label')?.getAttribute('data-zh');

// review 2026-10-17: locked tiles were pale padlocks with no way to tell how to get them
describe("Truffle's room: what's locked and how to get it", () => {
  it('a locked chest costume is a full-contrast silhouette of Truffle in it, tagged 宝箱', async () => {
    renderWithApp(<Wardrobe />, await makeAppData({ kid: { ...DEFAULT_KID, ownedCostumes: ['tiger'] } }));
    const dragon = screen.getByRole('button', { name: '龙' }) as HTMLButtonElement;
    expect(dragon.disabled).toBe(true);
    expect(dragon.querySelector('.outfit__preview.is-silhouette svg.truffle')?.getAttribute('data-outfit')).toBe('dragon');
    expect(zh(dragon.querySelector('.outfit__tag'))).toBe('宝箱');
    const tiger = screen.getByRole('button', { name: '虎' });
    expect(tiger.querySelector('.is-silhouette, .outfit__tag')).toBeNull();
  });
  it('a locked accessory is its own drawing as a silhouette, tagged 宝箱', async () => {
    renderWithApp(<Wardrobe />, await makeAppData({ kid: { ...DEFAULT_KID, ownedAccessories: [] } }));
    const wand = screen.getByRole('button', { name: '魔法棒' });
    expect(wand.querySelector('.is-silhouette svg.acc-thumb')).toBeTruthy();
    expect(zh(wand.querySelector('.outfit__tag'))).toBe('宝箱');
  });
  it('a locked power says how many more characters unlock it: 再认识 3 个字', async () => {
    renderWithApp(<Wardrobe />, await makeAppData());
    fireEvent.click(screen.getByRole('tab', { name: '能力' }));
    const rows = await screen.findAllByRole('button', { name: /\d+\/\d+/ });
    const fire = rows.find((r) => r.getAttribute('aria-label')!.startsWith('火'))!;
    await waitFor(() => expect(zh(fire.querySelector('.power-row__need'))).toBe('再认识 3 个字'));
  });
  it('a world not reached yet says the same: 再认识 N 个字', async () => {
    renderWithApp(<Wardrobe />, await makeAppData());
    fireEvent.click(screen.getByRole('tab', { name: '地方' }));
    const next = WORLDS.find((w) => w.id !== 'home')!;
    const place = screen.getByText((_, el) => el?.getAttribute('data-zh') === next.zh).closest('button')!;
    await waitFor(() => expect(zh(place.querySelector('.place__lock'))).toBe(`再认识 ${next.at} 个字`));
  });
});
