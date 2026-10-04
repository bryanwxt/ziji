import { costumeById, type Costume } from '../../fun/costumes';

// Costume art in Truffle's viewBox (30 20 260 270). Ink outlines match the mascot (3.2px, round joins).
const INK = '#2a2630';
const S = `stroke="${INK}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"`;
const s2 = `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;

/** Mirror an x coordinate across Truffle's centre line (x = 160). */
const mx = (x: number) => 320 - x;

const BODY = 'M110 186 C90 200 86 238 104 258 C120 276 200 276 216 258 C234 238 230 200 210 186 Z';
const BELLY = '<ellipse cx="160" cy="236" rx="36" ry="30" fill="#fffdf7" opacity=".85"/>';
/** Hood: a dome over the head with the face left open (even-odd). Covers the cat's own ears. */
const HOOD =
  'M160 28 C224 28 270 64 276 116 C280 152 268 184 246 200 L74 200 C52 184 40 152 44 116 C50 64 96 28 160 28 Z ' +
  'M160 76 C210 76 250 102 250 138 C250 174 210 198 160 198 C110 198 70 174 70 138 C70 102 110 76 160 76 Z';

const tint = (color: string) => `<path d="${BODY}" fill="${color}" ${S}/>`;
const hood = (color: string) => `<path d="${HOOD}" fill="${color}" fill-rule="evenodd" ${S}/>`;
const pair = (draw: (flip: (x: number) => number) => string) => draw((x) => x) + draw(mx);

/** Animal features for each zodiac onesie: [behind the hood, in front of the hood]. */
const ANIMAL: Record<string, (c: Costume) => [string, string]> = {
  rat: (c) => [pair((f) => `<circle cx="${f(62)}" cy="48" r="24" fill="${c.color}" ${S}/><circle cx="${f(62)}" cy="48" r="13" fill="#f6c9cf"/>`), ''],
  ox: () => [
    pair((f) => `<path d="M${f(74)} 70 C${f(54)} 60 ${f(46)} 42 ${f(52)} 26 C${f(64)} 40 ${f(76)} 48 ${f(90)} 54 Z" fill="#f4e7cf" ${S}/>`),
    pair((f) => `<ellipse cx="${f(62)}" cy="96" rx="12" ry="8" fill="#6e452c"/>`),
  ],
  tiger: (c) => [
    pair((f) => `<circle cx="${f(98)}" cy="44" r="18" fill="${c.color}" ${S}/><circle cx="${f(98)}" cy="44" r="9" fill="#3a2a20"/>`),
    '<path d="M152 29 L160 52 L168 29 Z M126 33 L140 54 L142 31 Z M194 33 L180 54 L178 31 Z" fill="#3a2a20"/>' +
      pair((f) => `<path d="M${f(46)} 118 L${f(70)} 124 L${f(46)} 132 Z M${f(50)} 146 L${f(72)} 150 L${f(52)} 158 Z" fill="#3a2a20"/>`),
  ],
  rabbit: (c) => [
    '',
    pair((f) => `<ellipse cx="${f(56)}" cy="146" rx="17" ry="50" transform="rotate(${f(56) < 160 ? 12 : -12} ${f(56)} 146)" fill="${c.color}" ${S}/>` +
      `<ellipse cx="${f(56)}" cy="150" rx="8" ry="36" transform="rotate(${f(56) < 160 ? 12 : -12} ${f(56)} 150)" fill="#f6c9cf"/>`),
  ],
  dragon: () => [
    pair((f) => `<path d="M${f(116)} 38 L${f(104)} 24 L${f(128)} 32 Z" fill="#ffc94a" ${s2}/>`),
    pair((f) => `<path d="M${f(46)} 104 L${f(32)} 98 L${f(48)} 90 Z M${f(54)} 78 L${f(42)} 68 L${f(60)} 64 Z" fill="#3f9e55" ${s2}/>`),
  ],
  snake: () => ['', [80, 100, 130, 160, 190, 220, 240].map((x, i) => `<circle cx="${x}" cy="${[70, 50, 38, 34, 38, 50, 70][i]}" r="6" fill="#4f9e4a"/>`).join('')],
  horse: (c) => [
    pair((f) => `<path d="M${f(96)} 48 L${f(92)} 24 L${f(116)} 38 Z" fill="${c.color}" ${S}/>`),
    `<path d="M112 36 Q122 18 132 31 Q142 16 152 29 Q160 14 168 29 Q178 16 188 31 Q198 18 208 36 Z" fill="#7a4a2a" ${s2}/>`,
  ],
  goat: () => [
    '',
    pair((f) => `<circle cx="${f(58)}" cy="78" r="18" fill="#e8dcc0" ${S}/><path d="M${f(58)} 78 m-9 0 a9 9 0 1 1 9 9 a5 5 0 1 1 -4 -6" fill="none" ${s2}/>`),
  ],
  monkey: (c) => [pair((f) => `<circle cx="${f(52)}" cy="134" r="20" fill="${c.color}" ${S}/><circle cx="${f(52)}" cy="134" r="11" fill="#e8c39a"/>`), ''],
  rooster: () => ['', `<path d="M136 44 Q140 24 150 36 Q156 20 166 34 Q174 22 182 44 Z" fill="#b81d1d" ${s2}/>`],
  dog: () => [
    '',
    pair((f) => `<ellipse cx="${f(54)}" cy="126" rx="19" ry="40" transform="rotate(${f(54) < 160 ? 16 : -16} ${f(54)} 126)" fill="#a8703f" ${S}/>`),
  ],
  pig: (c) => [
    pair((f) => `<path d="M${f(94)} 52 L${f(90)} 28 L${f(116)} 40 Z" fill="${c.color}" ${S}/>`),
    `<ellipse cx="160" cy="50" rx="16" ry="10" fill="#ff8fab" ${s2}/><circle cx="154" cy="50" r="2.6" fill="${INK}"/><circle cx="166" cy="50" r="2.6" fill="${INK}"/>`,
  ],
};

/** Outfits: [behind the body, over the body, on the head]. */
const OUTFIT: Record<string, (c: Costume) => [string, string, string]> = {
  astronaut: (c) => [
    '',
    tint(c.color) + `<rect x="136" y="214" width="48" height="30" rx="6" fill="#bfe0ff" ${s2}/><circle cx="148" cy="229" r="4" fill="#ff5532"/><circle cx="162" cy="229" r="4" fill="#ffc94a"/><circle cx="176" cy="229" r="4" fill="#7fdc7a"/>`,
    `<ellipse cx="160" cy="122" rx="118" ry="100" fill="#bfe0ff" fill-opacity=".22" ${S}/><path d="M82 70 C98 50 122 40 146 38" fill="none" stroke="#fffdf7" stroke-width="7" stroke-linecap="round" opacity=".9"/>`,
  ],
  chef: (c) => [
    '',
    `<path d="M124 196 L196 196 L206 268 C180 276 140 276 114 268 Z" fill="${c.color}" ${S}/><path d="M124 210 C110 206 100 214 98 224 M196 210 C210 206 220 214 222 224" fill="none" ${s2}/>`,
    `<circle cx="132" cy="36" r="15" fill="${c.color}" ${S}/><circle cx="188" cy="36" r="15" fill="${c.color}" ${S}/><circle cx="160" cy="34" r="17" fill="${c.color}" ${S}/><rect x="118" y="40" width="84" height="20" rx="4" fill="${c.color}" ${S}/>`,
  ],
  wizard: (c) => [
    '',
    tint(c.color) + `<path d="M160 214 l5 10 11 2 -8 8 2 11 -10 -5 -10 5 2 -11 -8 -8 11 -2 Z" fill="#ffc94a" ${s2}/>`,
    `<ellipse cx="160" cy="64" rx="74" ry="11" fill="${c.color}" ${S}/><path d="M104 62 L160 21 L216 62 Z" fill="${c.color}" ${S}/><circle cx="174" cy="44" r="4" fill="#ffc94a"/><circle cx="148" cy="52" r="3" fill="#ffc94a"/>`,
  ],
  explorer: (c) => [
    '',
    `<path d="M110 190 C96 210 94 240 104 258 L136 262 L140 198 Z M210 190 C224 210 226 240 216 258 L184 262 L180 198 Z" fill="${c.color}" ${S}/><rect x="190" y="222" width="18" height="16" rx="3" fill="#b08a4e" ${s2}/>`,
    `<ellipse cx="160" cy="56" rx="94" ry="14" fill="${c.color}" ${S}/><path d="M110 54 C112 30 208 30 210 54 Z" fill="${c.color}" ${S}/><path d="M112 48 C140 42 180 42 208 48" fill="none" stroke="#7a5a2c" stroke-width="5"/>`,
  ],
  pirate: (c) => [
    '',
    tint('#fffdf7') + [212, 232, 252].map((y) => `<rect x="${y === 252 ? 118 : 108}" y="${y}" width="${y === 252 ? 84 : 104}" height="8" rx="4" fill="${c.color}"/>`).join(''),
    `<path d="M84 68 C104 26 216 26 236 68 C200 56 120 56 84 68 Z" fill="#26232b" ${S}/><circle cx="160" cy="48" r="9" fill="#fffdf7"/><path d="M155 46 h3 M162 46 h3 M156 52 q4 3 8 0" stroke="${INK}" stroke-width="1.6" fill="none"/>`,
  ],
  hero: (c) => [
    `<path d="M112 192 C78 222 66 262 80 288 L240 288 C254 262 242 222 208 192 Z" fill="${c.color}" ${S}/>`,
    `<circle cx="160" cy="226" r="18" fill="#ffc94a" ${s2}/><text x="160" y="227" font-family="WenKai, serif" font-size="22" text-anchor="middle" dominant-baseline="middle" fill="${INK}">字</text>`,
    `<path d="M68 82 C116 66 204 66 252 82 L250 96 C202 82 118 82 70 96 Z" fill="${c.color}" ${S}/>`,
  ],
  pixel: (c) => {
    const rows: [number, number, number][] = [[200, 108, 212], [212, 102, 218], [224, 100, 220], [236, 100, 220], [248, 106, 214]];
    const body = rows.map(([y, x0, x1]) => {
      const cells: string[] = [];
      for (let x = x0, i = 0; x + 12 <= x1; x += 12, i++) cells.push(`<rect x="${x}" y="${y}" width="12" height="12" fill="${(i + y / 12) % 2 < 1 ? c.color : '#3faa5a'}" opacity=".55"/>`);
      return cells.join('');
    });
    const cap = [0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${118 + i * 12}" y="${i === 0 || i === 6 ? 46 : 34}" width="12" height="${i === 0 || i === 6 ? 12 : 24}" fill="${i % 2 ? '#3faa5a' : c.color}" ${s2}/>`).join('');
    return ['', body.join(''), cap];
  },
  raincoat: (c) => [
    '',
    tint(c.color) + `<path d="M160 196 L160 268" stroke="${INK}" stroke-width="2.4"/><circle cx="170" cy="214" r="3.5" fill="${INK}"/><circle cx="170" cy="236" r="3.5" fill="${INK}"/><circle cx="170" cy="256" r="3.5" fill="${INK}"/>`,
    `<path d="M56 74 C96 50 224 50 264 74 C232 66 88 66 56 74 Z" fill="${c.color}" ${S}/><path d="M108 66 C112 32 208 32 212 66 Z" fill="${c.color}" ${S}/>`,
  ],
};

/** The layers for a costume id, or null for unknown ids (ignored, never worn). */
export function costumeLayer(id: string | null | undefined): { back: string; body: string; head: string; hidesEars: boolean } | null {
  const c = costumeById(id);
  if (!c) return null;
  if (c.kind === 'onesie') {
    const [behind, front] = ANIMAL[c.id]!(c);
    return { back: '', body: tint(c.color) + BELLY, head: behind + hood(c.color) + front, hidesEars: true };
  }
  const [back, body, head] = OUTFIT[c.id]!(c);
  return { back, body, head, hidesEars: false };
}
