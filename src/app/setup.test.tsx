import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { builtinWords } from '../content';
import { hashPin } from '../lib/hash';
import { getKid, getSettings, putWords } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { DEFAULT_SETTINGS } from '../types';
import { PetSetup } from './PetSetup';
import { PlacementScreen } from './PlacementScreen';
import { SetupPin } from './SetupPin';

const type = (pin: string) => [...pin].forEach((d) => fireEvent.click(screen.getByRole('button', { name: d })));

describe('first launch', () => {
  it('SetupPin asks twice and saves a hashed PIN', async () => {
    const app = await makeAppData({ settings: { ...DEFAULT_SETTINGS } });
    renderWithApp(<SetupPin />, app);
    type('1234');
    await screen.findByText('Enter the same PIN again');
    type('9999');
    expect(await screen.findByText('The PINs did not match. Please start again.')).toBeTruthy();
    type('1234');
    await screen.findByText('Enter the same PIN again');
    type('1234');
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'petSetup' }));
    expect((await getSettings(app.db)).pinHash).toBe(await hashPin('1234'));
  });

  it('PetSetup welcomes him with the red 字己 seal, and no explanation of the pun', async () => {
    renderWithApp(<PetSetup />, await makeAppData({ kid: null }));
    expect(screen.getByRole('heading', { name: '字己' })).toBeTruthy();
    expect(document.querySelector('.brand .seal')?.textContent).toBe('字己');
    expect([...document.querySelectorAll('.brand .seal > span')].map((s) => s.textContent)).toEqual(['字', '己']); // stacked, not vertical text
    expect(document.querySelector('.pun')).toBeNull();
    expect(document.body.textContent).not.toContain('自己学汉字');
  });

  it('Meet Truffle: wake him, then continue to placement', async () => {
    const app = await makeAppData({ kid: null });
    renderWithApp(<PetSetup />, app);
    expect(document.querySelector('svg.truffle')?.getAttribute('data-mood')).toBe('sleepy');
    expect((screen.getByText('好！').closest('button') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '叫醒松露' }));
    expect(document.querySelector('svg.truffle')?.getAttribute('data-mood')).toBe('sulk');
    expect(screen.getByText(/我是松露/)).toBeTruthy();
    fireEvent.click(screen.getByText('好！'));
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'placement' }));
    expect((await getKid(app.db))?.petName).toBe('松露');
  });

  it('Placement quiz: passes a band at 6 of 8, stops at the 3rd miss, credits the passed band', async () => {
    const app = await makeAppData();
    const words = builtinWords(0);
    await putWords(app.db, words);
    renderWithApp(<PlacementScreen tapGuardMs={0} />, app);
    const answerRight = async () => {
      const ch = (await screen.findByTestId('placement-char')).textContent!;
      fireEvent.click(screen.getByRole('button', { name: words.find((w) => w.text === ch)!.pinyin }));
    };
    for (let i = 0; i < 6; i++) await answerRight();
    fireEvent.click(screen.getByText('不知道'));
    fireEvent.click(screen.getByText('不知道'));
    expect(await screen.findByText('第 2 组')).toBeTruthy();
    for (let i = 0; i < 3; i++) fireEvent.click(await screen.findByText('不知道'));
    expect(await screen.findByText('你已经认识 300 个字了！')).toBeTruthy();
    expect((await getSettings(app.db)).placementDone).toBe(true);
    fireEvent.click(screen.getByText('开始！'));
    await waitFor(() => expect(app.go).toHaveBeenCalledWith({ name: 'home' }));
  });

  it('Placement quiz: a double tap answers once, not the next question too', async () => {
    const app = await makeAppData();
    await putWords(app.db, builtinWords(0));
    renderWithApp(<PlacementScreen tapGuardMs={120} />, app);
    const ready = () => waitFor(() => expect(document.querySelector('[data-ready="true"]')).toBeTruthy());
    await ready();
    fireEvent.click(screen.getByText('不知道'));
    fireEvent.click(screen.getByText('不知道')); // lands on the next question straight away: ignored
    await ready();
    fireEvent.click(screen.getByText('不知道'));
    await ready();
    expect(screen.getByTestId('placement-char')).toBeTruthy(); // only 2 misses so far, so still asking
    expect(screen.queryByText(/你已经认识/)).toBeNull();
  });
});
