// Jobs, drawn full-body (rewards spec 2026-10-15 §5.2) to the v3 standard: each a whole outfit with headgear across his head and
// the thing a child knows the job by, held in a paw. firefighter and hawker are the parent-approved samples.
//
// Held props sit out to his right (or low on his left) so they clear his face in every paw move: the wave turns his right paw
// up and 20° toward his face, so anything held in it must stay right of x ≈ 230 once turned (the WebKit face probe checks it).
import { boot, cel, celShade, CREAM_PAW, feet, gloveL, gloveR, heldPole, hi, INK, num, oval, pair, PAW_L_D, PAW_R_D, pawOverL, pawOverR, poleFlag, rope, S, s2, star, tint } from './costumeKit';
import type { CostumeLayer } from './costumes';

const r1 = (n: number) => Math.round(n * 10) / 10;
const GOLD = '#f2c230';

// ---------------------------------------------------------------------------------------------------------------------------
// 1. 宇航员 astronaut: a white space helmet round his whole head with a clear visor over his face, a radio antenna and side
//    pods; a white space suit with mission patches and a chest control box; the life-support pack behind; grey moon boots.
//    (Told apart by the helmet ring.)
const SUIT = '#f2f4f8';
const SUIT_GREY = '#d9dde6';
const HELM = oval(160, 113, 116, 87); // x 44–276, y 26–200
const VISOR_HOLE = oval(160, 124, 100, 70, true); // his face, x 60–260, y 54–194
/** The helmet ring lit: its outline shrunk toward the upper left (a rim of shadow left on the lower right), the visor cut out. */
const HELM_LIT = oval(r1(84 + 0.95 * (160 - 84)), r1(52 + 0.95 * (113 - 52)), r1(116 * 0.95), r1(87 * 0.95));
const astronaut = (): CostumeLayer => ({
  // the life-support pack on his back, showing past his shoulders
  back: cel('M84 172 C76 172 70 178 70 186 L70 246 C70 254 76 258 84 258 L236 258 C244 258 250 254 250 246 L250 186 C250 178 244 172 236 172 Z', SUIT_GREY, 90, 180, 0.94) +
    pair((f) => `<path d="M${f(76)} 196 L${f(76)} 234" stroke="${celShade(SUIT_GREY)}" stroke-width="3" stroke-linecap="round"/>`),
  body: tint(SUIT) +
    // the helmet's neck ring
    `<path d="M100 194 C130 206 190 206 220 194 L222 206 C190 220 130 220 98 206 Z" fill="#3f6fd6" ${S}/>` +
    // the chest control box with its three lights and a dial
    cel('M134 218 L186 218 C190 218 192 220 192 224 L192 246 C192 250 190 252 186 252 L134 252 C130 252 128 250 128 246 L128 224 C128 220 130 218 134 218 Z', SUIT_GREY, 136, 222, 0.92) +
    `<circle cx="142" cy="230" r="4.4" fill="#ff5532" ${s2}/><circle cx="156" cy="230" r="4.4" fill="#ffc94a" ${s2}/><circle cx="170" cy="230" r="4.4" fill="#7fdc7a" ${s2}/>` +
    `<path d="M138 243 L182 243" stroke="#8a93a6" stroke-width="3" stroke-linecap="round"/><circle cx="182" cy="230" r="3" fill="#3f6fd6"/>` +
    // the mission patches: blue on his left shoulder, orange on his right
    `<circle cx="108" cy="222" r="10" fill="#3f6fd6" ${s2}/><path d="${star(108, 222, 6)}" fill="#fffdf7"/>` +
    `<path d="M204 214 L222 214 L222 230 L204 230 Z" fill="#ff8a3d" ${s2}/><path d="M207 222 L219 222" stroke="#fffdf7" stroke-width="2.4"/>`,
  head:
    // the helmet: its ring (shadow, lit, line), the side pods, a blue stripe over the top, then the clear visor
    `<path d="${HELM} ${VISOR_HOLE}" fill="${celShade(SUIT)}"/>` +
    `<path d="${HELM_LIT} ${VISOR_HOLE}" fill="${SUIT}"/>` +
    `<path d="${HELM} ${VISOR_HOLE}" fill="none" ${S}/>` +
    `<path d="M92 50 C126 34 194 34 228 50" fill="none" stroke="#3f6fd6" stroke-width="5" stroke-linecap="round"/>` +
    pair((f) => cel(`M${f(50)} 100 C${f(40)} 100 ${f(36)} 106 ${f(36)} 114 L${f(36)} 132 C${f(36)} 140 ${f(40)} 144 ${f(50)} 144 Z`, SUIT_GREY, f(40), 104, 0.9) +
      `<circle cx="${f(43)}" cy="122" r="3" fill="${f(0) === 0 ? '#ff5532' : '#7fdc7a'}"/>`) +
    `<path d="M232 50 L248 31" ${S}/><circle cx="249" cy="29" r="5" fill="#ff5532" ${s2}/>` +
    `<path d="${oval(160, 124, 100, 70)}" fill="#bfe0ff" fill-opacity=".2" ${S}/>` +
    hi('M80 96 C88 78 104 66 124 60', 6, 0.7) + hi('M136 57 L146 56', 5, 0.6) +
    hi('M70 52 C82 40 98 33 116 30', 5, 0.6),
  // the moon boots in his paws' place: grey, a thick sole and a blue band
  ...feet((f) => boot(f, SUIT_GREY) + `<path d="M${f(117)} 279 L${f(159)} 279" stroke="${celShade(SUIT_GREY)}" stroke-width="2.6"/>` +
    `<path d="M${f(119)} 266 C${f(130)} 262 ${f(146)} 262 ${f(157)} 266" fill="none" stroke="#3f6fd6" stroke-width="3.4" stroke-linecap="round"/>`),
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 2. 厨师 chef: a tall puffed white toque on a band right across his head, a white double-breasted jacket with a red
//    neckerchief; a black frying pan with a fried egg in his right paw and a wooden ladle in his left. (The toque and the pan.)
const CHEF = '#fffdf7';
const PAN = '#3d3845';
const WOOD = '#c98f55';
const chef = (): CostumeLayer => ({
  back: '',
  body: tint(CHEF) +
    // the jacket's double-breasted front: the overlap, two rows of three buttons
    `<path d="M174 200 C180 222 180 248 176 270" fill="none" ${s2}/>` +
    [212, 232, 252].map((y) => `<circle cx="150" cy="${y}" r="3.6" fill="#d9d4cc" ${s2}/><circle cx="190" cy="${y}" r="3.6" fill="#d9d4cc" ${s2}/>`).join('') +
    // the cuffs' seams, a breast pocket
    pair((f) => `<path d="M${f(98)} 226 C${f(104)} 230 ${f(110)} 232 ${f(116)} 232" fill="none" stroke="${celShade(CHEF)}" stroke-width="2.4" stroke-linecap="round"/>`) +
    `<path d="M120 214 L136 214" stroke="${celShade(CHEF)}" stroke-width="2.4" stroke-linecap="round"/>` +
    // the red neckerchief: a band round his neck and its knot, the ends hanging
    `<path d="M108 192 C130 206 190 206 212 192 L214 202 C190 218 130 218 106 202 Z" fill="#d8302a" ${S}/>` +
    `<path d="M150 206 L144 228 L156 224 L160 210 Z M170 206 L176 228 L164 224 L160 210 Z" fill="#d8302a" ${s2}/>` +
    `<circle cx="160" cy="209" r="6" fill="#b8241f" ${s2}/>`,
  head:
    // the puffs of the toque (they cover his crown, as a hat may), their pleats, then the band right across his head
    cel('M66 92 C46 82 44 52 70 46 C72 26 104 22 118 34 C128 22 148 22 160 30 C172 22 192 22 202 34 C216 22 248 26 250 46 C276 52 274 82 254 92 C220 78 100 78 66 92 Z', CHEF, 96, 40, 0.92) +
    `<path d="M112 80 C108 66 110 52 118 40 M160 78 L160 36 M208 80 C212 66 210 52 202 40" fill="none" stroke="${celShade(CHEF)}" stroke-width="2.4" stroke-linecap="round"/>` +
    hi('M66 66 C66 56 72 50 82 48', 5, 0.9) + hi('M124 34 C132 28 142 27 150 30', 4, 0.9) +
    cel('M54 98 C90 66 230 66 266 98 L264 112 C228 80 92 80 56 112 Z', CHEF, 80, 82, 0.94) +
    [86, 112, 138, 160, 182, 208, 234].map((x) => { const y = 79 + 0.0023 * (x - 160) ** 2; return `<path d="M${x} ${r1(y)} L${x} ${r1(y + 9)}" stroke="#d9d4cc" stroke-width="2"/>`; }).join(''),
  // the frying pan out to his right, a fried egg in it, its handle in his paw
  pawR: heldPole(184, 264, -24, 8, 52, '#8a5a3c', 8) +
    cel(oval(250, 232, 30, 21), PAN, 230, 218, 0.9) +
    `<path d="${oval(250, 230, 23, 15)}" fill="#26232b"/>` +
    `<path d="M236 228 C232 218 244 214 250 220 C256 214 268 220 264 230 C264 240 250 242 244 238 C236 240 232 234 236 228 Z" fill="#fffdf7" ${s2}/>` +
    `<circle cx="250" cy="229" r="6" fill="#ffc22e" ${s2}/><circle cx="248" cy="227" r="1.8" fill="#fff"/>` +
    hi('M226 226 C230 218 238 214 246 213', 3, 0.35) + pawOverR,
  // the wooden ladle out to his left, its bowl down
  pawL: heldPole(138, 264, -152, 10, 58, WOOD, 6) +
    cel('M76 226 C74 238 80 248 90 248 C100 248 106 240 104 230 C96 232 84 230 76 226 Z', WOOD, 82, 230, 0.86) +
    pawOverL,
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 3. 消防员 firefighter: a red helmet with a wide brim and a gold front shield, a red coat with yellow bands, and a hose
//    spraying water from his right paw (it rises with the paw). The parent-approved sample, verbatim.
const FIRE = '#d8302a';
const FIRE_GOLD = '#f2c230';
const BAND_Y = '#ffd23f';
const bandAt = (y: number, w = 13) =>
  `<path d="M90 ${y} C130 ${y + 8} 190 ${y + 8} 230 ${y} L231 ${y + w} C190 ${y + w + 8} 130 ${y + w + 8} 89 ${y + w} Z" fill="${BAND_Y}" ${S}/>` +
  `<path d="M92 ${y + w / 2} C130 ${y + w / 2 + 8} 190 ${y + w / 2 + 8} 228 ${y + w / 2}" fill="none" stroke="#e9eef5" stroke-width="3"/>`;
const firefighter = (): CostumeLayer => ({
  back: '',
  body: tint(FIRE) + bandAt(220) + bandAt(246, 12) +
    // a tall collar and the coat's front clasps
    pair((f) => `<path d="M${f(116)} 186 L${f(148)} 198 L${f(146)} 212 L${f(110)} 200 Z" fill="${FIRE}" ${S}/>`) +
    `<path d="M160 204 L160 270" stroke="${INK}" stroke-width="1.8"/>` + [212, 240, 264].map((y) => `<rect x="153" y="${y - 3}" width="14" height="6" rx="2" fill="#2d2a33"/>`).join(''),
  head:
    // the dome, then the wide brim sweeping down at the sides, then the gold shield standing on the front
    cel('M60 98 C56 50 104 22 160 22 C216 22 264 50 260 98 Z', FIRE, 120, 40, 0.9) +
    `<path d="M160 26 L160 50" stroke="${celShade(FIRE)}" stroke-width="6" stroke-linecap="round"/>` +
    hi('M86 70 C94 50 112 38 134 33', 6, 0.45) +
    cel('M34 112 C28 92 56 80 80 84 C112 74 208 74 240 84 C264 80 292 92 286 112 C280 124 266 122 258 108 C250 100 240 96 232 94 C204 88 116 88 88 94 C80 96 70 100 62 108 C54 122 40 124 34 112 Z', FIRE, 100, 82, 0.92) +
    cel('M136 88 L134 50 C134 36 146 28 160 28 C174 28 186 36 186 50 L184 88 C176 84 144 84 136 88 Z', FIRE_GOLD, 148, 40, 0.88) +
    `<path d="M142 82 L141 52 C141 42 150 36 160 36 C170 36 179 42 179 52 L178 82" fill="none" stroke="#c8962a" stroke-width="1.8"/>` +
    `<circle cx="160" cy="60" r="12" fill="${FIRE}" ${s2}/><path d="M160 51 C166 57 166 63 160 69 C154 63 154 57 160 51 Z" fill="${FIRE_GOLD}"/>`,
  // a short hose: from a coil at his feet, up into a red-and-brass nozzle, and a fan of water sprays from it. It rides his paw,
  // so it stays short and close (a long hose swung far below him when he cheered)
  pawR: rope('M186 270 C190 282 206 284 222 278 C240 272 248 256 236 250 C224 244 212 256 220 268 C226 278 246 280 262 274', '#e8c05a', 9) +
    `<g transform="translate(262 274) rotate(-20)"><path d="M-2 -7 L10 -7 L10 7 L-2 7 Z" fill="#d9a83a" ${s2}/><path d="M4 -7 L4 7" stroke="#b08530" stroke-width="1.6"/></g>` +
    `<g transform="translate(186 260) rotate(-24) scale(.82)">` +
    `<path d="M48 -6 L132 -34 Q144 0 132 34 L48 6 Z" fill="#bfe6ff" fill-opacity=".85" stroke="#7fc0ea" stroke-width="2" stroke-linejoin="round"/>` +
    `<path d="M50 0 L136 0 M52 -3 L130 -20 M52 3 L130 20" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>` +
    [[146, -20, 5], [150, 6, 6], [142, 30, 4.5], [160, -6, 4], [124, -42, 4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#bfe6ff" stroke="#7fc0ea" stroke-width="1.6"/>`).join('') +
    `<path d="M-6 -10 L30 -8 L30 8 L-6 10 Z" fill="${FIRE}" ${S}/><path d="M30 -8 L48 -6 L48 6 L30 8 Z" fill="#d9a83a" ${S}/><path d="M12 9 L8 24 L18 24 L22 9" fill="#2d2a33" ${s2}/>` +
    `</g>` + gloveR('#3f3b47'),
  pawL: gloveL('#3f3b47'),
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 4. 医生 doctor (the plan's worked example): teal scrubs under an open white coat, a stethoscope round his neck, a white band
//    right across his head with the round head mirror on its front, blue gloves, and the doctor's bag with its red cross in his
//    left paw.
const SCRUB = '#49b8a8';
const COAT = '#fbfdff';
const doctor = (): CostumeLayer => ({
  back: '',
  body: tint(SCRUB) +
    pair((f) => cel(`M${f(112)} 188 C${f(94)} 206 ${f(88)} 240 ${f(102)} 266 L${f(146)} 270 L${f(146)} 214 L${f(134)} 192 Z`, COAT, Math.min(f(112), f(146)) + 10, 200, 0.92)) +
    pair((f) => `<path d="M${f(134)} 192 L${f(148)} 212 L${f(146)} 226" fill="none" ${s2}/>`) +
    `<path d="M128 194 C126 222 142 238 160 238 C178 238 194 222 192 194" fill="none" stroke="${INK}" stroke-width="7.6" stroke-linecap="round"/>` +
    `<path d="M128 194 C126 222 142 238 160 238 C178 238 194 222 192 194" fill="none" stroke="#3d3845" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M160 238 L160 248" stroke="#3d3845" stroke-width="4" stroke-linecap="round"/>` +
    `<circle cx="160" cy="255" r="8" fill="#d9dde6" ${S}/><circle cx="157.5" cy="252.5" r="2.4" fill="#fff"/>`,
  head:
    `<path d="M54 98 C94 60 226 60 266 98 L264 112 C226 74 94 74 56 112 Z" fill="${COAT}" ${S}/>` +
    `<path d="M62 102 C100 68 220 68 258 102" fill="none" stroke="${celShade(COAT)}" stroke-width="2"/>` +
    cel('M140 76 C140 56 180 56 180 76 C180 96 140 96 140 76 Z', '#d9dde6', 150, 64, 0.86) +
    `<circle cx="160" cy="76" r="5" fill="#3d3845"/>` + hi('M146 70 C149 64 154 62 160 61', 3, 0.7),
  pawL: cel('M70 244 L122 244 L126 276 L66 276 Z', '#8a5a3c', 78, 250, 0.9) +
    `<path d="M84 244 C84 230 108 230 108 244" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M84 244 C84 230 108 230 108 244" fill="none" stroke="#6a452b" stroke-width="3.6" stroke-linecap="round"/>` +
    `<path d="M92 251 L100 251 L100 256 L105 256 L105 264 L100 264 L100 269 L92 269 L92 264 L87 264 L87 256 L92 256 Z" fill="#fff" stroke="#d8302a" stroke-width="2" stroke-linejoin="round"/>` +
    gloveL('#bfe6ff'),
  pawR: gloveR('#bfe6ff'),
  hidesEars: false,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 5. 飞行员 pilot: a brown leather flying cap over his head with ear flaps down his cheeks and amber goggles pushed up on his
//    forehead; a leather jacket with a fleece collar and a gold wings badge; a white scarf flying out behind; a toy plane in
//    his right paw. (The goggles and the scarf.)
const LEATHER = '#9a6338';
const FLEECE = '#fff4dc';
const pilot = (): CostumeLayer => ({
  // the long white scarf, flying out to his right
  back: rope('M196 200 C222 198 236 182 256 184 C270 186 276 176 284 166', '#fffdf7', 10) +
    `<path d="M274 172 L286 160 M278 178 L288 170" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`,
  body: tint(LEATHER) +
    // the jacket's zip and pockets, the gold wings badge
    `<path d="M160 214 L160 270" stroke="${celShade(LEATHER)}" stroke-width="3"/>` +
    pair((f) => `<path d="M${f(118)} 244 L${f(140)} 244" stroke="${celShade(LEATHER)}" stroke-width="3" stroke-linecap="round"/>`) +
    `<path d="M114 222 C120 216 126 216 130 220 C134 216 140 216 146 222 C140 222 134 224 130 228 C126 224 120 222 114 222 Z" fill="${GOLD}" ${s2}/>` +
    // the fleece collar folded open, the scarf knotted at his throat
    pair((f) => cel(`M${f(108)} 190 C${f(116)} 206 ${f(132)} 216 ${f(152)} 214 L${f(144)} 196 C${f(132)} 198 ${f(118)} 196 ${f(108)} 190 Z`, FLEECE, Math.min(f(108), f(152)) + 6, 196, 0.9)) +
    `<path d="M146 200 C152 210 168 210 174 200 L170 218 C164 222 156 222 150 218 Z" fill="#fffdf7" ${S}/>`,
  head:
    // the ear flaps down over his cheek tufts, the leather cap over his head, its seam, then the goggles pushed up
    pair((f) => cel(`M${f(58)} 96 C${f(48)} 118 ${f(48)} 146 ${f(58)} 164 C${f(66)} 174 ${f(80)} 172 ${f(88)} 162 C${f(84)} 140 ${f(84)} 116 ${f(90)} 96 Z`, LEATHER, f(0) === 0 ? 60 : 240, 104, 0.9) +
      `<path d="M${f(70)} 168 L${f(74)} 188" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M${f(70)} 168 L${f(74)} 188" stroke="#6a452b" stroke-width="3" stroke-linecap="round"/>`) +
    cel('M52 108 C44 56 98 26 160 26 C222 26 276 56 268 108 C250 96 232 90 214 88 C180 84 140 84 106 88 C88 90 70 96 52 108 Z', LEATHER, 104, 42, 0.92) +
    `<path d="M160 30 L160 84" stroke="${celShade(LEATHER)}" stroke-width="2.4"/>` + hi('M80 66 C90 48 110 36 132 32', 6, 0.35) +
    `<path d="M54 82 C96 60 224 60 266 82" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M54 82 C96 60 224 60 266 82" fill="none" stroke="#4a3426" stroke-width="6" stroke-linecap="round"/>` +
    pair((f) => `<circle cx="${f(130)}" cy="68" r="17" fill="#c9ccd6" ${S}/><circle cx="${f(130)}" cy="68" r="11.5" fill="#ffd27a" ${s2}/>` +
      `<path d="M${f(124)} 62 C${f(126)} 59 ${f(129)} 58 ${f(132)} 58" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`) +
    `<path d="M147 68 L173 68" stroke="#c9ccd6" stroke-width="6"/><path d="M147 68 L173 68" fill="none" ${s2}/>`,
  // the toy plane, flying out of his paw: tail in his paw, nose up and out to his right
  pawR: `<g transform="translate(196 252) rotate(-19) scale(1.12)">` +
    `<path d="M2 -4 L8 -20 L18 -20 L22 -4 Z" fill="#d8302a" ${s2}/><ellipse cx="10" cy="2" rx="9" ry="3" fill="${FLEECE}" ${s2}/>` +
    cel('M0 -4 C20 -11 52 -12 70 -8 C80 -6 82 4 70 7 C52 10 20 8 0 4 Z', '#d8302a', 20, -6, 0.9) +
    `<path d="M12 0 L66 0" stroke="#fffdf7" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M44 -9 C46 -18 58 -18 60 -9 Z" fill="#bfe6ff" ${s2}/>` +
    `<path d="M30 3 L54 3 L46 20 L34 20 Z" fill="${FLEECE}" ${s2}/>` +
    `<path d="M82 -14 L82 14" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/><circle cx="80" cy="0" r="3.6" fill="#c9ccd6" ${s2}/>` +
    `</g>` + pawOverR,
  pawL: '',
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 6. 警察 police officer: a peaked cap (dark-blue crown, a black peak, the checked band edge to edge and a gold badge), a
//    dark-blue uniform with a chest badge, a belt and a whistle on its cord; a round red 停 sign in his right paw.
//    (Told apart by the checked band and the sign.)
const POLICE = '#2a3f7a';
/** The cap's band: its top follows his head (y 68 at the middle), 20 tall, two rows of checks, dark blue and white. */
const bandTop = (x: number) => 68 + 12 * ((x - 160) / 104) ** 2;
const CHECKS = (() => {
  const xs = [...Array(13)].map((_, i) => 56 + i * 17.33);
  let out = '';
  for (let i = 0; i < 12; i++) {
    for (const row of [0, 1]) {
      const [a, b] = [xs[i]!, xs[i + 1]!];
      const ya = bandTop(a) + row * 10;
      const yb = bandTop(b) + row * 10;
      if ((i + row) % 2 === 0) out += `<path d="M${r1(a)} ${r1(ya)} L${r1(b)} ${r1(yb)} L${r1(b)} ${r1(yb + 10)} L${r1(a)} ${r1(ya + 10)} Z" fill="${POLICE}"/>`;
    }
  }
  return out;
})();
const BAND = `M56 ${r1(bandTop(56))} C100 60 220 60 264 ${r1(bandTop(264))} L264 ${r1(bandTop(264) + 20)} C220 80 100 80 56 ${r1(bandTop(56) + 20)} Z`;
const police = (): CostumeLayer => ({
  back: '',
  body: tint(POLICE) +
    // the shirt's collar, its buttons, the gold chest badge, the shoulder straps
    pair((f) => `<path d="M${f(118)} 192 L${f(150)} 204 L${f(142)} 218 Z" fill="#3a5294" ${s2}/>`) +
    [214, 232].map((y) => `<circle cx="160" cy="${y}" r="3.2" fill="${GOLD}" ${s2}/>`).join('') +
    cel('M118 208 L134 204 L150 208 L148 222 C146 229 140 233 134 235 C128 233 122 229 120 222 Z', GOLD, 124, 210, 0.86) +
    `<path d="${star(134, 219, 6)}" fill="#c8962a"/>` +
    pair((f) => `<path d="M${f(100)} 200 L${f(124)} 194" stroke="${celShade(POLICE)}" stroke-width="5" stroke-linecap="round"/>`) +
    // the whistle on its white cord, from his shoulder
    `<path d="M196 196 C200 210 200 222 196 232" fill="none" stroke="#fffdf7" stroke-width="2.6"/>` +
    `<path d="M190 232 L206 232 L208 240 L190 240 Z" fill="#c9ccd6" ${s2}/>` +
    // the black belt and its buckle, at his waist: low down by his paws its ends read as two more shoes
    `<path d="M93 238 C128 248 192 248 227 238 L227 249 C192 259 128 259 93 249 Z" fill="#26232b" ${S}/>` +
    `<path d="M152 243 L168 243 L168 255 L152 255 Z" fill="${GOLD}" ${s2}/>`,
  head:
    // the crown, wider than his head as a peaked cap's is, then the checked band right across, the peak, the gold badge
    cel('M48 72 C42 50 92 26 160 26 C228 26 278 50 272 72 C266 82 250 84 238 82 L82 82 C70 84 54 82 48 72 Z', POLICE, 96, 38, 0.92) +
    hi('M74 56 C92 42 118 34 144 32', 5, 0.3) +
    `<path d="${BAND}" fill="#fffdf7"/>` + CHECKS + `<path d="${BAND}" fill="none" ${S}/>` +
    cel('M94 92 C130 84 190 84 226 92 C214 104 106 104 94 92 Z', '#26232b', 120, 88, 0.9, '#141218') +
    hi('M110 92 C140 88 180 88 210 92', 2, 0.4) +
    cel('M152 36 L168 36 L172 46 C170 56 164 62 160 64 C156 62 150 56 148 46 Z', GOLD, 154, 40, 0.86) +
    `<circle cx="160" cy="48" r="3.6" fill="#d8302a"/>`,
  // the round red sign on its short pole, out to his right, 停 in white
  pawR: heldPole(184, 264, -27, 8, 64, '#c9ccd6', 6) +
    cel(oval(258, 226, 21, 21), '#d8302a', 246, 214, 0.9) +
    `<circle cx="258" cy="226" r="16.5" fill="none" stroke="#fffdf7" stroke-width="2.2"/>` +
    `<text x="258" y="227" font-family="WenKai, serif" font-size="21" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="#fffdf7">停</text>` +
    pawOverR,
  pawL: gloveL('#fffdf7'),
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 7. 足球员 footballer: a green sweatband right across his forehead (his crown and ears show), a yellow jersey with a green
//    collar and number 7, green shorts, black boots on his feet; the football under his left paw. (Yellow, and the ball.)
const JERSEY = '#ffcc2e';
const PITCH = '#2fae5a';
/** His football boots, in his paws' place: black, a white stripe, studs. */
const FOOTBALL_BOOTS = feet((f) => boot(f, '#2d2a33', '#18161c') + `<path d="M${f(118)} 279 L${f(158)} 279" stroke="#fffdf7" stroke-width="2.4"/>` +
  [124, 136, 148].map((x) => `<path d="M${f(x)} 286 L${f(x)} 289" stroke="#2d2a33" stroke-width="3" stroke-linecap="round"/>`).join(''));
const football = (): CostumeLayer => ({
  back: '',
  body: tint(JERSEY) +
    // short sleeves standing out at his shoulders, green-cuffed; the green V collar; the number
    pair((f) => cel(`M${f(116)} 190 C${f(98)} 192 ${f(84)} 204 ${f(76)} 222 L${f(100)} 234 C${f(104)} 220 ${f(110)} 210 ${f(124)} 202 Z`, JERSEY, f(0) === 0 ? 92 : 214, 204, 0.9) +
      rope(`M${f(78)} 224 L${f(99)} 233`, PITCH, 6)) +
    `<path d="M136 192 L160 212 L184 192" fill="none" stroke="${INK}" stroke-width="9.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M136 192 L160 212 L184 192" fill="none" stroke="${PITCH}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` +
    num('7', 160, 234, PITCH) + hi('M110 206 C104 214 102 222 102 230', 3, 0.4) +
    // green shorts round his middle, down to the suit's own bottom edge (no legs out at the sides: they read as two more feet)
    cel('M98 246 C128 256 192 256 222 246 C221 251 219 255 216 258 C200 276 120 276 104 258 C101 255 99 251 98 246 Z', PITCH, 110, 252, 0.9) +
    `<path d="M160 256 L160 272" stroke="${celShade(PITCH)}" stroke-width="2.4"/>`,
  head:
    // the sweatband: right across his forehead, the white stripe along it; it never grows over his crown
    `<path d="M54 92 C92 56 228 56 266 92 L266 108 C228 72 92 72 54 108 Z" fill="${PITCH}" ${S}/>` +
    `<path d="M58 98 C96 64 224 64 262 98" fill="none" stroke="#fffdf7" stroke-width="3"/>` +
    hi('M74 82 C92 70 108 64 124 62', 2.4, 0.5),
  // the football under his left paw: white with black patches
  pawL: `<g transform="translate(106 254) scale(1.12) translate(-112 -254)">` +
    cel(oval(112, 254, 19, 19), '#fffdf7', 104, 244, 0.9, '#d9d4cc') +
    `<path d="M112 247 L119 252 L116 260 L108 260 L105 252 Z" fill="#2d2a33"/>` +
    `<path d="M95 248 L100 250 L100 257 L95 260 M129 248 L124 250 L124 257 L129 260 M106 237 L112 240 L118 237" fill="#2d2a33" ${s2}/>` +
    `<path d="M112 247 L112 240 M119 252 L124 250 M116 260 L119 267 M108 260 L105 267 M105 252 L100 250" stroke="${INK}" stroke-width="1.6"/></g>` +
    FOOTBALL_BOOTS.feetL,
  pawR: '',
  ...FOOTBALL_BOOTS,
  hidesEars: false,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 8. 魔法师 wizard: a tall pointed purple hat with a wide brim right across his head, its tip flopping over to his right, a
//    gold band and stars; a long purple robe with gold stars, a crescent moon and a gold rope belt; a star-topped wand in his
//    right paw. (The hat and the star wand.)
const WIZ = '#7b5cd6';
const wizard = (): CostumeLayer => ({
  back: '',
  body:
    // the robe down to the ground, wider than him, then his body in it
    cel('M110 186 C92 208 84 246 78 282 C130 290 190 290 242 282 C236 246 228 208 210 186 Z', WIZ, 128, 196, 0.9) + tint(WIZ) +
    `<path d="M80 276 C130 284 190 284 240 276" fill="none" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/>` +
    [[118, 214, 7], [200, 230, 6], [134, 268, 5], [214, 262, 5]].map(([x, y, r]) => `<path d="${star(x!, y!, r!)}" fill="${GOLD}" ${s2}/>`).join('') +
    `<path d="M178 206 C170 210 168 222 176 228 C166 228 160 218 164 210 C166 206 172 204 178 206 Z" fill="${GOLD}" ${s2}/>` +
    rope('M100 244 C130 254 190 254 220 244', GOLD, 5) +
    `<path d="M146 252 L140 272 M150 252 L150 274" stroke="${INK}" stroke-width="6.4" stroke-linecap="round"/><path d="M146 252 L140 272 M150 252 L150 274" stroke="${GOLD}" stroke-width="3.2" stroke-linecap="round"/>`,
  head:
    // the wide brim right across his head, then the cone (over his crown, as a hat may) flopping to his right, its gold band,
    // its stars and the pompom on its tip
    cel('M50 84 C58 66 112 62 160 62 C208 62 262 66 270 84 C262 98 214 96 160 92 C106 96 58 98 50 84 Z', WIZ, 70, 70, 0.92) +
    cel('M94 78 C108 50 128 30 156 24 C196 18 246 32 278 64 C258 56 238 54 226 60 C228 66 228 72 226 78 C190 70 130 70 94 78 Z', WIZ, 120, 36, 0.92) +
    `<path d="M98 70 C134 62 190 62 226 70 L226 78 C190 70 130 70 94 78 Z" fill="${GOLD}" ${s2}/>` +
    hi('M106 64 C116 46 130 34 148 28', 5, 0.35) +
    `<path d="${star(140, 50, 7)}" fill="${GOLD}" ${s2}/><path d="${star(190, 38, 6)}" fill="${GOLD}" ${s2}/>` +
    `<circle cx="276" cy="64" r="6" fill="${GOLD}" ${s2}/>`,
  // the wand: a short dark staff out to his right with a big gold star on its tip
  pawR: heldPole(188, 262, -38, 14, 82, '#8a5a3c', 7) +
    cel(star(254, 210, 17, 0.5), GOLD, 246, 200, 0.86) +
    `<circle cx="276" cy="190" r="2.6" fill="#fff6c8"/><circle cx="270" cy="230" r="2" fill="#fff6c8"/>` + pawOverR,
  pawL: '',
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 9. 海盗 pirate: a black tricorn right across his head with a gold edge and a white skull and crossbones, his eye patch
//    flipped up onto the brim (both eyes show); a black long coat open over a red-and-white striped shirt, a red sash, gold
//    buttons; a little green parrot on his left shoulder; a brass spyglass in his right paw. (The tricorn and the parrot.)
const PIRATE = '#2d2a33';
const PR_RED = '#d8302a';
/** The shirt in the coat's opening: x 140–180 at y 196, 144–176 at y 268; red stripes across it. */
const shirtX = (y: number) => [140 + ((y - 196) / 72) * 4, 180 - ((y - 196) / 72) * 4] as const;
const SHIRT_STRIPES = [204, 220, 236].map((y) => {
  const [a, b] = shirtX(y);
  const [c, d] = shirtX(y + 8);
  return `<path d="M${r1(a)} ${y} L${r1(b)} ${y} L${r1(d)} ${y + 8} L${r1(c)} ${y + 8} Z" fill="${PR_RED}"/>`;
}).join('');
const pirate = (): CostumeLayer => ({
  back: '',
  body:
    // the long coat to the ground, then the coat over his body, the striped shirt in its opening, the sash, gold buttons
    cel('M110 186 C92 210 86 248 84 284 L236 284 C234 248 228 210 210 186 Z', PIRATE, 124, 196, 0.9) + tint(PIRATE) +
    `<path d="M140 196 L180 196 L176 268 L144 268 Z" fill="#fffdf7" ${s2}/>` + SHIRT_STRIPES +
    pair((f) => `<path d="M${f(132)} 192 L${f(146)} 236 L${f(140)} 270" fill="none" stroke="#45414d" stroke-width="5" stroke-linecap="round"/>`) +
    `<path d="M102 242 C130 252 190 252 218 242 L220 256 C190 266 130 266 100 256 Z" fill="${PR_RED}" ${S}/>` +
    `<path d="M200 252 L210 276 L218 272 L206 250 Z" fill="${PR_RED}" ${s2}/>` +
    pair((f) => [212, 228].map((y) => `<circle cx="${f(128)}" cy="${y}" r="3.4" fill="${GOLD}" ${s2}/>`).join('')) +
    `<path d="M86 282 L234 282" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`,
  head:
    // the tricorn: its crown and upturned brim in one, a horn at each side, the front corner dipping between his eyes
    cel('M44 66 C58 78 76 88 98 92 C122 96 146 92 160 104 C174 92 198 96 222 92 C244 88 262 78 276 66 C268 50 244 42 216 44 C200 30 180 24 160 24 C140 24 120 30 104 44 C76 42 52 50 44 66 Z', PIRATE, 100, 44, 0.92, '#18161c') +
    `<path d="M48 68 C62 80 78 88 98 92 C122 96 146 92 160 102 C174 92 198 96 222 92 C242 88 258 80 272 68" fill="none" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/>` +
    hi('M70 56 C86 48 100 46 112 48', 4, 0.3) +
    // the skull and crossbones on the front
    `<path d="M146 70 L174 82 M146 82 L174 70" stroke="${INK}" stroke-width="7.4" stroke-linecap="round"/><path d="M146 70 L174 82 M146 82 L174 70" stroke="#fffdf7" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="${oval(160, 56, 10, 9.5)}" fill="#fffdf7" ${s2}/><path d="M154 66 L166 66 L164 72 L156 72 Z" fill="#fffdf7" ${s2}/>` +
    `<circle cx="156.4" cy="56" r="2.6" fill="${PIRATE}"/><circle cx="163.6" cy="56" r="2.6" fill="${PIRATE}"/>` +
    // the eye patch, flipped up onto the brim over his right eye, its cord along the hat
    `<path d="M186 50 C204 46 222 50 240 60" fill="none" stroke="#c98f55" stroke-width="2.4" stroke-linecap="round"/>` +
    `<path d="${oval(214, 62, 11, 9)}" fill="#141218" stroke="#8a8399" stroke-width="2"/>` +
    // the little green parrot on his left shoulder: its tail down behind, its body, wing, eye and hooked beak
    `<g transform="translate(6 22)">` +
    `<path d="M78 186 L70 222 L80 220 L86 190 Z" fill="#2f8fd6" ${s2}/>` +
    cel('M64 172 C60 156 70 144 84 146 C96 148 100 160 98 172 C98 184 90 194 80 194 C70 194 66 184 64 172 Z', '#3fbf6a', 72, 154, 0.9) +
    `<path d="M80 166 C88 168 94 176 92 188 C84 186 78 178 80 166 Z" fill="#2f9a52" ${s2}/>` +
    `<circle cx="78" cy="156" r="3.6" fill="#fffdf7" ${s2}/><circle cx="77.4" cy="156.4" r="1.8" fill="#2d2a33"/>` +
    `<path d="M66 156 C60 156 56 162 60 168 C62 164 64 162 68 162 Z" fill="#ffc22e" ${s2}/>` +
    `<path d="M76 146 C76 140 82 138 86 142" fill="none" stroke="${PR_RED}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M80 194 L78 200 M86 193 L86 199" stroke="#ff9f43" stroke-width="3" stroke-linecap="round"/></g>`,
  // the brass spyglass, pointing up and out to his right
  pawR: heldPole(184, 262, -30, 10, 62, '#c98f55', 9, GOLD) +
    `<g transform="translate(184 262) rotate(-30)"><path d="M26 -6.5 L26 6.5" stroke="${INK}" stroke-width="1.8"/></g>` + pawOverR,
  pawL: '',
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 10. 小贩 Singapore hawker: a white singlet under a blue apron, a towel headband knotted at the side, the shoulder towel,
//     and a big wok of noodles in flames. The parent-approved sample, verbatim.
const APRON = '#2f74c9';
const TOWEL = '#fffdf7';
const hawker = (): CostumeLayer => ({
  back: '',
  body: tint(TOWEL) +
    cel('M130 194 L190 194 L194 220 C208 226 216 238 218 256 C200 276 120 276 102 256 C104 238 112 226 126 220 Z', APRON, 140, 204, 0.9) +
    `<path d="M126 220 C112 218 100 214 94 210 M194 220 C208 218 220 214 226 210" fill="none" stroke="${APRON}" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M142 232 L178 232 L176 252 C166 256 154 256 144 252 Z" fill="none" stroke="#e8f0fb" stroke-width="2.4" stroke-linejoin="round"/>` +
    // the towel over his shoulder, red-striped at its end
    `<path d="M98 194 C108 186 124 186 134 192 L130 246 L104 246 Z" fill="${TOWEL}" ${S}/><path d="M104 232 L130 232 M104 238 L130 238" stroke="#d8302a" stroke-width="2.6"/>`,
  head:
    // a towel tied round his forehead from one edge of his head to the other, its knot and two ends sticking out at the side
    `<path d="M54 94 C92 54 228 54 266 94 L264 110 C226 70 94 70 56 110 Z" fill="${TOWEL}" ${S}/>` +
    `<path d="M62 100 C98 64 222 64 258 100" fill="none" stroke="#d8302a" stroke-width="2"/>` +
    `<path d="M266 98 C276 86 286 80 290 82 C288 92 282 100 274 106 Z" fill="${TOWEL}" ${S}/><path d="M268 110 C278 110 288 116 290 126 C280 126 272 122 266 118 Z" fill="${TOWEL}" ${S}/>` +
    `<ellipse cx="264" cy="104" rx="8" ry="11" fill="${TOWEL}" ${S}/>`,
  // the wok in his right paw: flames lick up round it, noodles fly out of it
  pawR:
    `<path d="M222 238 C218 232 226 228 230 224 C234 218 236 210 242 202 C246 210 248 206 252 194 C258 200 264 196 266 186 C270 188 274 182 274 172 C282 184 286 196 284 206 C288 214 290 226 286 238 Z" fill="#ff8a3d" ${S}/>` +
    `<path d="M232 236 C230 230 236 226 240 220 C244 226 248 222 252 210 C256 216 262 212 266 202 C268 200 272 196 274 190 C280 204 282 218 278 236 Z" fill="#ffd23f"/>` +
    [`M250 234 C246 220 258 210 254 198`, `M264 234 C268 214 278 208 274 188`].map((d) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="6.4" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#ffe69a" stroke-width="3.4" stroke-linecap="round"/>`).join('') +
    `<path d="M188 262 L218 248" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M188 262 L218 248" stroke="#8a5a3c" stroke-width="5" stroke-linecap="round"/>` +
    cel('M210 236 L288 236 C284 260 266 270 249 270 C232 270 214 260 210 236 Z', '#4a4552', 222, 240, 0.9) +
    `<ellipse cx="249" cy="236" rx="39" ry="6.5" fill="#2f2b36" ${S}/>` + hi('M218 246 C222 256 230 262 240 266', 3, 0.35) +
    `<path d="${PAW_R_D}" fill="${CREAM_PAW}" ${s2}/><path d="M178 264 L178 270 M188 264 L188 270" fill="none" ${s2}/>`,
  // the wok spatula in his left paw
  pawL: `<path d="M136 264 L86 226" stroke="${INK}" stroke-width="8.6" stroke-linecap="round"/><path d="M136 264 L86 226" stroke="#8a5a3c" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M86 226 L92 218" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` +
    cel('M64 226 C56 214 64 200 78 202 L96 212 C94 226 78 236 64 226 Z', '#b9bcc6', 72, 210, 0.86) +
    `<path d="${PAW_L_D}" fill="${CREAM_PAW}" ${s2}/><path d="M132 264 L132 270 M142 264 L142 270" fill="none" ${s2}/>`,
  hidesEars: false,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 11. 军人 soldier (his ask, 2026-10-15), Singapore-army flavoured: a helmet in pixel camo right across his head with its chin
//     straps, a pixel-camo uniform with chest pockets, the webbing belt and a water bottle on his hip, a small Singapore flag
//     patch on his arm, black boots on his own feet; a Singapore flag in his right paw. No weapons: this is a 7-year-old's app.
//     (The camo helmet and the flag.)
const ARMY = '#82803a';
const CAMO = ['#4f5e2a', '#8a6a3e', '#b3bd7c'];
const WEBBING = '#4a5526';
/** Pixel camo: 8-unit squares, seeded, kept to the cells whose four corners pass `inside`. */
const camo = (seed: number, x0: number, x1: number, y0: number, y1: number, inside: (x: number, y: number) => boolean) => {
  let h = seed;
  const rnd = () => ((h = (h * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let out = '';
  for (let y = y0; y < y1; y += 8) for (let x = x0; x < x1; x += 8) {
    const r = rnd();
    const k = rnd();
    if (r > 0.5 || ![[x, y], [x + 8, y], [x, y + 8], [x + 8, y + 8]].every(([a, b]) => inside(a!, b!))) continue;
    out += `<path d="M${x} ${y} L${x + 8} ${y} L${x + 8} ${y + 8} L${x} ${y + 8} Z" fill="${CAMO[Math.floor(k * 3)]}"/>`;
  }
  return out;
};
const inEllipse = (cx: number, cy: number, rx: number, ry: number) => (x: number, y: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const SOLDIER_HELM = 'M52 112 C46 62 98 26 160 26 C222 26 274 62 268 112 C262 106 252 100 240 96 C200 86 120 86 80 96 C68 100 58 106 52 112 Z';
/** His black army boots, in his paws' place: laces, a sole. */
const ARMY_BOOTS = feet((f) => boot(f, '#2d2a33', '#18161c') + `<path d="M${f(118)} 281 L${f(158)} 281" stroke="#4a4552" stroke-width="2.4"/>` +
  `<path d="M${f(130)} 263 L${f(146)} 263 M${f(129)} 268 L${f(147)} 268 M${f(129)} 273 L${f(147)} 273" stroke="#8a8399" stroke-width="1.8" stroke-linecap="round"/>`);
const soldier = (): CostumeLayer => ({
  back: '',
  body: tint(ARMY) +
    camo(7, 88, 232, 188, 276, (x, y) => y > 196 && inEllipse(160, 234, 64, 40)(x, y)) +
    // the collar folded open, the two chest pockets with their flaps and buttons
    pair((f) => `<path d="M${f(118)} 190 L${f(152)} 204 L${f(140)} 218 Z" fill="${ARMY}" ${s2}/>`) +
    pair((f) => `<path d="M${f(118)} 212 L${f(144)} 212 L${f(144)} 234 L${f(118)} 234 Z" fill="none" stroke="${celShade(ARMY)}" stroke-width="2.4" stroke-linejoin="round"/>` +
      `<path d="M${f(116)} 210 L${f(146)} 210 L${f(146)} 218 L${f(131)} 221 L${f(116)} 218 Z" fill="${ARMY}" ${s2}/><circle cx="${f(131)}" cy="216" r="2.2" fill="${WEBBING}"/>`) +
    // the Singapore flag patch on his left arm: red over white, the crescent
    `<path d="M196 208 L218 206 L219 214 L197 216 Z" fill="#e0283a"/><path d="M197 216 L219 214 L220 222 L198 224 Z" fill="#fffdf7"/><path d="M196 208 L218 206 L220 222 L198 224 Z" fill="none" ${s2}/>` +
    `<circle cx="202" cy="211.5" r="2.6" fill="#fffdf7"/><circle cx="203.4" cy="211.3" r="2.3" fill="#e0283a"/>` +
    // the webbing belt and its buckle, at his waist
    `<path d="M93 238 C128 248 192 248 227 238 L227 249 C192 259 128 259 93 249 Z" fill="${WEBBING}" ${S}/>` +
    `<path d="M151 242 L169 242 L169 255 L151 255 Z" fill="#c9ccd6" ${s2}/><path d="M156 246 L164 246 L164 251 L156 251 Z" fill="${WEBBING}"/>` +
    // the water bottle on his right hip: its olive cover, the black cap, the strap over the belt
    `<path d="M104 246 L104 238" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>` +
    cel('M88 254 C86 244 92 238 100 238 L110 238 C118 238 122 244 120 254 L118 270 C117 276 113 278 108 278 L100 278 C95 278 91 276 90 270 Z', '#5f6e30', 94, 244, 0.88) +
    `<path d="M96 232 L112 232 L112 240 L96 240 Z" fill="#2d2a33" ${s2}/><path d="M92 256 L116 256" stroke="${WEBBING}" stroke-width="3"/>`,
  head:
    // the helmet right across his head in pixel camo, its rim, then the chin straps down his cheeks
    cel(SOLDIER_HELM, ARMY, 100, 44, 0.94) +
    camo(3, 64, 256, 30, 92, (x, y) => inEllipse(160, 100, 98, 68)(x, y) && y < 90 - 0.002 * (x - 160) ** 2) +
    `<path d="${SOLDIER_HELM}" fill="none" ${S}/>` +
    `<path d="M56 106 C66 100 74 98 82 96 C120 87 200 87 238 96 C246 98 254 100 264 106" fill="none" stroke="${celShade(ARMY)}" stroke-width="5" stroke-linecap="round"/>` +
    hi('M70 70 C84 50 106 38 132 33', 6, 0.4) +
    pair((f) => rope(`M${f(60)} 110 C${f(62)} 136 ${f(68)} 156 ${f(80)} 172`, WEBBING, 4)),
  // a Singapore flag on a short pole, flying out to his right: red over white, the crescent and five stars
  pawR: poleFlag(186, 262, -40, 84, 26, 36, '#c9ccd6', (x0, x1) => {
    const mid = (x0 + x1) / 2;
    const cx = x1 - (x1 - x0) / 4;
    return `<path d="M${x1} 0 L${x1} 36 L${mid} 36 L${mid} 0 Z" fill="#e0283a"/><path d="M${mid} 0 L${mid} 36 L${x0} 36 L${x0} 0 Z" fill="#fffdf7"/>` +
      `<circle cx="${cx}" cy="8.5" r="4.6" fill="#fffdf7"/><circle cx="${cx}" cy="10.5" r="4.1" fill="#e0283a"/>` +
      [0, 1, 2, 3, 4].map((i) => {
        const a = (i * 2 * Math.PI) / 5;
        return `<circle cx="${(cx + 2.9 * Math.cos(a)).toFixed(1)}" cy="${(15 + 2.9 * Math.sin(a)).toFixed(1)}" r="1" fill="#fffdf7"/>`;
      }).join('');
  }) + ARMY_BOOTS.feetR,
  pawL: '',
  ...ARMY_BOOTS,
  hidesEars: true,
});

export const JOB_COSTUMES: Record<string, () => CostumeLayer> = { astronaut, chef, firefighter, doctor, pilot, police, football, wizard, pirate, hawker, soldier };
