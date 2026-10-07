// The animated-page trial (parent 2026-10-08: "boring… didn't understand what Hush was doing… the same static picture"): chapter 1
// pages 1–2 staged with GSAP — things wear their words as paper tags; Hush wheels his machine in, the tags peel off and fly into the
// funnel, the painting drains to grey and Truffle's sun goes cold. A one-page experiment, not the reader.
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { HushScene } from '../ui/story/HushScene';
import { Truffle } from '../ui/truffle/Truffle';
import type { Expression } from '../ui/truffle/rig';

gsap.registerPlugin(MotionPathPlugin);

const BG = `${import.meta.env.BASE_URL}story/bg/hdb-morning.webp`;
/** Things in the painting wearing their words (x, y as fractions of the painting). */
const TAGS = [
  { zh: '太阳', en: 'sun', x: 0.1, y: 0.13 },
  { zh: '衣服', en: 'clothes', x: 0.27, y: 0.31 },
  { zh: '门', en: 'door', x: 0.785, y: 0.36 },
  { zh: '鞋', en: 'shoes', x: 0.69, y: 0.5 },
];

const PAGES = [
  ['It was Saturday morning. Truffle lay on the ledge. The sun warmed his tummy.', 'He was the happiest cat on the eighth floor.', '“Purrrrr. Nobody disturb me. I am busy being warm.”'],
  ['A tall man in a long purple coat was pushing a brass machine.', '“SHHHHHH! Silence is GOLDEN!”', 'The funnel sucked. Words peeled off everything like stickers. They swirled into the glass belly.', 'Everything went grey. Even the sunshine on Truffle’s tummy.'],
];

