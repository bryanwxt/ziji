// His robots (his ask, 2026-10-15), to the v3 standard (rewards spec §5.1): Truffle's own mecha and car-robot, in the genre's
// feel but no show's: no V-fin, no twin eye slits, no show's colour blocks or emblems. Each changes his whole silhouette, has
// one dominant colour and holds its signature thing in a paw slot (out to his right, or low on his left, clear of his face).
import { boot, cel, celRing, celShade, feet, heldPole, hi, INK, oval, pair, poleFlag, S, s2, tint } from './costumeKit';
import type { CostumeLayer } from './costumes';

const STEEL = '#5b5f6e';
const ARMOUR = '#f4f1ea';
const CORE = '#4fe3f0';
const GLOW = '#d6fdff';

// ---------------------------------------------------------------------------------------------------------------------------
// 1. 机甲 mecha pilot suit: an orange armoured helmet round his face with cat-ear fins and glowing ear pods, a white brow
//    plate; big orange shoulder pauldrons, a white chest plate with a glowing core, two thrusters on his back with blue flames;
//    steel boots; a round energy shield on his left paw and a short beam blade in his right. (Orange, the fins and
//    the glowing core.)
const MECHA = '#ee6a12';
const M_HELM = 'M50 150 C44 120 44 92 54 70 C70 40 112 24 160 24 C208 24 250 40 266 70 C276 92 276 120 270 150 C266 168 252 184 230 194 L90 194 C68 184 54 168 50 150 Z';
/** His face through the helmet: x 72–248, y 74–196 (the eyes are 97–223, from y 95). */
const M_FACE = 'M72 112 C72 90 108 74 160 74 C212 74 248 90 248 112 L248 150 C248 178 208 196 160 196 C112 196 72 178 72 150 Z';
/** Chunky steel boots in his paws' place, an orange band round each. */
const MECHA_BOOTS = feet((f) => boot(f, STEEL) + `<path d="M${f(117)} 279 L${f(159)} 279" stroke="${MECHA}" stroke-width="3.4"/>` +
  `<path d="M${f(124)} 265 C${f(132)} 262 ${f(144)} 262 ${f(152)} 265" fill="none" stroke="#8a8fa0" stroke-width="2.4" stroke-linecap="round"/>`);
