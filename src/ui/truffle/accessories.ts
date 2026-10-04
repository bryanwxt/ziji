import { accessoryById } from '../../fun/accessories';

// Accessory art in Truffle's viewBox (30 20 260 270), ink-outlined like the costumes.
// Places: back = behind the body; under = neck items, over the body but under the chin;
// face = on the face, tilting with the head; over = held items, in front of everything.
const INK = '#2a2630';
const S = `stroke="${INK}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"`;
const s2 = `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;
const RED = '#ff5532';
const GOLD = '#ffc94a';
const CREAM = '#fffdf7';

export interface AccessoryLayer {
  back: string;
  under: string;
  face: string;
  over: string;
}

const star = (cx: number, cy: number, r: number) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
  });
  return `M${pts.join(' L')} Z`;
};
const heart = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy + r * 0.9} C${cx - r * 1.6} ${cy - r * 0.1} ${cx - r * 0.9} ${cy - r * 1.3} ${cx} ${cy - r * 0.45} C${cx + r * 0.9} ${cy - r * 1.3} ${cx + r * 1.6} ${cy - r * 0.1} ${cx} ${cy + r * 0.9} Z`;
/** A cream paw closing over the base of a held item. */
const PAW = `<ellipse cx="186" cy="262" rx="16" ry="11" fill="${CREAM}" ${S}/><path d="M180 258 L180 266 M188 257 L188 266" ${s2}/>`;
const arms = `<path d="M92 112 L64 104 M228 112 L256 104" fill="none" ${S}/>`;

