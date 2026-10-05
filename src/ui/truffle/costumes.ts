import { costumeById, type Costume } from '../../fun/costumes';
import { BODY, belly, eyes, hood, INK, MUZZLE, num, pair, ropeTail, S, s2, shade, tint } from './costumeKit';
import { MYTH_HOOD, MYTH_OUTFIT } from './mythCostumes';
import { EYE_L, EYE_R, EYE_Y, FUR } from './rig';

// Costume art in Truffle's viewBox (30 20 260 270). Ink outlines match the mascot (3.2px, round joins).
// Redrawn 2026-10-06 (parent: some, like the zodiac ones, were hard to identify): each zodiac hood wears the animal's own
// face, one big shape that names it, and its own tail in place of his; each outfit carries one thing a child knows it by.
interface Animal { behind?: string; front: string; tail: string; body?: string; belly?: string }

/** Each zodiac onesie: behind the hood, on the hood (its face), its tail, and marks on the body. */
const ANIMAL: Record<string, (c: Costume) => Animal> = {
  rat: (c) => ({
    behind: pair((f) => `<circle cx="${f(80)}" cy="54" r="26" fill="${c.color}" ${S}/><circle cx="${f(80)}" cy="54" r="15" fill="#f6c2cc"/>`),
    front: eyes() + `<circle cx="160" cy="69" r="5" fill="#f08aa0" ${s2}/>` +
      pair((f) => `<path d="M${f(148)} 68 L${f(116)} 62 M${f(148)} 72 L${f(116)} 76" fill="none" ${s2}/>`),
    tail: ropeTail('M210 250 C242 260 270 246 270 222 C270 204 258 196 248 202', '#f3b8c2', 5),
  }),
  ox: (c) => ({
    behind: pair((f) => `<path d="M${f(98)} 70 C${f(70)} 66 ${f(50)} 52 ${f(48)} 32 C${f(62)} 46 ${f(80)} 50 ${f(106)} 52 Z" fill="#f1e2bd" ${S}/>`),
    front: `<path d="M84 72 C78 54 98 42 114 50 C124 58 112 74 98 80 Z" fill="${INK}"/><path d="M214 40 C228 40 238 52 232 62 C222 66 210 56 214 40 Z" fill="${INK}"/>` +
      eyes(24) + `<ellipse cx="160" cy="71" rx="25" ry="13" fill="#f6b9c4" ${S}/><ellipse cx="151" cy="71" rx="3.2" ry="4" fill="${INK}"/><ellipse cx="169" cy="71" rx="3.2" ry="4" fill="${INK}"/>` +
      `<path d="M150 83 Q160 96 170 83" fill="none" stroke="#e0a82e" stroke-width="4" stroke-linecap="round"/>`,
    body: `<path d="M100 214 C112 204 128 212 124 228 C118 240 100 236 100 214 Z M206 238 C220 236 224 252 212 258 C200 260 196 244 206 238 Z" fill="${INK}"/>`,
    tail: ropeTail('M210 250 C238 256 258 240 258 214', c.color, 5) + `<path d="M252 214 C250 198 266 196 266 212 C266 222 254 224 252 214 Z" fill="${INK}"/>`,
  }),
  tiger: (c) => ({
    behind: pair((f) => `<circle cx="${f(102)}" cy="44" r="18" fill="${c.color}" ${S}/><circle cx="${f(102)}" cy="44" r="9" fill="#fffdf7"/>`),
    // 王 on the forehead: how Chinese pictures mark a tiger
    front: `<g fill="#3a2a20"><rect x="146" y="35" width="28" height="5" rx="2"/><rect x="148" y="46" width="24" height="5" rx="2"/><rect x="145" y="57" width="30" height="5" rx="2"/><rect x="157.5" y="35" width="5" height="27" rx="2"/></g>` +
      eyes(34, 58) + pair((f) => `<path d="M${f(46)} 118 L${f(72)} 124 L${f(46)} 132 Z M${f(50)} 148 L${f(74)} 152 L${f(52)} 160 Z" fill="#3a2a20"/>`),
    body: pair((f) => `<path d="M${f(94)} 212 L${f(120)} 220 L${f(96)} 228 Z M${f(92)} 238 L${f(118)} 243 L${f(96)} 251 Z" fill="#3a2a20"/>`),
    tail: ropeTail('M210 250 C240 258 266 240 262 210 C260 198 252 194 246 196', c.color, 10) +
      `<path d="M232 254 L236 244 M252 244 L248 236 M262 222 L254 220" stroke="#3a2a20" stroke-width="5" stroke-linecap="round"/>`,
  }),
  rabbit: (c) => ({
    // tall ears rising from the top of the hood in a V (in front of it, so all of each ear shows)
    front: pair((f) => {
      const a = f(88) < 160 ? -50 : 50;
      return `<ellipse cx="${f(88)}" cy="46" rx="12" ry="28" transform="rotate(${a} ${f(88)} 46)" fill="${c.color}" ${S}/><ellipse cx="${f(88)}" cy="47" rx="5" ry="19" transform="rotate(${a} ${f(88)} 47)" fill="#f6c2cc"/>`;
    }) + eyes(22, 58) + `<path d="M154 68 L166 68 L160 75 Z" fill="#f08aa0" ${s2}/>`,
    tail: `<circle cx="226" cy="236" r="17" fill="${c.color}" ${S}/><circle cx="220" cy="230" r="5" fill="#fff"/>`,
  }),
  dragon: () => ({
    behind: pair((f) => ropeTail(`M${f(104)} 60 C${f(96)} 44 ${f(88)} 36 ${f(76)} 30 M${f(92)} 44 L${f(76)} 48`, '#ffc94a', 4.5)),
    front: [116, 138, 160, 182, 204].map((x, i) => {
      const y = [38, 31, 28, 31, 38][i]!;
      return `<path d="M${x - 7} ${y + 6} L${x} ${y - 5} L${x + 7} ${y + 6} Z" fill="#ff9f43" ${s2}/>`;
    }).join('') + eyes(24, 52) + `<ellipse cx="160" cy="70" rx="22" ry="11" fill="#86d79a" ${S}/><circle cx="152" cy="69" r="2.6" fill="${INK}"/><circle cx="168" cy="69" r="2.6" fill="${INK}"/>` +
      pair((f) => ropeTail(`M${f(140)} 74 C${f(118)} 80 ${f(98)} 70 ${f(86)} 78`, '#ffc94a', 3)),
    belly: `<ellipse cx="160" cy="236" rx="36" ry="30" fill="#ffe08a" ${s2}/><path d="M130 222 Q160 230 190 222 M126 238 Q160 246 194 238 M132 254 Q160 260 188 254" fill="none" ${s2}/>`,
    tail: ropeTail('M210 250 C240 258 268 238 260 208', '#3fae66', 10) +
      `<path d="M236 252 L244 242 L246 256 Z M256 232 L268 228 L262 240 Z M258 212 L270 206 L266 218 Z" fill="#ff9f43" ${s2}/>`,
  }),
  snake: () => ({
    // the hood is the snake's head: slit eyes and a forked tongue
    front: [118, 139, 160, 181, 202].map((x, i) => {
      const y = [44, 36, 33, 36, 44][i]!;
      return `<path d="M${x} ${y - 6} L${x + 6} ${y} L${x} ${y + 6} L${x - 6} ${y} Z" fill="#6f8f22"/>`;
    }).join('') +
      pair((f) => `<circle cx="${f(132)}" cy="58" r="8" fill="#ffe24a" ${s2}/><ellipse cx="${f(132)}" cy="58" rx="1.8" ry="6" fill="${INK}"/>`) +
      `<circle cx="154" cy="70" r="2.2" fill="${INK}"/><circle cx="166" cy="70" r="2.2" fill="${INK}"/>`,
    body: [[116, 212], [140, 204], [180, 204], [204, 212], [110, 240], [210, 240]].map(([x, y]) => `<path d="M${x} ${y! - 7} L${x! + 7} ${y} L${x} ${y! + 7} L${x! - 7} ${y} Z" fill="#6f8f22"/>`).join(''),
    tail: ropeTail('M210 252 C246 264 272 242 264 218 C258 202 236 204 240 220 C243 232 256 230 254 220', '#b4cf4a', 9),
  }),
  horse: (c) => ({
    behind: pair((f) => `<path d="M${f(98)} 50 L${f(92)} 24 L${f(120)} 38 Z" fill="${c.color}" ${S}/>`),
    front: `<path d="M114 46 Q120 24 134 32 Q142 18 152 29 Q160 14 168 29 Q178 18 186 32 Q200 24 206 46 Q190 38 160 38 Q130 38 114 46 Z" fill="#5a3420" ${s2}/>` +
      eyes(26, 56) + MUZZLE('#ecc596'),
    tail: `<path d="M210 246 C236 236 262 238 272 260 C262 254 254 254 250 262 C246 252 236 250 230 258 C228 250 218 252 212 256 Z" fill="#5a3420" ${S}/>`,
  }),
  goat: () => ({
    // curly horns and woolly curls round the face
    front: [[96, 94], [114, 82], [136, 75], [160, 72], [184, 75], [206, 82], [224, 94]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#f6ecd2" ${s2}/>`).join('') +
      pair((f) => `<circle cx="${f(64)}" cy="80" r="19" fill="#a49c90" ${S}/><path d="M${f(64)} 80 m-9 0 a9 9 0 1 1 9 9 a5 5 0 1 1 -4 -6" fill="none" ${s2}/>`) +
      eyes(20, 50) + `<path d="M150 197 Q160 226 170 197 Z" fill="#f6ecd2" ${s2}/>`,
    tail: `<path d="M208 244 C220 228 236 222 244 228 C236 236 226 244 214 252 Z" fill="#f6ecd2" ${S}/>`,
  }),
  monkey: (c) => ({
    // big round ears out at the sides, and the monkey's heart-shaped face with its eyes in it
    front: pair((f) => `<circle cx="${f(56)}" cy="132" r="20" fill="${c.color}" ${S}/><circle cx="${f(56)}" cy="132" r="11" fill="#e9c39a"/>`) +
      `<path d="M160 82 C124 78 110 42 134 32 C147 27 156 35 160 42 C164 35 173 27 186 32 C210 42 196 78 160 82 Z" fill="#e9c39a" ${S}/>` +
      eyes(17, 52, 5.5) + `<circle cx="155" cy="67" r="2" fill="${INK}"/><circle cx="165" cy="67" r="2" fill="${INK}"/><path d="M150 73 Q160 79 170 73" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    tail: ropeTail('M210 250 C244 256 268 232 258 208 C252 194 234 196 236 210 C238 220 250 218 248 210', c.color, 7),
  }),
  rooster: () => ({
    front: `<path d="M130 52 Q128 24 145 34 Q150 16 162 31 Q172 18 179 35 Q194 28 190 52 Z" fill="#b3171d" ${S}/>` +
      eyes(28, 60) + `<path d="M150 66 L170 66 L160 82 Z" fill="#ffc94a" ${S}/><ellipse cx="160" cy="90" rx="5" ry="8" fill="#b3171d" ${s2}/>`,
    tail: [['M210 250 C230 226 250 208 270 214', '#2f5a3a'], ['M210 250 C236 236 258 230 276 240', '#1f2a24'], ['M210 250 C230 214 238 196 254 192', '#b3171d']]
      .map(([d, col]) => ropeTail(d!, col!, 9)).join(''),
  }),
  dog: () => ({
    front: `<ellipse cx="184" cy="54" rx="13" ry="11" fill="#9c6a3a"/>` + eyes() +
      `<path d="M149 64 Q160 59 171 64 Q169 77 160 80 Q151 77 149 64 Z" fill="${INK}"/>` +
      pair((f) => `<ellipse cx="${f(54)}" cy="126" rx="19" ry="40" transform="rotate(${f(54) < 160 ? 16 : -16} ${f(54)} 126)" fill="#9c6a3a" ${S}/>`),
    tail: ropeTail('M210 248 C232 244 246 228 250 206', '#e8c27a', 10),
  }),
  pig: (c) => ({
    behind: pair((f) => `<path d="M${f(94)} 54 L${f(88)} 26 L${f(118)} 40 Z" fill="${c.color}" ${S}/><path d="M${f(94)} 54 L${f(100)} 38 L${f(118)} 40" fill="#f590ab" ${s2}/>`),
    front: eyes(26, 50) + `<ellipse cx="160" cy="66" rx="21" ry="13" fill="#ff8fab" ${S}/><ellipse cx="153" cy="66" rx="3" ry="4.4" fill="${INK}"/><ellipse cx="167" cy="66" rx="3" ry="4.4" fill="${INK}"/>`,
    tail: ropeTail('M210 248 C230 252 244 240 238 230 C232 222 222 232 230 238 C238 244 252 236 254 224', '#ffb3c7', 5),
  }),
};

interface Outfit { back?: string; body: string; head: string; hidesEars?: boolean }

/** Outfits: behind him, over his body, on his head. */
const OUTFIT: Record<string, (c: Costume) => Outfit> = {
  astronaut: (c) => ({
    body: tint(c.color) + `<rect x="136" y="214" width="48" height="30" rx="6" fill="#bfe0ff" ${s2}/><circle cx="148" cy="229" r="4" fill="#ff5532"/><circle cx="162" cy="229" r="4" fill="#ffc94a"/><circle cx="176" cy="229" r="4" fill="#7fdc7a"/>`,
    head: `<path d="M246 66 L266 42" ${S}/><circle cx="267" cy="40" r="6" fill="#ff5532" ${s2}/>` +
      `<ellipse cx="160" cy="122" rx="118" ry="100" fill="#bfe0ff" fill-opacity=".22" ${S}/><path d="M82 70 C98 50 122 40 146 38" fill="none" stroke="#fffdf7" stroke-width="7" stroke-linecap="round" opacity=".9"/>`,
  }),
  chef: (c) => ({
    body: `<path d="M124 196 L196 196 L206 268 C180 276 140 276 114 268 Z" fill="${c.color}" ${S}/><path d="M124 210 C110 206 100 214 98 224 M196 210 C210 206 220 214 222 224" fill="none" ${s2}/>` +
      `<rect x="146" y="230" width="28" height="18" rx="4" fill="none" ${s2}/>` +
      `<path d="M214 262 L234 206" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M214 262 L234 206" stroke="#c98f55" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="237" cy="198" rx="9" ry="13" fill="#c98f55" ${S}/>`,
    // a tall, puffed toque on a pleated band
    head: `<path d="M114 62 C96 60 92 34 114 32 C114 20 136 18 146 26 C152 16 170 16 176 26 C186 18 206 22 206 34 C226 34 226 60 206 62 Z" fill="${c.color}" ${S}/>` +
      `<path d="M134 34 C134 44 138 52 142 58 M160 30 L160 58 M186 34 C186 44 182 52 178 58" stroke="#d9d4cc" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
      `<path d="M112 58 L208 58 L208 76 C176 70 144 70 112 76 Z" fill="${c.color}" ${S}/><path d="M124 60 v13 M140 60 v11 M156 60 v10 M172 60 v10 M188 60 v11 M200 60 v12" stroke="#d9d4cc" stroke-width="2"/>` +
      `<path d="M104 36 C108 28 116 24 124 24" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  }),
  wizard: (c) => ({
    body: tint(c.color) + `<path d="M160 214 l5 10 11 2 -8 8 2 11 -10 -5 -10 5 2 -11 -8 -8 11 -2 Z" fill="#ffc94a" ${s2}/>` +
      `<path d="M100 262 L76 214" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M74 210 l3 7 8 1 -6 5 2 8 -7 -4 -7 4 2 -8 -6 -5 8 -1 Z" fill="#ffc94a" ${s2}/>`,
    // a tall pointed hat whose tip flops over, a gold band, stars
    head: `<ellipse cx="160" cy="68" rx="80" ry="13" fill="${shade(c.color, 0.15)}" ${S}/>` +
      `<path d="M106 66 C118 52 130 34 148 26 C166 18 196 22 230 40 C214 40 196 42 186 48 C196 54 208 60 214 66 Z" fill="${c.color}" ${S}/>` +
      `<path d="M110 60 C140 52 180 52 210 60 L214 66 C180 58 140 58 106 66 Z" fill="#ffc94a" ${s2}/>` +
      `<path d="M150 46 l2 5 5 1 -4 3 1 5 -4 -3 -4 3 1 -5 -4 -3 5 -1 Z M182 34 l1.6 4 4 .8 -3 2.4 .8 4 -3.4 -2.4 -3.4 2.4 .8 -4 -3 -2.4 4 -.8 Z" fill="#ffc94a"/>` +
      `<circle cx="230" cy="41" r="5" fill="#ffc94a" ${s2}/><path d="M124 50 C132 40 140 34 148 31" stroke="#fff" stroke-opacity=".45" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  }),
  explorer: (c) => ({
    body: `<path d="M110 190 C96 210 94 240 104 258 L136 262 L140 198 Z M210 190 C224 210 226 240 216 258 L184 262 L180 198 Z" fill="${c.color}" ${S}/>` +
      `<path d="M116 194 L204 250" stroke="#7a5a2c" stroke-width="6" stroke-linecap="round"/><rect x="196" y="236" width="24" height="20" rx="4" fill="#b08a4e" ${s2}/>` +
      `<circle cx="149" cy="214" r="8" fill="${INK}"/><circle cx="171" cy="214" r="8" fill="${INK}"/><rect x="155" y="210" width="10" height="7" fill="${INK}"/><circle cx="149" cy="214" r="3.5" fill="#bfe0ff"/><circle cx="171" cy="214" r="3.5" fill="#bfe0ff"/>`,
    // a domed sun helmet: a curved brim, a band, a highlight
    head: `<path d="M76 66 C108 54 212 54 244 66 C232 80 88 80 76 66 Z" fill="${shade(c.color, 0.15)}" ${S}/>` +
      `<path d="M108 64 C106 30 214 30 212 64 C180 58 140 58 108 64 Z" fill="${c.color}" ${S}/>` +
      `<path d="M108 58 C140 52 180 52 212 58 L212 66 C180 60 140 60 108 66 Z" fill="#7a5a2c"/><circle cx="160" cy="36" r="4" fill="${shade(c.color, 0.3)}"/>` +
      `<path d="M120 50 C124 40 134 34 146 32" stroke="#fff" stroke-opacity=".5" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  }),
  pirate: (c) => ({
    body: tint('#fffdf7') + [212, 232, 252].map((y) => `<rect x="${y === 252 ? 118 : 108}" y="${y}" width="${y === 252 ? 84 : 104}" height="8" rx="4" fill="${c.color}"/>`).join(''),
    // an eye-patch over his right eye, and a three-cornered hat with a gold edge and a skull
    head: `<path d="M84 86 L190 108 M216 128 L252 140" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/><ellipse cx="${EYE_R}" cy="${EYE_Y}" rx="17" ry="15" fill="${INK}"/>` +
      `<path d="M66 76 C78 42 118 50 160 30 C202 50 242 42 254 76 C226 64 196 72 160 66 C124 72 94 64 66 76 Z" fill="#26232b" ${S}/>` +
      `<path d="M70 72 C96 62 124 68 160 62 C196 68 224 62 250 72" stroke="#e0b13a" stroke-width="3.5" fill="none" stroke-linecap="round"/>` +
      `<circle cx="160" cy="48" r="9" fill="#fffdf7" ${s2}/><path d="M155 46 h3 M162 46 h3 M156 52 q4 3 8 0" stroke="${INK}" stroke-width="1.6" fill="none"/><path d="M150 60 L170 56 M150 56 L170 60" stroke="#fffdf7" stroke-width="3" stroke-linecap="round"/>`,
  }),
  hero: () => ({
    back: `<path d="M112 192 C78 222 66 262 80 288 L240 288 C254 262 242 222 208 192 Z" fill="#d8262e" ${S}/>`,
    // a blue suit with a gold belt and his 字 badge, a red cape, a mask
    body: tint('#3f6fd6') + `<path d="M104 246 C130 254 190 254 216 246 L216 256 C190 264 130 264 104 256 Z" fill="#ffc94a" ${s2}/>` +
      `<circle cx="160" cy="222" r="18" fill="#ffc94a" ${S}/><text x="160" y="223" font-family="WenKai, serif" font-size="22" text-anchor="middle" dominant-baseline="middle" fill="${INK}">字</text>`,
    head: `<path d="M72 112 C100 92 220 92 248 112 C250 128 238 140 222 140 C204 140 196 130 160 130 C124 130 116 140 98 140 C82 140 70 128 72 112 Z ` +
      `M${EYE_L - 17} ${EYE_Y} a17 14 0 1 0 34 0 a17 14 0 1 0 -34 0 Z M${EYE_R - 17} ${EYE_Y} a17 14 0 1 0 34 0 a17 14 0 1 0 -34 0 Z" fill="#d8262e" fill-rule="evenodd" ${S}/>`,
  }),
  pixel: (c) => {
    // pixel sunglasses and a game-controller shirt
    const lens = (cx: number) => [[-18, -10], [-6, -10], [6, -10], [-18, 0], [-6, 0], [6, 0]].map(([dx, dy]) => `<rect x="${cx + dx!}" y="${EYE_Y + dy!}" width="12" height="10" fill="${INK}"/>`).join('') +
      `<rect x="${cx - 14}" y="${EYE_Y - 7}" width="5" height="4" fill="#fff"/>`;
    return {
      body: tint(c.color) + `<rect x="130" y="216" width="60" height="30" rx="14" fill="#6d6875" ${S}/><path d="M144 226 h4 v-4 h4 v4 h4 v4 h-4 v4 h-4 v-4 h-4 Z" fill="${INK}"/><circle cx="172" cy="228" r="4" fill="#ff5532"/><circle cx="180" cy="236" r="4" fill="#3f8bff"/>`,
      head: lens(EYE_L) + lens(EYE_R) + `<rect x="${EYE_L + 18}" y="${EYE_Y - 8}" width="${EYE_R - EYE_L - 36}" height="6" fill="${INK}"/>`,
    };
  },
  raincoat: (c) => ({
    body: tint(c.color) + `<path d="M160 196 L160 268" stroke="${INK}" stroke-width="2.4"/><circle cx="170" cy="214" r="3.5" fill="${INK}"/><circle cx="170" cy="236" r="3.5" fill="${INK}"/><circle cx="170" cy="256" r="3.5" fill="${INK}"/>` +
      `<path d="M98 262 L82 200" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M50 202 C52 172 112 172 114 202 C106 196 98 196 92 202 C86 196 78 196 72 202 C66 196 58 196 50 202 Z" fill="#3f8bff" ${S}/>`,
    head: `<path d="M56 74 C96 50 224 50 264 74 C232 66 88 66 56 74 Z" fill="${c.color}" ${S}/><path d="M108 66 C112 32 208 32 212 66 Z" fill="${c.color}" ${S}/>`,
  }),
  // ---- the parent's additions (2026-10-06) ----
  robot: (c) => ({
    body: tint(c.color) + `<rect x="132" y="210" width="56" height="40" rx="8" fill="#8fa0b4" ${S}/>` +
      `<circle cx="146" cy="222" r="5" fill="#ff5532"/><circle cx="160" cy="222" r="5" fill="#ffc94a"/><circle cx="174" cy="222" r="5" fill="#7fdc7a"/><path d="M142 238 h36" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
    // a boxy helmet with a window for his face, bolts and an antenna
    head: `<path d="M160 30 L160 22" ${S}/><circle cx="160" cy="23" r="4" fill="#ff5532" ${s2}/>` +
      `<path d="M84 30 L236 30 Q270 30 270 64 L270 170 Q270 204 236 204 L84 204 Q50 204 50 170 L50 64 Q50 30 84 30 Z M104 72 L216 72 Q246 72 246 102 L246 168 Q246 196 216 196 L104 196 Q74 196 74 168 L74 102 Q74 72 104 72 Z" fill="${c.color}" fill-rule="evenodd" ${S}/>` +
      pair((f) => `<circle cx="${f(62)}" cy="118" r="6" fill="#ffc94a" ${s2}/>`) + `<path d="M118 46 h84" stroke="#8fa0b4" stroke-width="6" stroke-linecap="round"/>`,
    hidesEars: true,
  }),
  rook: (c) => ({
    // he stands in a chess rook: its tower covers his whole body (rim over his shoulders, flared base), its battlements are his hat
    body: `<path d="M98 190 C92 214 96 236 92 254 L228 254 C224 236 228 214 222 190 Z" fill="${c.color}" ${S}/>` +
      `<path d="M96 212 h128 M94 234 h132 M126 190 v22 M160 190 v22 M194 190 v22 M110 212 v22 M144 212 v22 M178 212 v22 M212 212 v22 M126 234 v20 M160 234 v20 M194 234 v20" stroke="#c4b48f" stroke-width="2.4"/>` +
      `<rect x="84" y="174" width="152" height="20" rx="8" fill="${c.color}" ${S}/><path d="M92 182 h136" stroke="#c4b48f" stroke-width="2.4"/>` +
      `<path d="M90 254 L230 254 L240 270 C200 280 120 280 80 270 Z" fill="${c.color}" ${S}/><path d="M86 264 h148" stroke="#c4b48f" stroke-width="2.4"/>`,
    head: `<path d="M100 74 L100 30 L122 30 L122 44 L134 44 L134 30 L154 30 L154 44 L166 44 L166 30 L186 30 L186 44 L198 44 L198 30 L220 30 L220 74 C186 68 134 68 100 74 Z" fill="${c.color}" ${S}/>` +
      `<path d="M100 56 h120 M120 56 v14 M160 56 v12 M200 56 v14 M140 44 v12 M180 44 v12" stroke="#c4b48f" stroke-width="2.4"/><path d="M104 36 v16" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>`,
  }),
  football: (c) => ({
    // red with white sleeves; number 7
    body: tint(c.color) + pair((f) => `<path d="M${f(114)} 188 C${f(100)} 192 ${f(88)} 204 ${f(84)} 220 L${f(104)} 228 C${f(106)} 214 ${f(112)} 204 ${f(122)} 198 Z" fill="#fffdf7" ${S}/>`) +
      `<path d="M144 190 L160 204 L176 190" fill="none" stroke="#fffdf7" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` +
      num('7', 160, 232, '#fffdf7') + `<rect x="114" y="252" width="92" height="14" rx="6" fill="#fffdf7" ${S}/>` +
      `<circle cx="90" cy="262" r="14" fill="#fffdf7" ${S}/><path d="M90 256 l5 4 -2 6 h-6 l-2 -6 Z" fill="${INK}"/>`,
    head: '',
  }),
  basketball: (c) => ({
    // a vest (his grey shoulders show), number 7, a ball at his side
    body: tint(c.color) + pair((f) => `<ellipse cx="${f(104)}" cy="208" rx="13" ry="20" fill="${FUR}" ${S}/>`) +
      `<path d="M138 192 Q160 212 182 192" fill="none" stroke="#ffc94a" stroke-width="4" stroke-linecap="round"/>` + num('7', 160, 234, '#fffdf7') +
      `<circle cx="88" cy="252" r="16" fill="#f28c28" ${S}/><path d="M72 252 h32 M88 236 v32 M76 240 Q88 252 76 264 M100 240 Q88 252 100 264" fill="none" ${s2}/>`,
    head: `<path d="M68 96 C108 78 212 78 252 96 L250 108 C210 92 110 92 70 108 Z" fill="#fffdf7" ${S}/><path d="M70 101 C110 85 210 85 250 101" fill="none" stroke="${c.color}" stroke-width="3"/>`,
  }),
  gi: (c) => ({
    // a white gi: crossed lapels, a grey belt tied in front
    body: tint(c.color) +
      `<path d="M130 188 L184 246" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M130 188 L184 246" stroke="${c.color}" stroke-width="8" stroke-linecap="round"/>` +
      `<path d="M190 188 L146 236" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M190 188 L146 236" stroke="${c.color}" stroke-width="8" stroke-linecap="round"/>` +
      `<rect x="100" y="240" width="120" height="12" rx="5" fill="#9a9a9a" ${S}/><rect x="151" y="236" width="18" height="19" rx="4" fill="#9a9a9a" ${S}/>` +
      `<path d="M154 254 L144 272 L152 274 L160 256 Z M166 254 L178 272 L170 274 L162 256 Z" fill="#9a9a9a" ${s2}/><path d="M146 268 L152 270" stroke="${INK}" stroke-width="4"/>`,
    head: '',
  }),
};

/** The layers for a costume id, or null for unknown ids (ignored, never worn). `tail` replaces his own tail (it swishes with it). */
export function costumeLayer(id: string | null | undefined): { back: string; body: string; head: string; tail?: string; hidesEars: boolean } | null {
  const c = costumeById(id);
  if (!c) return null;
  if (c.kind === 'onesie') {
    const a: Animal & { back?: string } = (ANIMAL[c.id] ?? MYTH_HOOD[c.id])!(c);
    return {
      back: a.back ?? '',
      body: tint(c.color) + (a.belly ?? belly()) + (a.body ?? ''),
      head: (a.behind ?? '') + hood(c.color) + `<g data-hood-face="${c.id}">${a.front}</g>`,
      tail: a.tail,
      hidesEars: true,
    };
  }
  const o = (OUTFIT[c.id] ?? MYTH_OUTFIT[c.id])!(c);
  return { back: o.back ?? '', body: o.body, head: o.head, hidesEars: !!o.hidesEars };
}
