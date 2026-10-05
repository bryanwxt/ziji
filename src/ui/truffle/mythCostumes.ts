// The myth costumes (parent, 2026-10-06: he is really into the Greek myths): every Greek god, the heroes and the creatures,
// and Chinese myth figures, the fortune cat and the lion dance. Each carries the thing a child knows the figure by. Drawn from
// the old stories and pictures, never a film's or a game's version of them.
import type { Costume } from '../../fun/costumes';
import { band, crown, eyes, fringe, helmet, hood, INK, MUZZLE, pair, robe, ropeTail, S, s2, shade, staff, tint, toga, wings, wreath } from './costumeKit';

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

/**
 * Medusa's hair: a cap of scales over his head, and six plump, friendly snakes curling out of it, each with a face. They
 * curl out to the sides (there is no room above his head inside his box).
 */
const MEDUSA_HAIR = (green: string) => {
  const dark = shade(green, 0.3);
  const light = '#c9e6a8';
  const snake = (d: string, hx: number, hy: number, deg: number) =>
    `<path d="${d}" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${green}" stroke-width="12" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${light}" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="1 7"/>` +
    `<g transform="translate(${hx} ${hy}) rotate(${deg})"><ellipse cx="0" cy="0" rx="13" ry="10" fill="${green}" ${S}/><circle cx="-4" cy="-3" r="2.4" fill="${INK}"/><circle cx="5" cy="-3" r="2.4" fill="${INK}"/><path d="M-3 4 Q1 7 5 4" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="-8" cy="3" r="2.2" fill="#ff9fb3" opacity=".7"/></g>`;
  const one = (f: (x: number) => number, i: number) => {
    const deg = f(0) === 0 ? 1 : -1; // turns the faces to look outward on each side
    return [
      snake(`M${f(134)} 46 C${f(120)} 30 ${f(100)} 28 ${f(88)} 36`, f(80), 40, -10 * deg),
      snake(`M${f(104)} 66 C${f(84)} 56 ${f(66)} 62 ${f(58)} 74`, f(52), 80, 10 * deg),
      snake(`M${f(90)} 98 C${f(70)} 96 ${f(56)} 110 ${f(54)} 122`, f(52), 130, 20 * deg),
    ][i]!;
  };
  return `<path d="M66 116 C60 60 104 30 160 30 C216 30 260 60 254 116 C236 96 204 84 160 84 C116 84 84 96 66 116 Z" fill="${green}" ${S}/>` +
    [[110, 50], [136, 42], [160, 40], [184, 42], [210, 50], [96, 70], [124, 62], [160, 60], [196, 62], [224, 70]].map(([x, y]) => `<path d="M${x! - 8} ${y} Q${x} ${y! + 8} ${x! + 8} ${y}" stroke="${dark}" stroke-width="2" fill="none"/>`).join('') +
    [0, 1, 2].map((i) => one((x) => x, i) + one((x) => 320 - x, i)).join('');
};

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
    head: crown(GOLD, 5, 20, ['#d8262e', '#2fa3a0']),
  }),
  poseidon: (c) => ({
    body: robe(c.color, '#fffdf7') + `<path d="M112 244 q8 -8 16 0 q8 -8 16 0 q8 -8 16 0 q8 -8 16 0 q8 -8 16 0 q8 -8 16 0" fill="none" stroke="#fffdf7" stroke-width="3"/>` +
      staff(248, 132, GOLD, 5) + `<path d="M232 152 L232 126 M248 146 L248 118 M264 152 L264 126 M232 146 Q248 160 264 146" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M232 152 L232 126 M248 146 L248 118 M264 152 L264 126 M232 146 Q248 160 264 146" fill="none" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/>`,
    head: crown(GOLD, 3, 26, ['#2fa3a0', '#fffdf7']),
  }),
  demeter: (c) => ({
    body: robe(c.color, GOLD) +
      [0, 1, 2].map((i) => `<path d="M${74 + i * 8} 268 L${70 + i * 10} 196" stroke="#c99a2e" stroke-width="3"/>` + [0, 1, 2, 3].map((j) => `<ellipse cx="${70 + i * 10}" cy="${196 + j * 9}" rx="4" ry="7" fill="${GOLD}" ${s2}/>`).join('')).join(''),
    head: wreath('#e8b33a', '', 'wheat'),
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
      // sun rays fanning up from a gold band (a radiant crown)
      const a = Math.PI * (1.14 + (0.72 * i) / 8);
      const p = (r: number, da = 0) => `${(160 + r * Math.cos(a + da)).toFixed(1)} ${(120 + r * 0.92 * Math.sin(a + da)).toFixed(1)}`;
      return `<path d="M${p(70, -0.08)} L${p(i === 4 ? 104 : 96)} L${p(70, 0.08)} Z" fill="${c.color}" ${s2}/>`;
    }).join('') + band(GOLD, 74, 12) + `<circle cx="160" cy="76" r="7" fill="#ff9f43" ${s2}/>`,
  }),
  artemis: (c) => ({
    back: `<path d="M86 270 C40 230 40 170 86 130" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M86 270 C40 230 40 170 86 130" fill="none" stroke="#a87a4a" stroke-width="5" stroke-linecap="round"/><path d="M86 130 L86 270" stroke="${INK}" stroke-width="1.6"/>`,
    body: tint(c.color) + `<path d="M118 192 L204 252" stroke="#7a5a2c" stroke-width="6" stroke-linecap="round"/>` +
      `<rect x="218" y="196" width="16" height="44" rx="5" transform="rotate(20 226 218)" fill="#a87a4a" ${s2}/><path d="M228 194 l6 -14 M236 198 l8 -12" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
    // a crescent moon on her headband
    head: band('#c9d1dc', 76, 10) + `<path d="M136 44 C136 64 147 74 160 74 C173 74 184 64 184 44 C178 56 170 62 160 62 C150 62 142 56 136 44 Z" fill="#f4f6fb" ${S}/><path d="M142 56 C148 64 154 67 160 67" stroke="#c9d1dc" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
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
    head: wreath('#5f9e4a', [[96, 74], [124, 50], [160, 42], [196, 50], [224, 74]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#ff6f91" ${s2}/><path d="M${x! - 4} ${y! + 1} C${x! - 4} ${y! - 5} ${x! + 4} ${y! - 5} ${x! + 4} ${y} C${x! + 4} ${y! + 4} ${x} ${y! + 4} ${x} ${y! + 1}" stroke="#c2185b" stroke-width="1.6" fill="none"/>`).join('')),
  }),
  hephaestus: (c) => ({
    // a blacksmith: leather apron, hammer
    body: tint('#6d6875') + `<path d="M124 196 L196 196 L204 266 C180 274 140 274 116 266 Z" fill="${c.color}" ${S}/><path d="M124 196 L110 186 M196 196 L210 186" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M234 266 L234 210" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M234 266 L234 210" stroke="#a87a4a" stroke-width="5" stroke-linecap="round"/><rect x="214" y="190" width="40" height="22" rx="4" fill="#8a8f99" ${S}/>`,
    head: band('#8a5a3c', 76, 12) + pair((f) => `<circle cx="${f(136)}" cy="82" r="13" fill="#c4883a" ${S}/><circle cx="${f(136)}" cy="82" r="8" fill="#9ad0e6" ${s2}/><path d="M${f(132)} 78 l4 -2" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`) + `<path d="M149 82 h22" stroke="${INK}" stroke-width="3"/>`,
  }),
  hermes: (c) => ({
    // a winged cap, winged sandals, his staff
    body: tint(c.color) + wing(106, 262, -1, 0.8) + wing(214, 262, 1, 0.8) +
      staff(76, 166, GOLD, 4) + `<path d="M68 214 C88 206 64 196 84 188 C64 180 88 170 76 162" fill="none" stroke="#5f9e4a" stroke-width="4" stroke-linecap="round"/>` + wing(76, 168, -1, 0.6) + wing(76, 168, 1, 0.6),
    head: wings(100, 60, -1, 0.9) + wings(220, 60, 1, 0.9) + `<path d="M96 72 C98 40 222 40 224 72 Z" fill="${c.color}" ${S}/><path d="M84 76 C120 62 200 62 236 76 C200 70 120 70 84 76 Z" fill="${shade(c.color)}" ${S}/><path d="M112 56 C124 46 140 42 152 42" stroke="#fff" stroke-opacity=".55" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  }),
  dionysus: (c) => ({
    body: robe(c.color, '#5f9e4a') +
      [[236, 210], [228, 220], [244, 220], [236, 230], [228, 240], [244, 240], [236, 250]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#7b4fa6" ${s2}/>`).join('') + `<path d="M236 204 L240 194" stroke="#5f9e4a" stroke-width="4" stroke-linecap="round"/>`,
    head: wreath('#5f9e4a', pair((f) => [[0, 0], [-7, 9], [7, 9], [0, 18], [-7, 27], [7, 27]].map(([dx, dy]) => `<circle cx="${f(92) + dx!}" cy="${78 + dy!}" r="6.5" fill="#7b4fa6" ${s2}/>`).join('') + `<circle cx="${f(90)}" cy="78" r="2" fill="#fff" opacity=".6"/>`)),
  }),
  hades: (c) => ({
    // dark and grumpy-friendly: his robe, a crown with blue flame tips, his two-pronged spear, a badge of his three-headed dog
    back: cape(c.color),
    body: robe(c.color, '#6f5a8f') +
      `<circle cx="160" cy="226" r="17" fill="#c9d1dc" ${S}/>` + [148, 160, 172].map((x) => `<circle cx="${x}" cy="228" r="5.5" fill="#4a4550"/><path d="M${x - 5} 224 l2 -6 3 4 M${x + 5} 224 l-2 -6 -3 4" fill="#4a4550"/>`).join('') +
      staff(250, 126, '#2a2630', 5) + `<path d="M240 140 L240 116 M260 140 L260 116 M240 140 Q250 150 260 140" fill="none" stroke="#8a8f99" stroke-width="5" stroke-linecap="round"/>`,
    head: crown('#4a4550', 5, 16, ['#6fb3ff', '#6fb3ff']) + [0, 1, 2, 3, 4].map((i) => { const x = 118.4 + 20.8 * i; const y = (i === 2 ? 22 : i % 2 ? 30 : 34); return `<path d="M${x} ${y + 12} C${x - 7} ${y + 6} ${x - 3} ${y} ${x} ${y - 4} C${x + 3} ${y} ${x + 7} ${y + 6} ${x} ${y + 12} Z" fill="#6fb3ff" ${s2}/>`; }).join(''),
  }),
  hestia: (c) => ({
    // a warm shawl, the hearth's flame in her paws
    body: tint('#fbe9d6') + `<path d="M104 196 C120 186 200 186 216 196 C222 214 210 226 198 222 C180 214 140 214 122 222 C110 226 98 214 104 196 Z" fill="${c.color}" ${S}/>` +
      `<path d="M160 268 C138 260 140 236 152 226 C152 238 158 240 160 230 C162 238 170 240 170 226 C182 236 182 260 160 268 Z" fill="#ff9f43" ${S}/><path d="M160 264 C150 258 152 248 158 242 C160 250 166 250 166 246 C170 254 168 262 160 264 Z" fill="${GOLD}"/>`,
    head: `<path d="M62 112 C62 52 100 30 160 30 C220 30 258 52 258 112 C242 90 200 76 160 76 C120 76 78 90 62 112 Z" fill="${c.color}" ${S}/><path d="M72 104 C92 88 124 80 160 80 C196 80 228 88 248 104" stroke="${GOLD}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M96 56 C112 42 132 36 150 35" stroke="#fff" stroke-opacity=".5" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    hidesEars: true,
  }),
  // ---- the heroes ----
  heracles: (c) => ({
    // the lion's skin over his head (its mane round his face), the paws tied on his chest, his club
    body: tint('#c4883a') + `<path d="M126 196 L148 214 L160 204 L172 214 L194 196" fill="none" stroke="${c.color}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M226 266 L238 184" stroke="${INK}" stroke-width="15" stroke-linecap="round"/><path d="M226 266 L238 184" stroke="#8a5a3c" stroke-width="11" stroke-linecap="round"/><circle cx="234" cy="206" r="3" fill="${INK}"/><circle cx="232" cy="224" r="3" fill="${INK}"/>`,
    head: pair((f) => `<circle cx="${f(108)}" cy="40" r="14" fill="#a8703f" ${S}/><circle cx="${f(108)}" cy="40" r="7" fill="#e8c38a"/>`) + hood(c.color) + fringe('#a8703f', 'spike', 0.4, 1.1, 17) +
      `<g data-hood-face="heracles">${eyes(24, 52)}<ellipse cx="160" cy="66" rx="16" ry="10" fill="#e8c38a" ${s2}/><path d="M153 61 L167 61 L160 68 Z" fill="${INK}"/></g>`,
    hidesEars: true,
  }),
  odysseus: (c) => ({
    // a traveller's cap, a sea-blue cloak, a ship's oar
    back: cape(c.color),
    body: tint('#e8d6b0') + `<path d="M108 250 C130 258 190 258 212 250" fill="none" stroke="#a87a4a" stroke-width="6" stroke-linecap="round"/>` +
      `<path d="M240 270 L246 150" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M240 270 L246 150" stroke="#c98f55" stroke-width="5" stroke-linecap="round"/><path d="M236 196 C232 214 234 240 240 270 C248 240 252 214 250 196 Z" fill="#c98f55" ${S}/>`,
    head: `<path d="M108 72 C110 46 132 24 160 22 C188 24 210 46 212 72 Z" fill="#a87a4a" ${S}/><path d="M100 70 C130 60 190 60 220 70 L220 80 C190 72 130 72 100 80 Z" fill="${shade('#a87a4a', 0.15)}" ${S}/><path d="M128 54 C134 40 146 30 156 28" stroke="#fff" stroke-opacity=".5" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  }),
  perseus: (c) => ({
    // a winged helmet and a mirror-bright shield
    body: tint(c.color) + `<path d="M108 252 C130 260 190 260 212 252" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/>` +
      roundShield(80, 226, 32, '#e9eef6', `<path d="M64 212 C70 204 80 202 88 204" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`),
    head: helmet('#c4883a', '') + wings(70, 90, -1) + wings(250, 90, 1),
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
    head: band(GOLD, 78, 10) + `<path d="M160 72 l6 8 -6 8 -6 -8 Z" fill="#d8262e" ${s2}/>`,
  }),
  jason: (c) => ({
    // the Golden Fleece: a ram's golden wool, curly at its edges, over his shoulders, with the ram's horn as its clasp
    back: `<path d="M110 188 C78 220 70 258 80 284 L240 284 C250 258 242 220 210 188 Z" fill="${GOLD}" ${S}/>`,
    body: tint(c.color) +
      `<path d="M98 200 C110 184 210 184 222 200 C228 214 220 228 210 230 C204 238 192 238 186 232 C178 240 166 240 160 232 C154 240 142 240 134 232 C128 238 116 238 110 230 C100 228 92 214 98 200 Z" fill="${GOLD}" ${S}/>` +
      [[112, 212], [134, 220], [160, 222], [186, 220], [208, 212], [124, 200], [196, 200]].map(([x, y]) => `<path d="M${x! - 5} ${y} a5 5 0 1 1 5 5 a3 3 0 1 1 -2 -4" stroke="${shade(GOLD, 0.35)}" stroke-width="1.8" fill="none"/>`).join('') +
      `<circle cx="160" cy="200" r="8" fill="#e8d6b0" ${S}/><path d="M156 200 a4 4 0 1 1 4 4 a2.4 2.4 0 1 1 -1.6 -3.2" stroke="${INK}" stroke-width="1.6" fill="none"/>`,
    head: '',
  }),
  medusa: (c) => ({
    // friendly snakes for hair
    body: robe(c.color, GOLD),
    head: MEDUSA_HAIR(c.color),
    hidesEars: true,
  }),
  // ---- Chinese ----
  wukong: () => ({
    // the golden headband, a tiger-skin skirt, the 金箍棒
    body: tint('#f2a03d') + `<path d="M104 236 L216 236 L222 262 C190 274 130 274 98 262 Z" fill="#ffb84a" ${S}/>` +
      [112, 140, 168, 196].map((x) => `<path d="M${x} 240 L${x + 8} 256 L${x + 14} 240 Z" fill="#3a2a20"/>`).join('') +
      `<path d="M58 270 L262 170" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="M58 270 L262 170" stroke="#c8102e" stroke-width="7" stroke-linecap="round"/><path d="M58 270 L74 262 M262 170 L246 178" stroke="${GOLD}" stroke-width="7" stroke-linecap="round"/>`,
    head: band(GOLD, 78, 12) + pair((f) => `<path d="M${f(80)} 104 C${f(64)} 104 ${f(60)} 88 ${f(72)} 86 C${f(80)} 86 ${f(80)} 96 ${f(74)} 96" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${f(80)} 104 C${f(64)} 104 ${f(60)} 88 ${f(72)} 86 C${f(80)} 86 ${f(80)} 96 ${f(74)} 96" fill="none" stroke="${GOLD}" stroke-width="4.5" stroke-linecap="round"/>`),
  }),
  nezha: (c) => ({
    // twin hair buns tied with red, the red sash (混天绫) flowing out behind him, the gold ring, fire wheels at his feet
    back: pair((f) => ropeTail(`M${f(112)} 200 C${f(84)} 196 ${f(66)} 212 ${f(70)} 232 C${f(74)} 252 ${f(58)} 266 ${f(44)} 258`, c.color, 11) +
      `<path d="M${f(48)} 256 L${f(34)} 248 L${f(40)} 262 L${f(34)} 272 Z" fill="${c.color}" ${s2}/>`),
    body: tint('#fbe9d6') + `<path d="M110 200 C140 214 180 214 210 200" fill="none" stroke="${INK}" stroke-width="15" stroke-linecap="round"/><path d="M110 200 C140 214 180 214 210 200" fill="none" stroke="${c.color}" stroke-width="11" stroke-linecap="round"/>` +
      `<circle cx="160" cy="232" r="16" fill="none" stroke="${INK}" stroke-width="9"/><circle cx="160" cy="232" r="16" fill="none" stroke="${GOLD}" stroke-width="5"/><path d="M150 222 a14 14 0 0 1 10 -4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>` +
      pair((f) => `<circle cx="${f(96)}" cy="266" r="12" fill="${GOLD}" ${S}/><circle cx="${f(96)}" cy="266" r="4" fill="${INK}"/><path d="M${f(84)} 262 C${f(76)} 252 ${f(82)} 246 ${f(86)} 252 C${f(84)} 244 ${f(92)} 240 ${f(94)} 250" fill="#ff6a3d" ${s2}/>`),
    head: pair((f) => `<circle cx="${f(124)}" cy="42" r="14" fill="#2a2630" ${S}/><path d="M${f(116)} 34 C${f(120)} 30 ${f(126)} 30 ${f(130)} 32" stroke="#fff" stroke-opacity=".45" stroke-width="3" fill="none" stroke-linecap="round"/>` +
      `<path d="M${f(110)} 52 C${f(118)} 58 ${f(130)} 58 ${f(138)} 52" stroke="${c.color}" stroke-width="5.5" fill="none" stroke-linecap="round"/><path d="M${f(136)} 54 l${f(144) - f(136)} 7 l${f(138) - f(144)} 3 Z" fill="${c.color}" ${s2}/>`) +
      `<circle cx="160" cy="92" r="4" fill="#d8262e"/>`,
  }),
  change: (c) => ({
    // the full moon behind her, ribbons, and the little jade rabbit
    back: `<circle cx="240" cy="66" r="40" fill="#fff3c4" ${S}/><path d="M218 50 a8 8 0 1 0 8 10" stroke="#f0dc9a" stroke-width="3" fill="none"/>` +
      pair((f) => ropeTail(`M${f(108)} 198 C${f(76)} 208 ${f(84)} 236 ${f(64)} 252 C${f(52)} 262 ${f(56)} 274 ${f(68)} 280`, '#ff9fbf', 8)),
    body: robe(c.color, '#ff9fbf') + `<ellipse cx="160" cy="244" rx="14" ry="11" fill="#fffdf7" ${S}/><ellipse cx="153" cy="230" rx="4" ry="10" fill="#fffdf7" ${s2}/><ellipse cx="166" cy="230" rx="4" ry="10" fill="#fffdf7" ${s2}/><circle cx="156" cy="242" r="1.6" fill="${INK}"/><circle cx="164" cy="242" r="1.6" fill="${INK}"/>`,
    // two upright loops of hair (双环髻) over a small bun, a hairpin with a flower and pearls
    head: pair((f) => { const a = f(0) === 0 ? -22 : 22; return `<ellipse cx="${f(134)}" cy="42" rx="10" ry="16" transform="rotate(${a} ${f(134)} 42)" fill="none" stroke="${INK}" stroke-width="12"/><ellipse cx="${f(134)}" cy="42" rx="10" ry="16" transform="rotate(${a} ${f(134)} 42)" fill="none" stroke="#3a3440" stroke-width="7"/>`; }) + `<ellipse cx="160" cy="56" rx="22" ry="12" fill="#3a3440" ${S}/><path d="M146 44 C152 40 160 39 166 40" stroke="#fff" stroke-opacity=".4" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M176 46 L212 60" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/><circle cx="178" cy="46" r="7" fill="#ff9fbf" ${s2}/><circle cx="178" cy="46" r="2.6" fill="${GOLD}"/><path d="M210 60 L212 74 M206 60 L204 72" stroke="${GOLD}" stroke-width="1.6"/><circle cx="212" cy="76" r="3" fill="#fffdf7" ${s2}/><circle cx="204" cy="74" r="3" fill="#fffdf7" ${s2}/>`,
  }),
  houyi: (c) => ({
    // a headband, a big bow and arrow, a sun on his chest (he shot down nine suns)
    back: `<path d="M74 280 C30 230 30 150 74 104" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M74 280 C30 230 30 150 74 104" fill="none" stroke="#8a5a3c" stroke-width="6" stroke-linecap="round"/><path d="M74 104 L74 280" stroke="${INK}" stroke-width="1.8"/>`,
    body: tint(c.color) + `<circle cx="160" cy="226" r="14" fill="#ff5532" ${S}/>` + [...Array(8)].map((_, i) => {
      const a = (i * Math.PI) / 4;
      return `<path d="M${(160 + 18 * Math.cos(a)).toFixed(1)} ${(226 + 18 * Math.sin(a)).toFixed(1)} L${(160 + 24 * Math.cos(a)).toFixed(1)} ${(226 + 24 * Math.sin(a)).toFixed(1)}" stroke="#ff9f43" stroke-width="3.5" stroke-linecap="round"/>`;
    }).join('') + `<path d="M76 190 L120 190" stroke="${INK}" stroke-width="3"/><path d="M118 184 L128 190 L118 196 Z" fill="${INK}"/>`,
    head: band('#d8262e', 78, 11) + `<path d="M238 98 C256 102 266 116 262 132 M240 104 C252 112 254 126 246 138" stroke="${INK}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M238 98 C256 102 266 116 262 132 M240 104 C252 112 254 126 246 138" stroke="#d8262e" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
  }),
  caishen: (c) => ({
    // a red robe, a tall gold hat, a gold ingot (元宝)
    body: robe(c.color, GOLD) + `<path d="M138 236 C142 250 178 250 182 236 L176 230 C170 236 150 236 144 230 Z" fill="${GOLD}" ${S}/><ellipse cx="160" cy="230" rx="11" ry="8" fill="${GOLD}" ${S}/>`,
    head: pair((f) => `<path d="M${f(118)} 52 C${f(98)} 46 ${f(82)} 44 ${f(70)} 48 C${f(68)} 56 ${f(72)} 62 ${f(80)} 62 C${f(92)} 60 ${f(106)} 60 ${f(118)} 64 Z" fill="${GOLD}" ${S}/>`) + `<path d="M114 72 L116 40 C116 30 204 30 204 40 L206 72 Z" fill="${GOLD}" ${S}/><path d="M108 66 C140 60 180 60 212 66 L212 78 C180 72 140 72 108 78 Z" fill="${c.color}" ${S}/><circle cx="160" cy="52" r="7" fill="#3f6fd6" ${s2}/><circle cx="160" cy="27" r="6" fill="${c.color}" ${s2}/><path d="M126 44 C130 36 140 33 150 33" stroke="#fff" stroke-opacity=".55" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
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
  cerberus: (c) => ({
    // three friendly heads: his hood, and one on each shoulder; a spiky collar
    front: eyes() + `<path d="M149 64 Q160 59 171 64 Q169 77 160 80 Q151 77 149 64 Z" fill="${INK}"/>` +
      pair((f) => `<path d="M${f(70)} 80 L${f(56)} 48 L${f(92)} 64 Z" fill="${c.color}" ${S}/>`),
    body: `<path d="M110 194 C140 206 180 206 210 194" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>` +
      [122, 142, 160, 178, 198].map((x) => `<path d="M${x - 5} 200 L${x} 210 L${x + 5} 200 Z" fill="#c9d1dc" ${s2}/>`).join('') +
      pair((f) => `<path d="M${f(84)} 204 L${f(78)} 180 L${f(96)} 194 Z M${f(112)} 194 L${f(118)} 178 L${f(104)} 190 Z" fill="${c.color}" ${S}/><circle cx="${f(98)}" cy="208" r="19" fill="${c.color}" ${S}/>` +
        `<ellipse cx="${f(98)}" cy="216" rx="11" ry="8" fill="#9c96a3" ${s2}/><circle cx="${f(91)}" cy="203" r="3" fill="#fff"/><circle cx="${f(105)}" cy="203" r="3" fill="#fff"/><circle cx="${f(91)}" cy="203" r="1.5" fill="${INK}"/><circle cx="${f(105)}" cy="203" r="1.5" fill="${INK}"/><path d="M${f(94)} 212 Q${f(98)} 209 ${f(102)} 212 Q${f(98)} 218 ${f(94)} 212 Z" fill="${INK}"/><path d="M${f(96)} 222 q2 5 4 0" fill="#ff8fab" ${s2}/>`),
    tail: ropeTail('M210 248 C232 244 246 228 250 206', c.color, 10),
  }),
  liondance: (c) => ({
    // the lion-dance head: a horn, a mirror on its brow, big bright eyes, a white fluffy fringe round the face; a fringed body
    front: fringe('#fffdf7', 'fluff', 0.36, 1.14, 19) + `<path d="M152 38 L160 23 L168 38 Z" fill="${GOLD}" ${S}/><circle cx="160" cy="45" r="6" fill="#c9eaff" ${S}/>` +
      pair((f) => `<circle cx="${f(124)}" cy="56" r="11" fill="#fffdf7" ${S}/><circle cx="${f(126)}" cy="58" r="5.5" fill="${INK}"/><path d="M${f(110)} 43 Q${f(124)} 35 ${f(138)} 43" fill="none" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/>`),
    body: `<path d="M102 252 C130 262 190 262 218 252" fill="none" stroke="${GOLD}" stroke-width="8" stroke-linecap="round"/>` +
      [110, 124, 138, 152, 166, 180, 194, 208].map((x) => `<path d="M${x} 256 L${x + 3} 268" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`).join('') +
      pair((f) => `<circle cx="${f(110)}" cy="214" r="8" fill="#fffdf7" ${s2}/>`),
    belly: `<ellipse cx="160" cy="232" rx="30" ry="22" fill="${GOLD}" opacity=".9"/>`,
    tail: [...Array(4)].map((_, i) => `<circle cx="${214 + i * 12}" cy="${244 - i * 10}" r="10" fill="#fffdf7" ${s2}/>`).join(''),
  }),
};
