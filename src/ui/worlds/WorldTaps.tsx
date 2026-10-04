import { useEffect, useRef, useState } from 'preact/hooks';
import { speak } from '../../audio/speech';
import { dig, findAnimal, tapEgg, tapGem } from '../../fun/finds';
import type { WorldId } from '../../fun/worlds';
import type { KidState } from '../../types';
import { reducedMotion } from '../motion';
import { SCENE_VIEWBOX } from './scenes';
import { ANIMAL_FACES, BABY_DINO, GEM, SPRAY } from './tapArt';

interface Props {
  world: WorldId;
  kid: KidState;
  today: string;
  onKid: (kid: KidState) => void; // finds (or stars) changed: save it
  onSay: (line: string) => void; // Truffle reacts in his bubble
}

type Effect =
  | { kind: 'spray' }
  | { kind: 'animal'; animal: string }
  | { kind: 'lap' }
  | { kind: 'crack'; cracks: number; gem: boolean }
  | { kind: 'wobble' }
  | { kind: 'hop' }
  | { kind: 'bubbles' }
  | { kind: 'launch' }
  | { kind: 'dig'; star: boolean };

const INK = '#2a2630';
const TRACK = 'M-20 460 C80 470 140 380 220 380 C300 380 330 300 290 270 C250 240 210 290 250 320 C300 360 340 330 380 300';
const STAR = 'M0 -12 l3.5 7.5 8 1 -6 5.5 1.6 8 -7.1 -4 -7.1 4 1.6 -8 -6 -5.5 8 -1Z';
const CAR = `<g transform="translate(0 0)"><path d="M-27 7 C-28 -2 -24 -7 -12 -9 C-6 -17 2 -20 13 -19 C20 -18 23 -12 26 -8 C30 -6 31 0 29 7Z" fill="#efc472" stroke="#2a2630" stroke-width="2.8" stroke-linejoin="round"/><path d="M-26 4 C-10 7 14 7 29 3 L29 7 L-27 7Z" fill="#d1a352" opacity=".7"/><path d="M-6 -10 C-2 -15 6 -16 12 -15 C15 -14 17 -12 18 -9 Z" fill="#e9eff2" stroke="#2a2630" stroke-width="2"/><circle cx="-15" cy="8" r="6.5" fill="#3a3640" stroke="#2a2630" stroke-width="2.4"/><circle cx="17" cy="8" r="6.5" fill="#3a3640" stroke="#2a2630" stroke-width="2.4"/><circle cx="-15" cy="8" r="2.4" fill="#d9d4d8"/><circle cx="17" cy="8" r="2.4" fill="#d9d4d8"/><path d="M-22 -2 h8" stroke="#fbf7ee" stroke-width="2" stroke-linecap="round" opacity=".7"/></g>`;
const ROCKET = `<g stroke="${INK}" stroke-linejoin="round" stroke-linecap="round"><path d="M44 352 C34 356 30 364 30 372 L46 368Z M80 352 C90 356 94 364 94 372 L78 368Z" fill="#e2705d" stroke-width="2.4"/><path d="M44 370 C40 334 50 304 62 286 C74 304 84 334 80 370Z" fill="#fbf7ee" stroke-width="2.6"/><path d="M66 292 C76 310 82 336 80 370 L70 370 C72 340 70 312 66 292Z" fill="${INK}" opacity=".1" stroke="none"/><path d="M51 299 C55 292 58 288 62 286 C66 288 69 292 73 299 C66 296 58 296 51 299Z" fill="#e2705d" stroke-width="2.2"/><circle cx="62" cy="324" r="8" fill="#6ea4d4" stroke-width="2.4"/><path d="M50 372 q12 26 24 0" fill="#efc472" stroke-width="2.2"/></g>`;
const EGG = `<ellipse cx="0" cy="0" rx="9" ry="12" fill="#f1e1b0" stroke="${INK}" stroke-width="2.4"/><path d="M-4 -4 l4 4 3 -3" fill="none" stroke="${INK}" stroke-width="2"/>`;

