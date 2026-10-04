import type { StepKind } from '../types';

export type PathKind = StepKind | 'chest';
export type NodeState = 'done' | 'current' | 'upcoming';

export interface PathNode {
  kind: PathKind;
  state: NodeState;
}

/** Today's path: one node per planned step, then the chest. Exactly one node is current until all are done.
 *  用一用 is the lesson's close, not a stop on the path (spec §20 part 7; it keeps the path to 6 stops on a phone). */
export function pathNodes(steps: StepKind[], completedSteps: StepKind[], chestOpened: boolean, todayCompleted: boolean): PathNode[] {
  const done = new Set(completedSteps);
  const nodes: PathNode[] = steps.filter((s) => s !== 'wrapup').map((kind) => ({ kind, state: done.has(kind) || todayCompleted ? 'done' : 'upcoming' }));
  nodes.push({ kind: 'chest', state: chestOpened ? 'done' : 'upcoming' });
  const chest = nodes[nodes.length - 1];
  // a lesson left during 用一用 has every stop done but isn't finished: the chest is the stop that resumes it
  const current = todayCompleted ? (chestOpened ? undefined : chest) : (nodes.find((n) => n.kind !== 'chest' && n.state === 'upcoming') ?? chest);
  if (current) current.state = 'current';
  return nodes;
}
