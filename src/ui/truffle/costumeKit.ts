// Shared drawing pieces for Truffle's costumes, accessories and powers, in his viewBox (30 20 260 270), in his light cel
// (spec 2026-10-13 §7): the same soft-violet line and weights as his body (2.8 outer, 1.8 inner), and one hard shadow on the
// big pieces (the robe and the hood), each an explicit path.
import { LINE, LW, LWI, mix } from '../cel';

export const INK = LINE;
export const S = `stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round" stroke-linecap="round"`;
export const s2 = `stroke="${INK}" stroke-width="${LWI}" stroke-linejoin="round" stroke-linecap="round"`;
/** A dark for small solid marks (an animal's eyes on a hood, nostrils): the line is too pale for them. */
export const DARK = '#3a3045';
/** A costume colour's one hard shadow tone (the mockup's wizard robe: toward a deep violet). */
export const celShade = (hex: string) => mix(hex, '#2a2050', 0.3);

/** Mirror an x coordinate across Truffle's centre line (x = 160). */
export const mx = (x: number) => 320 - x;

export const BODY = 'M110 186 C90 200 86 238 104 258 C120 276 200 276 216 258 C234 238 230 200 210 186 Z';
export const belly = (fill = '#fffdf7') => `<ellipse cx="160" cy="236" rx="36" ry="30" fill="${fill}" opacity=".85"/>`;
/** Hood: a dome over the head with the face left open (even-odd). Covers the cat's own ears. */
export const HOOD =
  'M160 28 C224 28 270 64 276 116 C280 152 268 184 246 200 L74 200 C52 184 40 152 44 116 C50 64 96 28 160 28 Z ' +
  'M160 76 C210 76 250 102 250 138 C250 174 210 198 160 198 C110 198 70 174 70 138 C70 102 110 76 160 76 Z';

/** The robe's shadow on the lower right and the band where his head shadows it (baked like his body's, spec §7). */
const ROBE_SH = 'M106.3 260.2 L112.8 263.9 L116.7 265.5 L126 268.1 L136.6 270 L154 271.4 L171.9 271.1 L188.8 269.2 L203.3 265.5 L210.7 262.1 L216 258 L220 252.6 L223.2 246.7 L226.3 236.9 L227.3 230.1 L227.3 219.8 L225.4 209.7 L221.9 200.3 L216.7 192.3 L212.4 187.9 L210 186 L204.5 186 L209.9 194.3 L213.4 203.7 L215.3 213.8 L215.3 224.1 L213.5 234.3 L209.7 243.7 L204 252 L198.7 256.1 L191.3 259.5 L182 262.1 L171.4 264 L154 265.4 L142 265.4 L130.3 264.7 L119.2 263.2Z';
const ROBE_BAND = 'M222.4 201.5 L210.9 204.6 L196 207 L178.6 208.5 L160 209 L141.4 208.5 L124 207 L109.1 204.6 L97.6 201.5 L99.6 197.5 L103.3 192.3 L110 186 L210 186 L216.7 192.3 L220.4 197.5Z';
export const tint = (color: string) => `<path d="${BODY}" fill="${color}"/><path d="${ROBE_SH}" fill="${celShade(color)}"/><path d="${ROBE_BAND}" fill="${celShade(color)}"/><path d="${BODY}" fill="none" ${S}/>`;