/** Where each world's one tappable thing sits, in scene units (the same 360×480 box as WorldScene). */
const TARGET: Record<WorldId, { label: string; shape: string }> = {
  yard: { label: '洒水器', shape: '<circle cx="68" cy="392" r="30"/>' },
  grass: { label: '草丛', shape: '<rect x="60" y="312" width="50" height="84" rx="10"/>' },
  race: { label: '赛车', shape: '<rect x="26" y="326" width="60" height="80" rx="10"/><rect x="86" y="396" width="24" height="40" rx="6"/>' }, // the flag, or the red car's near half (clear of Truffle)
  blocks: { label: '宝石', shape: '<rect x="306" y="368" width="54" height="38" rx="6"/>' },
  dino: { label: '恐龙蛋', shape: '<rect x="54" y="408" width="54" height="48" rx="10"/>' },
  sea: { label: '潜水艇', shape: '<rect x="22" y="320" width="86" height="70" rx="12"/>' },
  space: { label: '火箭', shape: '<rect x="30" y="282" width="66" height="96" rx="10"/>' },
  pirate: { label: '宝藏', shape: '<rect x="62" y="396" width="36" height="36" rx="8"/>' },
};

const DURATION: Record<Effect['kind'], number> = { spray: 1200, animal: 2200, lap: 1700, crack: 500, wobble: 800, hop: 900, bubbles: 1600, launch: 4300, dig: 1400 };
const GEM_POP_MS = 1400; // the day's gem stays up even if he keeps tapping

