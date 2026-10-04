// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');
const inkLayer = css.slice(css.indexOf('/* ===== Ink layer'));
const reducedBlocks = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]);

describe('ink layer contracts (paint rules jsdom cannot see)', () => {
  it('the hold ring still fills over the hold time (1.2 s by default) with reduced motion', () => {
    expect(reducedBlocks.some((b) => /\.hold\.is-holding \.hold__ring circle \{[^}]*transition: stroke-dashoffset var\(--hold-ms, 1200ms\) linear !important/.test(b))).toBe(true);
  });
  it('small text on the red celebration block gets an ink shadow', () => {
    expect(inkLayer).toMatch(/\.celebrate--night > p[^{]*\{[^}]*text-shadow/);
    expect(inkLayer).toMatch(/\.celebrate--night > h1 \.label__py[^{]*\{[^}]*text-shadow/);
  });
  it("the celebration's cream text and ink shadow stay on its own headings, not Truffle's bubble or the hold button", () => {
    // a colour or shadow on the whole block leaks into nested things: cream 喵！ on the white bubble, a smeared 按住
    expect(css).not.toMatch(/\.celebrate--night \{[^}]*color:/);
    expect(css).not.toMatch(/\.celebrate--night \.label__py[^{]*\{[^}]*text-shadow/);
    expect(css).not.toMatch(/\.celebrate--night p[ ,{]/); // only its own paragraphs (> p), not any p inside
    expect(inkLayer).toMatch(/\.celebrate--night > h1, \.celebrate--night > p[^{]*\{[^}]*color: var\(--paper\)/);
    expect(inkLayer).toMatch(/\.celebrate--night \.pet__bubble, \.celebrate--night \.hold \{[^}]*color: var\(--ink\)[^}]*text-shadow: none/);
  });
  it('keeps the highlights the restyle overrode: reached goal, radical in the intro, emoji picker', () => {
    expect(inkLayer).toMatch(/\.goal--reached \{[^}]*--green-soft/);
    expect(inkLayer).toMatch(/\.part--radical \{[^}]*color:(?! var\(--blue\))/);
    expect(inkLayer).toMatch(/\.swatch \{/);
    expect(inkLayer).toMatch(/\.swatch\.is-on \{/);
  });
});

describe('pinyin labels', () => {
  it('every character gets the same slot, so 完成 is not pushed apart by a long syllable', () => {
    expect(css).toMatch(/\.label__cell--zh \{[^}]*min-width: 1\.3em/);
    expect(css).not.toMatch(/\.label__py \{[^}]*margin: 0 -/); // no overhang: neighbouring syllables must never touch
  });
  it('a blank is an empty box with its underscore hidden', () => {
    expect(css).toMatch(/\.label__cell--blank \.label__ch \{[^}]*color: transparent[^}]*border:/);
  });
  it('the home corner lines labels up on their bottoms', () => {
    expect(css).toMatch(/\.home__who \{[^}]*align-items: flex-end/);
  });
});

describe('collection contrast', () => {
  it("the grid leaves room for the cards' 4px shadow, so the right-hand column is not cut off by the scroll panel", () => {
    expect(css).toMatch(/\.zika-grid \{[^}]*padding: 0 4px 4px 0/);
  });
  it('stars on gold cards are ink, not gold-on-gold', () => {
    expect(css).toMatch(/\.card--gold \.zika__stars \{[^}]*color: var\(--ink\)/);
  });
});

describe('字辨 feedback fits its bar on a tablet', () => {
  it('the explanation is compact one-line rows, and 继续 never sticks out past the bar', () => {
    expect(css).toMatch(/\.zibian__why \{[^}]*flex-direction: column/);
    expect(css).toMatch(/\.bottombar__detail \.zibian__radical \{[^}]*white-space: nowrap/);
    // on every size, not only the phone: the text column may shrink, the button may not
    expect(css).toMatch(/\n\.bottombar__msg, \.bottombar__msg > div \{ min-width: 0; \}\n\.bottombar:not\(\.bottombar--neutral\) \.btn \{ flex: none; \}/);
  });
});

describe('no dragon left in what people see', () => {
  it('manifest, theme colour and settings copy', () => {
    const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const settings = readFileSync(new URL('./parent/SettingsPanel.tsx', import.meta.url), 'utf8');
    for (const s of [vite, settings]) expect(s).not.toMatch(/pet dragon|feed the dragon/i); // the 龙 zodiac onesie is fine
    expect(vite).toContain("theme_color: '#fbf6ea'");
    expect(html).toContain('content="#fbf6ea"');
  });
});

describe('world layers never get in the way', () => {
  it('the scene ignores taps and sits behind content', () => {
    expect(css).toMatch(/\.world-scene \{[^}]*pointer-events: none/);
    expect(css).toMatch(/\.world-scene \{[^}]*z-index: -1/);
  });
  it('the Home world is pinned to the screen, not stretched over the whole scrolling page', () => {
    expect(css).toMatch(/\.world-scene \{[^}]*position: fixed/);
    expect(css).toMatch(/\.home \.world-scene \{[^}]*bottom: var\(--nav-h\)/); // ground sits above the tab bar
  });
  it('text that sits straight on the page gets a paper backing, so scenery never runs under it', () => {
    expect(css).toMatch(/\.home__who \{[^}]*background: var\(--paper\)/);
    expect(css).toMatch(/\.home__title \{[^}]*background: var\(--paper\)/);
    expect(css).toMatch(/\.path__name \{[^}]*background: var\(--paper\)/);
  });
  it("Truffle's bubble keeps its line on one row", () => {
    expect(css).toMatch(/\.pet__bubble \.label__cells \{[^}]*flex-wrap: nowrap/);
  });
});

describe('看图说话 layout', () => {
  it('the picture is sized to the screen height so the model sentence stays above the bottom bar', () => {
    expect(css).toMatch(/\.kantu__pic \{[^}]*height: min\(34vh/);
  });
});

describe('world tap fun never gets in the way', () => {
  it('the tap layer sits over the scene, under Home content, and only its target takes taps', () => {
    expect(css).toMatch(/\.world-taps \{[^}]*position: fixed[^}]*pointer-events: none/);
    expect(css).toMatch(/\.world-taps \.tap[^{]*\{[^}]*pointer-events: all/);
    expect(css).toMatch(/\.home \.home__main, \.home \.path, \.home \.path__row \{[^}]*pointer-events: none/);
    expect(css).toMatch(/\.home \.path__row > \* \{[^}]*pointer-events: auto/);
    expect(css).toMatch(/\.home > \.topbar, \.home > \.home__main \{[^}]*z-index: 1/);
  });
});

describe('scene texture', () => {
  it('worlds, lesson strips and pictures get a grain overlay like Truffle\'s', () => {
    expect(css).toMatch(/\.world-scene::after, \.grainy::after \{[^}]*mix-blend-mode: multiply/);
  });
});

describe('the 字己 seal', () => {
  it('stacks its characters without vertical writing mode (WebKit pushes WenKai glyphs out of the red box)', () => {
    const rules = [...css.matchAll(/\.seal[^{]*\{[^}]*\}/g)].map((m) => m[0]);
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.filter((r) => /writing-mode:\s*vertical/.test(r))).toEqual([]);
  });
});

describe('adaptive layouts (spec §18)', () => {
  const adaptive = css.slice(css.indexOf('/* ===== Adaptive layouts (spec §18)'));
  it('a screen is exactly one screen tall and the document never scrolls (the parent area may)', () => {
    expect(css).toMatch(/\.screen \{[^}]*height: 100dvh;[^}]*overflow: hidden;/);
    expect(adaptive).toMatch(/html, body \{ overflow: hidden; \}/);
    expect(adaptive).toMatch(/html:has\(\.screen--scroll\), html:has\(\.screen--scroll\) body \{ overflow: auto; \}/);
    expect(adaptive).toMatch(/\.screen--scroll \{[^}]*height: auto;[^}]*min-height: 100dvh;[^}]*overflow: visible;/);
  });
  it('long lists scroll inside their own panel', () => {
    expect(adaptive).toMatch(/\.scroll-panel \{[^}]*flex: 1;[^}]*min-height: 0;[^}]*overflow-y: auto;/);
  });
  it('has the three arrangements and the phone-sideways overlay', () => {
    expect(adaptive).toContain('@media (max-width: 599px)');
    expect(adaptive).toContain('@media (orientation: landscape) and (min-height: 600px)');
    expect(adaptive).toMatch(/@media \(orientation: landscape\) and \(max-height: 499px\) \{[^@]*\.rotate-hint \{[^}]*display: flex;/);
    expect(adaptive).toMatch(/\.rotate-hint \{ display: none; \}/);
  });
  it('the nav height clears the home indicator, and pinyin never drops below 9px', () => {
    expect(adaptive).toMatch(/--nav-h: calc\(\d+px \+ env\(safe-area-inset-bottom\)\)/);
    expect(adaptive).toMatch(/\.label__py \{ font-size: max\(0\.5em, 9px\); \}/);
  });
  it('Home: on the ground everything stays in the middle band (the sides hold the world taps); Truffle pinned above a --nav-h nav', () => {
    expect(adaptive).toMatch(/:root \{ --band: 50vw; \}/);
    expect(adaptive).toMatch(/\.home__path \{[^}]*width: min\(100%, var\(--band\)\);/);
    expect(adaptive).toMatch(/\.home__cards \{ width: min\(100%, var\(--band\), 560px\);/);
    expect(adaptive).toMatch(/\.world-scene \{ top: auto; height: min\(100%, 133\.33vw\);/); // never wider than the screen: no target cropped off
    expect(adaptive).toMatch(/\.home__pet \{[^}]*position: absolute;[^}]*bottom: calc\(var\(--nav-h\)[^}]*left: 50%;/);
    expect(adaptive).toMatch(/\.tabbar \{ height: var\(--nav-h\);/);
    expect(adaptive).toMatch(/\.home \.home__cards, \.home \.home__path \{ pointer-events: none; \}/);
  });
  it('lessons: the ground shows under a floating 继续 card that clears the home indicator', () => {
    expect(adaptive).toMatch(/\.bottombar \{[^}]*position: sticky;[^}]*bottom: 0;[^}]*margin: auto 0 0;[^}]*border-radius: 18px;/);
    expect(adaptive).toMatch(/\.screen:has\(\.lessonbar\) \{[^}]*padding-bottom: max\(16px, env\(safe-area-inset-bottom\)\);/);
    expect(adaptive).toMatch(/\.bottombar--neutral \{[^}]*background: transparent;[^}]*border-color: transparent;[^}]*pointer-events: none;/);
    expect(css).not.toContain('.world-strip');
  });
  it('朗读: a long passage scrolls inside its card; 看图说话: theme words never push the page, and stay tappable', () => {
    expect(adaptive).toMatch(/\.passage, \.langdu__passage \{[^}]*min-height: 0;[^}]*overflow-y: auto;/);
    expect(adaptive).toMatch(/\.kantu__word \{[^}]*min-height: 44px;/);
    expect(adaptive).toMatch(/@media \(max-width: 599px\) \{[^@]*\.kantu__words \{[^}]*flex-wrap: nowrap;[^}]*overflow-x: auto;/);
  });
  it('the parent area never overflows sideways on a phone: wide tables scroll inside their panel', () => {
    expect(adaptive).toMatch(/\.parent \.panel \{[^}]*min-width: 0;[^}]*overflow-x: auto;/);
    expect(adaptive).toMatch(/\.parent__body \{[^}]*min-width: 0;/);
  });
  it('the PIN pad and setup shrink on a phone instead of scrolling', () => {
    expect(adaptive).toMatch(/@media \(max-width: 599px\) \{[^@]*\.pinpad \{[^}]*grid-template-columns: repeat\(3, 72px\);/);
    expect(adaptive).toMatch(/\.room \{[^}]*min-height: 0;/);
  });
  it('the review fixes: paper behind the big character and the 钓鱼 question; a centred feedback card on an upright iPad; no Chinese under 16px', () => {
    expect(adaptive).toMatch(/\.flash__prompt \.hanzi--xl, \.whichpart__char, \.pond-q \{[^}]*background: var\(--surface\);[^}]*border: var\(--panel-border\);/);
    expect(adaptive).toMatch(/@media \(orientation: portrait\) and \(min-width: 600px\) \{[^@]*\.bottombar \{[^}]*width: min\(100%, 680px\);[^}]*align-self: center;/);
    expect(adaptive).toMatch(/\.label-tag \{ font-size: 16px; \}/);
    expect(adaptive).toMatch(/\.hold__label \{ font-size: 16px; \}/);
  });
  it('a screen clips with overflow: clip, so nothing (a focus, a browser scroll-into-view) can ever scroll it', () => {
    expect(css).toMatch(/\.screen \{[^}]*overflow: hidden; overflow: clip;/); // hidden is the fallback for Safari before 16
  });
  it('the meaning cue never wraps and shrinks to fit its length', () => {
    expect(css).toMatch(/\.meaning-cue \{[^}]*white-space: nowrap;[^}]*font-size: min\(var\(--hanzi-xl\), calc\(\d+vw \/ var\(--len, 2\)\)\);/);
  });
  it('a long self-introduction scrolls inside its card instead of pushing the buttons off an SE', () => {
    expect(css).toMatch(/\.langdu__script \{[^}]*max-height: [^;]*dvh[^}]*overflow-y: auto/);
  });
  it("the evening lantern string never runs across a lesson's progress bar on a landscape iPad", () => {
    expect(css).toMatch(/@media \(orientation: landscape\) and \(min-height: 600px\) \{\s*\.screen:has\(\.lessonbar\) \[data-part="lanterns"\] \{ display: none; \}/);
  });
  it('labels on Home (the path names, Truffle\'s bubble) let a tap through to the world target under them', () => {
    expect(css).toMatch(/\.home \.path__row > \.path__name, \.home \.pet__bubble \{ pointer-events: none; \}/);
  });
  it("Truffle's Home box lets taps through: only Truffle himself opens the wardrobe", () => {
    expect(css).toMatch(/\.home__pet \{[^}]*pointer-events: none;/);
    expect(css).toMatch(/\.home__pet \.truffle \{ pointer-events: auto; \}/);
    expect(css).not.toMatch(/\.home__pet \.pet__bubble \{ pointer-events: auto/);
  });
  it('no emoji-era glyph sizing around ink icons (a 130px line box under the prize, letter-spaced stars)', () => {
    expect(css).not.toMatch(/\.prize \{[^}]*font-size/);
    expect(css).not.toMatch(/\.loading \{[^}]*font-size/);
    expect(css).not.toMatch(/\.fishtile__badge \{[^}]*font-size/);
    expect(css).not.toMatch(/\.zika__stars \{[^}]*letter-spacing/);
  });
  it('a rare 字卡 has a frame you can see (a 4px blue ring and a corner mark), not a pale hairline', () => {
    expect(css).toMatch(/\.zika\.card--rare \{[^}]*inset 0 0 0 4px #7db8f0/);
    expect(css).toMatch(/\.zika\.card--rare::after \{/);
  });
});
