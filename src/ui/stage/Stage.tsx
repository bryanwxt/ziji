import type { ComponentChildren } from 'preact';

export type StageActivity = 'flash' | 'use' | 'zibian' | 'write' | 'langdu' | 'placement';

/**
 * One layout for every lesson activity (spec 2026-10-04 §3): the world behind, Truffle in one spot, the lesson on a paper
 * card that fills its region (so its box is the same on every question), and the feedback sheet docked underneath.
 */
export function Stage({ activity, truffle, sheet, children }: { activity: StageActivity; truffle: ComponentChildren; sheet: ComponentChildren; children: ComponentChildren }) {
  return (
    <div class={`stage stage--${activity}`} data-stage={activity}>
      <div class="stage__truffle">{truffle}</div>
      <section class="stage__card">{children}</section>
      <div class="stage__sheet">{sheet}</div>
    </div>
  );
}
