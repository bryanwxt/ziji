// His favourite onesies (rewards spec 2026-10-15 §5.2), to the v3 standard (docs/worlds/costumes/standard-v3.png): each a hood
// with the animal's own face, its body and tail, in light cel. penguin is the plan's worked example.
import { belly, cel, celShade, DARK, eyes, feet, mitts, gloveL, gloveR, hi, hood, pair, pawOverR, rope, ropeTail, S, s2, tint } from './costumeKit';
import type { CostumeLayer } from './costumes';

/** A circle as an explicit cubic path (so a round piece can be a `cel` piece, its shadow a rim on the lower right). */
const disc = (cx: number, cy: number, r: number) => {
  const k = r * 0.5523;
  return `M${cx - r} ${cy} C${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r} C${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy} ` +
    `C${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r} C${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy} Z`;
};
/** An eye on a dark hood: a white ring with a dark pupil and a catch-light (dark on dark would not read). */
const ringEye = (cx: number, cy: number, r = 7) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fffdf7" ${s2}/><circle cx="${cx + 0.6}" cy="${cy + 0.6}" r="${r * 0.5}" fill="${DARK}"/><circle cx="${cx + 1.8}" cy="${cy - 1.2}" r="1.5" fill="#fff"/>`;
/** Which side of his centre line a mirrored x is on: the anchor of a cel piece goes on its own upper left either way. */
const left = (f: (x: number) => number) => f(100) < 160;
const r1 = (n: number) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------------------------------------------------------
// 1. 小恐龙 baby dino: a purple hood with a row of round yellow plates along its crown, big friendly eyes and two round nostrils;
//    he sits in the cracked eggshell he hatched from, and has a thick dino tail. (Not 龙: purple, the eggshell, no horns or
//    whiskers. Not 青蛙: the plates, the shell and the tail.)
const DINO = '#8f6fd6';
const DINO_PLATE = '#ffd84a';
const SHELL = '#fffaf2';
/**
 * The plates: rounded spikes standing out of the hood's dome (an ellipse through its top and sides), each rooted a little inside
 * its edge and pointing out along it, the middle one the biggest; never above his box. Absolute points, so the box test reads them.
 */
