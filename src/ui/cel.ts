// Light cel (spec 2026-10-13 §7, mockup row C, docs/worlds/truffle-cel-mock.png): one soft-violet line, flat fills, one pale
// hard shadow on the lower right (light from the upper left), never a gradient on a character and never a clip-path: WebKit
// repaints clipped shapes on every animation frame, so every shadow is its own explicit path.

/** The line: a soft violet. */
export const LINE = '#706889';
/** The blue-violet every shadow tone leans toward. */
export const SHADOW = '#7a7398';
/** Truffle's line widths in his 260-wide box: outer contours, then inner lines (nose, mouth, toes). */
export const LW = 2.8;
export const LWI = 1.8;
/** The drawn layer's widths in the worlds' 1000-wide box (creatures are 60–120 tall there). */
export const WLW = 2.2;
export const WLWI = 1.4;

/** a → b by t (0…1), as #rrggbb. */
export function mix(a: string, b: string, t: number): string {
  const ch = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(ch(a, i) * (1 - t) + ch(b, i) * t).toString(16).padStart(2, '0')).join('')}`;
}
/** A fill's one hard shadow tone (row C: pale; k 0.4 for fur, less for pale fills). */
export const shadeOf = (fill: string, k = 0.4) => mix(fill, SHADOW, k);

/** Stroke attributes for the line at width w. */
export const line = (w: number = LW) => `stroke="${LINE}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

const r1 = (n: number) => +n.toFixed(1);

/**
 * The shadow of an ellipse: the ellipse minus itself moved (dx, dy) toward the light, as one explicit path (a crescent on the
 * side away from the light). (dx, dy) is the lit shape's offset, so (-0.2rx, -0.2ry) puts the shadow on the lower right.
 */
export function crescent(cx: number, cy: number, rx: number, ry: number, dx: number, dy: number): string {
  const ux = dx / rx;
  const uy = dy / ry;
  const L = Math.hypot(ux, uy);
  if (L === 0 || L >= 2) return '';
  const h = Math.sqrt(1 - (L * L) / 4);
  const [nx, ny] = [-uy / L, ux / L];
  const p = (s: number) => [ux / 2 + s * h * nx, uy / 2 + s * h * ny] as const;
  const [a, b] = [p(1), p(-1)];
  const ang = (x: number, y: number) => Math.atan2(y, x);
  const between = (from: number, to: number, mid: number) => { // is `mid` passed going from `from` to `to` in increasing angle?
    const t = (x: number) => ((x - from) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    return t(mid) < t(to);
  };
  const far = ang(-ux, -uy); // the ellipse's own edge away from the light
  const sweep1 = between(ang(a[0], a[1]), ang(b[0], b[1]), far) ? 1 : 0;
  const near = ang(-ux, -uy); // the moved ellipse's edge toward the centre: the same direction from its own centre
  const sweep2 = between(ang(b[0] - ux, b[1] - uy), ang(a[0] - ux, a[1] - uy), near) ? 1 : 0;
  const X = (x: number) => r1(cx + x * rx);
  const Y = (y: number) => r1(cy + y * ry);
  return `M${X(a[0])} ${Y(a[1])} A${rx} ${ry} 0 1 ${sweep1} ${X(b[0])} ${Y(b[1])} A${rx} ${ry} 0 0 ${sweep2} ${X(a[0])} ${Y(a[1])}Z`;
}

/** An outlined ellipse with its hard shadow; k is how far the lit shape moves toward the light (as a share of each radius). */
export function celEllipse(cx: number, cy: number, rx: number, ry: number, fill: string, o: { shade?: string; k?: number; w?: number } = {}): string {
  const k = o.k ?? 0.22;
  const sh = crescent(cx, cy, rx, ry, -rx * k, -ry * k);
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>` + (sh ? `<path d="${sh}" fill="${o.shade ?? shadeOf(fill)}"/>` : '') +
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" ${line(o.w ?? WLW)}/>`;
}

/** A shape drawn the cel way: its flat fill, its shadow (an explicit path inside it), then its outline over both. */
export const celPath = (d: string, fill: string, shadow: string, o: { shade?: string; w?: number } = {}) =>
  `<path d="${d}" fill="${fill}"/>` + (shadow ? `<path d="${shadow}" fill="${o.shade ?? shadeOf(fill)}"/>` : '') + `<path d="${d}" fill="none" ${line(o.w ?? WLW)}/>`;

/** An outlined four-point sparkle (joy confetti, a find's glint). */
export function sparkle(x: number, y: number, r: number, fill = '#ffe27a', w: number = LWI * 0.7): string {
  const k = r * 0.28;
  return `<path d="M${r1(x)} ${r1(y - r)} Q${r1(x + k)} ${r1(y - k)} ${r1(x + r)} ${r1(y)} Q${r1(x + k)} ${r1(y + k)} ${r1(x)} ${r1(y + r)} Q${r1(x - k)} ${r1(y + k)} ${r1(x - r)} ${r1(y)} Q${r1(x - k)} ${r1(y - k)} ${r1(x)} ${r1(y - r)}Z" fill="${fill}" ${line(w)}/>`;
}

/** A small anime eye for a creature: dark, a brown ring, a pupil, two catch-lights. */
export const beadEye = (x: number, y: number, r = 4) =>
  `<ellipse cx="${x}" cy="${y}" rx="${r1(r * 0.85)}" ry="${r}" fill="#2a1f26"/><ellipse cx="${x}" cy="${r1(y + r * 0.25)}" rx="${r1(r * 0.6)}" ry="${r1(r * 0.66)}" fill="#6a4632"/><ellipse cx="${x}" cy="${r1(y + r * 0.3)}" rx="${r1(r * 0.36)}" ry="${r1(r * 0.44)}" fill="#1c1420"/><ellipse cx="${r1(x + r * 0.3)}" cy="${r1(y - r * 0.4)}" rx="${r1(r * 0.31)}" ry="${r1(r * 0.36)}" fill="#fff"/><circle cx="${r1(x - r * 0.3)}" cy="${r1(y + r * 0.6)}" r="${r1(r * 0.15)}" fill="#fff"/>`;

/** Blush with three hatch strokes (spec §7). */
export const blush = (x: number, y: number, rx: number, ry: number, w: number = WLWI * 0.8) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#ff9d8a" opacity=".55"/><path d="M${r1(x - rx * 0.55)} ${r1(y + ry * 0.45)} l${r1(rx * 0.3)} ${r1(-ry * 0.9)} M${r1(x - rx * 0.1)} ${r1(y + ry * 0.45)} l${r1(rx * 0.3)} ${r1(-ry * 0.9)} M${r1(x + rx * 0.35)} ${r1(y + ry * 0.45)} l${r1(rx * 0.3)} ${r1(-ry * 0.9)}" fill="none" stroke="#e2707c" stroke-width="${w}" stroke-linecap="round" opacity=".7"/>`;
