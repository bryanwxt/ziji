// Truffle 松露 — geometry from docs/superpowers/specs/assets/2026-10-02-truffle-reference.html (approved 2026-10-02), painted in light
// cel (spec 2026-10-13 §7, mockup row C): a soft-violet line, flat fills, and one pale hard shadow on the lower right of each part,
// each shadow its own explicit path (no clip-paths, no gradients). Coordinates share the viewBox "30 20 260 270".
import { LINE, LW, LWI, mix, SHADOW } from '../cel';

export type TruffleMood = 'sulk' | 'neutral' | 'pleased' | 'side' | 'content' | 'wow' | 'cheer' | 'sleepy';
export const TRUFFLE_MOODS: TruffleMood[] = ["sulk", "neutral", "pleased", "side", "content", "wow", "cheer", "sleepy"];

/** His colours (row C): flat fur, chest and paws, pink ear insides, and the one shadow tone of each. */
export const CEL = {
  fur: '#a9a4ab', furSh: mix('#a9a4ab', SHADOW, 0.4), furHi: '#c7c3cc', furMark: mix('#a9a4ab', '#4e4858', 0.32), crown: mix('#a9a4ab', '#4e4858', 0.16),
  chest: '#fbf5ea', chestSh: mix('#fbf5ea', SHADOW, 0.14), pink: '#f6b6b6', pinkSh: mix('#f6b6b6', SHADOW, 0.2), nose: '#f2949c',
} as const;

