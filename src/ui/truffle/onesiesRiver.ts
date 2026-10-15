// The river onesies (rewards spec 2026-10-15 §5.2): the creatures of One River's worlds, each a hood with the animal's own face,
// its body and tail, to the v3 standard (docs/worlds/costumes/standard-v3.png). otter and panda are the parent-approved samples.
import { animalFoot, belly, cel, celShade, DARK, eyes, feet, mitts, gloveL, gloveR, hi, hood, pair, PAW_L_D, PAW_R_D, rope, S, s2, tint } from './costumeKit';
import type { CostumeLayer } from './costumes';


// ---------------------------------------------------------------------------------------------------------------------------
// 1. 水獭 otter onesie: brown hood with small round ears and the otter's whiskered face, a cream throat, its thick flat tail.
const OTTER = '#93643f';
const OTTER_CREAM = '#f6e3c4';
const otter = (): CostumeLayer => ({
  back: '',
  body: tint(OTTER) +
    // the cream throat and chest, from under the chin to the belly
    cel('M126 194 C142 204 178 204 194 194 C208 214 208 254 188 264 C170 272 150 272 132 264 C112 254 112 214 126 194 Z', OTTER_CREAM, 140, 206, 0.92),
  head: pair((f) => `<circle cx="${f(98)}" cy="44" r="15" fill="${OTTER}" ${S}/><circle cx="${f(98)}" cy="45" r="7" fill="#6a452b"/>`) +
    hood(OTTER) +
    // a pale brow above the eyes, then the face: eyes, two puffy cream whisker pads, a big dark nose, whiskers
    eyes(28, 48, 5.5) +
    pair((f) => `<ellipse cx="${f(148)}" cy="66" rx="14" ry="10" fill="${OTTER_CREAM}" ${S}/><circle cx="${f(144)}" cy="66" r="1.4" fill="${DARK}"/><circle cx="${f(150)}" cy="70" r="1.4" fill="${DARK}"/><circle cx="${f(152)}" cy="64" r="1.4" fill="${DARK}"/>` +
      `<path d="M${f(134)} 63 L${f(108)} 58 M${f(134)} 68 L${f(106)} 70 M${f(135)} 73 L${f(110)} 80" fill="none" ${s2}/>`) +
    `<path d="M150 55 Q160 51 170 55 Q168 63 160 65 Q152 63 150 55 Z" fill="${DARK}"/><ellipse cx="156" cy="55.5" rx="2.6" ry="1.4" fill="#fff" opacity=".8"/>`,
  // the otter's tail: long, thick at the root, tapering, flat
  tail: cel('M206 236 C232 240 258 232 272 204 C282 222 274 246 254 258 C238 266 220 264 206 258 Z', OTTER, 230, 238, 0.86),
  // the otter's own feet in his paws' place (one foot each, never a paw on a foot: parent 2026-10-16)
  ...feet((f) => animalFoot(f, OTTER)),
  ...mitts(OTTER),
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 2. 熊猫 panda onesie: white hood with black ears and eye patches; black arms, legs and paws.
const PANDA = '#fbfaf6';
const BLK = '#3d3845';
const panda = (): CostumeLayer => ({
  back: '',
  body: tint(PANDA) + belly('#ffffff') +
    // black arms down both sides (its black feet are in his paws' place)
    pair((f) => `<path d="M${f(112)} 188 C${f(94)} 200 ${f(86)} 226 ${f(92)} 250 C${f(100)} 256 ${f(112)} 254 ${f(118)} 246 C${f(116)} 226 ${f(120)} 208 ${f(134)} 196 Z" fill="${BLK}" ${S}/>`) +
    hi('M100 210 C98 222 98 232 100 240', 3, 0.25),
  head: pair((f) => `<circle cx="${f(88)}" cy="44" r="20" fill="${BLK}" ${S}/>` + hi(`M${f(78)} 36 C${f(82)} 31 ${f(88)} 29 ${f(92)} 30`, 3, 0.3)) +
    hood(PANDA) +
    pair((f) => {
      const a = f(0) === 0 ? 28 : -28;
      return `<ellipse cx="${f(134)}" cy="54" rx="13" ry="17" transform="rotate(${a} ${f(134)} 54)" fill="${BLK}"/><circle cx="${f(135)}" cy="53" r="4.6" fill="#fff"/><circle cx="${f(135)}" cy="54" r="2.6" fill="${BLK}"/>`;
    }) +
    `<path d="M150 64 Q160 60 170 64 Q168 72 160 74 Q152 72 150 64 Z" fill="${BLK}"/><path d="M160 74 L160 79 M152 80 Q156 84 160 79 Q164 84 168 80" fill="none" ${s2}/>`,
  tail: `<circle cx="222" cy="250" r="13" fill="${PANDA}" ${S}/>`,
  ...feet((f) => animalFoot(f, BLK, '#6a6478')),
  ...mitts(BLK),
  hidesEars: true,
});


// ---------------------------------------------------------------------------------------------------------------------------
/** A circle as an explicit cubic path (so a round piece can be a `cel` piece, its shadow a rim on the lower right). */
const disc = (cx: number, cy: number, r: number) => {
  const k = r * 0.5523;
  return `M${cx - r} ${cy} C${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r} C${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy} ` +
    `C${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r} C${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy} Z`;
};
/** An eye on a dark hood: a white ring with a dark pupil and a catch-light (dark on dark would not read). */
const ringEye = (cx: number, cy: number, r = 7) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fffdf7" ${s2}/><circle cx="${cx + 0.6}" cy="${cy + 0.6}" r="${r * 0.5}" fill="${DARK}"/><circle cx="${cx + 1.8}" cy="${cy - 1.2}" r="1.5" fill="#fff"/>`;

// ---------------------------------------------------------------------------------------------------------------------------
// 3. 青蛙 frog (the worked example): a green hood with two big eyes standing on top, a wide smile across its brow, a pale
//    belly, spots, webbed feet and green gloves; no tail.
const FROG = '#7cc84a';
const FROG_BELLY = '#e4f5b8';
const frog = (): CostumeLayer => ({
  back: '',
  body: tint(FROG) + belly(FROG_BELLY) +
    pair((f) => `<circle cx="${f(104)}" cy="214" r="6" fill="${celShade(FROG)}"/><circle cx="${f(110)}" cy="240" r="4.5" fill="${celShade(FROG)}"/>`),
  head: hood(FROG) +
    // each eye is a dome on the hood's top, lit from the upper left on both sides
    pair((f) => cel(`M${f(116)} 54 C${f(116)} 26 ${f(160)} 26 ${f(160)} 54 C${f(160)} 70 ${f(116)} 70 ${f(116)} 54 Z`, FROG, Math.min(f(116), f(160)) + 10, 34, 0.88) +
      `<circle cx="${f(138)}" cy="48" r="11" fill="#fffdf7" ${s2}/><circle cx="${f(139)}" cy="49" r="6" fill="${DARK}"/><circle cx="${f(141)}" cy="46.5" r="2" fill="#fff"/>`) +
    `<path d="M128 66 Q160 80 192 66" fill="none" stroke="${celShade(FROG)}" stroke-width="3.4" stroke-linecap="round"/>` +
    pair((f) => `<ellipse cx="${f(112)}" cy="68" rx="6" ry="4" fill="#ff9d8a" opacity=".5"/>`),
  tail: '', // a frog has none: his own is hidden
  // webbed feet in his paws' place: three toes splayed out below each
  ...feet((f) => cel(`M${f(123)} 263 C${f(128)} 256 ${f(148)} 256 ${f(153)} 263 L${f(162)} 283 L${f(149)} 278 L${f(138)} 287 L${f(127)} 278 L${f(114)} 283 Z`, FROG, Math.min(f(114), f(162)) + 10, 262, 0.9) +
    `<path d="M${f(132)} 268 L${f(127)} 278 M${f(144)} 268 L${f(149)} 278" fill="none" stroke="${celShade(FROG)}" stroke-width="2" stroke-linecap="round"/>`),
  ...mitts(FROG),
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 4. 犀鸟 hornbill: a charcoal hood, its big yellow bill sweeping down over one side with the cream casque riding on it, a white
//    ring eye, charcoal wings tipped white, and a long tail fan with a white tip. (Not 喜鹊: the bill and casque.)
const HORNBILL = '#3d3845';
const CASQUE = '#f6e7a1';
const BILL = '#ffc94a';
const hornbill = (): CostumeLayer => ({
  back: '',
  body: tint(HORNBILL) +
    // the wings down his sides, their flight feathers tipped white
    pair((f) => cel(`M${f(112)} 190 C${f(94)} 202 ${f(88)} 226 ${f(92)} 250 L${f(120)} 248 C${f(118)} 226 ${f(122)} 208 ${f(134)} 196 Z`, HORNBILL, f(112) < 160 ? 104 : 196, 204, 0.9) +
      `<path d="M${f(92)} 248 L${f(120)} 246 C${f(120)} 254 ${f(116)} 262 ${f(112)} 262 L${f(110)} 256 L${f(104)} 262 L${f(100)} 256 L${f(94)} 260 C${f(92)} 256 ${f(91)} 252 ${f(92)} 248 Z" fill="#fffdf7" ${s2}/>`),
  head: hood(HORNBILL) +
    // the hood is the bird's head turned to its right: the big curved bill sweeps from the crown down over the hood's left side,
    // above his eye, with the casque riding on it, orange at its front tip; one ring eye behind the bill
    cel('M178 30 C140 26 92 40 62 72 C54 80 48 90 46 100 C58 92 70 84 84 78 C112 66 146 62 186 62 C194 52 190 36 178 30 Z', BILL, 120, 40, 0.9) +
    `<path d="M182 47 C150 46 110 56 80 76" fill="none" ${s2}/>` + hi('M160 34 C130 34 100 46 80 62', 3, 0.6) +
    cel('M186 34 C170 22 130 22 104 34 C96 30 90 30 86 34 C90 42 96 48 104 50 C128 40 160 36 186 40 Z', CASQUE, 120, 28, 0.9) +
    `<path d="M104 34 C96 30 90 30 86 34 C90 42 96 48 104 50 C102 44 102 38 104 34 Z" fill="#ff8a3d" ${s2}/>` +
    ringEye(206, 56, 8),
  // the long tail: a fan of feathers flaring at its end, its tip white
  tail: cel('M206 248 C232 238 248 216 254 192 C264 182 280 186 286 198 C288 210 284 222 276 230 C262 246 240 258 210 260 Z', HORNBILL, 224, 232, 0.9) +
    `<path d="M254 192 C264 182 280 186 286 198 C288 210 284 222 276 230 C270 222 262 214 250 210 C252 204 253 198 254 192 Z" fill="#fffdf7" ${s2}/>` +
    `<path d="M232 244 C248 232 262 214 270 196 M222 252 C244 244 264 228 280 212" fill="none" stroke="${celShade(HORNBILL)}" stroke-width="2" stroke-linecap="round"/>`,
  pawL: gloveL(HORNBILL),
  pawR: gloveR(HORNBILL),
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 5. 鸭子 duck: a yellow hood with a tuft on top and a flat orange bill across the brow, yellow wings, orange webbed feet and
//    a short upturned tail. (Not 鸡: the flat orange bill, no comb.)
const DUCK = '#ffd84a';
const DUCK_BILL = '#ff9f2e';
const duck = (): CostumeLayer => ({
  back: '',
  body: tint(DUCK) + belly('#fff4c2') +
    pair((f) => cel(`M${f(114)} 192 C${f(96)} 204 ${f(90)} 228 ${f(98)} 250 C${f(108)} 246 ${f(118)} 236 ${f(124)} 222 C${f(128)} 210 ${f(126)} 198 ${f(120)} 192 Z`, DUCK, f(114) < 160 ? 104 : 196, 202, 0.9) +
      `<path d="M${f(102)} 236 L${f(110)} 232 M${f(100)} 244 L${f(108)} 240" fill="none" ${s2}/>`),
  head: hood(DUCK) +
    // the tuft: three little feathers standing on the crown
    `<path d="M156 46 C144 40 138 32 141 25 C150 26 158 34 156 46 Z M164 46 C176 40 182 32 179 25 C170 26 162 34 164 46 Z" fill="${DUCK}" ${s2}/>` +
    `<path d="M160 48 C150 38 152 28 160 24 C168 28 170 38 160 48 Z" fill="${DUCK}" ${s2}/>` +
    eyes(26, 50) +
    // the flat bill across the brow, two nostrils
    cel('M132 64 C132 55 188 55 188 64 C190 72 178 77 160 77 C142 77 130 72 132 64 Z', DUCK_BILL, 142, 58, 0.88) +
    `<path d="M138 68 Q160 72 182 68" fill="none" stroke="${celShade(DUCK_BILL)}" stroke-width="1.8" stroke-linecap="round"/>` +
    `<circle cx="152" cy="62" r="1.8" fill="${DARK}"/><circle cx="168" cy="62" r="1.8" fill="${DARK}"/>`,
  tail: cel('M208 246 C222 240 230 228 232 210 C240 216 242 228 236 238 C246 232 252 222 252 212 C260 230 250 254 214 256 Z', DUCK, 222, 236, 0.88),
  // webbed feet, three toes each, turned out, in his paws' place
  ...feet((f) => cel(`M${f(126)} 262 C${f(118)} 266 ${f(110)} 272 ${f(106)} 280 L${f(118)} 279 L${f(122)} 287 L${f(134)} 281 L${f(142)} 288 L${f(150)} 279 C${f(156)} 276 ${f(158)} 266 ${f(150)} 261 C${f(144)} 257 ${f(132)} 257 ${f(126)} 262 Z`, DUCK_BILL, Math.min(f(106), f(158)) + 10, 264, 0.88)),
  ...mitts(DUCK),
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 6. 蜻蜓 dragonfly: a teal hood with two huge blue compound eyes on top, four clear wings fanning from his shoulders, a banded
//    body and a long thin segmented tail.
const DRAGONFLY = '#3fb6c8';
const COMPOUND = '#2f8fd6';
const WING = '#e6f7ff';
const dragonfly = (): CostumeLayer => ({
  // four clear wings fanning out from his shoulders, below the hood, lit along their top edges
  back: pair((f) =>
    `<path d="M${f(120)} 200 C${f(96)} 180 ${f(56)} 160 ${f(38)} 170 C${f(30)} 182 ${f(54)} 204 ${f(120)} 210 Z" fill="${WING}" ${S}/>` +
    `<path d="M${f(120)} 214 C${f(88)} 212 ${f(48)} 222 ${f(40)} 240 C${f(48)} 254 ${f(92)} 240 ${f(122)} 220 Z" fill="${WING}" ${S}/>` +
    `<path d="M${f(114)} 202 C${f(92)} 188 ${f(68)} 176 ${f(46)} 174 M${f(114)} 206 C${f(90)} 200 ${f(68)} 196 ${f(48)} 190 M${f(116)} 216 C${f(92)} 218 ${f(68)} 224 ${f(48)} 236 M${f(116)} 218 C${f(94)} 226 ${f(76)} 234 ${f(58)} 244" fill="none" stroke="#8ccbe0" stroke-width="1.8" stroke-linecap="round"/>` +
    hi(`M${f(48)} 168 C${f(64)} 166 ${f(84)} 176 ${f(98)} 186`, 3, 0.8)),
  body: tint(DRAGONFLY) +
    [222, 240, 256].map((y, i) => `<path d="M${104 + i * 2} ${y} C${130} ${y + 8} ${190} ${y + 8} ${216 - i * 2} ${y}" fill="none" stroke="${celShade(DRAGONFLY)}" stroke-width="4" stroke-linecap="round"/>`).join(''),
  head: hood(DRAGONFLY) +
    pair((f) => cel(disc(f(124), 48, 22), COMPOUND, f(124) - 9, 39, 0.88) +
      `<path d="M${f(108)} 50 Q${f(124)} 58 ${f(140)} 50 M${f(112)} 60 Q${f(124)} 66 ${f(136)} 60" fill="none" stroke="${celShade(COMPOUND)}" stroke-width="1.8" stroke-linecap="round"/>` +
      `<circle cx="${f(117)}" cy="39" r="5" fill="#fff"/><circle cx="${f(126)}" cy="36" r="2" fill="#fff"/>`) +
    `<path d="M146 70 Q160 78 174 70" fill="none" stroke="${celShade(DRAGONFLY)}" stroke-width="3" stroke-linecap="round"/>`,
  // the long thin abdomen, curving away to his right, ringed in dark bands
  tail: rope('M208 250 C234 256 256 248 268 228 C276 214 280 198 278 184', DRAGONFLY, 10) +
    [[228, 254, 228, 244], [248, 250, 244, 240], [264, 238, 256, 230], [274, 218, 264, 214]].map(([x1, y1, x2, y2]) => {
      const cx = (x1! + x2!) / 2;
      const cy = (y1! + y2!) / 2;
      return `<path d="M${cx + (x1! - cx) * 0.75} ${cy + (y1! - cy) * 0.75} L${cx + (x2! - cx) * 0.75} ${cy + (y2! - cy) * 0.75}" stroke="${celShade(DRAGONFLY)}" stroke-width="4" stroke-linecap="round"/>`;
    }).join(''),
  pawL: gloveL(DRAGONFLY),
  pawR: gloveR(DRAGONFLY),
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 7. 锦鲤 koi: a white hood with an orange-red patch over its crown and by its cheeks, a fish mouth with two barbels, fins at
//    its sides, white scales with patches on the body and a big flowing orange fan tail. (Not 螃蟹: white with orange patches.)
const KOI = '#fffaf2';
const KOI_RED = '#f26b3a';
const koi = (): CostumeLayer => ({
  back: '',
  body: tint(KOI) +
    `<path d="M104 206 C110 194 132 192 140 202 C146 214 132 226 118 224 C108 222 102 214 104 206 Z" fill="${KOI_RED}"/>` +
    `<path d="M186 246 C190 234 212 232 218 242 C220 254 206 264 194 262 C186 258 184 252 186 246 Z" fill="${KOI_RED}"/>` +
    [136, 148, 160, 172, 184].map((x) => `<path d="M${x - 6} 230 Q${x} 238 ${x + 6} 230" fill="none" stroke="#e0c9b4" stroke-width="1.8" stroke-linecap="round"/>`).join('') +
    [142, 154, 166, 178].map((x) => `<path d="M${x - 6} 242 Q${x} 250 ${x + 6} 242" fill="none" stroke="#e0c9b4" stroke-width="1.8" stroke-linecap="round"/>`).join(''),
  head: hood(KOI) +
    // the fins at the hood's sides
    pair((f) => cel(`M${f(68)} 104 C${f(54)} 96 ${f(42)} 104 ${f(44)} 120 C${f(46)} 134 ${f(56)} 142 ${f(70)} 140 Z`, KOI_RED, f(56) < 160 ? 52 : 262, 108, 0.88) +
      `<path d="M${f(66)} 112 L${f(52)} 112 M${f(66)} 122 L${f(50)} 124 M${f(66)} 132 L${f(54)} 134" fill="none" stroke="${celShade(KOI_RED)}" stroke-width="1.6" stroke-linecap="round"/>`) +
    // the big patch over the crown (a kohaku's), and the small ones by the cheeks
    cel('M104 52 C100 38 120 28 150 28 C166 28 172 38 166 46 C158 52 144 50 132 54 C120 58 106 60 104 52 Z', KOI_RED, 118, 34, 0.9) +
    cel('M180 36 C192 30 212 38 214 50 C208 56 196 54 188 50 C180 46 174 40 180 36 Z', KOI_RED, 186, 36, 0.88) +
    `<path d="M50 160 C52 150 62 148 68 156 C72 166 66 176 58 174 C52 172 48 166 50 160 Z" fill="${KOI_RED}"/>` +
    `<path d="M262 146 C266 140 274 142 274 150 C274 158 266 162 262 158 C258 154 258 150 262 146 Z" fill="${KOI_RED}"/>` +
    eyes(38, 62, 5) +
    // the round fish mouth, and its two barbels curling out along the brow
    `<ellipse cx="160" cy="68" rx="6.5" ry="5" fill="#ff9d8a" ${s2}/><ellipse cx="160" cy="68.5" rx="3" ry="2" fill="${DARK}"/>` +
    pair((f) => rope(`M${f(153)} 71 C${f(142)} 74 ${f(136)} 80 ${f(137)} 87 C${f(138)} 91 ${f(142)} 92 ${f(143)} 88`, KOI_RED, 2.4)),
  // the big flowing fan tail, orange with white tips
  tail: cel('M206 248 C222 240 234 226 242 206 C254 194 274 194 284 204 C272 212 266 222 266 232 C278 236 286 250 284 264 C268 256 248 256 236 260 C224 262 212 258 206 252 Z', KOI_RED, 226, 228, 0.9) +
    `<path d="M262 196 C272 196 280 200 284 204 C276 208 270 212 266 220 C266 210 264 202 262 196 Z M270 240 C278 246 284 254 284 264 C278 260 272 258 266 258 C270 252 270 246 270 240 Z" fill="${KOI}" ${s2}/>`,
  pawL: gloveL(KOI_RED),
  pawR: gloveR(KOI_RED),
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 8. 螃蟹 crab: a red hood with two eyes on stalks and a wide smile, a pale belly plate, three little legs each side, and a big
//    pincer closing round each paw. (Not 锦鲤: red all over, the pincers.)
const CRAB = '#d8382e';
const CRAB_PALE = '#ffd9c7';
/**
 * The crab's red mitts: his paw's own shape with the pincer's notch cut in its outer side. They stay inside his paw's outline,
 * so they rise with it and never cross his face, even when he hides his eyes; the big claws are the suit's (on its body).
 */
const mitt = (d: string, notch: string) => `<path d="${d}" fill="${CRAB}" ${s2}/><path d="${notch}" fill="${celShade(CRAB)}" ${s2}/>`;
/** One of the suit's big claws, raised beside him: a palm and two fingers open upward (mirrored by `f`). */
const bigClaw = (f: (x: number) => number) =>
  cel(`M${f(94)} 252 C${f(74)} 260 ${f(50)} 250 ${f(46)} 230 C${f(44)} 220 ${f(48)} 212 ${f(54)} 207 L${f(42)} 192 ` +
    `C${f(38)} 178 ${f(54)} 170 ${f(64)} 180 C${f(60)} 188 ${f(60)} 196 ${f(64)} 203 L${f(72)} 204 ` +
    `C${f(72)} 192 ${f(84)} 186 ${f(92)} 194 C${f(100)} 210 ${f(102)} 236 ${f(94)} 252 Z`, CRAB, Math.min(f(46), f(102)) + 12, 200, 0.9) +
  `<path d="M${f(64)} 203 C${f(60)} 212 ${f(62)} 222 ${f(70)} 228" fill="none" ${s2}/>` +
  hi(`M${f(46)} 186 C${f(48)} 180 ${f(54)} 177 ${f(58)} 178`, 3, 0.5);
const crab = (): CostumeLayer => ({
  back: '',
  body:
    // three little legs each side, bent at the knee, behind the suit's outline
    pair((f) => [236, 250, 262].map((y) => rope(`M${f(100)} ${y} L${f(78)} ${y - 2} L${f(70)} ${y + 12}`, CRAB, 6)).join('')) +
    tint(CRAB) + pair(bigClaw) +
    cel('M128 212 C142 204 178 204 192 212 C200 236 190 258 160 264 C130 258 120 236 128 212 Z', CRAB_PALE, 140, 214, 0.92) +
    `<path d="M134 230 Q160 236 186 230 M136 246 Q160 252 184 246" fill="none" stroke="#e8b6a2" stroke-width="1.8" stroke-linecap="round"/>`,
  head: hood(CRAB) +
    // the eyes on their stalks, standing up off the hood's top
    pair((f) => rope(`M${f(140)} 54 L${f(134)} 36`, CRAB, 6) +
      `<circle cx="${f(132)}" cy="32" r="9" fill="#fffdf7" ${S}/><circle cx="${f(133)}" cy="33" r="4.6" fill="${DARK}"/><circle cx="${f(130.5)}" cy="30.5" r="1.6" fill="#fff"/>`) +
    `<path d="M124 64 Q160 82 196 64" fill="none" stroke="${DARK}" stroke-width="3" stroke-linecap="round"/>` +
    pair((f) => `<circle cx="${f(108)}" cy="54" r="3.5" fill="${celShade(CRAB)}"/><circle cx="${f(96)}" cy="66" r="2.5" fill="${celShade(CRAB)}"/>`),
  tail: '', // a crab has none
  pawL: mitt(PAW_L_D, 'M121.5 262 L134 266 L123 270 Z'),
  pawR: mitt(PAW_R_D, 'M198.5 262 L186 266 L197 270 Z'),
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 9. 鹦鹉 parrot: a blue hood with a dark hooked beak on the brow and white striped face patches at its sides, a gold chest,
//    blue wings edged in green and two long tail feathers. (Not 喜鹊: bright blue and gold, the hooked beak.)
const PARROT = '#2f8fd6';
const GOLD = '#ffd23f';
const GREEN = '#3fbf6a';
const BEAK = '#3d3845';
const parrot = (): CostumeLayer => ({
  back: '',
  body: tint(PARROT) +
    cel('M126 194 C142 204 178 204 194 194 C208 214 208 254 188 264 C170 272 150 272 132 264 C112 254 112 214 126 194 Z', GOLD, 140, 206, 0.92) +
    pair((f) => rope(`M${f(110)} 194 C${f(94)} 208 ${f(90)} 232 ${f(98)} 254`, GREEN, 7) +
      cel(`M${f(114)} 190 C${f(98)} 204 ${f(94)} 228 ${f(102)} 250 C${f(110)} 250 ${f(118)} 244 ${f(122)} 234 C${f(122)} 216 ${f(126)} 204 ${f(134)} 196 Z`, PARROT, f(114) < 160 ? 106 : 194, 202, 0.9)),
  head: hood(PARROT) +
    // the white face patches at the hood's sides, with their thin dark lines
    pair((f) => `<path d="M${f(52)} 112 C${f(46)} 136 ${f(52)} 160 ${f(70)} 172 C${f(74)} 150 ${f(72)} 128 ${f(66)} 108 C${f(60)} 104 ${f(54)} 106 ${f(52)} 112 Z" fill="#fffdf7" ${s2}/>` +
      `<path d="M${f(56)} 126 L${f(66)} 124 M${f(56)} 140 L${f(68)} 138 M${f(58)} 154 L${f(68)} 154" fill="none" stroke="${BEAK}" stroke-width="1.8" stroke-linecap="round"/>`) +
    eyes(32, 50) +
    // the hooked beak: the paler lower bill under the dark upper one curving down to its point
    `<path d="M146 66 C148 76 156 82 164 80 C166 72 160 66 146 66 Z" fill="#8a8296" ${s2}/>` +
    cel('M138 60 C142 46 178 44 184 58 C188 72 176 84 162 90 C166 82 166 74 158 70 C150 68 142 66 138 60 Z', BEAK, 150, 52, 0.88),
  // two long tail feathers sweeping down to his right, gold beneath
  tail: cel('M206 252 C232 256 256 262 282 280 C262 284 234 274 206 260 Z', GOLD, 220, 256, 0.9) +
    cel('M206 244 C234 238 262 244 284 262 C266 268 236 260 206 254 Z', PARROT, 222, 246, 0.9) +
    cel('M208 236 C232 226 258 226 280 238 C262 248 234 246 208 246 Z', PARROT, 222, 234, 0.9),
  pawL: gloveL(BEAK),
  pawR: gloveR(BEAK),
  hidesEars: true,
});

export const RIVER_ONESIES: Record<string, () => CostumeLayer> = { otter, panda, hornbill, frog, duck, dragonfly, koi, crab, parrot };