const PLATES = [-52, -26, 0, 26, 52].map((deg, i) => {
  const t = (deg * Math.PI) / 180;
  const [w, h] = [[10, 17], [12, 20], [14, 21], [12, 20], [10, 17]][i]!;
  const n = Math.hypot(88 * Math.sin(t), 116 * Math.cos(t));
  const [ux, uy] = [(88 * Math.sin(t)) / n, (-116 * Math.cos(t)) / n]; // out of the dome
  const [vx, vy] = [-uy, ux]; // along it
  const [ex, ey] = [160 + 116 * Math.sin(t) - ux * 11, 116 - 88 * Math.cos(t) - uy * 11];
  const hh = Math.min(h, (ey - 23) / -uy); // the tip stays inside his box
  const p = (a: number, b: number) => `${r1(ex + vx * a + ux * b)} ${r1(ey + vy * a + uy * b)}`;
  const d = `M${p(-w, 0)} C${p(-w, hh * 0.55)} ${p(-w * 0.45, hh)} ${p(0, hh)} C${p(w * 0.45, hh)} ${p(w, hh * 0.55)} ${p(w, 0)} Z`;
  return [d, r1(ex - w * 0.3), r1(ey - 4)] as const;
});
const babydino = (): CostumeLayer => ({
  back: '',
  body: tint(DINO) + belly('#fff4dc') +
    `<path d="M136 214 Q160 220 184 214 M132 226 Q160 233 188 226" fill="none" stroke="#e6d2a8" stroke-width="2.2" stroke-linecap="round"/>` +
    // the eggshell round his waist, its broken top in zig-zags, one crack and a speckle or two
    cel('M90 246 L100 236 L112 247 L124 235 L138 247 L152 235 L166 247 L180 235 L194 247 L208 235 L220 247 L230 238 C232 248 226 256 216 260 C200 276 120 276 104 260 C96 256 90 252 90 246 Z', SHELL, 112, 244, 0.9) +
    `<path d="M152 247 L148 256 L154 262" fill="none" ${s2}/>` +
    `<circle cx="118" cy="258" r="3" fill="#d9cdf2"/><circle cx="196" cy="254" r="2.4" fill="#d9cdf2"/><circle cx="182" cy="264" r="3.2" fill="#d9cdf2"/>`,
  head: hood(DINO) +
    PLATES.map(([d, ax, ay]) => cel(d, DINO_PLATE, ax, ay, 0.84)).join('') +
    // big friendly eyes with a lid line over each, two round nostrils and a little smile
    pair((f) => `<circle cx="${f(132)}" cy="58" r="8.5" fill="#fffdf7" ${s2}/><circle cx="${f(133)}" cy="59" r="5" fill="${DARK}"/><circle cx="${f(134.8)}" cy="56.6" r="1.9" fill="#fff"/>`) +
    pair((f) => `<ellipse cx="${f(152)}" cy="70" rx="2.6" ry="2.2" fill="${celShade(DINO)}"/>`) +
    pair((f) => `<ellipse cx="${f(110)}" cy="68" rx="7" ry="4.5" fill="#ff9d8a" opacity=".55"/>`),
  // the thick dino tail, out to his right, with three little plates along its top
  tail: cel('M204 228 C232 232 258 226 280 206 C286 220 278 240 260 252 C242 262 222 264 206 260 Z', DINO, 226, 236, 0.88) +
    [[234, 230, 6], [254, 224, 5.5], [270, 214, 5]].map(([x, y, r]) => cel(disc(x!, y!, r!), DINO_PLATE, x! - 2, y! - 2, 0.85)).join(''),
  pawL: gloveL(DINO),
  pawR: gloveR(DINO),
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 2. 翼龙 pterosaur: a mauve hood that is the reptile's head in profile, its long crest sweeping back off the crown to his
//    right and its short beak pointing forward to his left; two big leathery wings spread behind him; clawed gloves.
//    (Not 小恐龙: mauve, the wings and the crest. Not 犀鸟: pink, a straight pointed beak, the crest behind.)
const PTERO = '#c96f9a';
const MEMBRANE = '#e8a3c1';
/** A wing, out to his left (mirrored by `f`): the arm along its top to the wrist, three finger bones, a scalloped trailing edge. */
const ptWing = (f: (x: number) => number) =>
  cel(`M${f(116)} 194 L${f(60)} 150 C${f(48)} 150 ${f(38)} 160 ${f(36)} 172 C${f(46)} 190 ${f(48)} 208 ${f(44)} 226 ` +
    `C${f(58)} 224 ${f(70)} 230 ${f(76)} 244 C${f(86)} 236 ${f(98)} 238 ${f(104)} 250 Z`, MEMBRANE, left(f) ? 66 : 254, 168, 0.9) +
  `<path d="M${f(60)} 152 L${f(42)} 178 M${f(62)} 154 L${f(50)} 220 M${f(64)} 156 L${f(80)} 236" fill="none" stroke="${celShade(MEMBRANE)}" stroke-width="2" stroke-linecap="round"/>` +
  rope(`M${f(116)} 194 L${f(60)} 151`, PTERO, 7) +
  `<path d="M${f(60)} 151 L${f(52)} 140 L${f(64)} 145 Z" fill="#fffdf7" ${s2}/>` +
  hi(`M${f(104)} 182 L${f(72)} 158`, 2.5, 0.6);
const ptClaws = (xs: number[]) => xs.map((x) => `<path d="M${x - 3} 273 L${x} 279 L${x + 3} 273 Z" fill="#fffdf7" ${s2}/>`).join('');
const pterosaur = (): CostumeLayer => ({
  back: pair(ptWing),
  body: tint(PTERO) + belly('#f6d3e2'),
  head:
    hood(PTERO) +
    // the reptile's head in profile along the hood's top: the long crest sweeping back off it, out past the hood's right side
    cel('M176 50 C204 34 244 24 286 24 C268 38 242 54 214 66 C200 64 186 58 176 50 Z', PTERO, 200, 36, 0.9) +
    `<path d="M196 46 C222 36 252 30 276 28" fill="none" stroke="${celShade(PTERO)}" stroke-width="2" stroke-linecap="round"/>` +
    // and the long straight beak pointing forward, to his left, its mouth line along it
    cel('M190 54 C152 50 108 48 62 54 C102 62 148 72 190 78 C196 70 196 60 190 54 Z', MEMBRANE, 120, 54, 0.9) +
    `<path d="M186 66 C150 62 112 58 76 56" fill="none" ${s2}/>` + hi('M176 54 C146 52 112 52 84 54', 2.5, 0.6) +
    `<circle cx="206" cy="62" r="7.5" fill="#fffdf7" ${s2}/><circle cx="204.6" cy="62.6" r="4.2" fill="${DARK}"/><circle cx="203" cy="60.6" r="1.5" fill="#fff"/>` +
    `<ellipse cx="226" cy="76" rx="7" ry="4.5" fill="#ff9d8a" opacity=".5"/>`,
  tail: '', // its wings are the silhouette: his own tail is hidden
  pawL: gloveL(PTERO) + ptClaws([130, 138, 146]),
  pawR: gloveR(PTERO) + ptClaws([174, 182, 190]),
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 3. 喜鹊 magpie: a blue-black hood with small white cheek patches and white-ringed eyes, a short dark beak, a white belly and
//    white shoulder patches, and its very long tail, two feathers with a blue sheen, sweeping out and up to his right.
//    (Not 犀鸟: no bill or casque, the long tail. Not 企鹅: blue-black all over, the tail. Not 鹦鹉: black and white, no gold.)
const MAGPIE = '#2a4f8f';
const SHEEN = '#4c7fd6';
const magpie = (): CostumeLayer => ({
  back: '',
  body: tint(MAGPIE) +
    cel('M126 196 C142 206 178 206 194 196 C208 216 208 254 188 264 C170 272 150 272 132 264 C112 254 112 216 126 196 Z', '#ffffff', 140, 208, 0.92) +
    // the white shoulder patches, the wings' flash, and a dark wing below each
    pair((f) => cel(`M${f(112)} 190 C${f(96)} 202 ${f(90)} 222 ${f(94)} 240 C${f(104)} 236 ${f(114)} 226 ${f(118)} 212 C${f(122)} 202 ${f(122)} 194 ${f(118)} 190 Z`, '#ffffff', left(f) ? 102 : 206, 200, 0.9) +
      `<path d="M${f(94)} 240 C${f(98)} 252 ${f(108)} 258 ${f(118)} 256 C${f(118)} 244 ${f(118)} 230 ${f(118)} 214 C${f(112)} 228 ${f(104)} 236 ${f(94)} 240 Z" fill="${MAGPIE}" ${s2}/>` +
      `<path d="M${f(104)} 246 C${f(108)} 250 ${f(112)} 250 ${f(116)} 248" fill="none" stroke="${SHEEN}" stroke-width="2" stroke-linecap="round"/>`),
  head: hood(MAGPIE) +
    // small white cheek patches low on the hood's sides, outside the face opening
    pair((f) => `<path d="M${f(50)} 140 C${f(50)} 156 ${f(58)} 170 ${f(70)} 178 C${f(70)} 164 ${f(70)} 150 ${f(70)} 136 C${f(64)} 130 ${f(54)} 132 ${f(50)} 140 Z" fill="#ffffff" ${s2}/>`) +
    `<path d="M196 44 C214 50 230 60 240 72" fill="none" stroke="${SHEEN}" stroke-width="3" stroke-linecap="round" opacity=".9"/>` +
    ringEye(134, 56, 7) + ringEye(186, 56, 7) +
    // the short dark beak on the brow
    cel('M148 62 C152 56 168 56 172 62 C170 70 164 76 160 82 C156 76 150 70 148 62 Z', '#1f2430', 154, 60, 0.85, '#141821') +
    `<path d="M150 66 Q160 70 170 66" fill="none" stroke="#5a6a8a" stroke-width="1.4" stroke-linecap="round"/>`,
  // the very long tail: two paddle-ended feathers out on the diagonal to his right, the upper one in its blue sheen
  tail: cel('M206 252 C236 250 256 236 268 214 C274 202 280 196 288 198 C290 210 284 222 274 232 C258 250 234 262 208 262 Z', celShade(MAGPIE), 222, 250, 0.92, '#1c3561') +
    cel('M206 246 C230 238 248 216 260 184 C266 170 274 160 284 162 C290 172 286 186 278 198 C262 226 238 246 208 256 Z', SHEEN, 226, 226, 0.92, MAGPIE) +
    `<path d="M216 246 C238 234 254 212 266 184" fill="none" stroke="#8fb4f0" stroke-width="2.4" stroke-linecap="round"/>`,
  pawL: gloveL('#3d3845'),
  pawR: gloveR('#3d3845'),
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 4. 企鹅 penguin (the worked example): a fluffy grey chick's hood under a dark cap that sweeps to both cheeks, a tuft,
//    white-ringed eyes and a small beak; a white belly, flippers, orange feet.
const PENGUIN = '#c7ccd6';
const PG_CAP = '#3d3845';
const penguin = (): CostumeLayer => ({
  back: '',
  body: tint(PENGUIN) + belly('#ffffff') +
    pair((f) => cel(`M${f(112)} 196 C${f(94)} 212 ${f(88)} 236 ${f(96)} 254 C${f(104)} 252 ${f(110)} 238 ${f(116)} 216 Z`, PENGUIN, Math.min(f(112), f(88)) + 8, 210, 0.88)),
  head: hood(PENGUIN) +
    `<path d="M48 120 C46 62 100 30 160 30 C220 30 274 62 272 120 C258 98 232 84 200 80 C186 78 172 80 160 82 C148 80 134 78 120 80 C88 84 62 98 48 120 Z" fill="${PG_CAP}" ${S}/>` +
    hi('M84 66 C98 50 118 42 140 38', 5, 0.3) +
    `<path d="M150 32 C146 20 158 14 160 24 C164 14 176 18 170 32 Z" fill="${PG_CAP}" ${s2}/>` +
    pair((f) => `<circle cx="${f(132)}" cy="58" r="7.5" fill="#fffdf7"/><circle cx="${f(133)}" cy="59" r="4.2" fill="${DARK}"/><circle cx="${f(134.5)}" cy="57" r="1.5" fill="#fff"/>`) +
    `<path d="M151 66 L169 66 L160 77 Z" fill="#ffb03d" ${s2}/>`,
  tail: `<path d="M208 256 L230 262 L212 270 Z" fill="${PG_CAP}" ${S}/>`,
  // orange feet in his paws' place: flat, three toes
  ...feet((f) => cel(`M${f(118)} 278 C${f(118)} 266 ${f(128)} 259 ${f(138)} 259 C${f(148)} 259 ${f(158)} 266 ${f(158)} 278 L${f(156)} 285 L${f(148)} 281 L${f(138)} 287 L${f(128)} 281 L${f(120)} 285 Z`, '#ff9f43', Math.min(f(118), f(158)) + 8, 263, 0.9)),
  ...mitts(PG_CAP),
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 5. 鲨鱼 shark: a blue hood with a tall dorsal fin on its crown and a friendly row of white teeth along the top of the face
//    opening (his face looks out of the shark's mouth), small dark eyes; a white belly, gills and fins, a crescent tail.
//    (Not 鼠: the fin and the teeth, blue.)
const SHARK = '#4f7fb8';
const SHARK_BELLY = '#f4f7fb';
/** The top of the face opening (the ellipse 160,137 r 90×61) at x. */
const openingTop = (x: number) => 137 - 61 * Math.sqrt(1 - ((x - 160) / 90) ** 2);
const shark = (): CostumeLayer => ({
  back: '',
  body: tint(SHARK) +
    cel('M126 198 C142 208 178 208 194 198 C208 218 208 254 188 264 C170 272 150 272 132 264 C112 254 112 218 126 198 Z', SHARK_BELLY, 140, 210, 0.92) +
    // the gills on each side and a pectoral fin standing out from each
    pair((f) => [0, 9, 18].map((d) => `<path d="M${f(108 + d * 0.4)} ${206 + d} C${f(114 + d * 0.4)} ${212 + d} ${f(114 + d * 0.4)} ${220 + d} ${f(108 + d * 0.4)} ${226 + d}" fill="none" stroke="${celShade(SHARK)}" stroke-width="2.4" stroke-linecap="round"/>`).join('') +
      cel(`M${f(98)} 228 C${f(84)} 236 ${f(72)} 250 ${f(68)} 264 C${f(82)} 262 ${f(96)} 254 ${f(106)} 246 Z`, SHARK, left(f) ? 86 : 234, 240, 0.88)),
  head:
    hood(SHARK) +
    // the dorsal fin, standing on the crown and swept back
    cel('M134 66 C142 50 160 30 198 22 C188 38 186 54 190 70 C172 74 150 72 134 66 Z', SHARK, 154, 44, 0.9) +
    hi('M146 56 C156 44 168 36 182 30', 3, 0.55) +
    // the teeth, hanging from the top of the face opening, above his eyes
    [118, 132, 146, 160, 174, 188, 202].map((x) => {
      const y = r1(openingTop(x));
      return `<path d="M${x - 6.5} ${r1(y - 3)} L${x + 6.5} ${r1(y - 3)} L${x} ${r1(y + 8)} Z" fill="#ffffff" ${s2}/>`;
    }).join('') +
    eyes(52, 64, 5),
  // the crescent tail fin, its upper lobe the taller
  tail: cel('M204 252 C224 250 240 240 248 222 C252 204 262 190 278 182 C272 200 268 214 270 228 C274 240 280 250 286 260 C268 258 254 258 240 262 C226 264 212 262 204 258 Z', SHARK, 226, 236, 0.9),
  pawL: gloveL(SHARK),
  pawR: gloveR(SHARK),
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 6. 独角兽 unicorn: a lilac hood with a gold spiral horn rising from its brow between two small ears, sleepy lashed eyes, and a
//    rainbow mane falling down its right side; a rainbow tail; gold hooves. (Not 兔: the horn and mane, lilac.)
const UNICORN = '#cdb0f2';
const HORN = '#f2c230';
const RAINBOW = ['#ff8fa3', '#ffd23f', '#7fdc7a', '#7fc0ea'];
const unicorn = (): CostumeLayer => ({
  back: '',
  body: tint(UNICORN) + belly('#f6eefe'),
  head:
    // two small pointed ears, behind the hood
    pair((f) => cel(`M${f(98)} 58 C${f(96)} 44 ${f(98)} 32 ${f(104)} 24 C${f(114)} 30 ${f(122)} 40 ${f(126)} 50 Z`, UNICORN, left(f) ? 104 : 208, 36, 0.88) +
      `<path d="M${f(104)} 50 C${f(103)} 42 ${f(104)} 36 ${f(106)} 32 C${f(111)} 37 ${f(115)} 42 ${f(117)} 48 Z" fill="#f6c2dc"/>`) +
    hood(UNICORN) +
    // the rainbow mane, from the crown down over the hood's right side
    RAINBOW.map((c, k) => rope(`M${170 + k * 8} ${32 + k * 6} C${226 - k * 2} ${26 + k * 8} ${282 - k * 8} ${66 + k * 4} ${280 - k * 8} ${120 + k * 2} C${279 - k * 8} ${146} ${272 - k * 8} ${162 - k * 2} ${262 - k * 8} ${174 - k * 4}`, c, 7)).join('') +
    // the spiral horn
    cel('M146 66 C150 52 156 38 160 24 C164 38 170 52 174 66 C164 70 156 70 146 66 Z', HORN, 154, 40, 0.88) +
    `<path d="M149 58 L171 52 M152 46 L167 42 M155 36 L164 33" fill="none" ${s2}/>` +
    // sleepy lashed eyes and pink cheeks
    pair((f) => `<path d="M${f(118)} 62 Q${f(128)} 70 ${f(138)} 62" fill="none" stroke="${DARK}" stroke-width="2.6" stroke-linecap="round"/>` +
      `<path d="M${f(120)} 64 L${f(116)} 68 M${f(124)} 66 L${f(122)} 71" fill="none" stroke="${DARK}" stroke-width="1.8" stroke-linecap="round"/>` +
      `<ellipse cx="${f(110)}" cy="76" rx="7" ry="4.5" fill="#ff9dbb" opacity=".55"/>`),
  // the rainbow tail
  tail: RAINBOW.map((c, k) => rope(`M206 ${250 + k * 3} C${234 + k * 4} ${258 + k * 2} ${262 + k * 2} ${246 - k * 2} ${266 + k * 4} ${222 + k * 6} C${268 + k * 4} ${208 + k * 6} ${260 + k * 3} ${198 + k * 6} ${252 + k * 3} ${200 + k * 6}`, c, 7)).join(''),
  pawL: gloveL(HORN),
  pawR: gloveR(HORN),
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 7. 猫头鹰 owl: a dusky violet hood with two feather tufts, a pale facial disc with big amber eyes and a small hooked beak; a
//    cream chest with V-feather marks, wings down its sides and a short fan tail; a little open book at his side, held in his
//    right paw. (Not 水獭: violet, the disc and the book.)
const OWL = '#7a6a9a';
const OWL_CREAM = '#f3e6c8';
const AMBER = '#ffb03d';
const BOOK = '#3f6fd6';
const owl = (): CostumeLayer => ({
  back: '',
  body: tint(OWL) +
    cel('M126 196 C142 206 178 206 194 196 C208 216 208 254 188 264 C170 272 150 272 132 264 C112 254 112 216 126 196 Z', OWL_CREAM, 140, 208, 0.92) +
    [[146, 222], [174, 222], [160, 236], [140, 248], [180, 248]].map(([x, y]) => `<path d="M${x! - 5} ${y} L${x} ${y! + 5} L${x! + 5} ${y}" fill="none" stroke="#c9b48e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`).join('') +
    // the wings down his sides, their feather ends notched
    pair((f) => cel(`M${f(112)} 190 C${f(94)} 202 ${f(88)} 226 ${f(92)} 250 L${f(98)} 244 L${f(104)} 252 L${f(110)} 244 L${f(118)} 250 C${f(118)} 228 ${f(122)} 208 ${f(134)} 196 Z`, OWL, left(f) ? 104 : 196, 204, 0.9) +
      `<path d="M${f(102)} 214 C${f(100)} 222 ${f(100)} 230 ${f(102)} 236" fill="none" stroke="${celShade(OWL)}" stroke-width="2" stroke-linecap="round"/>`),
  head:
    hood(OWL) +
    // the feather tufts at the hood's top corners, leaning out
    pair((f) => cel(`M${f(82)} 70 C${f(76)} 54 ${f(72)} 38 ${f(76)} 24 L${f(86)} 34 L${f(92)} 26 L${f(100)} 40 L${f(108)} 36 C${f(110)} 50 ${f(104)} 62 ${f(96)} 70 Z`, OWL, left(f) ? 84 : 236, 38, 0.86)) +
    // the facial disc: two pale rounds with big amber eyes, a brow line over them and the beak between
    pair((f) => cel(disc(f(139), 56, 17), OWL_CREAM, f(139) - 6, 49, 0.9) +
      `<circle cx="${f(139)}" cy="56" r="9.5" fill="${AMBER}" ${s2}/><circle cx="${f(139.5)}" cy="56.5" r="5.2" fill="${DARK}"/><circle cx="${f(141.6)}" cy="53.8" r="1.9" fill="#fff"/>`) +
    `<path d="M120 40 C134 34 150 38 160 48 C170 38 186 34 200 40" fill="none" stroke="${celShade(OWL)}" stroke-width="3" stroke-linecap="round"/>` +
    cel('M153 62 C155 56 165 56 167 62 C167 70 163 78 160 84 C157 78 153 70 153 62 Z', '#ffc94a', 157, 60, 0.85),
  // a short fan of tail feathers
  tail: cel('M204 250 C222 246 238 250 248 260 L240 262 L244 270 L232 268 L230 274 L218 268 C212 266 206 262 204 256 Z', OWL, 220, 254, 0.88),
  pawL: gloveL(OWL),
  // the little open book at his side, its covers blue, its pages cream, his paw closing round its spine
  pawR: cel('M194 238 L214 233 L236 229 L238 258 L214 264 L196 262 Z', BOOK, 204, 236, 0.92) +
    `<path d="M198 240 L214 236 L214 260 L199 258 Z M214 236 L233 232 L234 255 L214 260 Z" fill="#fffdf7" ${s2}/>` +
    `<path d="M202 245 L210 243 M202 250 L210 248 M218 242 L229 239 M218 247 L229 244 M218 252 L226 250" fill="none" stroke="#b7aec9" stroke-width="1.4" stroke-linecap="round"/>` +
    pawOverR,
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 8. 小老虎 tiger cub: a white tiger cub's hood with grey-violet stripes, a small 王 on its brow, round baby ears with pink
//    insides, big blue eyes and a pink nose; stripes down its sides; a ringed white tail; white gloves with pink pads.
//    (Not 虎: white, not orange; round baby ears, blue eyes, the 王 small.)
const CUB = '#f2f0fa';
const STRIPE = '#6b6585';
/** A tapering stripe from the hood's (or body's) outer edge inward: a wedge from (x, y) toward (tx, ty), `w` wide at its root. */
const stripe = (x: number, y: number, tx: number, ty: number, w: number) => {
  const [dx, dy] = [tx - x, ty - y];
  const n = Math.hypot(dx, dy);
  const [nx, ny] = [(-dy / n) * (w / 2), (dx / n) * (w / 2)];
  return `<path d="M${r1(x + nx)} ${r1(y + ny)} Q${r1(x + dx * 0.5 + nx * 0.8)} ${r1(y + dy * 0.5 + ny * 0.8)} ${tx} ${ty} Q${r1(x + dx * 0.5 - nx * 0.8)} ${r1(y + dy * 0.5 - ny * 0.8)} ${r1(x - nx)} ${r1(y - ny)} Z" fill="${STRIPE}"/>`;
};
const tigercub = (): CostumeLayer => ({
  back: '',
  body: tint(CUB) + belly('#ffffff') +
    pair((f) => stripe(f(90), 212, f(116), 218, 10) + stripe(f(88), 232, f(116), 236, 10) + stripe(f(94), 252, f(116), 252, 9)),
  head:
    // round baby ears at the hood's top corners, tucked behind it
    pair((f) => cel(disc(f(92), 40, 15), CUB, f(92) - 5, 35, 0.88) + `<circle cx="${f(93)}" cy="41" r="7.5" fill="#f6c2cc"/>`) +
    hood(CUB) +
    // stripes from the hood's edge inward: on the crown and down both sides
    pair((f) => stripe(f(134), 29, f(140), 50, 9) + stripe(f(118), 33, f(122), 48, 7) + stripe(f(58), 80, f(82), 90, 10) +
      stripe(f(45), 106, f(70), 112, 11) + stripe(f(46), 132, f(70), 132, 10) + stripe(f(52), 162, f(72), 156, 10)) +
    // the small 王 on its brow
    `<g fill="${STRIPE}"><rect x="152" y="38" width="16" height="3.4" rx="1.5"/><rect x="153" y="45" width="14" height="3.4" rx="1.5"/><rect x="151" y="52" width="18" height="3.4" rx="1.5"/><rect x="158.3" y="38" width="3.4" height="17" rx="1.5"/></g>` +
    // big blue cub eyes, a pink nose and a smile
    pair((f) => `<circle cx="${f(128)}" cy="60" r="7.5" fill="#fffdf7" ${s2}/><circle cx="${f(128.6)}" cy="60.6" r="5" fill="#7fc0ea"/><circle cx="${f(129)}" cy="61" r="2.6" fill="${DARK}"/><circle cx="${f(130.6)}" cy="58.4" r="1.6" fill="#fff"/>`) +
    `<path d="M154 66 L166 66 L160 72 Z" fill="#f08aa0" ${s2}/><path d="M160 72 L160 75 M154 77 Q157 79 160 75 Q163 79 166 77" fill="none" ${s2}/>`,
  // the white tail with its dark rings
  tail: ropeTail('M206 250 C236 258 262 242 262 214 C262 202 256 196 250 198', CUB, 11) +
    [[226, 256, 228, 247], [244, 252, 240, 244], [258, 238, 251, 233], [262, 220, 254, 220]].map(([x1, y1, x2, y2]) =>
      `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${STRIPE}" stroke-width="4.5" stroke-linecap="round"/>`).join(''),
  pawL: gloveL(CUB) + `<ellipse cx="138" cy="268" rx="5" ry="3.2" fill="#f6c2cc"/>`,
  pawR: gloveR(CUB) + `<ellipse cx="182" cy="268" rx="5" ry="3.2" fill="#f6c2cc"/>`,
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 9. 小白兔 bunny: a white hood with two long lop ears flopping down its sides (pink inside), a pink nose and a bunny mouth; a
//    round fluffy tail; an orange carrot in his right paw, its leafy end out to his right. (Not 兔: the lop ears and the carrot;
//    it is white by its name.)
const BUNNY = '#fffefa';
const CARROT = '#ff9f43';
const LEAF = '#46b06a';
const bunny = (): CostumeLayer => ({
  back: '',
  body: tint(BUNNY) + belly('#ffffff'),
  head: hood(BUNNY) +
    // the lop ears: from the top of the hood, flopping down over its sides
    pair((f) => cel(`M${f(118)} 40 C${f(92)} 34 ${f(64)} 46 ${f(52)} 72 C${f(42)} 96 ${f(38)} 124 ${f(44)} 148 C${f(50)} 160 ${f(66)} 158 ${f(70)} 146 C${f(72)} 122 ${f(78)} 96 ${f(92)} 72 C${f(100)} 60 ${f(110)} 50 ${f(118)} 40 Z`, BUNNY, left(f) ? 70 : 250, 60, 0.9) +
      `<path d="M${f(98)} 52 C${f(80)} 56 ${f(64)} 74 ${f(56)} 98 C${f(50)} 118 ${f(50)} 134 ${f(54)} 144 C${f(58)} 146 ${f(62)} 144 ${f(62)} 138 C${f(64)} 118 ${f(68)} 96 ${f(80)} 74 C${f(86)} 64 ${f(92)} 58 ${f(98)} 52 Z" fill="#f6c2cc"/>`) +
    eyes(24, 56, 6) +
    `<ellipse cx="160" cy="68" rx="5.5" ry="4.2" fill="#f08aa0" ${s2}/><path d="M160 72 L160 76 M153 79 Q157 81 160 76 Q163 81 167 79" fill="none" ${s2}/>` +
    pair((f) => `<ellipse cx="${f(116)}" cy="70" rx="7" ry="4.5" fill="#ff9dbb" opacity=".5"/>`),
  tail: cel(disc(232, 256, 15), BUNNY, 226, 250, 0.86),
  // the carrot, its point in his fist and its leafy end out to his right, so a raised paw keeps it off his face
  pawR:
    // the leaves first, behind the carrot's top
    `<path d="M240 228 C244 212 252 202 262 196 C262 210 256 222 246 230 Z" fill="${LEAF}" ${s2}/>` +
    `<path d="M242 232 C252 222 264 218 276 220 C270 232 258 236 246 236 Z" fill="${LEAF}" ${s2}/>` +
    `<path d="M236 228 C234 214 236 200 244 190 C248 204 246 218 240 230 Z" fill="${celShade(LEAF)}" ${s2}/>` +
    cel('M188 270 C200 262 220 248 234 226 C240 222 248 226 248 234 C238 254 214 266 190 274 Z', CARROT, 214, 246, 0.9) +
    `<path d="M206 258 L212 264 M220 248 L226 254 M232 236 L238 242" fill="none" stroke="${celShade(CARROT)}" stroke-width="1.8" stroke-linecap="round"/>` +
    hi('M206 254 C218 246 228 236 236 228', 2.5, 0.55) +
    pawOverR,
  hidesEars: true,
});

// the bunny is the zodiac 兔 (parent 2026-10-15: one rabbit, the cuter one): it draws under the zodiac id
export const FAVOURITE_ONESIES: Record<string, () => CostumeLayer> = { babydino, pterosaur, magpie, penguin, shark, unicorn, owl, tigercub, rabbit: bunny };
