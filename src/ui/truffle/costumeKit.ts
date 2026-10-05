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
/** Something held upright at his side (a staff, a spear): its shaft from his paw to `top`. */
export const staff = (x: number, top: number, color: string, w = 5) =>
  `<path d="M${x} 266 L${x} ${top}" stroke="${INK}" stroke-width="${w + 3.2}" stroke-linecap="round"/><path d="M${x} 266 L${x} ${top}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;

// ---- headpieces, made to sit on his head (parent, 2026-10-06: the first ones looked amateur) ----
// Each follows the curve of his head (top at 160,34), has one bold outline round the whole piece, a shade underneath and a
// highlight on top, and stays clear of his eyes (EYE_Y 118) and inside his box.

/** A colour mixed toward ink (k = 0…1): the shade side of a piece. */
export const shade = (hex: string, k = 0.28) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const ink = [0x2a, 0x26, 0x30];
  return `#${c.map((v, i) => Math.round(v + (ink[i]! - v) * k).toString(16).padStart(2, '0')).join('')}`;
};
const HL = `stroke="#fff" stroke-opacity=".55" stroke-linecap="round" fill="none"`;
const f1 = (n: number) => n.toFixed(1);

/** A band round his forehead, following his head's curve; its ends tuck in at his temples. */
export const band = (fill: string, y = 78, h = 13) =>
  `<path d="M80 ${y + 18} C110 ${y - 4} 210 ${y - 4} 240 ${y + 18} L240 ${y + 18 + h} C210 ${y - 4 + h} 110 ${y - 4 + h} 80 ${y + 18 + h} Z" fill="${fill}" ${S}/>` +
  `<path d="M84 ${y + 17 + h} C112 ${y - 3 + h} 208 ${y - 3 + h} 236 ${y + 17 + h}" stroke="${shade(fill, 0.35)}" stroke-width="3.5" fill="none" stroke-linecap="round"/>` +
  `<path d="M100 ${y + 9} C126 ${y - 1} 194 ${y - 1} 220 ${y + 9}" ${HL} stroke-width="3"/>`;

/** One pointed leaf, `len` long, at (x, y), turned `deg` (0 points right). */
const leaf = (x: number, y: number, deg: number, fill: string, len = 18, w = 7) =>
  `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(deg)})"><path d="M0 0 C${f1(len * 0.3)} ${-w} ${f1(len * 0.75)} ${-w} ${len} 0 C${f1(len * 0.75)} ${w} ${f1(len * 0.3)} ${w} 0 0 Z" fill="${fill}" ${s2}/><path d="M2 0 L${len - 3} 0" stroke="${shade(fill, 0.45)}" stroke-width="1.4"/></g>`;

/**
 * A wreath of two branches round the top of his head, meeting at the front: laurel, wheat, vine. `accent` is drawn over it
 * (roses, grapes). Leaves alternate in and out of the branch and point toward the front, darker ones behind.
 */
export const wreath = (leafColor: string, accent = '', kind: 'laurel' | 'wheat' = 'laurel') => {
  const out: string[] = [];
  const at = (t: number, off = 0) => {
    const x = 160 + (90 + off) * Math.cos(t);
    const y = 110 + (70 + off) * Math.sin(t);
    return [x, y] as const;
  };
  for (const side of [-1, 1] as const) {
    // the stem
    const pts = [...Array(9)].map((_, i) => at(side < 0 ? Math.PI * (1.12 + 0.36 * (i / 8)) : Math.PI * (1.88 - 0.36 * (i / 8))));
    out.push(`<path d="M${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(' L')}" stroke="${shade(leafColor, 0.5)}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
    for (let i = 0; i < 6; i++) {
      const t = side < 0 ? Math.PI * (1.12 + 0.36 * (i / 5.5)) : Math.PI * (1.88 - 0.36 * (i / 5.5));
      const [x, y] = at(t, i % 2 ? 6 : -6);
      // along the branch toward the front: the tangent, turned out or in
      const tan = (Math.atan2(70 * Math.cos(t), -90 * Math.sin(t)) * 180) / Math.PI + (side < 0 ? 0 : 180);
      const deg = tan + (i % 2 ? -38 : 38) * side;
      const fill = i % 2 ? leafColor : shade(leafColor, 0.18);
      out.push(kind === 'wheat'
        ? `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(deg)})"><path d="M0 0 C4 -6 12 -6 16 0 C12 6 4 6 0 0 Z" fill="${fill}" ${s2}/><path d="M4 -3 l3 3 l3 -3 M4 3 l3 -3 l3 3" stroke="${shade(fill, 0.5)}" stroke-width="1.2" fill="none"/></g>`
        : leaf(x, y, deg, fill, 24, 9));
    }
  }
  return out.join('') + accent;
};

