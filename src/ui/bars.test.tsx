import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { makeAppData, renderWithApp } from '../test/renderWithApp';
import { TabBar } from './TabBar';

describe('TabBar', () => {
  it('marks the active tab and navigates', async () => {
    const app = await makeAppData();
    renderWithApp(<TabBar active="home" />, app);
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(screen.getByText('首页').closest('button')!.getAttribute('aria-current')).toBe('page');
    fireEvent.click(screen.getByText('字卡'));
    expect(app.go).toHaveBeenCalledWith({ name: 'stickers' });
    fireEvent.click(screen.getByText('家长'));
    expect(app.go).toHaveBeenCalledWith({ name: 'parent' });
  });
});
