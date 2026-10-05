// Shared drawing pieces for Truffle's costumes, in his viewBox (30 20 260 270): ink outlines match the mascot (3.2px, round joins).
export const INK = '#2a2630';
export const S = `stroke="${INK}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"`;
export const s2 = `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;

/** Mirror an x coordinate across Truffle's centre line (x = 160). */
export const mx = (x: number) => 320 - x;

export const BODY = 'M110 186 C90 200 86 238 104 258 C120 276 200 276 216 258 C234 238 230 200 210 186 Z';
export const belly = (fill = '#fffdf7') => `<ellipse cx="160" cy="236" rx="36" ry="30" fill="${fill}" opacity=".85"/>`;
/** Hood: a dome over the head with the face left open (even-odd). Covers the cat's own ears. */
export const HOOD =
  'M160 28 C224 28 270 64 276 116 C280 152 268 184 246 200 L74 200 C52 184 40 152 44 116 C50 64 96 28 160 28 Z ' +
  'M160 76 C210 76 250 102 250 138 C250 174 210 198 160 198 C110 198 70 174 70 138 C70 102 110 76 160 76 Z';

export const tint = (color: string) => `<path d="${BODY}" fill="${color}" ${S}/>`;
export const hood = (color: string) => `<path d="${HOOD}" fill="${color}" fill-rule="evenodd" ${S}/>`;
export const pair = (draw: (flip: (x: number) => number) => string) => draw((x) => x) + draw(mx);
/** The animal's own eyes on the hood, above his face (as on an animal onesie). */
export const eyes = (dx = 22, y = 54, r = 5.5) =>
  pair((f) => `<circle cx="${f(160 - dx)}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${f(160 - dx) + 1.6}" cy="${y - 1.8}" r="1.7" fill="#fff"/>`);
/** A tail drawn as a thick stroke with an ink edge (in his tail's place, so it swishes with him). */
export const ropeTail = (d: string, color: string, w = 8) =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 3.2}" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** Text in the app's rounded font (a jersey number). */
export const num = (n: string, x: number, y: number, fill: string, size = 34) =>
  `<text x="${x}" y="${y}" font-family="Nunito, sans-serif" font-weight="900" font-size="${size}" text-anchor="middle" dominant-baseline="middle" fill="${fill}" stroke="${INK}" stroke-width="2" paint-order="stroke">${n}</text>`;

/** A long robe or tunic, with a trim along its hem and down its front. */
export const robe = (color: string, trim: string) =>
  tint(color) + `<path d="M108 252 C130 262 190 262 212 252" fill="none" stroke="${trim}" stroke-width="6" stroke-linecap="round"/><path d="M146 190 L160 214 L174 190" fill="none" stroke="${trim}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>`;
/** A toga: white, gold-edged, with a sash over one shoulder. */
export const toga = (sash: string) =>
  tint('#fbfaf6') + `<path d="M118 190 C150 214 182 236 210 252" fill="none" stroke="${sash}" stroke-width="14" stroke-linecap="round"/><path d="M108 252 C130 262 190 262 212 252" fill="none" stroke="#e0b13a" stroke-width="5" stroke-linecap="round"/>`;
/** Leaves (or flowers) round his head, in an arc over the forehead between his ears. */
export const wreath = (leaf: string, extra = '') => {
  const out: string[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = Math.PI * (1.12 + (0.76 * i) / 8);
    const x = 160 + 64 * Math.cos(t);
    const y = 84 + 40 * Math.sin(t);
    const deg = (t * 180) / Math.PI + 90;
    out.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="6" ry="11" transform="rotate(${deg.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${leaf}" ${s2}/>`);
  }
  return out.join('') + extra;
};
/** A crown on his head: a band and its points. */
export const crown = (gold: string, points = 5, tall = 18) => {
  const w = 96 / points;
  let d = `M112 66 L112 52`;
  for (let i = 0; i < points; i++) d += ` L${(112 + w * i + w / 2).toFixed(1)} ${52 - tall} L${(112 + w * (i + 1)).toFixed(1)} 52`;
  return `<path d="${d} L208 66 Z" fill="${gold}" ${S}/>`;
};
/** A Greek helmet over the top of his head (cheek guards clear of his eyes), with a crest. */
export const helmet = (metal: string, plume: string) =>
  `<path d="M66 128 C60 70 100 36 160 36 C220 36 260 70 254 128 L232 128 C232 104 214 92 160 92 C106 92 88 104 88 128 Z" fill="${metal}" ${S}/>` +
  `<path d="M160 40 L160 90" stroke="${INK}" stroke-width="2.4" opacity=".5"/>` +
  (plume ? `<path d="M96 60 C96 22 224 22 224 60 C208 44 112 44 96 60 Z" fill="${plume}" ${S}/><path d="M122 36 L126 50 M142 30 L144 46 M160 28 L160 44 M178 30 L176 46 M198 36 L194 50" stroke="${INK}" stroke-width="1.8" opacity=".55"/>` : '');
/** Something held upright at his side (a staff, a spear): its shaft from his paw to `top`. */
export const staff = (x: number, top: number, color: string, w = 5) =>
  `<path d="M${x} 266 L${x} ${top}" stroke="${INK}" stroke-width="${w + 3.2}" stroke-linecap="round"/><path d="M${x} 266 L${x} ${top}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