const line = (w: number) => `stroke="${LINE}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const out = (d: string, w: number = LW) => `<path d="${d}" fill="none" ${line(w)}/>`;
const fill = (d: string, c: string) => `<path d="${d}" fill="${c}"/>`;

// the shapes (unchanged from the reference)
const G = {
  head: 'M160 34 C212 34 250 60 256 98 C266 104 268 116 261 122 C268 130 265 142 254 146 C242 178 204 198 160 198 C116 198 78 178 66 146 C55 142 52 130 59 122 C52 116 54 104 64 98 C70 60 108 34 160 34Z',
  torso: 'M110 186 C112 158 208 158 210 186 C230 200 234 238 216 258 C200 276 120 276 104 258 C86 238 90 200 110 186Z',
  earL: 'M74 92 C64 66 66 42 76 30 C94 36 112 48 122 60 Z',
  earR: 'M246 92 C256 66 254 42 244 30 C226 36 208 48 198 60 Z',
  earInL: 'M82 76 C78 60 79 48 84 42 C94 48 104 54 110 62 Z',
  earInR: 'M238 76 C242 60 241 48 236 42 C226 48 216 54 210 62 Z',
  blaze: 'M154 60 C156 92 158 112 160 126 C162 112 164 92 166 60 C163 76 161 88 160 98 C159 88 157 76 154 60Z',
  muzzle: 'M134 132 C142 124 178 124 186 132 C204 140 212 160 202 176 C190 192 130 192 118 176 C108 160 116 140 134 132Z',
  nose: 'M152 142 L168 142 C166 148 163 151 160 152 C157 151 154 148 152 142 Z',
  tail: 'M212 252 C246 256 262 226 248 204 C244 196 252 190 258 194 C246 182 232 194 236 208 C244 228 234 242 210 240Z',
  pawL: 'M122 262 C120 276 154 278 154 266 C154 258 124 254 122 262Z',
  pawR: 'M198 262 C200 276 166 278 166 266 C166 258 196 254 198 262Z',
};

/**
 * Each part's hard shadow: the part minus itself moved toward the light (upper left), baked once as an explicit polygon (the
 * moves are the mockup's: head −8,−10; ears −6,−6; body −12,−7; chest and muzzle −6,−6 and −5,−6; tail −4,−7; paws −3,−4; the
 * ear insides lie the other way, +3,+4). BAND is where his head shadows his body.
 */
export const SH = {
  head: 'M240 64.5 L245.8 72 L250.4 80.1 L253.8 88.8 L255.7 96.3 L252.3 91.4 L248 88 L247.1 83.3 L244.3 74.3 L242.4 70.1 L238.2 62.6Z M257.2 98.8 L260.3 101.4 L262.7 104.5 L264.3 107.8 L265 111.1 L265 114.4 L264.2 117.6 L262.6 120.4 L261 122 L263.2 125.2 L264.6 129.7 L264.5 134.4 L262.9 138.8 L258.8 143.4 L254 146 L250.5 153.7 L245.9 161 L240.4 167.6 L234.1 173.7 L226.9 179.2 L219 184 L210.4 188.2 L201.3 191.6 L191.6 194.4 L181.4 196.4 L165.5 197.9 L149.1 197.6 L138.6 196.4 L128.4 194.4 L118.7 191.6 L109.6 188.2 L97 181.7 L89.4 176.5 L82.6 170.7 L76.7 164.4 L72.4 158.4 L77.9 163.7 L85.1 169.2 L97.2 176.2 L110.7 181.6 L125.5 185.5 L141.1 187.6 L157.5 187.9 L173.4 186.4 L183.6 184.4 L193.3 181.6 L202.4 178.2 L211 174 L218.9 169.2 L226.1 163.7 L232.4 157.6 L237.9 151 L242.5 143.7 L246 136 L249.7 134.1 L253.5 130.8 L255.9 126.6 L256.7 120.9 L255.7 116.3 L253 112 L255.2 109.5 L256.6 106.6 L257.1 102.2 L256.4 98.3Z M61.2 143.4 L57.7 139.8 L55.6 134.9 L58 136Z',
  earL: 'M71.7 85.5 L74 92 L122 60 L114.7 52.5 L116 54 L71.2 83.8Z',
  earR: 'M244 30 L247.4 35 L249.9 41.1 L251.7 48 L252.5 55.8 L252.4 64.1 L251.3 73 L249.2 82.4 L246 92 L198 60 L199.1 58.7 L240 86 L244 73.2 L245.3 67 L246.4 58.1 L246.5 49.8 L245.7 42 L243.9 35.1 L242.2 30.6Z',
  earInL: 'M110 62 L104.8 56.3 L98.5 51.3 L84 42 L83.4 42.8 L80.7 48.7 L79.6 56.7 L80.1 66.5 L82 76 L83.9 75 L82.6 63.8 L83.1 55.2 L84.4 50.5 L87 46 L100.4 54.4 L109.7 62.2Z',
  earInR: 'M210 62 L215.2 56.3 L221.5 51.3 L236 42 L236.6 42.8 L239.3 48.7 L240.4 56.7 L239.9 66.5 L238 76 L236.1 75 L237.4 63.8 L236.9 55.2 L235.6 50.5 L233 46 L219.6 54.4 L210.3 62.2Z',
  muzzle: 'M197.5 140 L201.6 145.2 L204.5 151 L206.1 157.2 L206.3 163.5 L204.9 169.8 L202 176 L198.1 179.7 L192.4 182.7 L185.5 185 L173.3 187.3 L160 188 L146.7 187.3 L134.5 185 L127.6 182.7 L121.9 179.7 L119.7 177.9 L118 176 L116.5 173.3 L122.6 176.7 L129.5 179 L137.4 180.7 L150.5 181.9 L163.9 181.7 L172.6 180.7 L180.5 179 L187.4 176.7 L193.1 173.7 L197 170 L199.1 165.9 L200.5 161.7 L201.3 157.5 L201.1 151.2 L199.5 145 L196.4 139Z',
  torso: 'M193.8 170.3 L202 174.3 L205.2 176.8 L207.7 179.6 L209.3 182.6 L210 186 L214.7 190 L220.4 197.5 L223.3 203.3 L225.4 209.7 L226.8 216.3 L227.5 223.2 L227.3 230.1 L226.3 236.9 L224.4 243.5 L221.7 249.7 L216 258 L213.7 260.2 L207.3 263.9 L203.3 265.5 L194 268.1 L177.8 270.7 L160 271.5 L142.3 270.7 L126 268.1 L116.7 265.5 L112.8 263.9 L109.3 262.1 L104.4 258.4 L114 261.1 L130.3 263.7 L142 264.4 L159.9 264.1 L176.8 262.2 L186.8 259.9 L195.3 256.9 L198.7 255.1 L204 251 L209.7 242.7 L213.5 233.3 L215.3 223.1 L215.5 216.2 L214.8 209.3 L212.4 199.4 L209.9 193.3 L204.7 185.3 L198 179 L197.3 175.6Z',
  band: 'M220.6 201.5 L209.5 204.6 L195 207 L178.1 208.5 L160 209 L141.9 208.5 L125 207 L110.5 204.6 L97.8 200.9 L103.3 192.3 L110 186 L110.6 183.4 L121.1 181.5 L133.2 180.1 L160 179 L186.8 180.1 L198.9 181.5 L209.4 183.4 L210 186 L214.7 190 L220.4 197.5 L222.2 200.9Z',
  chest: 'M130.1 252.7 L132.9 255.8 L138.1 259.8 L144.1 262.9 L150.7 265 L155.3 265.7 L162.4 265.9 L169.3 265 L175.9 262.9 L180 260.9 L185.5 257.2 L189.9 252.7 L193.3 247.5 L194.8 243.8 L195.9 238 L195.7 232.1 L194.1 226.4 L189.9 219.3 L184.4 214 L188.1 220.4 L189.7 226.1 L189.9 232 L188.8 237.8 L186.3 243.3 L182.6 248.3 L177.7 252.6 L169.9 256.9 L161 259.4 L156.4 259.9 L149.3 259.7 L140.2 257.7 L134 254.9 L129.6 252Z',
  tail: 'M244.7 189.5 L248.9 189.2 L251.9 189.9 L255 191.5 L258 194 L254.9 192.8 L251.1 193.3 L248.2 195.6 L247 198.5 L247.2 202 L250.9 209.6 L253 218.4 L252.4 227.1 L249.5 235.2 L246.3 240.1 L242 244.4 L236.9 247.9 L233.9 249.3 L227.4 251.4 L223.9 252 L216.2 252.3 L212 252 L210.9 245.2 L216.1 245.3 L223.4 244.4 L226.8 243.5 L232.9 240.9 L235.6 239.2 L240.3 235.3 L245.5 228.2 L248.4 220.1 L249.1 214.3 L247.9 205.5 L243 194.1 L243.5 190Z',
  pawL: 'M122.8 266.7 L124.8 269.2 L129.4 271.9 L135.2 273.5 L141.4 273.9 L147.1 273 L150.2 271.7 L153.3 268.7 L154 266 L153.4 264.1 L151 261.8 L150.3 264.7 L148.5 266.8 L145.7 268.4 L142.3 269.4 L138.4 269.9 L132.2 269.5 L126.4 267.9 L122.4 265.6Z',
  pawR: 'M166.2 267.4 L166.7 268.7 L168.5 270.8 L172.9 273 L178.6 273.9 L184.8 273.5 L190.6 271.9 L195.2 269.2 L197.8 265.2 L198 262 L197 260.2 L195 259 L194.2 262.7 L192.2 265.2 L187.6 267.9 L181.8 269.5 L173.7 269.7 L169.9 269Z',
};

const C = CEL;
/** The body without its front paws: fur, its shadow, solid fur marks, the band under his head, the chest, then the outline. */
export const TORSO = fill(G.torso, C.fur) + fill(SH.torso, C.furSh) +
  `<path d="M104 208 Q114 212 117 222 M216 208 Q206 212 203 222 M100 228 Q110 232 113 242 M220 228 Q210 232 207 242" fill="none" stroke="${C.furMark}" stroke-width="5" stroke-linecap="round"/>` +
  fill(SH.band, C.furSh) + `<ellipse cx="160" cy="236" rx="36" ry="30" fill="${C.chest}"/>` + fill(SH.chest, C.chestSh) + out(G.torso);
/** Each front paw (spec 2026-10-04 §4.6): cream, its shadow, the outline and two toe lines. */
const paw = (d: string, sh: string, toes: string) => fill(d, C.chest) + fill(sh, C.chestSh) + out(d, LWI * 1.15) + out(toes, LWI * 0.75);
export const PAW_L = paw(G.pawL, SH.pawL, 'M132 264 L132 270 M142 264 L142 270');
export const PAW_R = paw(G.pawR, SH.pawR, 'M178 264 L178 270 M188 264 L188 270');
/** The whole body, paws at rest (for art that draws him still). */
export const BODY = TORSO + PAW_L + PAW_R;

/** The rig's parts (spec 2026-10-04 §4.1): the same drawing, cut apart so each piece can move. */
export const TAIL = fill(G.tail, C.fur) + fill(SH.tail, C.furSh) +
  `<path d="M221 242 L226 250 M240 230 L247 236 M240 212 L249 208" fill="none" stroke="${C.furMark}" stroke-width="6" stroke-linecap="round"/>` + out(G.tail);
/** Each ear: its outer shape (behind the head) and its pink inside (over it), moved together. */
export const EAR_L = fill(G.earL, C.fur) + fill(SH.earL, C.furSh) + out(G.earL);
export const EAR_R = fill(G.earR, C.fur) + fill(SH.earR, C.furSh) + out(G.earR);
export const EAR_IN_L = fill(G.earInL, C.pink) + fill(SH.earInL, C.pinkSh);
export const EAR_IN_R = fill(G.earInR, C.pink) + fill(SH.earInR, C.pinkSh);
/** The head without ears and without blush (the rig draws the blush): fur, shadow, solid crown and stripes, one highlight at the
 *  top left, the blaze and muzzle, the outline, then the nose and whiskers. */
export const HEAD_SHAPE = fill(G.head, C.fur) + fill(SH.head, C.furSh) +
  fill('M70 92 C76 58 112 38 160 38 C208 38 244 58 250 92 C226 70 196 62 160 62 C124 62 94 70 70 92Z', C.crown) +
  fill('M128 60 C134 72 136 82 133 92 C131 82 127 72 124 62Z M192 60 C186 72 184 82 187 92 C189 82 193 72 196 62Z M108 72 C116 80 120 88 119 94 C116 88 110 82 104 76Z M212 72 C204 80 200 88 201 94 C204 88 210 82 216 76Z', C.furMark) +
  fill('M80 104 C82 78 106 54 142 46 C112 58 92 78 86 104Z', C.furHi) +
  fill(G.blaze, C.chest) + fill(G.muzzle, C.chest) + fill(SH.muzzle, C.chestSh) + out(G.head) +
  `<path d="${G.nose}" fill="${C.nose}" ${line(LWI)}/><ellipse cx="156.5" cy="145" rx="2.4" ry="1.4" fill="#fff" opacity=".9"/>` +
  `<path d="M112 160 L74 155 M112 167 L77 172 M208 160 L246 155 M208 167 L243 172" fill="none" ${line(LWI * 0.6)} opacity=".7"/>`;
