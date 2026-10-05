import { useEffect, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../audio/sfx';
import { speak } from '../../audio/speech';
import type { WorldId } from '../../fun/worlds';
import type { KidState } from '../../types';
import { reducedMotion } from '../motion';
import type { ReactionKind } from '../truffle/timelines';
import { FX_MS, GEM_POP_MS, momentFx } from './momentFx';
import { MOMENTS, runMoment, type Fx, type Outcome } from './moments';
import { SCENE_VIEWBOX, WORLD_ART } from './scenes';
import { BABY_DINO } from './tapArt';

/** How often a moment starts by itself on Home (ms), plus up to half as much again at random. */
export const AUTO_MS = 30_000;

interface Props {
  world: WorldId;
  kid: KidState;
  today: string;
  onKid: (kid: KidState) => void; // finds (or stars) changed: save it
  onSay: (line: string) => void; // Truffle says it in his bubble
  onReact: (kind: ReactionKind, side: -1 | 1) => void; // how Truffle reacts, and which side the prop is on (he looks there)
  autoEvery?: number;
}

/**
 * Truffle's props in each world (spec 2026-10-04 §4.5): tap one and he plays with it — the prop moves in its own place while the
 * still one in the scene is hidden — and some moments start by themselves now and then. The daily finds live on these props
 * (runMoment keeps their rules). Only the props take taps; the rest of the world lets them through.
 */
export function WorldProps({ world, kid, today, onKid, onSay, onReact, autoEvery = AUTO_MS }: Props) {
  const [fx, setFx] = useState<{ svg: string; run: number; kind: Fx['kind'] } | null>(null);
  const busy = useRef(false);
  const gemTaps = useRef({ day: today, n: 0 }); // taps count toward one day's gem only
  const hidden = useRef<HTMLElement | SVGElement | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const run = useRef(0);
  const latest = useRef({ kid, today, onKid, onSay, onReact });
  latest.current = { kid, today, onKid, onSay, onReact };
  const art = WORLD_ART[world];

  const show = () => {
    if (hidden.current) hidden.current.style.visibility = '';
    hidden.current = null;
  };
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => { timers.current.forEach(clearTimeout); show(); }, []);

  const play = (prop: string, o: Outcome, auto = false) => {
    const still = reducedMotion();
    const { svg, hide } = momentFx(world, o.fx, still);
    show(); // another moment's prop comes back first
    if (hide) {
      const el = document.querySelector<SVGElement>(`.world-scene ${hide}`);
      if (el) { el.style.visibility = 'hidden'; hidden.current = el; }
    }
    busy.current = true;
    // SVG animations run on their outermost <svg>'s clock: each moment gets a fresh <svg> (keyed), so it always plays from its start
    setFx({ svg, run: ++run.current, kind: o.fx.kind });
    const ms = o.fx.kind === 'crack' && o.fx.gem ? GEM_POP_MS : FX_MS[o.fx.kind];
    later(ms, () => {
      busy.current = false;
      show();
      if (o.fx.kind !== 'crack') setFx(null); // cracks stay on the block for this visit
    });
    if (o.say) latest.current.onSay(o.say);
    if (o.later) { const line = o.later.say; later(o.later.ms, () => latest.current.onSay(line)); }
    if (o.speak && !auto) speak(o.speak); // a moment that starts by itself never talks out loud
    if (o.sfx) playSfx(o.sfx);
    latest.current.onReact(o.react, art.props[prop]!.x < 180 ? -1 : 1);
  };

  const onTap = (prop: string) => {
    if (busy.current) return; // a moment that is playing ignores taps
    const { kid: k, today: day } = latest.current;
    if (gemTaps.current.day !== day) gemTaps.current = { day, n: 0 };
    const o = runMoment(world, prop, k, day, prop === 'gem-block' ? ++gemTaps.current.n : 0);
    if (o.kid) latest.current.onKid(o.kid);
    play(prop, o);
  };

  // now and then a moment starts by itself (spec §4.5) — never with reduced motion, never one that holds a find
  useEffect(() => {
    if (reducedMotion()) return;
    const autos = MOMENTS[world].filter((m) => m.auto);
    if (!autos.length) return;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        if (!busy.current && document.visibilityState !== 'hidden') {
          const m = autos[Math.floor(Math.random() * autos.length)]!;
          const { kid: k, today: day } = latest.current;
          const { kid: _found, ...o } = runMoment(world, m.prop, k, day, 0);
          play(m.prop, o, true);
        }
        next();
      }, autoEvery + Math.random() * autoEvery * 0.5);
    };
    next();
    return () => clearTimeout(t);
  }, [world, autoEvery]);

  const nest = art.props.nest;
  const baby = world === 'dino' && kid.finds.dinoHatched && fx?.kind !== 'hop' && nest ? `<g class="tap-baby-dino" transform="translate(${nest.x + 10} ${nest.y - 8}) scale(0.9)">${BABY_DINO}</g>` : '';

  return (
    <>
      <svg class="world-props" data-world={world} viewBox={SCENE_VIEWBOX} preserveAspectRatio="xMidYMax slice">
        {baby && <g aria-hidden="true" dangerouslySetInnerHTML={{ __html: baby }} />}
        {MOMENTS[world].filter((m) => m.tap).map((m) => {
          const s = art.props[m.prop]!;
          return (
            <rect
              key={m.prop}
              class="tap"
              role="button"
              tabIndex={0}
              aria-label={m.label}
              x={s.x - s.w / 2}
              y={s.y - s.h}
              width={s.w}
              height={s.h}
              rx={10}
              fill="#000"
              fill-opacity="0"
              onClick={() => onTap(m.prop)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onTap(m.prop)}
            />
          );
        })}
      </svg>
      {fx && fx.svg && <svg key={fx.run} class="world-props world-props__fx" aria-hidden="true" viewBox={SCENE_VIEWBOX} preserveAspectRatio="xMidYMax slice" dangerouslySetInnerHTML={{ __html: fx.svg }} />}
    </>
  );
}
