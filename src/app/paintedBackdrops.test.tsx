import { screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { putWords } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { CollectionScreen } from './CollectionScreen';
import { PetSetup } from './PetSetup';
import { PlacementScreen } from './PlacementScreen';
import { Wardrobe } from './Wardrobe';

/** The four screens that borrow his world: its painting under a pale veil, nothing drawn on it (parent, 2026-10-14). */
function expectBackdrop(world = 'home') {
  const scene = document.querySelector('.world-scene.world-scene--bare');
  expect(scene?.getAttribute('data-world')).toBe(world);
  expect(scene?.querySelector('image[data-part="painting"]')).toBeTruthy();
  expect(scene?.querySelector('.world-scene__veil')).toBeTruthy();
  expect(scene?.querySelector('[data-part="props"], .world-props')).toBeNull();
  expect(document.querySelector('.scene--home, .scene__swash')).toBeNull();
}

describe('painted backdrops', () => {
  it('first-launch setup uses the first world', async () => {
    renderWithApp(<PetSetup />, await makeAppData({ kid: null }));
    expectBackdrop('home');
  });
  it('placement question and result', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    renderWithApp(<PlacementScreen tapGuardMs={0} seed={1} />, app);
    await screen.findByText('不知道');
    expectBackdrop();
  });
  it('字卡 and the room', async () => {
    const app = await makeAppData();
    renderWithApp(<CollectionScreen />, app);
    await screen.findByRole('heading', { name: '字卡' });
    expectBackdrop();
  });
  it('松露的房间', async () => {
    renderWithApp(<Wardrobe />, await makeAppData());
    expectBackdrop();
  });
});
