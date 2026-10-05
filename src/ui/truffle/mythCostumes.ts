// The myth costumes (parent, 2026-10-06: he is really into the Greek myths): every Greek god, the heroes and the creatures,
// and Chinese myth figures, the fortune cat and the lion dance. Each carries the thing a child knows the figure by. Drawn from
// the old stories and pictures, never a film's or a game's version of them.
import type { Costume } from '../../fun/costumes';
import { crown, eyes, helmet, hood, INK, pair, robe, ropeTail, S, s2, staff, tint, toga, wreath } from './costumeKit';

export interface MythOutfit { back?: string; body: string; head: string; hidesEars?: boolean }
export interface MythHood { back?: string; behind?: string; front: string; tail: string; body?: string; belly?: string }

const GOLD = '#f2c230';
const star = (x: number, y: number, r: number, fill = GOLD) => {
  const p: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    p.push(`${(x + rr * Math.cos(a)).toFixed(1)} ${(y + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `<path d="M${p.join(' L')} Z" fill="${fill}" ${s2}/>`;
};
const bolt = (x: number, y: number) => `<path d="M${x} ${y} L${x - 16} ${y + 34} L${x - 4} ${y + 34} L${x - 14} ${y + 66} L${x + 14} ${y + 24} L${x + 2} ${y + 24} L${x + 10} ${y} Z" fill="${GOLD}" ${S}/>`;
const roundShield = (x: number, y: number, r: number, fill: string, mark = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${S}/><circle cx="${x}" cy="${y}" r="${r - 6}" fill="none" ${s2}/>${mark}`;
const cape = (color: string) => `<path d="M112 190 C84 220 74 258 84 284 L236 284 C246 258 236 220 208 190 Z" fill="${color}" ${S}/>`;
/** Small wings, for a cap or sandals: a few feather lobes out from (x, y), pointing to `dir` (-1 left, 1 right). */
const wing = (x: number, y: number, dir: -1 | 1, k = 1) =>
  `<path d="M${x} ${y} C${x + dir * 10 * k} ${y - 16 * k} ${x + dir * 26 * k} ${y - 18 * k} ${x + dir * 30 * k} ${y - 10 * k} C${x + dir * 24 * k} ${y - 8 * k} ${x + dir * 24 * k} ${y - 4 * k} ${x + dir * 28 * k} ${y} C${x + dir * 20 * k} ${y} ${x + dir * 18 * k} ${y + 4 * k} ${x + dir * 22 * k} ${y + 8 * k} C${x + dir * 12 * k} ${y + 8 * k} ${x + dir * 4 * k} ${y + 6 * k} ${x} ${y} Z" fill="#fffdf7" ${s2}/>`;

export const MYTH_OUTFIT: Record<string, (c: Costume) => MythOutfit> = {
  // ---- the gods ----
  zeus: () => ({
    body: toga('#5b6fd6') + bolt(244, 168),
    head: wreath('#e0b13a'),
  }),
  hera: (c) => ({
    // a peacock-feather cape behind her
    back: `<path d="M108 188 C66 206 50 254 62 284 L258 284 C270 254 254 206 212 188 Z" fill="#2fa3a0" ${S}/>` +
      [[74, 252], [100, 226], [220, 226], [246, 252], [92, 274], [228, 274]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="12" fill="#3f6fd6" ${s2}/><circle cx="${x}" cy="${y}" r="4" fill="${GOLD}"/>`).join(''),
    body: robe(c.color, GOLD),
    head: crown(GOLD, 5, 16) + `<circle cx="160" cy="58" r="4" fill="#d8262e"/>`,
  }),
  poseidon: (c) => ({
    body: robe(c.color, '#fffdf7') + `<path d="M112 244 q8 -8 16 0 q8 -8 16 0 q8 -8 16 0 q8 -8 16 0 q8 -8 16 0 q8 -8 16 0" fill="none" stroke="#fffdf7" stroke-width="3"/>` +
      staff(248, 132, GOLD, 5) + `<path d="M232 152 L232 126 M248 146 L248 118 M264 152 L264 126 M232 146 Q248 160 264 146" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M232 152 L232 126 M248 146 L248 118 M264 152 L264 126 M232 146 Q248 160 264 146" fill="none" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/>`,
    head: crown(GOLD, 3, 20),
  }),
  demeter: (c) => ({
    body: robe(c.color, GOLD) +
      [0, 1, 2].map((i) => `<path d="M${74 + i * 8} 268 L${70 + i * 10} 196" stroke="#c99a2e" stroke-width="3"/>` + [0, 1, 2, 3].map((j) => `<ellipse cx="${70 + i * 10}" cy="${196 + j * 9}" rx="4" ry="7" fill="${GOLD}" ${s2}/>`).join('')).join(''),
    head: wreath(GOLD),
  }),
  athena: (c) => ({
    body: robe(c.color, '#3f6fd6') +
      roundShield(78, 230, 32, '#3f6fd6', `<circle cx="68" cy="226" r="8" fill="#fffdf7" ${s2}/><circle cx="88" cy="226" r="8" fill="#fffdf7" ${s2}/><circle cx="68" cy="226" r="3.5" fill="${INK}"/><circle cx="88" cy="226" r="3.5" fill="${INK}"/><path d="M74 236 L78 242 L82 236 Z" fill="${GOLD}"/>`),
    head: helmet('#c9d1dc', '#3f6fd6'),
    hidesEars: true,
  }),
  apollo: (c) => ({
    body: robe('#fbfaf6', c.color) +
      `<path d="M226 266 C214 236 222 206 234 202 C234 218 238 226 248 226 C258 226 262 218 262 202 C274 206 282 236 270 266 Z" fill="${c.color}" ${S}/><path d="M238 222 L238 262 M248 224 L248 262 M258 222 L258 262" stroke="${INK}" stroke-width="1.8"/>`,
    head: [...Array(9)].map((_, i) => {
      const t = Math.PI * (1.1 + (0.8 * i) / 8);
      const [x1, y1, x2, y2] = [160 + 54 * Math.cos(t), 84 + 34 * Math.sin(t), 160 + 74 * Math.cos(t), 84 + 54 * Math.sin(t)];
      return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${Math.max(24, y2).toFixed(1)}" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${Math.max(24, y2).toFixed(1)}" stroke="${c.color}" stroke-width="5" stroke-linecap="round"/>`;
    }).join('') + `<path d="M104 66 C130 48 190 48 216 66" fill="none" stroke="${c.color}" stroke-width="7" stroke-linecap="round"/>`,
  }),
  artemis: (c) => ({
    back: `<path d="M86 270 C40 230 40 170 86 130" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M86 270 C40 230 40 170 86 130" fill="none" stroke="#a87a4a" stroke-width="5" stroke-linecap="round"/><path d="M86 130 L86 270" stroke="${INK}" stroke-width="1.6"/>`,
    body: tint(c.color) + `<path d="M118 192 L204 252" stroke="#7a5a2c" stroke-width="6" stroke-linecap="round"/>` +
      `<rect x="218" y="196" width="16" height="44" rx="5" transform="rotate(20 226 218)" fill="#a87a4a" ${s2}/><path d="M228 194 l6 -14 M236 198 l8 -12" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
    // a crescent moon on her headband
    head: `<path d="M98 80 C130 62 190 62 222 80" fill="none" stroke="#c9d1dc" stroke-width="6" stroke-linecap="round"/><path d="M152 44 C140 54 144 72 160 76 C150 70 148 56 160 48 Z" fill="#e9eef6" ${S}/>`,
  }),
  ares: (c) => ({
    back: cape(c.color),
    body: tint('#9a6a3a') + `<path d="M124 200 C140 214 180 214 196 200 L200 244 C180 252 140 252 120 244 Z" fill="#c4883a" ${S}/>` +
      staff(250, 128, '#8a5a3c', 5) + `<path d="M240 138 L250 106 L260 138 Z" fill="#c9d1dc" ${S}/>`,
    head: helmet('#a8703f', c.color),
    hidesEars: true,
  }),
  aphrodite: (c) => ({
    body: robe(c.color, '#fffdf7') +
      `<path d="M140 238 L160 210 L180 238 Q160 248 140 238 Z" fill="#ffe9d6" ${S}/><path d="M160 212 L150 236 M160 212 L160 240 M160 212 L170 236" stroke="${INK}" stroke-width="1.8"/>`,
    head: wreath('#5f9e4a', [104, 130, 160, 190, 216].map((x, i) => `<circle cx="${x}" cy="${[70, 52, 46, 52, 70][i]}" r="7" fill="#ff6f91" ${s2}/>`).join('')),
  }),
  hephaestus: (c) => ({
    // a blacksmith: leather apron, hammer
    body: tint('#6d6875') + `<path d="M124 196 L196 196 L204 266 C180 274 140 274 116 266 Z" fill="${c.color}" ${S}/><path d="M124 196 L110 186 M196 196 L210 186" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M234 266 L234 210" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M234 266 L234 210" stroke="#a87a4a" stroke-width="5" stroke-linecap="round"/><rect x="214" y="190" width="40" height="22" rx="4" fill="#8a8f99" ${S}/>`,
    head: `<path d="M70 104 C110 84 210 84 250 104 L248 116 C208 98 112 98 72 116 Z" fill="${c.color}" ${S}/>`,
  }),
  hermes: (c) => ({
    // a winged cap, winged sandals, his staff
    body: tint(c.color) + wing(106, 262, -1, 0.8) + wing(214, 262, 1, 0.8) +
      staff(76, 166, GOLD, 4) + `<path d="M68 214 C88 206 64 196 84 188 C64 180 88 170 76 162" fill="none" stroke="#5f9e4a" stroke-width="4" stroke-linecap="round"/>` + wing(76, 168, -1, 0.6) + wing(76, 168, 1, 0.6),
    head: `<path d="M98 72 C100 40 220 40 222 72 C190 62 130 62 98 72 Z" fill="${c.color}" ${S}/>` + wing(100, 64, -1) + wing(220, 64, 1),
  }),
  dionysus: (c) => ({
    body: robe(c.color, '#5f9e4a') +
      [[236, 210], [228, 220], [244, 220], [236, 230], [228, 240], [244, 240], [236, 250]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#7b4fa6" ${s2}/>`).join('') + `<path d="M236 204 L240 194" stroke="#5f9e4a" stroke-width="4" stroke-linecap="round"/>`,
    head: wreath('#5f9e4a', [[112, 62], [208, 62]].map(([x, y]) => [0, 1, 2].map((j) => `<circle cx="${x! + (j - 1) * 7}" cy="${y! + (j === 1 ? 8 : 0)}" r="5.5" fill="#7b4fa6" ${s2}/>`).join('')).join('')),
  }),
  hades: (c) => ({
    // dark and grumpy-friendly: his robe, a crown with blue flame tips, his two-pronged spear, a badge of his three-headed dog
    back: cape(c.color),
    body: robe(c.color, '#6f5a8f') +
      `<circle cx="160" cy="226" r="17" fill="#c9d1dc" ${S}/>` + [148, 160, 172].map((x) => `<circle cx="${x}" cy="228" r="5.5" fill="#4a4550"/><path d="M${x - 5} 224 l2 -6 3 4 M${x + 5} 224 l-2 -6 -3 4" fill="#4a4550"/>`).join('') +
      staff(250, 126, '#2a2630', 5) + `<path d="M240 140 L240 116 M260 140 L260 116 M240 140 Q250 150 260 140" fill="none" stroke="#8a8f99" stroke-width="5" stroke-linecap="round"/>`,
    head: crown('#4a4550', 5, 14) + [0, 1, 2, 3, 4].map((i) => `<ellipse cx="${(121.6 + 19.2 * i).toFixed(1)}" cy="34" rx="4" ry="6" fill="#6fb3ff"/>`).join(''),
  }),
  hestia: (c) => ({
    // a warm shawl, the hearth's flame in her paws
    body: tint('#fbe9d6') + `<path d="M104 196 C120 186 200 186 216 196 C222 214 210 226 198 222 C180 214 140 214 122 222 C110 226 98 214 104 196 Z" fill="${c.color}" ${S}/>` +
      `<path d="M160 268 C138 260 140 236 152 226 C152 238 158 240 160 230 C162 238 170 240 170 226 C182 236 182 260 160 268 Z" fill="#ff9f43" ${S}/><path d="M160 264 C150 258 152 248 158 242 C160 250 166 250 166 246 C170 254 168 262 160 264 Z" fill="${GOLD}"/>`,
    head: `<path d="M64 110 C64 52 100 30 160 30 C220 30 256 52 256 110 C240 88 200 74 160 74 C120 74 80 88 64 110 Z" fill="${c.color}" ${S}/>`,
    hidesEars: true,
  }),
  // ---- the heroes ----
  heracles: (c) => ({
    // the lion's skin over his head (its mane round his face), the paws tied on his chest, his club
    body: tint('#c4883a') + `<path d="M126 196 L148 214 L160 204 L172 214 L194 196" fill="none" stroke="${c.color}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M226 266 L238 184" stroke="${INK}" stroke-width="15" stroke-linecap="round"/><path d="M226 266 L238 184" stroke="#8a5a3c" stroke-width="11" stroke-linecap="round"/><circle cx="234" cy="206" r="3" fill="${INK}"/><circle cx="232" cy="224" r="3" fill="${INK}"/>`,
    head: [...Array(14)].map((_, i) => {
      const t = Math.PI * (0.92 + (1.16 * i) / 13);
      return `<circle cx="${(160 + 102 * Math.cos(t)).toFixed(1)}" cy="${(132 + 82 * Math.sin(t)).toFixed(1)}" r="15" fill="#a8703f" ${s2}/>`;
    }).join('') + hood(c.color) + `<g data-hood-face="heracles">${eyes(24, 54)}<ellipse cx="160" cy="70" rx="15" ry="9" fill="#a8703f" ${s2}/><path d="M154 66 L166 66 L160 72 Z" fill="${INK}"/></g>`,
    hidesEars: true,
  }),
  odysseus: (c) => ({
    // a traveller's cap, a sea-blue cloak, a ship's oar
    back: cape(c.color),
    body: tint('#e8d6b0') + `<path d="M108 250 C130 258 190 258 212 250" fill="none" stroke="#a87a4a" stroke-width="6" stroke-linecap="round"/>` +
      `<path d="M240 270 L246 150" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M240 270 L246 150" stroke="#c98f55" stroke-width="5" stroke-linecap="round"/><path d="M236 196 C232 214 234 240 240 270 C248 240 252 214 250 196 Z" fill="#c98f55" ${S}/>`,
    head: `<path d="M106 70 C110 46 132 24 160 22 C188 24 210 46 214 70 C190 62 130 62 106 70 Z" fill="#a87a4a" ${S}/>`,
  }),
  perseus: (c) => ({
    // a winged helmet and a mirror-bright shield
    body: tint(c.color) + `<path d="M108 252 C130 260 190 260 212 252" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/>` +
      roundShield(80, 226, 32, '#e9eef6', `<path d="M64 212 C70 204 80 202 88 204" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`),
    head: helmet('#c4883a', '') + wing(76, 82, -1) + wing(244, 82, 1),
    hidesEars: true,
  }),
  achilles: (c) => ({
    // all in gold: a crested helmet, armour, a gold shield
    body: tint('#9a6a3a') + `<path d="M120 194 C140 208 180 208 200 194 L204 248 C182 258 138 258 116 248 Z" fill="${c.color}" ${S}/><path d="M160 204 L160 248 M134 222 Q146 230 158 222 M162 222 Q174 230 186 222" fill="none" ${s2}/>` +
      roundShield(80, 228, 32, c.color, star(80, 228, 14, '#fff3c4')),
    head: helmet(c.color, '#d8262e'),
    hidesEars: true,
  }),
  theseus: (c) => ({
    // a sword, and the ball of red thread that led him out of the labyrinth
    body: tint(c.color) + `<path d="M108 252 C130 260 190 260 212 252" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="M240 196 L240 252" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M240 196 L240 252" stroke="#e9eef6" stroke-width="5" stroke-linecap="round"/><path d="M228 252 L252 252" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M240 254 L240 268" stroke="#8a5a3c" stroke-width="5" stroke-linecap="round"/>` +
      `<circle cx="80" cy="252" r="16" fill="#d8262e" ${S}/><path d="M68 244 Q80 256 92 244 M66 254 Q80 266 94 254 M74 238 Q88 250 90 262" fill="none" stroke="#8a1a1a" stroke-width="2"/><path d="M80 268 C90 280 110 276 120 284" fill="none" stroke="#d8262e" stroke-width="3"/>`,
    head: `<path d="M70 102 C110 84 210 84 250 102 L248 112 C208 96 112 96 72 112 Z" fill="${GOLD}" ${S}/>`,
  }),
  jason: (c) => ({
    // the Golden Fleece over his shoulders
    back: `<path d="M110 188 C78 220 70 258 80 284 L240 284 C250 258 242 220 210 188 Z" fill="${GOLD}" ${S}/>` +
      [[96, 232], [112, 256], [92, 270], [224, 232], [208, 256], [228, 270]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#ffe08a" ${s2}/>`).join(''),
    body: tint(c.color) + [118, 138, 160, 182, 202].map((x, i) => `<circle cx="${x}" cy="${[198, 192, 190, 192, 198][i]}" r="9" fill="${GOLD}" ${s2}/>`).join(''),
    head: '',
  }),
  // ---- a creature that is clothes, not a hood ----
  medusa: (c) => ({
    // friendly snakes for hair
    body: robe(c.color, GOLD),
    head: [[-1, 70, 66], [-1, 92, 46], [-1, 122, 32], [1, 198, 32], [1, 228, 46], [1, 250, 66]].map(([dir, x, y]) => {
      const tipx = x! + dir! * 22;
      const hy = Math.max(31, y! - 4);
      return ropeTail(`M${160 + (x! - 160) * 0.55} ${y! + 30} C${x! - dir! * 10} ${y! + 18} ${x! + dir! * 8} ${y! + 4} ${tipx} ${hy}`, c.color, 9) +
        `<path d="M${tipx + dir! * 8} ${hy + 2} l${dir! * 8} 2 M${tipx + dir! * 14} ${hy + 3} l${dir! * 3} -4 M${tipx + dir! * 14} ${hy + 3} l${dir! * 3} 4" stroke="#d8262e" stroke-width="2" stroke-linecap="round"/>` +
        `<ellipse cx="${tipx}" cy="${hy}" rx="10" ry="8" fill="${c.color}" ${s2}/><circle cx="${tipx - 3}" cy="${hy - 2}" r="2" fill="${INK}"/><circle cx="${tipx + 3}" cy="${hy - 2}" r="2" fill="${INK}"/>`;
    }).join('') + `<path d="M76 100 C100 70 220 70 244 100 C210 84 110 84 76 100 Z" fill="${c.color}" ${S}/>`,
    hidesEars: true,
  }),
  // ---- Chinese ----
  wukong: () => ({
    // the golden headband, a tiger-skin skirt, the 金箍棒
    body: tint('#f2a03d') + `<path d="M104 236 L216 236 L222 262 C190 274 130 274 98 262 Z" fill="#ffb84a" ${S}/>` +
      [112, 140, 168, 196].map((x) => `<path d="M${x} 240 L${x + 8} 256 L${x + 14} 240 Z" fill="#3a2a20"/>`).join('') +
      `<path d="M58 270 L262 170" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="M58 270 L262 170" stroke="#c8102e" stroke-width="7" stroke-linecap="round"/><path d="M58 270 L74 262 M262 170 L246 178" stroke="${GOLD}" stroke-width="7" stroke-linecap="round"/>`,
    head: `<path d="M70 102 C110 86 210 86 250 102 L248 112 C208 98 112 98 72 112 Z" fill="${GOLD}" ${S}/>` +
      pair((f) => `<path d="M${f(72)} 108 C${f(58)} 108 ${f(56)} 94 ${f(66)} 92" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/>`),
  }),
  nezha: (c) => ({
    // twin hair buns, the red sash, the gold ring, fire wheels at his feet
    back: `<path d="M70 200 C40 170 60 130 90 150 C70 170 80 196 110 196" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M70 200 C40 170 60 130 90 150 C70 170 80 196 110 196" fill="none" stroke="${c.color}" stroke-width="9" stroke-linecap="round"/>` +
      `<path d="M250 200 C280 170 260 130 230 150 C250 170 240 196 210 196" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M250 200 C280 170 260 130 230 150 C250 170 240 196 210 196" fill="none" stroke="${c.color}" stroke-width="9" stroke-linecap="round"/>`,
    body: tint('#fbe9d6') + `<path d="M110 200 C140 214 180 214 210 200" fill="none" stroke="${c.color}" stroke-width="12" stroke-linecap="round"/>` +
      `<circle cx="160" cy="232" r="16" fill="none" stroke="${INK}" stroke-width="9"/><circle cx="160" cy="232" r="16" fill="none" stroke="${GOLD}" stroke-width="5"/>` +
      pair((f) => `<circle cx="${f(96)}" cy="266" r="12" fill="${GOLD}" ${S}/><circle cx="${f(96)}" cy="266" r="4" fill="${INK}"/><path d="M${f(84)} 262 C${f(76)} 252 ${f(82)} 246 ${f(86)} 252 C${f(84)} 244 ${f(92)} 240 ${f(94)} 250" fill="#ff6a3d" ${s2}/>`),
    head: pair((f) => `<circle cx="${f(124)}" cy="44" r="15" fill="${INK}"/><path d="M${f(114)} 52 L${f(134)} 52" stroke="${c.color}" stroke-width="4" stroke-linecap="round"/>`),
  }),
  change: (c) => ({
    // the full moon behind her, ribbons, and the little jade rabbit
    back: `<circle cx="240" cy="66" r="40" fill="#fff3c4" ${S}/><path d="M96 196 C60 214 52 250 66 276 M224 196 C260 214 268 250 254 276" fill="none" stroke="#ff9fbf" stroke-width="7" stroke-linecap="round"/>`,
    body: robe(c.color, '#ff9fbf') + `<ellipse cx="160" cy="244" rx="14" ry="11" fill="#fffdf7" ${S}/><ellipse cx="153" cy="230" rx="4" ry="10" fill="#fffdf7" ${s2}/><ellipse cx="166" cy="230" rx="4" ry="10" fill="#fffdf7" ${s2}/><circle cx="156" cy="242" r="1.6" fill="${INK}"/><circle cx="164" cy="242" r="1.6" fill="${INK}"/>`,
    head: `<ellipse cx="160" cy="40" rx="24" ry="14" fill="${INK}"/><path d="M134 40 L192 30" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/><circle cx="192" cy="30" r="5" fill="#ff6f91" ${s2}/>`,
  }),
  houyi: (c) => ({
    // a headband, a big bow and arrow, a sun on his chest (he shot down nine suns)
    back: `<path d="M74 280 C30 230 30 150 74 104" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M74 280 C30 230 30 150 74 104" fill="none" stroke="#8a5a3c" stroke-width="6" stroke-linecap="round"/><path d="M74 104 L74 280" stroke="${INK}" stroke-width="1.8"/>`,
    body: tint(c.color) + `<circle cx="160" cy="226" r="14" fill="#ff5532" ${S}/>` + [...Array(8)].map((_, i) => {
      const a = (i * Math.PI) / 4;
      return `<path d="M${(160 + 18 * Math.cos(a)).toFixed(1)} ${(226 + 18 * Math.sin(a)).toFixed(1)} L${(160 + 24 * Math.cos(a)).toFixed(1)} ${(226 + 24 * Math.sin(a)).toFixed(1)}" stroke="#ff9f43" stroke-width="3.5" stroke-linecap="round"/>`;
    }).join('') + `<path d="M76 190 L120 190" stroke="${INK}" stroke-width="3"/><path d="M118 184 L128 190 L118 196 Z" fill="${INK}"/>`,
    head: `<path d="M70 102 C110 84 210 84 250 102 L248 112 C208 96 112 96 72 112 Z" fill="#d8262e" ${S}/><path d="M248 106 C262 112 266 126 258 136" fill="none" stroke="#d8262e" stroke-width="5" stroke-linecap="round"/>`,
  }),
  caishen: (c) => ({
    // a red robe, a tall gold hat, a gold ingot (元宝)
    body: robe(c.color, GOLD) + `<path d="M138 236 C142 250 178 250 182 236 L176 230 C170 236 150 236 144 230 Z" fill="${GOLD}" ${S}/><ellipse cx="160" cy="230" rx="11" ry="8" fill="${GOLD}" ${S}/>`,
    head: `<path d="M116 70 L122 30 L198 30 L204 70 Z" fill="${GOLD}" ${S}/><rect x="108" y="62" width="104" height="12" rx="4" fill="${c.color}" ${S}/>` +
      pair((f) => `<path d="M${f(108)} 50 L${f(78)} 44 L${f(80)} 58 L${f(116)} 58" fill="${GOLD}" ${s2}/>`) + `<circle cx="160" cy="46" r="7" fill="${c.color}" ${s2}/>`,
  }),
  luckycat: (c) => ({
    // the fortune cat: a red collar with a gold bell, a big gold coin
    body: `<path d="M114 194 C140 206 180 206 206 194" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/><path d="M114 194 C140 206 180 206 206 194" fill="none" stroke="${c.color}" stroke-width="9" stroke-linecap="round"/>` +
      `<circle cx="160" cy="210" r="9" fill="${GOLD}" ${S}/><path d="M152 210 h16" stroke="${INK}" stroke-width="2"/>` +
      `<ellipse cx="160" cy="246" rx="24" ry="16" fill="${GOLD}" ${S}/><text x="160" y="247" font-family="WenKai, serif" font-size="15" text-anchor="middle" dominant-baseline="middle" fill="${INK}">招财</text>`,
    head: '',
  }),
};

export const MYTH_HOOD: Record<string, (c: Costume) => MythHood> = {
  minotaur: (c) => ({
    // a bull's head: great horns, a nose ring; the labyrinth's pattern on his body
    behind: pair((f) => `<path d="M${f(94)} 66 C${f(64)} 66 ${f(42)} 52 ${f(40)} 26 C${f(56)} 42 ${f(78)} 46 ${f(104)} 48 Z" fill="#f1e2bd" ${S}/>`),
    front: eyes(24) + `<ellipse cx="160" cy="71" rx="25" ry="13" fill="#c98a6a" ${S}/><ellipse cx="151" cy="71" rx="3.2" ry="4" fill="${INK}"/><ellipse cx="169" cy="71" rx="3.2" ry="4" fill="${INK}"/>` +
      `<circle cx="160" cy="88" r="9" fill="none" stroke="${INK}" stroke-width="6"/><circle cx="160" cy="88" r="9" fill="none" stroke="${GOLD}" stroke-width="3"/>`,
    belly: `<rect x="122" y="214" width="76" height="40" rx="6" fill="#e8d6b0" ${s2}/><path d="M130 246 L130 222 L190 222 L190 246 L140 246 L140 232 L180 232 L180 240 L150 240" fill="none" stroke="${c.color}" stroke-width="3.5"/>`,
    tail: ropeTail('M210 250 C238 256 258 240 258 214', c.color, 5) + `<path d="M252 214 C250 198 266 196 266 212 C266 222 254 224 252 214 Z" fill="${INK}"/>`,
  }),
  pegasus: (c) => ({
    // the winged horse: white, a blue mane, great wings
    back: pair((f) => {
      const d = (x: number) => f(x);
      return `<path d="M${d(118)} 214 C${d(90)} 180 ${d(56)} 172 ${d(38)} 182 C${d(48)} 190 ${d(46)} 198 ${d(40)} 206 C${d(54)} 208 ${d(56)} 216 ${d(50)} 224 C${d(66)} 224 ${d(72)} 232 ${d(70)} 240 C${d(90)} 236 ${d(108)} 230 ${d(118)} 214 Z" fill="#fffdf7" ${S}/>`;
    }),
    behind: pair((f) => `<path d="M${f(98)} 50 L${f(92)} 24 L${f(120)} 38 Z" fill="${c.color}" ${S}/>`),
    front: `<path d="M114 46 Q120 24 134 32 Q142 18 152 29 Q160 14 168 29 Q178 18 186 32 Q200 24 206 46 Q190 38 160 38 Q130 38 114 46 Z" fill="#6fb3ff" ${s2}/>` +
      eyes(26, 56) + `<ellipse cx="160" cy="71" rx="22" ry="12" fill="#f0e6f6" ${S}/><ellipse cx="152" cy="71" rx="2.6" ry="3.6" fill="${INK}"/><ellipse cx="168" cy="71" rx="2.6" ry="3.6" fill="${INK}"/>`,
    tail: `<path d="M210 246 C236 236 262 238 272 260 C262 254 254 254 250 262 C246 252 236 250 230 258 C228 250 218 252 212 256 Z" fill="#6fb3ff" ${S}/>`,
  }),
  cerberus: (c) => ({
    // three friendly heads: his hood, and one on each shoulder; a spiky collar
    front: eyes() + `<path d="M149 64 Q160 59 171 64 Q169 77 160 80 Q151 77 149 64 Z" fill="${INK}"/>` +
      pair((f) => `<path d="M${f(70)} 80 L${f(56)} 48 L${f(92)} 64 Z" fill="${c.color}" ${S}/>`),
    body: `<path d="M110 194 C140 206 180 206 210 194" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>` +
      [122, 142, 160, 178, 198].map((x) => `<path d="M${x - 5} 200 L${x} 210 L${x + 5} 200 Z" fill="#c9d1dc" ${s2}/>`).join('') +
      pair((f) => `<circle cx="${f(98)}" cy="214" r="18" fill="${c.color}" ${S}/><path d="M${f(86)} 202 L${f(80)} 186 L${f(96)} 196 Z" fill="${c.color}" ${s2}/><circle cx="${f(92)}" cy="210" r="2.6" fill="#fff"/><circle cx="${f(104)}" cy="210" r="2.6" fill="#fff"/><ellipse cx="${f(98)}" cy="220" rx="4" ry="3" fill="${INK}"/>`),
    tail: ropeTail('M210 248 C232 244 246 228 250 206', c.color, 10),
  }),
  liondance: (c) => ({
    // the lion-dance head: a horn, a mirror on its brow, big bright eyes, a white fluffy fringe round the face; a fringed body
    front: `<path d="M152 38 L160 23 L168 38 Z" fill="${GOLD}" ${S}/><circle cx="160" cy="45" r="6" fill="#c9eaff" ${S}/>` +
      pair((f) => `<circle cx="${f(124)}" cy="56" r="11" fill="#fffdf7" ${S}/><circle cx="${f(126)}" cy="58" r="5.5" fill="${INK}"/><path d="M${f(110)} 43 Q${f(124)} 35 ${f(138)} 43" fill="none" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/>`) +
      [...Array(11)].map((_, i) => {
        const t = Math.PI * (1.06 + (0.88 * i) / 10);
        return `<circle cx="${(160 + 92 * Math.cos(t)).toFixed(1)}" cy="${(138 + 64 * Math.sin(t)).toFixed(1)}" r="9" fill="#fffdf7" ${s2}/>`;
      }).join('') + pair((f) => `<circle cx="${f(72)}" cy="${150}" r="9" fill="#fffdf7" ${s2}/><circle cx="${f(82)}" cy="${172}" r="9" fill="#fffdf7" ${s2}/>`),
    body: `<path d="M102 252 C130 262 190 262 218 252" fill="none" stroke="${GOLD}" stroke-width="8" stroke-linecap="round"/>` +
      [110, 124, 138, 152, 166, 180, 194, 208].map((x) => `<path d="M${x} 256 L${x + 3} 268" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`).join('') +
      pair((f) => `<circle cx="${f(110)}" cy="214" r="8" fill="#fffdf7" ${s2}/>`),
    belly: `<ellipse cx="160" cy="232" rx="30" ry="22" fill="${GOLD}" opacity=".9"/>`,
    tail: [...Array(4)].map((_, i) => `<circle cx="${214 + i * 12}" cy="${244 - i * 10}" r="10" fill="#fffdf7" ${s2}/>`).join(''),
  }),
};