/** A crown: a band hugging his head and `n` points with balls on their tips, the middle one tallest; `gems` on the band. */
export const crown = (gold: string, n = 5, tall = 18, gems: string[] = ['#d8262e', '#3f6fd6']) => {
  const L = 108;
  const R = 212;
  const yt = (x: number) => 54 + 6 * ((x - 160) / 52) ** 2; // the band's top follows his head
  const yb = (x: number) => yt(x) + 15;
  const w = (R - L) / n;
  const mid = (n - 1) / 2;
  let d = `M${L} ${f1(yb(L))} L${L} ${f1(yt(L))}`;
  const balls: string[] = [];
  for (let i = 0; i < n; i++) {
    const cx = L + w * (i + 0.5);
    const tip = yt(cx) - tall - (i === Math.round(mid) ? 6 : 0) + Math.abs(i - mid) * 2;
    d += ` L${f1(cx)} ${f1(tip)} L${f1(L + w * (i + 1))} ${f1(yt(L + w * (i + 1)))}`;
    balls.push(`<circle cx="${f1(cx)}" cy="${f1(tip)}" r="4" fill="${gold}" ${s2}/>`);
  }
  d += ` L${R} ${f1(yb(R))} C${R - 30} ${f1(yb(160) + 3)} ${L + 30} ${f1(yb(160) + 3)} ${L} ${f1(yb(L))} Z`;
  const gemAt = [-34, 0, 34].map((dx, i) => `<circle cx="${160 + dx}" cy="${f1(yt(160 + dx) + 8)}" r="${i === 1 ? 5 : 4}" fill="${gems[i % gems.length]}" ${s2}/>`).join('');
  return `<path d="${d}" fill="${gold}" ${S}/>` + balls.join('') +
    `<path d="M${L + 2} ${f1(yt(L) + 2)} C${L + 30} ${f1(yt(160) + 5)} ${R - 30} ${f1(yt(160) + 5)} ${R - 2} ${f1(yt(R) + 2)}" stroke="${shade(gold, 0.3)}" stroke-width="2" fill="none"/>` + gemAt +
    `<path d="M${L + 8} ${f1(yt(L) - 4)} L${L + 8} ${f1(yt(L) - 12)}" ${HL} stroke-width="3"/>`;
};

/** An open-faced Greek helmet: a dome, cheek pieces clear of his eyes, a rim, a highlight, and a crest (none if `plume` is ''). */
export const helmet = (metal: string, plume: string) =>
  `<path d="M70 104 C66 58 106 32 160 32 C214 32 254 58 250 104 L248 144 C240 152 228 150 224 140 L224 108 C206 92 114 92 96 108 L96 140 C92 150 80 152 72 144 Z" fill="${metal}" ${S}/>` +
  `<path d="M98 106 C116 94 204 94 222 106" stroke="${shade(metal, 0.3)}" stroke-width="4" fill="none" stroke-linecap="round"/>` +
  `<path d="M100 98 C118 86 140 84 156 88 M164 88 C180 84 202 86 220 98" stroke="${shade(metal, 0.35)}" stroke-width="2.4" fill="none"/>` +
  `<path d="M88 74 C96 58 112 48 130 44" ${HL} stroke-width="5"/>` +
  // the crest stands along the top of the helmet, its bristles fanning out
  (plume ? `<path d="M104 58 C98 26 222 26 216 58 C204 50 116 50 104 58 Z" fill="${plume}" ${S}/>` +
    [...Array(9)].map((_, i) => { const x = 114 + i * 11.5; const k = Math.sin(((i + 0.5) / 9) * Math.PI); return `<path d="M${f1(x)} ${f1(53 - 3 * k)} L${f1(x + (x - 160) * 0.1)} ${f1(40 - 8 * k)}" stroke="${shade(plume, 0.35)}" stroke-width="1.8" stroke-linecap="round"/>`; }).join('') +
    `<path d="M124 38 C140 31 160 30 176 31" ${HL} stroke-width="3"/>` : '');

/** Feathered wings (a cap's, a sandal's): out from (x, y) toward `dir` (-1 left, 1 right), scaled by k. */
export const wings = (x: number, y: number, dir: -1 | 1, k = 1) => {
  const p = (dx: number, dy: number) => `${f1(x + dir * dx * k)} ${f1(y + dy * k)}`;
  return `<path d="M${p(0, 0)} C${p(8, -20)} ${p(34, -28)} ${p(44, -18)} C${p(36, -14)} ${p(38, -8)} ${p(44, -4)} C${p(34, -2)} ${p(34, 4)} ${p(38, 8)} C${p(24, 10)} ${p(10, 6)} ${p(0, 0)} Z" fill="#fffdf7" ${s2}/>` +
    `<path d="M${p(12, -8)} L${p(36, -14)} M${p(12, 0)} L${p(34, 2)}" stroke="#b9b3bd" stroke-width="1.6" fill="none"/>`;
};