// --- a few sounds, made on the spot (Web Audio) ---
let ac: AudioContext | null = null;
const audio = () => (ac ??= new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)());
function noise(seconds: number, from: number, to: number, gain = 0.25) {
  const a = audio();
  const buf = a.createBuffer(1, a.sampleRate * seconds, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const bp = a.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(from, a.currentTime);
  bp.frequency.linearRampToValueAtTime(to, a.currentTime + seconds);
  const g = a.createGain();
  g.gain.setValueAtTime(0, a.currentTime);
  g.gain.linearRampToValueAtTime(gain, a.currentTime + 0.15);
  g.gain.linearRampToValueAtTime(0, a.currentTime + seconds);
  src.connect(bp).connect(g).connect(a.destination);
  src.start();
}
function pop(pitch = 700) {
  const a = audio();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(pitch, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(pitch / 3, a.currentTime + 0.18);
  g.gain.setValueAtTime(0.3, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.2);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + 0.22);
}

export function StoryTrial() {
  const [page, setPage] = useState(0);
  const [face, setFace] = useState<Expression>('sleepy');
  const [textOn, setTextOn] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  // page 1: a warm, sleepy loop
  useLayoutEffect(() => {
    if (page !== 0 || !stage.current) return;
    const ctx = gsap.context(() => {
      gsap.to('.trial__sun', { scale: 1.12, opacity: 0.95, duration: 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      gsap.to('.trial__zzz span', { y: -18, opacity: 0, duration: 2, stagger: 0.6, repeat: -1, ease: 'sine.out' });
      gsap.fromTo('.trial__tag', { y: 0 }, { y: -3, duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: 0.3 });
    }, stage);
    return () => ctx.revert();
  }, [page]);

  // page 2: Hush arrives and takes the words
  const play = () => {
    const root = stage.current;
    if (!root) return;
    tl.current?.kill();
    gsap.set('.trial__grey', { opacity: 0 });
    setFace('sleepy');
    setTextOn(false);
    const box = root.getBoundingClientRect();
    const mouth = root.querySelector('[data-part="mouth"]')!;
    const scene = root.querySelector('.trial__hush') as HTMLElement;
    const t = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.current = t;
    t.set(scene, { xPercent: 70, opacity: 1 })
      .set('.trial__tag', { opacity: 1, x: 0, y: 0, scale: 1, rotation: 0 })
      .set('.trial__sun', { opacity: 0.9, scale: 1 })
      .set('[data-belly]', { opacity: 0 })
      .set('.trial__bubble', { scale: 0, opacity: 0 })
      .set('.trial__shh', { opacity: 0, x: 0 })
      .call(() => noise(0.9, 4500, 2500, 0.22))
      .to('.trial__shh', { opacity: 1, duration: 0.15 })
      .to('.trial__shh', { x: -12, duration: 0.05, yoyo: true, repeat: 7, ease: 'none' }, '<')
      .to('.trial__shh', { opacity: 0, duration: 0.2 })
      .call(() => setFace('curious'), [], '-=0.3')
      // he rolls in: wheels turn, he bobs, his coat flaps; the camera leans in
      .to(scene, { xPercent: 0, duration: 1.5, ease: 'power2.out' }, '-=0.3')
      .to('[data-part="wheel"]', { rotation: -420, transformOrigin: '50% 50%', duration: 1.5, ease: 'power2.out' }, '<')
      .to('[data-part="body"], [data-part="head"]', { y: -6, duration: 0.25, yoyo: true, repeat: 5, ease: 'sine.inOut' }, '<')
      .to('[data-part="coat-tail"]', { rotation: 10, svgOrigin: '400 156', duration: 0.25, yoyo: true, repeat: 5, ease: 'sine.inOut' }, '<')
      .to('.trial__camera', { scale: 1.06, xPercent: -2, duration: 1.5, ease: 'power1.inOut' }, '<')
      // SHHHHHH! Silence is GOLDEN!
      .to('[data-part="shush-arm"]', { rotation: -8, svgOrigin: '378 152', duration: 0.2, yoyo: true, repeat: 3 })
      .call(() => noise(1.2, 5200, 3000, 0.28), [], '<')
      .to('.trial__bubble', { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.2)' }, '<')
      .to('.trial__bubble', { scale: 0.6, opacity: 0, duration: 0.25, ease: 'power2.in' }, '+=1.0')
      // the machine wakes; the words peel off and fly into the funnel together; the painting drains
      .addLabel('suck')
      .call(() => noise(2.6, 300, 900, 0.12), [], 'suck')
      .to('[data-part="machine"]', { x: 2, duration: 0.05, yoyo: true, repeat: 44, ease: 'none' }, 'suck')
      .to('[data-part="belly"]', { rotation: 540, svgOrigin: '130 290', duration: 4, ease: 'none' }, 'suck')
      .to('.trial__grey', { opacity: 1, duration: 2.4, ease: 'power1.in' }, 'suck+=0.3')
      .to('.trial__sun', { opacity: 0, scale: 0.6, duration: 1.6 }, 'suck+=0.6');
    const m = mouth.getBoundingClientRect();
    const mx = m.left + m.width / 2 - box.left;
    const my = m.top + m.height / 2 - box.top;
    root.querySelectorAll<HTMLElement>('.trial__tag').forEach((tag, i) => {
      const r = tag.getBoundingClientRect();
      const dx = mx - (r.left + r.width / 2 - box.left);
      const dy = my - (r.top + r.height / 2 - box.top);
      const at = 0.2 + i * 0.32; // each tag a beat after the one before, all in the air together
      t.to(tag, { rotation: i % 2 ? 14 : -14, y: -8, duration: 0.12, yoyo: true, repeat: 1, ease: 'sine.inOut' }, `suck+=${at}`)
        .to(tag, {
          motionPath: { path: [{ x: 0, y: -20 }, { x: dx * 0.5, y: dy * 0.5 - 80 }, { x: dx, y: dy }], curviness: 1.4 },
          rotation: 540, scale: 0.25, duration: 0.8, ease: 'power2.in',
        }, `suck+=${at + 0.24}`)
        .to(tag, { opacity: 0, duration: 0.1 }, `suck+=${at + 0.96}`)
        .call(() => pop(900 - i * 120), [], `suck+=${at + 0.96}`)
        .to(root.querySelector(`[data-belly="${TAGS[i]!.zh}"]`), { opacity: 1, duration: 0.2 }, `suck+=${at + 0.98}`);
    });
    // Truffle feels the cold
    t.call(() => setFace('surprised'), [], 'suck+=1.6')
      .to('.trial__truffle', { x: -3, duration: 0.05, yoyo: true, repeat: 11, ease: 'none' }, 'suck+=1.6')
      .call(() => setFace('grumpy'), [], 'suck+=2.6')
      .to('.trial__camera', { scale: 1, xPercent: 0, duration: 1, ease: 'power2.inOut' }, 'suck+=2.4')
      .call(() => setTextOn(true), [], 'suck+=2.6');
  };

  useEffect(() => {
    if (page === 1) play();
    return () => { tl.current?.kill(); };
  }, [page]);

  const next = () => {
    void audio().resume();
    if (page === 0) { setPage(1); setFace('sleepy'); } else play();
  };

  return (
    <div class="trial">
      <div class="trial__stage" ref={stage}>
        <div class="trial__camera">
          <div class="trial__bg" style={{ backgroundImage: `url(${BG})` }} />
          <div class="trial__bg trial__grey" style={{ backgroundImage: `url(${BG})` }} />
          <div class="trial__sun" />
          {TAGS.map((t) => (
            <div key={t.zh} class="trial__tag" style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%` }} lang="zh">{t.zh}</div>
          ))}
          <div class="trial__truffle">
            <Truffle mood="sleepy" expression={face} label={null} size={150} alive />
            {page === 0 && <div class="trial__zzz" aria-hidden="true"><span>z</span><span>z</span><span>Z</span></div>}
          </div>
          <div class="trial__hush" style={{ opacity: page === 0 ? 0 : undefined }}>
            <HushScene belly={TAGS.map((t) => t.zh)} />
            <div class="trial__bubble">SHHHHHH!<br />Silence is GOLDEN!</div>
          </div>
          <div class="trial__shh" aria-hidden="true">SHHHHHHHH…</div>
        </div>
      </div>
      <section class="trial__page">
        <div class={`trial__words${textOn ? ' is-on' : ''}`} key={`${page}-${textOn}`}>
          {PAGES[page]!.map((line, i) => <p key={i} style={{ animationDelay: `${i * 140}ms` }}>{line}</p>)}
        </div>
        <nav class="trial__nav">
          {page === 1 && <button type="button" class="trial__btn trial__btn--quiet" onClick={() => { tl.current?.kill(); setPage(0); setFace('sleepy'); setTextOn(true); gsap.set('.trial__grey', { opacity: 0 }); gsap.set('.trial__tag', { clearProps: 'all' }); }}>‹ Page 1</button>}
          <button type="button" class="trial__btn" onClick={next}>{page === 0 ? 'Next ›' : '↻ Play again'}</button>
        </nav>
      </section>
    </div>
  );
}