/** The hood's hard shadow: its dome's lower right, never over the face opening. */
const HOOD_SH = 'M65 192 L74 200 L246 200 L253.8 193.3 L260.5 185.2 L266.2 175.9 L270.8 165.5 L274.1 154.2 L276.1 142.1 L276.8 129.3 L276.4 120.5 L275 109.6 L271.9 97.3 L269.8 91.4 L264.3 80.3 L261.1 75.1 L253.5 65.3 L249.3 60.8 L239.8 52.5 L236.3 50 L243.5 57.3 L251.1 67.1 L257.2 77.8 L259.8 83.4 L263.7 95.3 L265 101.6 L266.4 112.5 L266.8 121.3 L266.5 129.9 L264.9 142.2 L263.1 150 L259.4 161.1 L254.4 171.1 L250.5 177.2 L243.8 185.3 L236 192 L201 192 L184 196.1 L172.3 197.5 L160 198 L147.7 197.5 L136 196.1 L119 192Z';
export const hood = (color: string) =>
  `<path d="${HOOD}" fill="${color}" fill-rule="evenodd"/><path d="${HOOD_SH}" fill="${celShade(color)}"/>` +
  `<path d="M160 76 C210 76 250 102 250 138 C250 174 210 198 160 198 C110 198 70 174 70 138 C70 102 110 76 160 76 Z" transform="translate(160 137) scale(1.075) translate(-160 -137)" fill="none" stroke="${celShade(color)}" stroke-width="7"/>` +
  `<path d="${HOOD}" fill="none" fill-rule="evenodd" ${S}/>` +
  `<path d="M74 92 C88 62 116 42 148 37" stroke="#fff" stroke-opacity=".42" stroke-width="7" fill="none" stroke-linecap="round"/>`;
export const pair = (draw: (flip: (x: number) => number) => string) => draw((x) => x) + draw(mx);
/** The animal's own eyes on the hood, above his face (as on an animal onesie). */
export const eyes = (dx = 22, y = 54, r = 5.5) =>
  pair((f) => `<circle cx="${f(160 - dx)}" cy="${y}" r="${r}" fill="${DARK}"/><circle cx="${f(160 - dx) + 1.6}" cy="${y - 1.8}" r="1.7" fill="#fff"/>`);
/** A tail drawn as a thick stroke with an ink edge (in his tail's place, so it swishes with him). */
export const ropeTail = (d: string, color: string, w = 8) =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 2 * LW}" stroke-linecap="round" stroke-linejoin="round"/>` +
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
  `<path d="M${x} 266 L${x} ${top}" stroke="${INK}" stroke-width="${w + 2 * LW}" stroke-linecap="round"/><path d="M${x} 266 L${x} ${top}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;

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

/**
 * A fur fringe round the face opening (a lion's mane, a lion-dance head): one band, its outer edge in tufts. `from`/`to` are
 * angles in turns round his face (0.5 = his left, 0.75 = the top, 1 = his right).
 */
export const fringe = (color: string, kind: 'fluff' | 'spike' = 'fluff', from = 0.42, to = 1.08, n = 15) => {
  const cx = 160;
  const cy = 137;
  const pt = (t: number, r: number) => [cx + (90 + r) * Math.cos(t * 2 * Math.PI), cy + (61 + r * 0.85) * Math.sin(t * 2 * Math.PI)] as const;
  const out: string[] = [];
  const [x0, y0] = pt(from, 0);
  let d = `M${f1(x0)} ${f1(y0)}`;
  for (let i = 0; i < n; i++) {
    const a = from + ((to - from) * i) / n;
    const b = from + ((to - from) * (i + 1)) / n;
    const m = (a + b) / 2;
    const [px, py] = pt(m, kind === 'spike' ? 24 : 17);
    const [bx, by] = pt(b, 4);
    d += kind === 'spike' ? ` L${f1(px)} ${f1(py)} L${f1(bx)} ${f1(by)}` : ` Q${f1(px)} ${f1(py)} ${f1(bx)} ${f1(by)}`;
  }
  // back along the opening's edge
  for (let i = n; i >= 0; i--) {
    const [x, y] = pt(from + ((to - from) * i) / n, -3);
    d += ` L${f1(x)} ${f1(y)}`;
  }
  out.push(`<path d="${d} Z" fill="${color}" ${S}/>`);
  return out.join('');
};

/** A horse's muzzle on a hood: a long pale oval with nostril slits (dots would read as a pig's snout). */
export const MUZZLE = (fill: string) =>
  `<ellipse cx="160" cy="70" rx="21" ry="13" fill="${fill}" ${S}/><path d="M151 66 q3 4 1 8 M169 66 q-3 4 -1 8" stroke="${DARK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;

