import type { RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { browTransform, EXTRAS, EYE_L, EYE_R, lowerLid, mouthPath, PRESETS, springStep, upperLid, type Expression, type Face } from './rig';
import { cardCentre, gazeToward, idleExtras, isDoubleBlink, nextBlinkMs, nextEarFlickMs } from './behaviour';
import { onSpeaking, settleIfSilent } from '../../audio/speaking';
import { PAW_REST, PAW_TRACKS, REACTIONS, REST, TRACKS, type Motion, type PawPose, type Reaction, type Track } from './timelines';

type Key = keyof Face;
const KEYS = ['lidTop', 'lidBottom', 'lidArc', 'pupil', 'browY', 'browAngle', 'browShow', 'browAsym', 'smile', 'mouthOpen', 'earL', 'earR', 'blush', 'tilt'] as const satisfies readonly Key[];
const EXTRA_KEYS = Object.keys(EXTRAS) as Expression[];

/** The extra state the loop paints besides the face: where he looks and how the body is posed. */
export interface Pose { gx: number; gy: number; tilt: number; headY: number; rig: string; body: string; tail: string; blink: number; earL: number; earR: number; pawL: string; pawR: string; shadow?: string }
export const REST_POSE: Pose = { gx: 0, gy: 0, tilt: 0, headY: 0, rig: '', body: '', tail: '', blink: 0, earL: 0, earR: 0, pawL: '', pawR: '' };

/** A paw's transform from its offsets (around where it sits at his feet), or none at rest. */
const pawTransform = (dx: number, dy: number, r: number, cx: number) =>
  Math.abs(dx) + Math.abs(dy) + Math.abs(r) < 0.05 ? '' : `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${r.toFixed(2)} ${cx} 266)`;
/** From wherever the paws are back to his feet in 200 ms (a reaction without paws, or a question coming up, cut a move short). */
function settlePaws(from: PawPose): (t: number) => PawPose | null {
  return (t) => {
    if (t > 200) return null;
    const k = 1 - t / 200;
    return { lx: from.lx * k, ly: from.ly * k, lr: from.lr * k, rx: from.rx * k, ry: from.ry * k, rr: from.rr * k };
  };
}
/** How long a new reaction carries the old pose before it is all its own (no snap to the ground or the feet; sweep). */
const CARRY_MS = 160;

/** Paints a face and pose onto Truffle's parts (the same geometry the markup was drawn with). */
export function paint(els: (part: string) => Element | null, f: Face, pose: Pose, extras: Record<string, number>, memo?: WeakMap<Element, Record<string, string>>) {
  // a value already there is not written again: a still frame costs no style or layout work (sweep)
  const set = (part: string, attr: string, value: string | number) => {
    const el = els(part);
    if (!el) return;
    const v = String(value);
    if (memo) {
      let seen = memo.get(el);
      if (!seen) memo.set(el, (seen = {}));
      if (seen[attr] === v) return;
      seen[attr] = v;
    }
    el.setAttribute(attr, v);
  };
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
  set('shadow', 'transform', pose.shadow ?? '');
  set('body', 'transform', pose.body);
  set('tail', 'style', `transform-origin:214px 246px;${pose.tail ? `transform:${pose.tail}` : ''}`);
  set('paw-l', 'transform', pose.pawL);
  set('paw-r', 'transform', pose.pawR);
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

const SETTLE_MS = 200;
/** A move cut short: from where he is, back to rest. */
const settle = (from: Motion): Track => (t) => {
  if (t >= SETTLE_MS) return null;
  const k = 1 - (1 - t / SETTLE_MS) ** 2;
  return { y: from.y * (1 - k), squash: from.squash * (1 - k), shake: from.shake * (1 - k), lean: from.lean * (1 - k) };
};

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
  const paws = useRef<{ fn: (t: number) => PawPose | null; start: number } | null>(null); // the paws' move (spec §4.6)
  const lastPaws = useRef<PawPose>(PAW_REST);
  const carry = useRef<{ m: Motion; p: PawPose; at: number } | null>(null); // where he was when a new reaction cut in
  const lag = useRef({ y: 0, v: 0 });
  const lastMotion = useRef<Motion>(REST);
  // idle life, scheduled by frame time
  const idle = useRef({ nextBlink: -1, blinkAt: -1, again: false, nextFlick: -1, flickAt: -1, flickSide: 1, nextKnead: -1 });
  const gaze = useRef({ x: 0, y: 0, vx: 0, vy: 0, aim: { x: 0, y: 0 }, aimAt: -Infinity });
  const pointer = useRef<{ x: number; y: number; at: number } | null>(null);
  const vel = useRef<Record<string, number>>({});
  const extras = useRef<Record<string, number>>(Object.fromEntries(EXTRA_KEYS.map((e) => [e, e === opts.expr ? 1 : 0])));
  const extraVel = useRef<Record<string, number>>({});
  const raf = useRef(0);
  const talking = useRef(false); // the iPad is speaking: his mouth moves (spec §4.6)
  const talkFace = useRef<Face>({ ...PRESETS.neutral }); // reused each frame while talking (no new object per frame)
  const visible = useRef(true);
  const onScreen = useRef(true);

  // a new reaction replaces a running one (review focus 2)
  useEffect(() => {
    if (!opts.react) return;
    pending.current = opts.react;
    // the reaction's expression is the state of him from now on (screens and tests read it); the loop eases the face there
    if (o.current.alive) svgRef.current?.setAttribute('data-expression', REACTIONS[opts.react.kind].expr);
  }, [opts.react?.key]);

  useEffect(() => {
    if (!opts.alive) return;
    const svg = svgRef.current;
    if (!svg) return;
    // parts come and go (a hood hides his ears; taking it off makes new ones), so a miss or a detached part is looked up again
    const cache = new Map<string, Element>();
    const memo = new WeakMap<Element, Record<string, string>>(); // what is already painted on each part
    const els = (part: string) => {
      let el = cache.get(part);
      if (!el?.isConnected) {
        el = svg.querySelector(`[data-part="${part}"]`) ?? undefined;
        if (el) cache.set(part, el);
        else cache.delete(part);
      }
      return el ?? null;
    };
    let wasCalm = false;
    const frame = (now: number) => {
      raf.current = 0;
      const { reduced, calm = false, lookAt = 0 } = o.current;
      const life = idleExtras(calm, reduced);
      // a question has come up (spec §4.3): what a reaction left behind goes (its held face, what follows it), and a move
      // still running eases to rest in 200 ms; a reaction sent during calm (写一写's nod) still plays
      if (calm && !wasCalm) {
        hold.current = null;
        after.current = null;
        // from where he is drawn now (a carry included), so nothing is counted twice (final review)
        if (track.current || carry.current) track.current = { fn: settle(lastMotion.current), start: now, purr: false };
        if (paws.current || carry.current) paws.current = { fn: settlePaws(lastPaws.current), start: now };
        carry.current = null;
      }
      wasCalm = calm;
      if (pending.current) {
        const def = REACTIONS[pending.current.kind];
        pending.current = null;
        // (paws a new reaction doesn't move already ease down by settlePaws below: carrying them too would double them)
        const pawsUp = !!paws.current || !!carry.current; // paws off their rest, by a move or a carry
        carry.current = { m: lastMotion.current, p: def.paws ? lastPaws.current : PAW_REST, at: now };
        hold.current = { expr: def.expr, until: now + def.holdMs, then: def.then };
        after.current = null;
        track.current = def.track && !reduced ? { fn: TRACKS[def.track], start: now, purr: def.track === 'purr' } : null;
        // its paw move, if it has one; otherwise a running one goes back to his feet (never stuck raised)
        paws.current = def.paws && !reduced ? { fn: PAW_TRACKS[def.paws], start: now } : pawsUp ? { fn: settlePaws(lastPaws.current), start: now } : null;
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
      // his idle life follows his mood (spec §4.6): content, he kneads now and then (never during a question)
      const happy = expr === 'content' || expr === 'happy' || expr === 'joy';
      if (idle.current.nextKnead < 0) idle.current.nextKnead = now + 12000 + Math.random() * 8000;
      if (now >= idle.current.nextKnead) {
        idle.current.nextKnead = now + 12000 + Math.random() * 8000;
        if (happy && !calm && !reduced && !paws.current && !track.current && !hold.current) paws.current = { fn: PAW_TRACKS.knead, start: now };
      }
      let pw: PawPose = PAW_REST;
      if (paws.current) {
        const sample = paws.current.fn(now - paws.current.start);
        if (sample) pw = sample;
        else paws.current = null;
      }
      // a new reaction starts from where the last one left him, easing over in CARRY_MS (never a one-frame snap)
      const c = carry.current;
      if (c) {
        const k = (now - c.at) / CARRY_MS;
        if (k >= 1) carry.current = null;
        else {
          const w = 1 - k;
          m = { y: m.y + c.m.y * w, squash: m.squash + c.m.squash * w, shake: m.shake + c.m.shake * w, lean: m.lean + c.m.lean * w };
          pw = { lx: pw.lx + c.p.lx * w, ly: pw.ly + c.p.ly * w, lr: pw.lr + c.p.lr * w, rx: pw.rx + c.p.rx * w, ry: pw.ry + c.p.ry * w, rr: pw.rr + c.p.rr * w };
        }
      }
      lastMotion.current = m; // where he is drawn: a new reaction or a question starts from here
      lastPaws.current = pw;
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
      if (pointer.current && now - pointer.current.at > 2000) pointer.current = null; // a finger that stopped moving is let go (sweep)
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
        pawL: pawTransform(pw.lx, pw.ly, pw.lr, 138), pawR: pawTransform(pw.rx, pw.ry, pw.rr, 182),
        shadow: m.y < -0.5 ? `translate(160 279) scale(${Math.max(0.55, 1 + m.y / 110).toFixed(3)}) translate(-160 -279)` : '',
      };
      // talking: the mouth opens and closes while the iPad speaks; the face itself is untouched, so it settles when speech ends
      if (talking.current && (Math.floor(now / 500) !== Math.floor((now - 17) / 500))) settleIfSilent(); // about twice a second
      let face = cur.current;
      if (talking.current && !reduced) {
        face = Object.assign(talkFace.current, cur.current);
        face.mouthOpen = Math.max(cur.current.mouthOpen, 0.12 + 0.38 * Math.abs(Math.sin(t * 13)));
      }
      paint(els, face, pose, extras.current, memo);
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
    const offTalk = onSpeaking((on) => { talking.current = on; });
    const onPointer = (e: PointerEvent) => { pointer.current = { x: e.clientX, y: e.clientY, at: performance.now() }; };
    document.addEventListener('pointermove', onPointer, { passive: true });
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1]; // the latest says where he is now
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
      offTalk();
      io?.disconnect();
    };
  }, [opts.alive]);
}
