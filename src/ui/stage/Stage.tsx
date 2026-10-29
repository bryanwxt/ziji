import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import { ReportFlag } from '../../report/ReportFlag';

export type StageActivity = 'flash' | 'use' | 'zibian' | 'write' | 'langdu' | 'placement';

/**
 * One layout for every lesson activity (spec 2026-10-04 §3): the world behind, Truffle in one spot, the lesson on a paper
 * card that fills its region (so its box is the same on every question), and the feedback sheet docked underneath.
 * The card's corner flag reports a wrong question (beta, 2026-10-29).
 */
/** What the card shows, as a report reads it: each label as its characters (no pinyin), choices and lines apart with ' | '. */
export function cardText(card: HTMLElement): string {
  const copy = card.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('.report-flag').forEach((el) => el.remove());
  copy.querySelectorAll<HTMLElement>('.label').forEach((el) => el.replaceWith(el.dataset.zh ?? el.textContent ?? ''));
  copy.querySelectorAll('button, p, h1, h2, h3, li').forEach((el) => el.append(' | '));
  return (copy.textContent ?? '').replace(/\s+/g, ' ').replace(/(\s*\|\s*)+/g, ' | ').replace(/^ \| | \| $/g, '').trim();
}

export function Stage({ activity, truffle, sheet, children }: { activity: StageActivity; truffle: ComponentChildren; sheet: ComponentChildren; children: ComponentChildren }) {
  const card = useRef<HTMLElement>(null);
  return (
    <div class={`stage stage--${activity}`} data-stage={activity}>
      <div class="stage__truffle">{truffle}</div>
      <section class="stage__card" ref={card}>
        {children}
        <ReportFlag activity={activity} card={() => (card.current ? cardText(card.current) : '')} />
      </section>
      <div class="stage__sheet">{sheet}</div>
    </div>
  );
}