const mecha = (): CostumeLayer => ({
  // two thrusters behind his shoulders, splayed out, blue flames under them
  back: pair((f) => {
    const side = f(0) === 0 ? 1 : -1;
    return cel(`M${f(56)} 162 C${f(54)} 150 ${f(62)} 142 ${f(74)} 142 L${f(92)} 146 C${f(100)} 148 ${f(104)} 154 ${f(102)} 162 L${f(98)} 226 L${f(62)} 226 Z`, MECHA, side > 0 ? 64 : 232, 150, 0.88) +
      `<path d="M${f(60)} 176 L${f(100)} 176" stroke="${ARMOUR}" stroke-width="5"/>` +
      `<path d="M${f(64)} 226 L${f(96)} 226 L${f(100)} 240 L${f(60)} 240 Z" fill="${STEEL}" ${s2}/>` +
      `<path d="M${f(64)} 241 C${f(66)} 254 ${f(72)} 264 ${f(80)} 270 C${f(88)} 264 ${f(94)} 254 ${f(96)} 241 Z" fill="${CORE}" ${s2}/>` +
      `<path d="M${f(72)} 242 C${f(74)} 251 ${f(77)} 257 ${f(80)} 260 C${f(83)} 257 ${f(86)} 251 ${f(88)} 242 Z" fill="${GLOW}"/>`;
  }),
  body: tint(MECHA) +
    // the white chest plate and its glowing core
    cel('M128 202 L192 202 L206 222 L194 244 L126 244 L114 222 Z', ARMOUR, 132, 208, 0.9) +
    `<circle cx="160" cy="223" r="14" fill="${STEEL}" ${S}/><circle cx="160" cy="223" r="9.5" fill="${CORE}"/><circle cx="157" cy="220" r="4" fill="${GLOW}"/>` +
    pair((f) => `<path d="M${f(124)} 223 L${f(138)} 223" stroke="${CORE}" stroke-width="3" stroke-linecap="round"/>`) +
    // the steel waist with its yellow light
    `<path d="M100 246 C130 256 190 256 220 246 L219 257 C190 267 130 267 101 257 Z" fill="${STEEL}" ${S}/>` +
    `<path d="M152 251 L168 251 L168 259 L152 259 Z" fill="#ffd23f" ${s2}/>` +
    // the big shoulder pauldrons, a white stripe and a bolt on each
    pair((f) => cel(`M${f(62)} 236 C${f(56)} 210 ${f(70)} 190 ${f(96)} 188 C${f(116)} 186 ${f(130)} 196 ${f(130)} 208 L${f(114)} 212 C${f(98)} 215 ${f(84)} 222 ${f(78)} 240 Z`, MECHA, f(0) === 0 ? 70 : 226, 196, 0.88) +
      `<path d="M${f(68)} 222 C${f(72)} 206 ${f(86)} 198 ${f(104)} 197" fill="none" stroke="${ARMOUR}" stroke-width="5" stroke-linecap="round"/>` +
      `<circle cx="${f(92)}" cy="214" r="3.4" fill="${STEEL}" ${s2}/>`),
  head:
    // the helmet ring round his face, cat-ear fins on top, the white brow plate and its gem, the steel visor rim, the ear pods
    pair((f) => cel(`M${f(70)} 66 L${f(80)} 26 L${f(122)} 38 Z`, MECHA, f(0) === 0 ? 84 : 236, 40, 0.84) +
      `<path d="M${f(80)} 56 L${f(84)} 36 L${f(108)} 43 Z" fill="${STEEL}"/>`) +
    celRing(M_HELM, M_FACE, MECHA, 110, 50, 0.95) +
    `<path d="${M_FACE}" fill="none" stroke="${STEEL}" stroke-width="5"/><path d="${M_FACE}" fill="none" ${s2}/>` +
    cel('M118 70 C140 64 180 64 202 70 L190 46 C172 42 148 42 130 46 Z', ARMOUR, 136, 50, 0.86) +
    `<path d="M152 58 L160 50 L168 58 L160 66 Z" fill="${CORE}" ${s2}/><circle cx="158" cy="56" r="1.8" fill="${GLOW}"/>` +
    pair((f) => `<circle cx="${f(48)}" cy="126" r="13" fill="${STEEL}" ${S}/><circle cx="${f(48)}" cy="126" r="7" fill="${CORE}"/><circle cx="${f(46)}" cy="124" r="2.6" fill="${GLOW}"/>` +
      `<path d="M${f(58)} 162 L${f(66)} 160 M${f(61)} 172 L${f(69)} 169 M${f(66)} 181 L${f(74)} 177" stroke="${celShade(MECHA)}" stroke-width="3.4" stroke-linecap="round"/>`) +
    hi('M66 86 C76 62 100 44 128 36', 6, 0.45),
  // the round energy shield on his left paw: an orange rim, a white face and the glowing core
  pawL: cel(oval(98, 238, 27, 27), MECHA, 86, 226, 0.9) +
    `<circle cx="98" cy="238" r="19" fill="${ARMOUR}" ${s2}/><path d="M98 226 L108 238 L98 250 L88 238 Z" fill="${CORE}" ${s2}/><circle cx="96" cy="235" r="2.4" fill="${GLOW}"/>` +
    hi('M78 230 C80 222 86 216 94 214', 3, 0.6) + MECHA_BOOTS.feetL,
  // a short beam blade out to his right: the steel hilt in his paw, the glowing blade
  pawR: heldPole(186, 262, -40, 8, 22, STEEL, 9) +
    `<g transform="translate(186 262) rotate(-40)">` +
    `<path d="M24 0 L76 0" stroke="${INK}" stroke-width="15" stroke-linecap="round"/><path d="M24 0 L76 0" stroke="${CORE}" stroke-width="11.4" stroke-linecap="round"/>` +
    `<path d="M26 -1 L74 -1" stroke="${GLOW}" stroke-width="4.4" stroke-linecap="round"/><path d="M18 -9 L18 9" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M18 -8 L18 8" stroke="#ffd23f" stroke-width="4.4" stroke-linecap="round"/></g>` +
    MECHA_BOOTS.feetR,
  ...MECHA_BOOTS,
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 2. 变形机器人 car-robot: a red sports car turned robot. Its bonnet is his helmet, with two headlights for brows and a white
//    race-number roundel; its windscreen is his chest, its wheels are on his shoulders, its spoiler stands behind him; white
//    racing stripes, red boots; a chequered flag in his right paw. (Red, the wheels and the windscreen; told apart from the old
//    grey box 机器人 by all of it.)
const CAR = '#e0283a';
const SILVER = '#c9ccd6';
const TYRE = '#2d2a33';
const GLASS = '#9fd8ff';
const LAMP = '#fff2b0';
/** The bonnet helmet: over his head and down both sides of his face as cheek guards, his face open below the headlights. */
const C_HELM = 'M44 172 L44 84 C44 48 92 26 160 26 C228 26 276 48 276 84 L276 172 C276 180 270 184 262 184 L254 184 C248 184 244 180 244 172 L244 108 C226 92 196 84 160 84 C124 84 94 92 76 108 L76 172 C76 180 72 184 66 184 L58 184 C50 184 44 180 44 172 Z';
const wheel = (x: number, y: number, r: number) =>
  cel(oval(x, y, r, r), TYRE, x - r * 0.4, y - r * 0.4, 0.9, '#18161c') +
  `<circle cx="${x}" cy="${y}" r="${r * 0.52}" fill="${SILVER}" ${s2}/>` +
  [0, 72, 144, 216, 288].map((a) => `<circle cx="${(x + r * 0.3 * Math.cos((a * Math.PI) / 180)).toFixed(1)}" cy="${(y + r * 0.3 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" r="1.6" fill="${STEEL}"/>`).join('') +
  `<circle cx="${x}" cy="${y}" r="${r * 0.14}" fill="${CAR}"/>`;
/** Red boots with black soles in his paws' place. */
const CAR_BOOTS = feet((f) => boot(f, CAR) + `<path d="M${f(117)} 282 L${f(159)} 282" stroke="${TYRE}" stroke-width="5"/>` +
  `<path d="M${f(124)} 265 C${f(132)} 262 ${f(144)} 262 ${f(152)} 265" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2.4" stroke-linecap="round"/>`);
const carbot = (): CostumeLayer => ({
  // the spoiler standing behind his shoulders: its wing and the two end plates
  back: cel('M36 168 C80 160 240 160 284 168 L282 182 C240 176 80 176 38 182 Z', CAR, 60, 166, 0.92) +
    pair((f) => cel(`M${f(34)} 150 L${f(48)} 156 L${f(48)} 190 L${f(34)} 186 Z`, CAR, f(0) === 0 ? 36 : 282, 156, 0.86)),
  body: tint(CAR) +
    // white racing stripes down his front, under the windscreen
    pair((f) => `<path d="M${f(150)} 232 L${f(150)} 272" stroke="#fffdf7" stroke-width="6"/>`) +
    // the windscreen chest: a silver frame, the glass, its glints
    `<path d="M122 196 L198 196 L212 236 L108 236 Z" fill="${SILVER}" ${S}/>` +
    cel('M129 202 L191 202 L202 230 L118 230 Z', GLASS, 132, 206, 0.9) +
    `<path d="M140 206 L128 226 M156 206 L146 222" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>` +
    // the front bumper and its grille at his waist
    `<path d="M104 244 C130 252 190 252 216 244 L215 254 C190 262 130 262 105 254 Z" fill="${SILVER}" ${S}/>` +
    [136, 148, 160, 172, 184].map((x) => `<path d="M${x} 250 L${x} 256" stroke="${STEEL}" stroke-width="2.4" stroke-linecap="round"/>`).join('') +
    // the wheels on his shoulders, each under a red wheel arch
    pair((f) => cel(`M${f(72)} 214 C${f(70)} 192 ${f(84)} 178 ${f(104)} 178 C${f(118)} 178 ${f(128)} 186 ${f(130)} 196 L${f(122)} 214 Z`, CAR, f(0) === 0 ? 80 : 226, 184, 0.9) + wheel(f(100), 210, 19)),
  head:
    // the bonnet helmet, its centre crease, the headlights at its brow, the race-number roundel
    cel(C_HELM, CAR, 100, 44, 0.94) +
    pair((f) => `<path d="M${f(146)} 30 C${f(140)} 50 ${f(138)} 66 ${f(140)} 84" fill="none" stroke="#fffdf7" stroke-width="5" stroke-linecap="round"/>`) +
    pair((f) => `<g transform="translate(${f(102)} 84) rotate(${f(0) === 0 ? -16 : 16})">` +
      `<path d="${oval(0, 0, 19, 10)}" fill="${SILVER}" ${s2}/>` + cel(oval(0, 0, 14, 6.6), LAMP, -4, -2, 0.86, '#e6c76a') +
      `<path d="M-8 -2 C-5 -4 -1 -5 3 -5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></g>`) +
    `<circle cx="160" cy="54" r="15" fill="#fffdf7" ${S}/>` +
    `<text x="160" y="55" font-family="Nunito, sans-serif" font-weight="900" font-size="20" text-anchor="middle" dominant-baseline="middle" fill="${CAR}">1</text>` +
    pair((f) => `<path d="M${f(52)} 132 L${f(68)} 132 M${f(52)} 146 L${f(68)} 146 M${f(52)} 160 L${f(68)} 160" stroke="${TYRE}" stroke-width="3.6" stroke-linecap="round"/>`) +
    hi('M62 74 C76 50 102 36 132 32', 6, 0.45),
  // a chequered flag on a short pole, flying out to his right
  pawR: poleFlag(186, 262, -40, 84, 26, 36, SILVER, (x0, x1) => {
    const out: string[] = [`<path d="M${x1} 0 L${x1} 36 L${x0} 36 L${x0} 0 Z" fill="#fffdf7"/>`];
    const [cw, ch] = [(x1 - x0) / 4, 36 / 5];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) if ((i + j) % 2) out.push(`<path d="M${(x0 + i * cw).toFixed(1)} ${(j * ch).toFixed(1)} L${(x0 + (i + 1) * cw).toFixed(1)} ${(j * ch).toFixed(1)} L${(x0 + (i + 1) * cw).toFixed(1)} ${((j + 1) * ch).toFixed(1)} L${(x0 + i * cw).toFixed(1)} ${((j + 1) * ch).toFixed(1)} Z" fill="${TYRE}"/>`);
    return out.join('');
  }) + CAR_BOOTS.feetR,
  ...CAR_BOOTS,
  hidesEars: true,
});

export const ROBOT_COSTUMES: Record<string, () => CostumeLayer> = { mecha, carbot };