const ART: Record<string, () => Partial<AccessoryLayer>> = {
  sunglasses: () => ({
    face:
      arms +
      `<rect x="90" y="100" width="56" height="36" rx="14" fill="#26232b" ${S}/><rect x="174" y="100" width="56" height="36" rx="14" fill="#26232b" ${S}/>` +
      `<path d="M146 112 Q160 104 174 112" fill="none" ${S}/><path d="M100 110 L112 104 M184 110 L196 104" stroke="${CREAM}" stroke-width="4" stroke-linecap="round" opacity=".8"/>`,
  }),
  starglasses: () => ({
    face: arms + `<path d="${star(118, 118, 34)}" fill="${GOLD}" fill-opacity=".45" ${S}/><path d="${star(202, 118, 34)}" fill="${GOLD}" fill-opacity=".45" ${S}/><path d="M146 116 Q160 108 174 116" fill="none" ${S}/>`,
  }),
  heartglasses: () => ({
    face: arms + `<path d="${heart(118, 120, 26)}" fill="#ff7a9c" fill-opacity=".45" ${S}/><path d="${heart(202, 120, 26)}" fill="#ff7a9c" fill-opacity=".45" ${S}/><path d="M144 116 Q160 108 176 116" fill="none" ${S}/>`,
  }),
  moustache: () => ({
    face: `<path d="M160 156 C150 148 132 148 122 160 C116 167 108 164 110 156 C106 168 120 176 132 170 C142 166 152 161 160 159 C168 161 178 166 188 170 C200 176 214 168 210 156 C212 164 204 167 198 160 C188 148 170 148 160 156 Z" fill="#3a2a20" ${s2}/>`,
  }),
  scarf: () => ({
    under:
      `<path d="M98 184 C130 204 190 204 222 184 L226 202 C190 224 130 224 94 202 Z" fill="${RED}" ${S}/>` +
      `<path d="M118 206 L108 248 L132 252 L138 212 Z" fill="${RED}" ${S}/><path d="M112 236 L132 240 M110 246 L114 254 M120 248 L122 256 M128 250 L130 258" fill="none" ${s2}/>` +
      `<path d="M118 196 L124 210 M140 202 L144 216 M162 204 L164 218 M184 200 L186 214 M204 194 L208 208" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/>`,
  }),
  bowtie: () => ({
    under: `<path d="M160 200 L132 186 L132 214 Z M160 200 L188 186 L188 214 Z" fill="${RED}" ${S}/><circle cx="160" cy="200" r="7" fill="#c23a1e" ${S}/>`,
  }),
  medal: () => ({
    under:
      `<path d="M142 188 L154 206 L166 206 L178 188 L168 188 L160 200 L152 188 Z" fill="#4aa3ff" ${s2}/>` +
      `<circle cx="160" cy="214" r="13" fill="${GOLD}" ${S}/><path d="${star(160, 214, 7.5)}" fill="${CREAM}" ${s2}/>`,
  }),
  headphones: () => ({
    under:
      `<path d="M100 196 C112 226 208 226 220 196" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><path d="M100 196 C112 226 208 226 220 196" fill="none" stroke="#7b8cff" stroke-width="6" stroke-linecap="round"/>` +
      `<ellipse cx="98" cy="200" rx="15" ry="19" fill="${GOLD}" ${S}/><ellipse cx="222" cy="200" rx="15" ry="19" fill="${GOLD}" ${S}/>`,
  }),
  brush: () => ({
    over:
      `<path d="M252 172 L198 246" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M252 172 L198 246" stroke="#c98a52" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M240 190 L234 186 M226 206 L220 202 M213 224 L207 220" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M200 240 C190 248 182 262 180 276 C190 270 202 262 208 250 Z" fill="${INK}"/>` +
      PAW,
  }),
  lantern: () => ({
    over:
      `<path d="M188 258 L238 196" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M240 194 L248 206" stroke="${INK}" stroke-width="2.4"/>` +
      `<rect x="236" y="204" width="24" height="6" rx="2" fill="${GOLD}" ${s2}/><ellipse cx="248" cy="226" rx="26" ry="20" fill="${RED}" ${S}/>` +
      `<path d="M236 210 C230 222 230 232 236 242 M260 210 C266 222 266 232 260 242 M248 206 L248 246" fill="none" stroke="#c23a1e" stroke-width="2"/>` +
      `<rect x="236" y="242" width="24" height="6" rx="2" fill="${GOLD}" ${s2}/><path d="M248 248 L248 266 M243 266 L253 266" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/>` +
      PAW,
  }),
  kite: () => ({
    over:
      `<path d="M188 258 C214 220 196 160 250 106" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="4 4"/>` +
      `<path d="M262 46 L284 76 L262 110 L240 76 Z" fill="${RED}" ${S}/><path d="M262 46 L262 110 M240 76 L284 76" stroke="${GOLD}" stroke-width="3"/>` +
      `<path d="M262 110 C254 124 268 132 258 146" fill="none" ${s2}/><path d="M252 122 L262 118 L258 128 Z M256 138 L266 134 L262 144 Z" fill="${GOLD}" ${s2}/>` +
      PAW,
  }),
  balloon: () => ({
    over:
      `<path d="M188 258 C200 214 236 180 252 132" fill="none" stroke="${INK}" stroke-width="2"/>` +
      `<ellipse cx="256" cy="98" rx="28" ry="33" fill="${RED}" ${S}/><path d="M250 130 L262 130 L256 136 Z" fill="${RED}" ${s2}/>` +
      `<path d="M242 84 C244 76 250 72 256 70" stroke="${CREAM}" stroke-width="5" stroke-linecap="round" fill="none" opacity=".85"/>` +
      PAW,
  }),
  wand: () => ({
    over:
      `<path d="M190 256 L236 196" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M190 256 L236 196" stroke="#7b5cd6" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="${star(242, 186, 20)}" fill="${GOLD}" ${S}/><path d="M270 160 l3 6 6 3 -6 3 -3 6 -3 -6 -6 -3 6 -3 Z M214 168 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 Z" fill="${GOLD}" ${s2}/>` +
      PAW,
  }),
  backpack: () => ({
    back: `<rect x="76" y="190" width="168" height="84" rx="26" fill="${RED}" ${S}/><path d="M138 186 C138 172 182 172 182 186" fill="none" ${S}/>`,
    under: `<path d="M118 192 C110 220 112 248 118 266 M202 192 C210 220 208 248 202 266" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="M118 192 C110 220 112 248 118 266 M202 192 C210 220 208 248 202 266" fill="none" stroke="#c23a1e" stroke-width="6" stroke-linecap="round"/>`,
  }),
  wings: () => ({
    back:
      `<path d="M100 214 C66 176 36 186 40 218 C28 230 38 250 58 246 C62 262 86 262 96 246 Z" fill="${CREAM}" ${S}/>` +
      `<path d="M220 214 C254 176 284 186 280 218 C292 230 282 250 262 246 C258 262 234 262 224 246 Z" fill="${CREAM}" ${S}/>` +
      `<path d="M58 218 C70 220 80 226 88 234 M66 202 C78 206 88 214 94 222 M262 218 C250 220 240 226 232 234 M254 202 C242 206 232 214 226 222" fill="none" stroke="#bfe0ff" stroke-width="4" stroke-linecap="round"/>`,
  }),
  jetpack: () => ({
    back:
      `<path d="M64 270 C60 282 70 290 74 280 C78 290 88 282 84 270 Z M236 270 C232 282 242 290 246 280 C250 290 260 282 256 270 Z" fill="${GOLD}" ${s2}/>` +
      `<path d="M68 270 C66 276 72 280 74 276 C76 280 82 276 80 270 Z M240 270 C238 276 244 280 246 276 C248 280 254 276 252 270 Z" fill="${RED}"/>` +
      `<rect x="58" y="200" width="32" height="70" rx="12" fill="#c9ced8" ${S}/><rect x="230" y="200" width="32" height="70" rx="12" fill="#c9ced8" ${S}/>` +
      `<path d="M58 214 C58 194 90 194 90 214 Z M230 214 C230 194 262 194 262 214 Z" fill="${RED}" ${S}/>`,
  }),
};

