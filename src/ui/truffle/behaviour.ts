// The small life Truffle has between reactions (spec 2026-10-04 §4.2, §4.3, §4.8): blinks, ear flicks, breathing, a tail
// swish, and where he looks. Pure functions; the loop in useRig schedules them by frame time.

/** The wait before the next blink: 2–5 s. */
export const nextBlinkMs = (rng: () => number) => 2000 + rng() * 3000;
/** About one blink in five is a double blink. */
export const isDoubleBlink = (rng: () => number) => rng() < 0.2;
/** The wait before the next ear flick: 3–7.5 s. */
export const nextEarFlickMs = (rng: () => number) => 3000 + rng() * 4500;

/**
 * What idle life runs. While a question is up (calm) he only breathes, blinks and looks at the card, so nothing pulls
 * the child's eye; with reduced motion only the blink stays (it is tiny and keeps him alive).
 */
export function idleExtras(calm: boolean, reduced: boolean) {
  const free = !calm && !reduced;
  return { blink: true, breathe: !reduced, earFlicks: free, tailSwish: free, followPointer: free };
}

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
/** Where to look, −1…1 per axis, from his own box toward a point; straight ahead with nothing to look at. */
export function gazeToward(from: DOMRect, to: { x: number; y: number } | null): { x: number; y: number } {
  if (!to || !from.width || !from.height) return { x: 0, y: 0 };
  const cx = from.left + from.width / 2;
  const cy = from.top + from.height / 2;
  return { x: clamp1((to.x - cx) / (from.width * 1.1)), y: clamp1((to.y - cy) / (from.height * 1.1)) };
}

/** The centre of the lesson card, or null when there is none (review focus 5: he then looks ahead). */
export function cardCentre(): { x: number; y: number } | null {
  const r = document.querySelector('.stage__card')?.getBoundingClientRect();
  if (!r || !r.width || !r.height) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * What a touch on him was (spec §4.5): a drag across his head or body is a stroke; a quick touch that hardly moved is a
 * tap on the part touched (head or tail); anything else (a long press that went nowhere) is nothing.
 */
export function classifyGesture(g: { part: 'head' | 'body' | 'tail'; travelled: number; ms: number }): 'stroke' | 'tapHead' | 'tapTail' | null {
  if (g.travelled >= 50 && g.part !== 'tail') return 'stroke';
  if (g.ms < 350 && g.travelled < 12) return g.part === 'head' ? 'tapHead' : g.part === 'tail' ? 'tapTail' : null;
  return null;
}