/** One thing to tap in each journey world, drawn over the scene in its own coordinates. Never blocks practice: only the target takes taps. */
export function WorldTaps({ world, kid, today, onKid, onSay }: Props) {
  const [effect, setEffect] = useState<Effect | null>(null);
  const busy = useRef(false);
  const gemTaps = useRef({ day: today, n: 0 }); // taps count toward one day's gem only
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [run, setRun] = useState(0);
  const still = reducedMotion();
  const laugh = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(laugh.current); }, []);

  const play = (e: Effect) => {
    busy.current = true;
    setEffect(e);
    // SVG animations run on their outermost <svg>'s clock: each effect gets a fresh <svg> (keyed), so it always plays from its start
    setRun((n) => n + 1);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      busy.current = false;
      if (e.kind !== 'crack') setEffect(null); // cracks stay on the block for this visit
    }, e.kind === 'crack' && e.gem ? GEM_POP_MS : DURATION[e.kind]);
  };

  const onTap = () => {
    if (busy.current) return; // a running animation ignores taps
    const f = kid.finds;
    switch (world) {
      case 'yard':
        play({ kind: 'spray' });
        onSay('哇！'); // a flinch at the cold water, then a laugh
        clearTimeout(laugh.current);
        laugh.current = setTimeout(() => onSay('哈哈哈！'), 700);
        return;
      case 'grass': {
        const r = findAnimal(f, today);
        if (r.isNew) {
          onKid({ ...kid, finds: r.finds });
          onSay('找到了！');
        }
        play({ kind: 'animal', animal: r.animal });
        return;
      }
      case 'race':
        play({ kind: 'lap' });
        return;
      case 'blocks': {
        if (gemTaps.current.day !== today) gemTaps.current = { day: today, n: 0 };
        gemTaps.current.n += 1;
        const r = tapGem(f, today, gemTaps.current.n);
        if (r.gem) {
          onKid({ ...kid, finds: r.finds });
          onSay('宝石！');
        }
        play({ kind: 'crack', cracks: r.cracks, gem: r.gem });
        return;
      }
      case 'dino': {
        if (f.dinoHatched) {
          play({ kind: 'hop' }); // the baby hops; no egg over it any more
          onSay('你好，小恐龙！');
          return;
        }
        const next = tapEgg(f);
        if (next !== f) onKid({ ...kid, finds: next });
        play({ kind: 'wobble' });
        return;
      }
      case 'sea':
        play({ kind: 'bubbles' });
        return;
      case 'space':
        speak('三，二，一！');
        play({ kind: 'launch' });
        return;
      case 'pirate': {
        const r = dig(f, today);
        if (r.star) {
          onKid({ ...kid, finds: r.finds, bonusStars: kid.bonusStars + 1 });
          onSay('找到星星了！');
        } else onSay('挖呀挖！');
        play({ kind: 'dig', star: r.star });
      }
    }
  };

  const t = TARGET[world];
  const fade = (dur: number) => `<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.8;1" dur="${dur}ms" fill="freeze"/>`;
  const rise = (from: number, dur: number) => (still ? fade(dur) : `<animateTransform attributeName="transform" type="translate" additive="sum" values="0 ${from};0 0;0 0" keyTimes="0;0.3;1" dur="${dur}ms" fill="freeze"/>${fade(dur)}`);

  let fx = '';
  if (effect?.kind === 'spray') fx = `<g transform="translate(68 396)">${SPRAY}${fade(1200)}</g>`;
  if (effect?.kind === 'animal') fx = `<g class="tap-pop" data-animal="${effect.animal}" transform="translate(88 298) scale(1.1)"><circle r="24" fill="#fffaf0" stroke="${INK}" stroke-width="2.4"/>${ANIMAL_FACES[effect.animal] ?? ''}${rise(40, 2200)}</g>`;
  if (effect?.kind === 'lap') fx = still ? `<g class="tap-car" transform="translate(220 380)">${CAR}${fade(1700)}</g>` : `<g class="tap-car">${CAR}<animateMotion dur="1700ms" path="${TRACK}" rotate="auto" fill="freeze"/></g>`;
  if (effect?.kind === 'crack') {
    const lines = ['M316 378 l8 8 -4 6', 'M334 376 l-6 10 5 6', 'M320 396 l6 -6 6 2'];
    fx = lines.slice(0, effect.cracks).map((d) => `<path class="tap-crack" d="${d}" fill="none" stroke="#fffaf0" stroke-width="2.4" stroke-linecap="round"/>`).join('');
    if (effect.gem) fx += `<g class="tap-gem" transform="translate(325 358)">${GEM}${rise(24, 1400)}</g>`;
  }
  if (effect?.kind === 'hop') fx = `<g class="tap-baby-dino is-hopping" transform="translate(94 424) scale(0.9)">${BABY_DINO}${still ? '' : '<animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;0 -14;0 0;0 -7;0 0" dur="900ms"/>'}</g>`;
  if (effect?.kind === 'wobble') fx = `<g class="tap-egg" transform="translate(90 428)">${EGG}${still ? '' : '<animateTransform attributeName="transform" type="rotate" additive="sum" values="0;-14;12;-8;6;0" dur="800ms"/>'}</g>`;
  if (effect?.kind === 'bubbles') {
    fx = [0, 1, 2, 3].map((i) => `<circle cx="${50 + i * 12}" cy="340" r="${3 + (i % 2)}" fill="none" stroke="${INK}" stroke-width="1.6">${still ? fade(1600) : `<animate attributeName="cy" values="340;296" dur="${900 + i * 200}ms" fill="freeze"/>${fade(1600)}`}</circle>`).join('');
    fx += `<g transform="translate(${still ? 60 : -30} 410)"><path d="M0 0 c10 -10 30 -10 40 0 c-10 10 -30 10 -40 0Z M0 0 l-10 -6 v12Z" fill="#9fcf90" stroke="${INK}" stroke-width="2"/>${still ? fade(1600) : `<animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;420 -10" dur="1600ms" fill="freeze"/>`}</g>`;
  }
  if (effect?.kind === 'launch') {
    // 三，二，一 first (about 1.5 s), then lift-off; the sky patch stops above the launch pad
    fx = `<path d="M26 278 H100 V368 H26Z" fill="#e4e1f5"/>` + (still ? `<g class="tap-rocket">${ROCKET}${fade(4300)}</g>` : `<g class="tap-rocket">${ROCKET}<animateTransform attributeName="transform" type="translate" values="0 0;0 -420;0 -420;0 0" keyTimes="0;0.4;0.55;1" begin="1500ms" dur="2800ms" fill="freeze"/></g>`);
  }
  if (effect?.kind === 'dig') {
    fx = `<g fill="#f1e1b0" stroke="${INK}" stroke-width="1.6"><circle cx="68" cy="408" r="4"/><circle cx="92" cy="404" r="3.5"/><circle cx="80" cy="403" r="3"/></g>`;
    if (effect.star) fx += `<g transform="translate(80 388)"><path d="${STAR}" fill="#efc472" stroke="${INK}" stroke-width="2"/>${rise(20, 1400)}</g>`;
  }
  const baby = world === 'dino' && kid.finds.dinoHatched && effect?.kind !== 'hop' ? `<g class="tap-baby-dino" transform="translate(94 424) scale(0.9)">${BABY_DINO}</g>` : '';

  return (
    <>
      <svg class="world-taps" data-world={world} viewBox={SCENE_VIEWBOX} preserveAspectRatio="xMidYMax slice">
        <g dangerouslySetInnerHTML={{ __html: baby }} />
        <g class="tap" role="button" aria-label={t.label} tabIndex={0} onClick={onTap} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onTap()} dangerouslySetInnerHTML={{ __html: t.shape.replaceAll('/>', ' fill="#000" fill-opacity="0"/>') }} />
      </svg>
      {fx && <svg key={run} class="world-taps world-taps__fx" aria-hidden="true" viewBox={SCENE_VIEWBOX} preserveAspectRatio="xMidYMax slice" dangerouslySetInnerHTML={{ __html: fx }} />}
    </>
  );
}