/** Ink art for an accessory id, or null for unknown ids (old emoji are migrated before they get here). */
export function accessoryLayer(id: string | null | undefined): AccessoryLayer | null {
  if (!id || !accessoryById(id)) return null;
  const art = ART[id]!();
  return { back: art.back ?? '', under: art.under ?? '', face: art.face ?? '', over: art.over ?? '' };
}

/** A tight crop around each accessory, for drawing it on its own (room tiles). */
const THUMB_VIEW: Record<string, string> = {
  sunglasses: '58 90 204 56', starglasses: '56 82 208 74', heartglasses: '56 88 208 64', moustache: '104 140 112 42',
  scarf: '90 180 140 82', bowtie: '126 180 68 40', medal: '136 184 48 46', headphones: '80 178 160 46',
  brush: '176 164 88 116', lantern: '184 186 94 84', kite: '226 42 64 112', balloon: '222 60 68 80',
  wand: '186 156 96 104', backpack: '72 168 176 110', wings: '78 172 164 96', jetpack: '96 186 128 108', // each half drawn closer in (see accessoryThumb)
};

const THUMB_BACK = '<ellipse class="thumb__back" cx="160" cy="236" rx="30" ry="40" fill="#a9a7ad" stroke="#2a2630" stroke-width="3"/>';
const PAIRED = 46; // wings and the jetpack sit either side of him: the thumbnail draws each half this much closer in

/** An accessory drawn on its own (no paw), with a viewBox cropped to it. */
export function accessoryThumb(id: string): { viewBox: string; markup: string } | null {
  const l = accessoryLayer(id);
  if (!l) return null;
  const art = (l.back + l.under + l.face + l.over).replace(PAW, '');
  if (id !== 'wings' && id !== 'jetpack') return { viewBox: THUMB_VIEW[id]!, markup: art };
  // a pair on either side of his body: each half moves in, on a small grey back, so the tile isn't two specks
  const half = (side: 'l' | 'r') =>
    `<clipPath id="thumb-${id}-${side}"><rect x="${side === 'l' ? 0 : 160}" y="0" width="160" height="320"/></clipPath>` +
    `<g transform="translate(${side === 'l' ? PAIRED : -PAIRED} 0)"><g clip-path="url(#thumb-${id}-${side})">${art}</g></g>`;
  return { viewBox: THUMB_VIEW[id]!, markup: THUMB_BACK + half('l') + half('r') };
}
