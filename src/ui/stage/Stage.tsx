import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import { ReportFlag } from '../../report/ReportFlag';

export type StageActivity = 'flash' | 'use' | 'zibian' | 'write' | 'langdu' | 'placement';

/**
 * One layout for every lesson activity (spec 2026-10-04 §3): the world behind, Truffle in one spot, the lesson on a paper
 * card that fills its region (so its box is the same on every question), and the feedback sheet docked underneath.
 * The card's corner flag reports a wrong question (beta, 2026-10-29).
 */
export function Stage({ activity, truffle, sheet, children }: { activity: StageActivity; truffle: ComponentChildren; sheet: ComponentChildren; children: ComponentChildren }) {
  const card = useRef<HTMLElement>(null);
  return (
    <div class={`stage stage--${activity}`} data-stage={activity}>
      <div class="stage__truffle">{truffle}</div>
      <section class="stage__card" ref={card}>
        {children}
        <ReportFlag activity={activity} card={() => card.current?.textContent ?? ''} />
      </section>
      <div class="stage__sheet">{sheet}</div>
    </div>
  );
}
