import { useEffect, useRef, useState } from 'preact/hooks';
import { startPurr, stopPurr } from '../audio/sfx';
import { visibleAccessory } from '../fun/costumes';
import type { KidState } from '../types';
import { Label } from './Label';
import { classifyGesture } from './truffle/behaviour';
import type { Reaction } from './truffle/timelines';
import { onCheer, takeGreeting } from './truffle/greeting';
import { Truffle, type TruffleMood } from './truffle/Truffle';

export type PetMood = TruffleMood;

interface Props {
  kid: KidState;
  mood?: PetMood;
  bubble?: string | null;
  size?: number;
  lookAt?: number;
  bounce?: boolean;
  /** a live Truffle: he breathes, blinks, reacts (spec 2026-10-04 §4) */
  alive?: boolean;
  /** a question is up: he keeps still and ignores touch (spec §4.8, review focus 3) */
  calm?: boolean;
  /** a moment for him to react to (the screen's; a newer touch reaction plays over it until the screen sends another) */
  react?: Reaction | null;
  touch?: boolean;
}

type Part = 'head' | 'body' | 'tail';
const HEART = 'M12 21 C5 15 2 11 2 7.5 C2 4.5 4.5 2 7.5 2 C9.5 2 11 3 12 4.5 C13 3 14.5 2 16.5 2 C19.5 2 22 4.5 22 7.5 C22 11 19 15 12 21Z';

/** Truffle with an optional speech bubble, wearing the child's chosen accessory; stroke him and he purrs (spec §4.5). */
export function Pet({ kid, mood = 'sulk', bubble = null, size = 120, lookAt = 0, bounce = false, alive = true, calm = false, react = null, touch = true }: Props) {
  const [current, setCurrent] = useState<Reaction | null>(react);
  const [said, setSaid] = useState<string | null>(null);
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([]);
  const n = useRef(0);
  const press = useRef<{ part: Part; t0: number; x: number; y: number; travelled: number; moves: number } | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const purrStop = useRef<ReturnType<typeof setTimeout> | null>(null);
  const purredAt = useRef(0);

  // the screen's reaction wins whenever it sends a new one
  useEffect(() => {
    if (react) setCurrent(react);
  }, [react?.key]);
  const later = (ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };
  const say = (text: string, ms: number) => {
    setSaid(text);
    later(ms, () => setSaid((s) => (s === text ? null : s)));
  };
  const play = (kind: Reaction['kind']) => setCurrent({ kind, key: 1e6 + ++n.current });
  // the lesson asked for a greeting: the first live Truffle waves and says it (spec 2026-10-04 §4.6)
  useEffect(() => {
    if (!alive) return;
    const line = takeGreeting();
    if (!line) return;
    play('hello');
    say(line, 2400);
  }, []);
  // a run of right answers: he bounces and praises him in his own bubble
  useEffect(() => {
    if (!alive) return;
    return onCheer((line) => {
      play('bouncy');
      say(line, 1800);
    });
  }, [alive]);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      if (purrStop.current) {
        clearTimeout(purrStop.current);
        stopPurr();
      }
    },
    [],
  );

  const touchable = touch && !calm;
  const onPart = (part: Part, e: PointerEvent) => {
    press.current = { part, t0: performance.now(), x: e.clientX, y: e.clientY, travelled: 0, moves: 0 };
    const el = e.currentTarget as Element | null;
    try {
      (el?.closest('.pet') as HTMLElement | null)?.setPointerCapture?.(e.pointerId);
    } catch {
      /* capture is a nicety: a stroke that leaves him still counts while it is over him */
    }
  };
  const onMove = (e: PointerEvent) => {
    const p = press.current;
    if (!p || !touchable) return;
    p.travelled += Math.hypot(e.clientX - p.x, e.clientY - p.y);
    p.x = e.clientX;
    p.y = e.clientY;
    if (classifyGesture({ part: p.part, travelled: p.travelled, ms: performance.now() - p.t0 }) !== 'stroke') return;
    const now = performance.now();
    if (!purrStop.current) startPurr();
    else clearTimeout(purrStop.current);
    // the purr reaction holds 'content' for 900 ms: renew it while the stroking goes on, so his eyes stay closed
    if (!purrStop.current || now - purredAt.current > 600) {
      purredAt.current = now;
      play('purr');
    }
    purrStop.current = setTimeout(() => {
      purrStop.current = null;
      stopPurr();
      say('呼噜～', 1200);
    }, 800);
    if (p.moves++ % 6 === 0) {
      const id = ++n.current;
      setHearts((h) => [...h, { id, x: 30 + Math.random() * 40 }]);
      later(1400, () => setHearts((h) => h.filter((x) => x.id !== id)));
    }
  };
  const onUp = () => {
    const p = press.current;
    press.current = null;
    if (!p || !touchable) return;
    const g = classifyGesture({ part: p.part, travelled: p.travelled, ms: performance.now() - p.t0 });
    if (g === 'tapHead') {
      play('flinch');
      say('哼！', 1100);
    } else if (g === 'tapTail') {
      play('pounce');
      later(450, () => say('喵！', 1100));
    }
  };

  const shown = said ?? bubble;
  return (
    <div class="pet" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => (press.current = null)}>
      {shown && (
        <div class="pet__bubble" key={shown}>
          <Label zh={shown} />
        </div>
      )}
      {hearts.map((h) => (
        <span key={h.id} class="pet__heart" style={{ left: `${h.x}%` }} aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d={HEART} fill="#ef6f6c" /></svg>
        </span>
      ))}
      <Truffle
        mood={mood}
        accessory={visibleAccessory(kid)}
        outfit={kid.outfit}
        lookAt={lookAt}
        size={size}
        bounce={bounce}
        power={kid.activePower}
        powerTier={kid.activePower ? (kid.powerTiersSeen[kid.activePower] ?? 0) : 0}
        alive={alive}
        calm={calm}
        react={current}
        onPart={touchable ? onPart : undefined}
      />
    </div>
  );
}