// ---- v3 (rewards spec 2026-10-15 §5.1): the helpers the approved samples (docs/worlds/costumes/samples-v3.ts.txt) drew with ----

/** His paws' outlines (parts.ts G.pawL / G.pawR): for gloves, and for a paw closing over a held thing. */
export const PAW_L_D = 'M122 262 C120 276 154 278 154 266 C154 258 124 254 122 262Z';
export const PAW_R_D = 'M198 262 C200 276 166 278 166 266 C166 258 196 254 198 262Z';
export const CREAM_PAW = '#fbf5ea';
const TOES_L = 'M132 264 L132 270 M142 264 L142 270';
const TOES_R = 'M178 264 L178 270 M188 264 L188 270';
const glove = (d: string, fill: string, toes: string) =>
  `<path d="${d}" fill="${fill}" ${s2}/><path d="${toes}" fill="none" stroke="${celShade(fill)}" stroke-width="1.6" stroke-linecap="round"/>`;
export const gloveL = (fill: string) => glove(PAW_L_D, fill, TOES_L);
export const gloveR = (fill: string) => glove(PAW_R_D, fill, TOES_R);
/** His own cream paw drawn again over a held thing, so the paw closes round it. */
export const pawOverL = `<path d="${PAW_L_D}" fill="${CREAM_PAW}" ${s2}/><path d="${TOES_L}" fill="none" ${s2}/>`;
export const pawOverR = `<path d="${PAW_R_D}" fill="${CREAM_PAW}" ${s2}/><path d="${TOES_R}" fill="none" ${s2}/>`;

/**
 * A cel piece: its one hard shadow (the piece in its shadow tone), the lit fill on top shrunk toward (ax, ay) — a point near the
 * piece's upper left, so what is left is a rim on the side away from the light — then the line. Explicit paths only, never a
 * clip-path; exact for any piece that is star-shaped about (ax, ay).
 */
export const cel = (d: string, fill: string, ax: number, ay: number, k = 0.9, sh = celShade(fill)) =>
  `<path d="${d}" fill="${sh}"/><path d="${d}" fill="${fill}" transform="translate(${ax} ${ay}) scale(${k}) translate(${-ax} ${-ay})"/><path d="${d}" fill="none" ${S}/>`;
/** A soft white highlight stroke on the lit side. */
export const hi = (d: string, w = 4, o = 0.5) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`;
/** A thick stroked band with an ink edge (a ribbon, a hose, a sash). */
export const rope = (d: string, color: string, w: number) => ropeTail(d, color, w);
/**
 * A held pole (a staff, a spatula, a spyglass): a straight rod through the paw at (cx, cy), turned `deg`, running `back` behind
 * and `ahead` in front, with an ink edge, optional end caps of 20 and a highlight. Put it in pawL/pawR so it rides the paw.
 */
export const heldPole = (cx: number, cy: number, deg: number, back: number, ahead: number, color: string, w = 8, cap?: string) =>
  `<g transform="translate(${cx} ${cy}) rotate(${deg})">` +
  `<path d="M${-back} 0 L${ahead} 0" stroke="${INK}" stroke-width="${w + 2 * LW}" stroke-linecap="round"/>` +
  `<path d="M${-back} 0 L${ahead} 0" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>` +
  (cap ? `<path d="M${-back} 0 L${-back + 20} 0 M${ahead - 20} 0 L${ahead} 0" stroke="${cap}" stroke-width="${w}" stroke-linecap="round"/>` : '') +
  `<path d="M${-back + 6} ${-w * 0.3} L${ahead - 6} ${-w * 0.3}" stroke="#fff" stroke-opacity=".35" stroke-width="${Math.max(1.5, w * 0.2)}" stroke-linecap="round"/></g>`;
