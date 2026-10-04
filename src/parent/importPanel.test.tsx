import { fireEvent, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { allWords, listParentPassages } from '../store/repo';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { ImportPanel } from './ImportPanel';

vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:photo');

const TEXT = ['第三十课', '> 词语', '欺', '负', '告坼', '> 词语搭配', '保持 安静', '小明在公园里玩。他看见一只小猫。小猫在睡觉。'].join('\n');

describe('ImportPanel', () => {
  it('previews what it found, flags a misread word with a fix, and adds everything on approval', async () => {
    const app = await makeAppData();
    renderWithApp(<ImportPanel />, app);
    fireEvent.input(screen.getByLabelText('Worksheet text'), { target: { value: TEXT } });
    fireEvent.click(screen.getByText('Read it'));
    expect(screen.getByDisplayValue('第三十课')).toBeTruthy(); // the list name comes from the lesson header
    expect(screen.getByText('欺负')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Use 告诉' }));
    expect(screen.getByText('告诉')).toBeTruthy();
    expect(screen.getByText('保持 + 安静')).toBeTruthy();
    expect(screen.getByText(/小明在公园里玩/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Add/ }));
    await waitFor(async () => expect((await allWords(app.db)).map((w) => w.text)).toEqual(expect.arrayContaining(['欺负', '告诉'])));
    expect((await listParentPassages(app.db))).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toMatch(/Added/);
  });
  it('leaves out an unticked item, and joins two pieces of a split word', async () => {
    const app = await makeAppData();
    renderWithApp(<ImportPanel />, app);
    fireEvent.input(screen.getByLabelText('Worksheet text'), { target: { value: '> 词语\n绘\n本\n安静' } });
    fireEvent.click(screen.getByText('Read it'));
    fireEvent.click(screen.getByRole('button', { name: 'Join 绘 with the next' }));
    expect(screen.getByText('绘本')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include 安静' }));
    fireEvent.click(screen.getByRole('button', { name: /^Add/ }));
    await waitFor(async () => expect((await allWords(app.db)).map((w) => w.text)).toContain('绘本'));
    expect((await allWords(app.db)).map((w) => w.text)).not.toContain('安静');
  });
  it('splits a word it joined by mistake, and flags a misread made of real characters (自已 → 自己)', async () => {
    const app = await makeAppData();
    renderWithApp(<ImportPanel />, app);
    fireEvent.input(screen.getByLabelText('Worksheet text'), { target: { value: '> 词语\n大\n小\n自已' } });
    fireEvent.click(screen.getByText('Read it'));
    fireEvent.click(screen.getByRole('button', { name: 'Split 大小' }));
    expect(screen.getByText('大')).toBeTruthy();
    expect(screen.getByText('小')).toBeTruthy();
    expect(screen.queryByText('大小')).toBeNull();
    expect(screen.getByRole('button', { name: 'Use 自己' })).toBeTruthy();
    expect(screen.getByText(/may be misread/)).toBeTruthy();
  });
  it('shows an added photo so its text can be selected with Live Text', async () => {
    const app = await makeAppData();
    renderWithApp(<ImportPanel />, app);
    const file = new File(['x'], 'page.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Add a photo'), { target: { files: [file] } });
    expect(document.querySelector<HTMLImageElement>('.import__photo img')?.src).toContain('blob:photo');
    expect(screen.getByText(/Live Text/)).toBeTruthy();
  });
});
