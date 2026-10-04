import type { RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { browTransform, EXTRAS, EYE_L, EYE_R, lowerLid, mouthPath, PRESETS, springStep, upperLid, type Expression, type Face } from './rig';
import { cardCentre, gazeToward, idleExtras, isDoubleBlink, nextBlinkMs, nextEarFlickMs } from './behaviour';
import { REACTIONS, REST, TRACKS, type Motion, type Reaction, type Track } from './timelines';

type Key = keyof Face;
const KEYS = ['lidTop', 'lidBottom', 'lidArc', 'pupil', 'browY', 'browAngle', 'browShow', 'browAsym', 'smile', 'mouthOpen', 'earL', 'earR', 'blush', 'tilt'] as const satisfies readonly Key[];
const EXTRA_KEYS = Object.keys(EXTRAS) as Expression[];

/** The extra state the loop paints besides the face: where he looks and how the body is posed. */
export interface Pose { gx: number; gy: number; tilt: number; headY: number; rig: string; body: string; tail: string; blink: number; earL: number; earR: number }
export const REST_POSE: Pose = { gx: 0, gy: 0, tilt: 0, headY: 0, rig: '', body: '', tail: '', blink: 0, earL: 0, earR: 0 };

/** Paints a face and pose onto Truffle's parts (the same geometry the markup was drawn with). */
export function paint(els: (part: string) => Element | null, f: Face, pose: Pose, extras: Record<string, number>) {
  const set = (part: string, attr: string, value: string | number) => els(part)?.setAttribute(attr, String(value));
  const lidTop = Math.min(1, f.lidTop + pose.blink * (1 - f.lidTop));
  for (const [side, cx] of [['l', EYE_L], ['r', EYE_R]] as const) {
    const up = upperLid(cx, lidTop, f.lidArc);
    const low = lowerLid(cx, f.lidBottom);
    set(`iris-${side}`, 'transform', `translate(${(pose.gx * 6).toFixed(2)} ${(pose.gy * 5).toFixed(2)})`);
    set(`pupil-${side}`, 'rx', (7 * f.pupil).toFixed(2));
    set(`pupil-${side}`, 'ry', (11 * f.pupil).toFixed(2));
    set(`lid-top-${side}`, 'd', up.fill);
    set(`lid-edge-${side}`, 'd', up.edge);
    set(`lid-edge-${side}`, 'opacity', up.edgeOn ? 1 : 0);
    set(`lid-closed-${side}`, 'd', up.closed);
    set(`lid-closed-${side}`, 'opacity', up.closedOn.toFixed(3));
    set(`lid-bottom-${side}`, 'd', low.fill);
    set(`lid-bedge-${side}`, 'd', low.edge);
    set(`lid-bedge-${side}`, 'opacity', low.edgeOn ? 1 : 0);
    set(`blush-${side}`, 'opacity', (f.blush * 0.6).toFixed(3));
  }
  set('brow-l', 'transform', browTransform('L', f));
  set('brow-r', 'transform', browTransform('R', f));
  set('brow-l', 'opacity', f.browShow.toFixed(3));
  set('brow-r', 'opacity', f.browShow.toFixed(3));
  const m = mouthPath(f.smile, f.mouthOpen);
  set('mouth', 'd', m.d);
  set('mouth', 'fill-opacity', m.fillOpacity.toFixed(3));
  const earL = `transform-origin:100px 78px;transform:rotate(${(-(f.earL + pose.earL)).toFixed(2)}deg)`;
  const earR = `transform-origin:220px 78px;transform:rotate(${(f.earR + pose.earR).toFixed(2)}deg)`;
  for (const p of ['ear-l', 'ear-in-l']) set(p, 'style', earL);
  for (const p of ['ear-r', 'ear-in-r']) set(p, 'style', earR);
  const tilt = Math.max(-8, Math.min(8, f.tilt + pose.tilt + pose.gx * 5));
  set('headpos', 'transform', `translate(${(pose.gx * 3).toFixed(2)} ${(pose.gy * 2 + pose.headY).toFixed(2)})`);
  set('headrot', 'transform', `rotate(${tilt.toFixed(2)} 160 190)`);
  set('rig', 'transform', pose.rig);
  set('body', 'transform', pose.body);
  els('tail')?.setAttribute('style', `transform-origin:214px 246px;${pose.tail ? `transform:${pose.tail}` : ''}`);
  for (const e of EXTRA_KEYS) set(`extra-${e}`, 'opacity', (extras[e] ?? 0).toFixed(3));
}

export interface RigOptions {
  alive: boolean;
  /** his own expression (from the mood or the screen); a reaction holds another one for a moment */
  expr: Expression;
  reduced: boolean;
  react?: Reaction | null;
  /** a question is up: no ear flicks, tail swish or following the finger; he looks at the card (spec §4.8) */
  calm?: boolean;
  /** −1 (left) … 1 (right): an extra head tilt the screen asks for */
  lookAt?: number;
}

const BLINK_MS = 170;
const FLICK_MS = 260;

/** Whole-body motion as a transform about his feet (160, 276): lean, jump, squash (crouch/land) or stretch. */
export const rigTransform = (m: Motion, shimmer = 0) =>
  `translate(${(m.lean + shimmer).toFixed(2)} ${m.y.toFixed(2)}) translate(160 276) scale(${(1 + m.squash * 0.6).toFixed(4)} ${(1 - m.squash).toFixed(4)}) translate(-160 -276)`;

/**
 * The loop that brings a live Truffle to life (spec 2026-10-04 §4.1): every face value springs toward the target, and the
 * parts are painted through the DOM (no re-render). It runs only while alive, the page is visible and he is on screen.
 */
export function useRig(svgRef: RefObject<SVGSVGElement>, opts: RigOptions) {
  const o = useRef(opts);
  o.current = opts;
  const cur = useRef<Face>({ ...PRESETS[opts.expr] });
  // a reaction: an expression held for a while (then perhaps another), and a body track
  const pending = useRef<Reaction | null>(null); // a new reaction starts on the next frame, in frame time
  const hold = useRef<{ expr: Expression; until: number; then?: Expression } | null>(null);
  const after = useRef<Expression | null>(null);
  const track = useRef<{ fn: Track; start: number; purr: boolean } | null>(null);
  const lag = useRef({ y: 0, v: 0 });
  // idle life, scheduled by frame time
  const idle = useRef({ nextBlink: -1, blinkAt: -1, again: false, nextFlick: -1, flickAt: -1, flickSide: 1 });
  const gaze = useRef({ x: 0, y: 0, vx: 0, vy: 0, aim: { x: 0, y: 0 }, aimAt: -Infinity });
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const vel = useRef<Record<string, number>>({});
  const extras = useRef<Record<string, number>>(Object.fromEntries(EXTRA_KEYS.map((e) => [e, e === opts.expr ? 1 : 0])));
  const extraVel = useRef<Record<string, number>>({});
  const raf = useRef(0);
  const visible = useRef(true);
  const onScreen = useRef(true);

  // a new reaction replaces a running one (review focus 2)
  useEffect(() => {
    if (opts.react) pending.current = opts.react;
  }, [opts.react?.key]);

  useEffect(() => {
    if (!opts.alive) return;
    const svg = svgRef.current;
    if (!svg) return;
    const cache = new Map<string, Element | null>();
    const els = (part: string) => {
      if (!cache.has(part)) cache.set(part, svg.querySelector(`[data-part="${part}"]`));
      return cache.get(part)!;
    };
    const frame = (now: number) => {
      raf.current = 0;
      const { reduced, calm = false, lookAt = 0 } = o.current;
      const life = idleExtras(calm, reduced);
      if (pending.current) {
        const def = REACTIONS[pending.current.kind];
        pending.current = null;
        hold.current = { expr: def.expr, until: now + def.holdMs, then: def.then };
        after.current = null;
        track.current = def.track && !reduced ? { fn: TRACKS[def.track], start: now, purr: def.track === 'purr' } : null;
      }
      // which expression shows now: a held reaction, what follows it, or his own
      if (hold.current && now >= hold.current.until) {
        after.current = hold.current.then ?? null;
        hold.current = null;
      }
      const expr = hold.current?.expr ?? after.current ?? o.current.expr;
      const target = PRESETS[expr];
      if (svg.getAttribute('data-expression') !== expr) svg.setAttribute('data-expression', expr);
      const [stiff, damp] = reduced ? [0.3, 0.5] : [0.16, 0.7]; // reduced motion: a quick cross-fade, no overshoot
      for (const k of KEYS) {
        const [x, v] = springStep(cur.current[k], vel.current[k] ?? 0, target[k], stiff, damp);
        cur.current[k] = x;
        vel.current[k] = v;
      }
      for (const e of EXTRA_KEYS) {
        const [x, v] = springStep(extras.current[e] ?? 0, extraVel.current[e] ?? 0, e === expr ? 1 : 0, stiff, damp);
        extras.current[e] = x;
        extraVel.current[e] = v;
      }
      // the body: the reaction's track (ending at rest), the head lagging a little behind a jump
      let m: Motion = REST;
      let shimmer = 0;
      if (track.current) {
        const sample = track.current.fn(now - track.current.start);
        if (sample) {
          m = sample;
          if (track.current.purr) shimmer = Math.sin(now / 1000 * 95) * 0.5;
        } else track.current = null;
      }
      lag.current.v = (lag.current.v + (-m.y * 0.18 - lag.current.y) * 0.2) * 0.7;
      lag.current.y += lag.current.v;
      // blinks (sometimes two) and ear flicks
      const s = idle.current;
      if (s.nextBlink < 0) s.nextBlink = now + nextBlinkMs(Math.random);
      if (s.nextFlick < 0) s.nextFlick = now + nextEarFlickMs(Math.random);
      if (life.blink && s.blinkAt < 0 && now >= s.nextBlink) {
        s.blinkAt = now;
        s.again = !s.again && isDoubleBlink(Math.random);
      }
      let blink = 0;
      if (s.blinkAt >= 0) {
        const k = (now - s.blinkAt) / BLINK_MS;
        if (k >= 1) {
          s.blinkAt = -1;
          s.nextBlink = now + (s.again ? 90 : nextBlinkMs(Math.random));
        } else blink = 1 - Math.abs(2 * k - 1);
      }
      let flickL = 0;
      let flickR = 0;
      if (now >= s.nextFlick) {
        if (life.earFlicks && s.flickAt < 0) {
          s.flickAt = now;
          s.flickSide = Math.random() < 0.5 ? -1 : 1;
        }
        s.nextFlick = now + nextEarFlickMs(Math.random);
      }
      if (s.flickAt >= 0) {
        const k = (now - s.flickAt) / FLICK_MS;
        if (k >= 1 || !life.earFlicks) s.flickAt = -1;
        else if (s.flickSide < 0) flickL = Math.sin(Math.PI * k) * 16;
        else flickR = Math.sin(Math.PI * k) * 16;
      }
      // breathing, anchored at his feet; the head rides a little behind
      const t = now / 1000;
      const br = life.breathe ? Math.sin(t * 2.1) : 0;
      const body = life.breathe ? `translate(0 ${(-br * 0.24).toFixed(3)}) translate(160 276) scale(1 ${(1 + br * 0.004).toFixed(4)}) translate(-160 -276)` : '';
      const purring = !!track.current?.purr;
      const tail = purring && !reduced ? `rotate(${(Math.sin(t * 1.1) * 3).toFixed(2)}deg)` : life.tailSwish ? `rotate(${(Math.sin(t * 2.3) * 8).toFixed(2)}deg)` : '';
      // where he looks: the finger when free, the card while calm, otherwise ahead
      const g = gaze.current;
      if (life.followPointer) g.aim = pointer.current ? gazeToward(svg.getBoundingClientRect(), pointer.current) : { x: 0, y: 0 };
      else if (calm) {
        if (now - g.aimAt >= 500) {
          g.aim = gazeToward(svg.getBoundingClientRect(), cardCentre());
          g.aimAt = now;
        }
      } else g.aim = { x: 0, y: 0 };
      [g.x, g.vx] = springStep(g.x, g.vx, g.aim.x, stiff, damp);
      [g.y, g.vy] = springStep(g.y, g.vy, g.aim.y, stiff, damp);
      const pose: Pose = {
        gx: g.x, gy: g.y, tilt: m.shake + Math.max(-1, Math.min(1, lookAt)) * 4, headY: lag.current.y - br * 0.7,
        rig: rigTransform(m, shimmer), body, tail, blink, earL: flickL, earR: flickR,
      };
      paint(els, cur.current, pose, extras.current);
      start();
    };
    const start = () => {
      if (!raf.current && visible.current && onScreen.current && typeof requestAnimationFrame === 'function') raf.current = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (raf.current && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
    const onVisibility = () => {
      visible.current = !document.hidden;
      if (visible.current) start();
      else stop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const onPointer = (e: PointerEvent) => { pointer.current = { x: e.clientX, y: e.clientY }; };
    document.addEventListener('pointermove', onPointer, { passive: true });
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver(([entry]) => {
        onScreen.current = !!entry?.isIntersecting;
        if (onScreen.current) start();
        else stop();
      });
      io.observe(svg);
    }
    visible.current = !document.hidden;
    start();
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('pointermove', onPointer);
      io?.disconnect();
    };
  }, [opts.alive]);
}
