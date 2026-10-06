import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { ProgressPanel } from './ProgressPanel';
import { summarize } from '../stats/stats';
import { DEFAULT_SETTINGS } from '../types';
import { makeCard, makeWord } from '../test/fixtures';

describe('the Progress tab (spec 2026-10-06 §3.4)', () => {
  it('shows characters recognised against the MOE target to date, and words heard, read, used, owned', () => {
    const know = summarize([makeWord('门')], [{ ...makeCard('b:门', 'recognise', new Date()), passed: 1 }, { ...makeCard('b:门', 'hear', new Date()), passed: 1 }]);
    render(<ProgressPanel know={know} settings={{ ...DEFAULT_SETTINGS, grade: 2 }} now={new Date('2026-10-06')} />);
    expect(screen.getByText(/1 of 746/)).toBeTruthy();
    expect(screen.getByText(/Heard/)).toBeTruthy();
    expect(screen.getByText(/Owned/)).toBeTruthy();
  });
});
