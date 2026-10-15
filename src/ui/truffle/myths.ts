// The Chinese myths, the fortune cat and the lion dance (rewards spec 2026-10-15 §5.2), redrawn to the v3 standard. wukong and
// change are the parent-approved samples (docs/worlds/costumes/samples-v3.ts.txt).
//
// Held props sit out to his right (or low and out on his left) so they clear his face in every paw move: the wave turns his
// right paw up and 20° toward his face, and the clap brings both paws up to his chest (the WebKit face probe checks it).
import { crescent } from '../cel';
import { belly, cel, celShade, DARK, fringe, gloveL, gloveR, hi, hood, INK, pair, pawOverL, pawOverR, rope, ropeTail, S, s2, tint } from './costumeKit';
import type { CostumeLayer } from './costumes';

const r1 = (n: number) => Math.round(n * 10) / 10;
/** A circle as an explicit cubic path (so a round piece can be a `cel` piece). */
const disc = (cx: number, cy: number, r: number) => {
  const k = r1(r * 0.5523);
  return `M${cx - r} ${cy} C${cx - r} ${r1(cy - k)} ${r1(cx - k)} ${cy - r} ${cx} ${cy - r} C${r1(cx + k)} ${cy - r} ${cx + r} ${r1(cy - k)} ${cx + r} ${cy} ` +
    `C${cx + r} ${r1(cy + k)} ${r1(cx + k)} ${cy + r} ${cx} ${cy + r} C${r1(cx - k)} ${cy + r} ${cx - r} ${r1(cy + k)} ${cx - r} ${cy} Z`;
};
/** Which side of his centre line a mirrored x is on. */
const left = (f: (x: number) => number) => f(100) < 160;
const GOLD = '#f2c230';
const RED = '#d8302a';

// ---------------------------------------------------------------------------------------------------------------------------
// 1. 孙悟空 Sun Wukong (the sample): a golden circlet, two long pheasant plumes, a gold tunic with a red scarf and a tiger-skin
//    skirt, a monkey's tail, the somersault cloud under him, and the 金箍棒 in his paw (it rises with the paw). The staff is
//    shorter than the sample's, so its top stays clear of his face when he waves and its foot stays by his feet.
const WK = '#f5b82e';
const WK_RED = '#d8302a';
const plume = (f: (x: number) => number) => {
  // a long pheasant plume (雉鸡翎) from the circlet, sweeping up and out: wide at the root, tapering to a fine tip
  const d = `M${f(132)} 74 C${f(118)} 30 ${f(88)} 10 ${f(40)} 24 C${f(36)} 28 ${f(42)} 30 ${f(48)} 30 C${f(90)} 26 ${f(110)} 46 ${f(146)} 74 Z`;
  const bars = [[118, 50, 124, 44], [104, 36, 110, 30], [88, 28, 92, 22], [70, 27, 72, 22]].map(([a, b, c, e]) =>
    `<path d="M${f(a!)} ${b} L${f(c!)} ${e}" stroke="${WK_RED}" stroke-width="3.4" stroke-linecap="round"/>`).join('');
  return `<path d="${d}" fill="${GOLD}" ${S}/>` + bars;
};
const wukong = (): CostumeLayer => ({
  // the somersault cloud he stands on
  back: cel('M44 282 C30 278 32 258 50 258 C50 240 76 236 86 250 C92 236 116 236 120 252 L200 252 C204 236 228 236 234 250 C244 236 270 240 270 258 C288 258 290 278 276 282 Z', '#fff7e6', 60, 250, 0.92) +
    `<path d="M58 270 C58 262 68 262 68 268 M252 270 C252 262 262 262 262 268" fill="none" stroke="#f0b35a" stroke-width="2.6" stroke-linecap="round"/>`,
  body: tint(WK) +
    // the tiger-skin skirt
    `<path d="M100 238 L220 238 L226 262 C190 276 130 276 94 262 Z" fill="#ffa53d" ${S}/>` +
    [106, 132, 158, 184, 208].map((x) => `<path d="M${x} 242 L${x + 6} 258 L${x + 12} 242 Z" fill="#3a2a20"/>`).join('') +
    `<path d="M98 232 C130 242 190 242 222 232 L222 242 C190 252 130 252 98 242 Z" fill="${WK_RED}" ${S}/>` +
    // the red scarf round his neck, its ends flying
    `<path d="M104 194 C130 212 190 212 216 194 L220 208 C190 228 130 228 100 208 Z" fill="${WK_RED}" ${S}/>` +
    `<path d="M196 214 C210 222 222 236 236 238 C226 228 222 222 212 212 Z" fill="${WK_RED}" ${S}/>`,
  head: pair(plume) +
    // the circlet: a gold band right across his head, edge to edge, a cloud-scroll at the brow and a curl at each end
    `<path d="M56 96 C96 58 224 58 264 96 L262 108 C222 70 98 70 58 108 Z" fill="${GOLD}" ${S}/>` +
    `<path d="M148 66 C146 56 154 50 160 56 C166 50 174 56 172 66 Z" fill="${GOLD}" ${S}/><circle cx="160" cy="62" r="3" fill="${WK_RED}"/>` +
    pair((f) => `<path d="M${f(60)} 106 C${f(46)} 108 ${f(42)} 94 ${f(52)} 92 C${f(60)} 92 ${f(60)} 102 ${f(54)} 102" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path d="M${f(60)} 106 C${f(46)} 108 ${f(42)} 94 ${f(52)} 92 C${f(60)} 92 ${f(60)} 102 ${f(54)} 102" fill="none" stroke="${GOLD}" stroke-width="4.5" stroke-linecap="round"/>`),
  tail: ropeTail('M210 250 C244 256 268 232 258 208 C252 194 234 196 236 210 C238 220 250 218 248 210', '#a06a3c', 7),
  // the staff: a red rod with gold ends, through his paw
  pawR: `<g transform="translate(182 262) rotate(-34)">` +
    `<path d="M-6 0 L126 0" stroke="${INK}" stroke-width="${12 + 2 * 2.8}" stroke-linecap="round"/><path d="M-6 0 L126 0" stroke="${WK_RED}" stroke-width="12" stroke-linecap="round"/>` +
    `<path d="M106 0 L126 0" stroke="${GOLD}" stroke-width="12" stroke-linecap="round"/><path d="M106 -6 L106 6" stroke="${INK}" stroke-width="1.8"/>` +
    `<path d="M8 -3.5 L102 -3.5" stroke="#fff" stroke-opacity=".35" stroke-width="2.5" stroke-linecap="round"/></g>` +
    pawOverR,
  hidesEars: false,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 2. 哪吒 Nezha (the plan's worked example): the lotus-pink tunic and petal skirt, 混天绫 (the red sash) floating out behind
//    him, two buns high on his head with the hair across his brow from edge to edge, a red mark, 风火轮 (the fire wheels) at his
//    feet, and 乾坤圈 (the golden ring) in his right paw.
const NZ = '#ef6f8a';
const NZ_RED = '#d8302a';
const NZ_HAIR = '#3d3646';
/** A fire wheel: flames streaming out behind, a gold rim, red spokes. */
const fireWheel = (f: (x: number) => number) =>
  `<path d="M${f(100)} 262 C${f(84)} 258 ${f(72)} 246 ${f(70)} 232 C${f(78)} 240 ${f(82)} 240 ${f(84)} 236 C${f(82)} 248 ${f(88)} 252 ${f(92)} 250 C${f(88)} 240 ${f(92)} 230 ${f(98)} 226 C${f(98)} 238 ${f(104)} 246 ${f(110)} 250 Z" fill="#ff7a2e" ${s2}/>` +
  `<path d="M${f(98)} 258 C${f(88)} 254 ${f(82)} 248 ${f(80)} 242 C${f(88)} 248 ${f(94)} 248 ${f(98)} 246 C${f(98)} 250 ${f(102)} 254 ${f(106)} 254 Z" fill="#ffc94a"/>` +
  `<circle cx="${f(102)}" cy="272" r="13" fill="${GOLD}" ${S}/><circle cx="${f(102)}" cy="272" r="7.5" fill="${NZ_RED}" ${s2}/>` +
  `<path d="M${f(102)} 265 L${f(102)} 279 M${f(95)} 272 L${f(109)} 272" stroke="${GOLD}" stroke-width="2.2"/><circle cx="${f(102)}" cy="272" r="2.6" fill="${GOLD}" ${s2}/>`;
const nezha = (): CostumeLayer => ({
  // the sash: from his shoulders, out in a loop on each side and streaming down
  back: rope('M112 198 C76 188 48 204 48 230 C48 250 62 260 56 280', NZ_RED, 12) +
    `<path d="M50 276 L40 286 L58 284 L66 274 Z" fill="${NZ_RED}" ${s2}/>` +
    rope('M208 196 C244 176 280 186 280 212 C280 232 262 240 268 262', NZ_RED, 12) +
    `<path d="M262 258 L270 274 L278 260 Z" fill="${NZ_RED}" ${s2}/>` +
    hi('M60 206 C68 198 80 194 94 194', 3, 0.45) + hi('M226 186 C240 180 256 180 266 186', 3, 0.45),
  body: tint(NZ) +
    [96, 120, 144, 168, 192, 214].map((x, i) => cel(`M${x} 262 C${x - 10} 246 ${x - 4} 228 ${x + 8} 222 C${x + 20} 228 ${x + 24} 246 ${x + 16} 262 Z`, i % 2 ? '#f9b3c4' : NZ, x + 2, 232, 0.86)).join('') +
    `<path d="M104 196 C130 214 190 214 216 196 L218 208 C190 228 130 228 102 208 Z" fill="${NZ_RED}" ${S}/>` +
    pair(fireWheel),
  head:
    // the two buns, high on his head, each tied with a red ribbon whose ends hang down
    pair((f) => cel(`M${f(110)} 56 C${f(96)} 34 ${f(118)} 18 ${f(136)} 26 C${f(150)} 34 ${f(146)} 54 ${f(128)} 60 Z`, NZ_HAIR, Math.min(f(110), f(146)) + 10, 28, 0.88) +
      `<path d="M${f(108)} 56 C${f(118)} 62 ${f(130)} 62 ${f(140)} 54" fill="none" stroke="${INK}" stroke-width="9.6" stroke-linecap="round"/><path d="M${f(108)} 56 C${f(118)} 62 ${f(130)} 62 ${f(140)} 54" fill="none" stroke="${NZ_RED}" stroke-width="6" stroke-linecap="round"/>` +
      `<path d="M${f(108)} 56 C${f(96)} 62 ${f(88)} 70 ${f(84)} 82 L${f(94)} 80 C${f(98)} 70 ${f(104)} 64 ${f(112)} 60 Z" fill="${NZ_RED}" ${s2}/>`) +
    // the hair across his brow from edge to edge, in locks
    `<path d="M54 102 C80 74 120 68 160 70 C200 68 240 74 266 102 C252 98 240 100 230 106 C222 94 208 90 196 94 C186 86 174 84 160 90 C146 84 134 86 124 94 C112 90 98 94 90 106 C80 100 68 98 54 102 Z" fill="${NZ_HAIR}" ${S}/>` +
    hi('M92 86 C106 77 124 73 142 72', 4, 0.3) +
    `<path d="M160 94 C163 99 163 104 160 108 C157 104 157 99 160 94 Z" fill="${NZ_RED}"/>`,
  pawR: `<circle cx="236" cy="242" r="20" fill="none" stroke="${INK}" stroke-width="${10 + 2 * 2.8}"/><circle cx="236" cy="242" r="20" fill="none" stroke="${GOLD}" stroke-width="10"/>` +
    hi('M221 230 C225 226 231 224 237 224', 3, 0.6) + pawOverR,
  hidesEars: true, // tucked under the buns
});

// ---------------------------------------------------------------------------------------------------------------------------
// 3. 嫦娥 Chang'e (the sample): a long pale-pink robe with wide sleeves, a rose ribbon floating out at both sides, dark hair in
//    two tall loops, a crescent moon behind her, and the jade rabbit in her paw.
const CE = '#f8cfe0';
const CE_ROSE = '#e8799f';
const HAIR = '#3d3646';
const change = (): CostumeLayer => ({
  back: `<path d="${crescent(70, 66, 34, 34, 15, -11)}" fill="#fff0b3" ${S}/>` +
    pair((f) => rope(`M${f(112)} 198 C${f(64)} 190 ${f(46)} 216 ${f(56)} 240 C${f(66)} 262 ${f(52)} 278 ${f(36)} 282`, CE_ROSE, 10)),
  body:
    // wide sleeves, then the long flared robe over them
    pair((f) => `<path d="M${f(112)} 192 C${f(86)} 202 ${f(70)} 232 ${f(66)} 262 C${f(80)} 272 ${f(102)} 270 ${f(114)} 258 C${f(108)} 236 ${f(112)} 214 ${f(122)} 200 Z" fill="${CE}" ${S}/>`) +
    cel('M114 186 C100 206 92 240 82 284 C130 292 190 292 238 284 C228 240 220 206 206 186 Z', CE, 130, 196, 0.9) +
    // the crossed collar, the high sash and its ends
    `<path d="M140 190 L160 214 L180 190" fill="none" stroke="#fffdf7" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M106 216 C130 224 190 224 214 216 L215 228 C190 236 130 236 105 228 Z" fill="${CE_ROSE}" ${S}/>` +
    `<path d="M156 230 L150 270 L158 268 L162 232 Z M164 230 L172 270 L164 270 L160 232 Z" fill="${CE_ROSE}" ${s2}/>`,
  head:
    // two tall loops of hair, long locks down past his cheeks, then the hair over his head (his ears tucked under it), a flower pin
    pair((f) => { const a = f(0) === 0 ? -20 : 20; return `<ellipse cx="${f(124)}" cy="42" rx="15" ry="21" transform="rotate(${a} ${f(124)} 42)" fill="none" stroke="${INK}" stroke-width="${13 + 5.6}"/><ellipse cx="${f(124)}" cy="42" rx="15" ry="21" transform="rotate(${a} ${f(124)} 42)" fill="none" stroke="${HAIR}" stroke-width="13"/>`; }) +
    pair((f) => `<path d="M${f(54)} 104 C${f(36)} 140 ${f(40)} 186 ${f(62)} 210 C${f(74)} 200 ${f(80)} 190 ${f(86)} 182 C${f(74)} 158 ${f(72)} 132 ${f(78)} 108 Z" fill="${HAIR}" ${S}/>`) +
    cel('M50 124 C36 70 92 30 160 30 C228 30 284 70 270 124 C258 104 242 92 228 86 C206 76 184 76 160 84 C136 76 114 76 92 86 C78 92 62 104 50 124 Z', HAIR, 110, 44, 0.9) +
    `<path d="M160 36 L160 88" stroke="#5a5266" stroke-width="2" stroke-linecap="round"/>` +
    hi('M86 70 C100 52 120 42 142 38', 5, 0.25) +
    `<circle cx="196" cy="48" r="10" fill="#ff9fbf" ${s2}/><circle cx="196" cy="48" r="3.6" fill="${GOLD}"/><path d="M204 54 L232 70" stroke="${GOLD}" stroke-width="3.5" stroke-linecap="round"/><circle cx="232" cy="74" r="3.4" fill="#fffdf7" ${s2}/>`,
  // the jade rabbit, sitting in her paw (it rises with the paw)
  pawR: `<g transform="translate(40 16)">` +
    `<ellipse cx="200" cy="216" rx="6.5" ry="17" transform="rotate(-14 200 216)" fill="#fffdf7" ${S}/><ellipse cx="200" cy="217" rx="2.6" ry="11" transform="rotate(-14 200 217)" fill="#f6b6c2"/>` +
    `<ellipse cx="214" cy="216" rx="6.5" ry="17" transform="rotate(16 214 216)" fill="#fffdf7" ${S}/><ellipse cx="214" cy="217" rx="2.6" ry="11" transform="rotate(16 214 217)" fill="#f6b6c2"/>` +
    `<ellipse cx="200" cy="252" rx="22" ry="17" fill="#fffdf7" ${S}/>` +
    `<circle cx="206" cy="234" r="14" fill="#fffdf7" ${S}/><circle cx="202" cy="232" r="2.2" fill="#d8302a"/><circle cx="212" cy="232" r="2.2" fill="#d8302a"/><path d="M205 238 L209 238 L207 240.5 Z" fill="#f08aa0"/>` + + `</g>` +
    pawOverR,
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 4. 后羿 Hou Yi, the archer who shot down nine suns: a red headband tied right across his head (its ends flying out to his
//    right; his crown and ears show), a deep-green tunic with leather shoulder plates and a belt with a gold sun, a quiver of
//    red-fletched arrows behind his right shoulder, and a big bow held in his left paw, leaning out away from his face.
const HY = '#3d7a5a';
const LEATHER = '#8a5a3c';
const BOW = '#c98f55';
const sunBadge = (cx: number, cy: number, r: number) =>
  [...Array(8)].map((_, i) => {
    const a = (i * Math.PI) / 4;
    return `<path d="M${r1(cx + (r + 2) * Math.cos(a))} ${r1(cy + (r + 2) * Math.sin(a))} L${r1(cx + (r + 7) * Math.cos(a))} ${r1(cy + (r + 7) * Math.sin(a))}" stroke="#ffb020" stroke-width="3.4" stroke-linecap="round"/>`;
  }).join('') + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffb020" ${s2}/><circle cx="${cx - 2}" cy="${cy - 2}" r="${r * 0.45}" fill="#ffe08a"/>`;
const houyi = (): CostumeLayer => ({
  // the quiver, slung across his back: its top and the arrows' red fletching past his right shoulder
  back: `<g transform="rotate(32 236 190)">` +
    [-8, 0, 8].map((dx) => `<path d="M${236 + dx} 150 L${236 + dx} 128" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>` +
      `<path d="M${236 + dx} 136 L${230 + dx} 122 L${236 + dx} 126 L${242 + dx} 122 Z" fill="${RED}" ${s2}/>`).join('') +
    cel('M222 148 L250 148 L248 236 L224 236 Z', LEATHER, 226, 152, 0.88) +
    `<path d="M222 160 L250 160 M223 222 L249 222" stroke="${GOLD}" stroke-width="3"/></g>`,
  body: tint(HY) +
    // the strap of the quiver across his chest
    `<path d="M120 194 L206 250" stroke="${INK}" stroke-width="9.6" stroke-linecap="round"/><path d="M120 194 L206 250" stroke="${LEATHER}" stroke-width="6" stroke-linecap="round"/>` +
    // the leather shoulder plates
    pair((f) => cel(`M${f(98)} 214 C${f(94)} 196 ${f(106)} 184 ${f(128)} 186 C${f(132)} 196 ${f(124)} 210 ${f(98)} 214 Z`, LEATHER, left(f) ? 104 : 196, 192, 0.88) +
      `<path d="M${f(104)} 204 C${f(112)} 200 ${f(120)} 198 ${f(126)} 194" fill="none" stroke="${celShade(LEATHER)}" stroke-width="2" stroke-linecap="round"/>`) +
    // the belt, its sun badge
    `<path d="M98 240 C130 250 190 250 222 240 L222 252 C190 262 130 262 98 252 Z" fill="${LEATHER}" ${S}/>` + sunBadge(160, 250, 8),
  head:
    // the headband right across his head, then its knot and two ends flying out to his right
    `<path d="M54 102 C88 72 232 72 266 102 L266 114 C232 86 88 86 54 114 Z" fill="${RED}" ${S}/>` +
    hi('M80 88 C110 76 140 72 160 72', 3, 0.45) +
    `<path d="M262 100 C274 96 282 100 286 108 C278 108 272 110 266 114 Z" fill="${RED}" ${S}/>` +
    `<path d="M264 110 C274 116 280 126 280 138 C272 132 266 124 260 116 Z" fill="${RED}" ${S}/>` +
    `<circle cx="264" cy="106" r="5.5" fill="${celShade(RED)}" ${s2}/>`,
  // the bow, its grip in his paw: a long upper limb leaning out to his left, the string on his side of it
  pawL:
    `<path d="M56 166 L140 288" stroke="#fffdf7" stroke-width="1.6"/>` +
    rope('M56 166 C40 196 52 238 92 262 C112 274 132 282 140 288', BOW, 6) +
    `<path d="M56 166 C52 162 50 158 52 154 M140 288 C146 290 150 288 152 284" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>` +
    // a leather grip
    `<path d="M88 259 L104 268" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="M88 259 L104 268" stroke="${LEATHER}" stroke-width="7" stroke-linecap="round"/>` +
    pawOverL,
  hidesEars: false,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 5. 财神 the god of wealth: a black 乌纱帽 (an official's hat, its two flat wings standing out to both sides), a maroon robe
//    with gold trim and gold coins, and a big gold ingot (元宝) held up in his right paw.
const CS = '#9e1b32';
const HAT = '#2d2a33';
/** A gold coin: round, a square hole. */
const coin = (cx: number, cy: number, r: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${GOLD}" ${s2}/><path d="M${cx - r * 0.32} ${cy - r * 0.32} L${cx + r * 0.32} ${cy - r * 0.32} L${cx + r * 0.32} ${cy + r * 0.32} L${cx - r * 0.32} ${cy + r * 0.32} Z" fill="${CS}" ${s2}/>`;
/** The ingot: a gold boat with a round bump of gold in it. */
const ingot = (cx: number, cy: number) =>
  cel(`M${cx - 18} ${cy - 16} C${cx - 18} ${cy - 30} ${cx + 18} ${cy - 30} ${cx + 18} ${cy - 16} Z`, GOLD, cx - 8, cy - 24, 0.86) +
  cel(`M${cx - 30} ${cy - 22} C${cx - 24} ${cy - 12} ${cx + 24} ${cy - 12} ${cx + 30} ${cy - 22} C${cx + 34} ${cy - 10} ${cx + 22} ${cy + 6} ${cx} ${cy + 6} C${cx - 22} ${cy + 6} ${cx - 34} ${cy - 10} ${cx - 30} ${cy - 22} Z`, GOLD, cx - 20, cy - 14, 0.88) +
  hi(`M${cx - 22} ${cy - 10} C${cx - 14} ${cy - 4} ${cx - 4} ${cy - 2} ${cx + 6} ${cy - 2}`, 3, 0.7) + hi(`M${cx - 10} ${cy - 24} C${cx - 6} ${cy - 27} ${cx} ${cy - 28} ${cx + 4} ${cy - 28}`, 2.5, 0.7);
const caishen = (): CostumeLayer => ({
  back: '',
  body: tint(CS) +
    // the gold collar crossing at his chest, the gold belt, three coins on the robe
    `<path d="M126 192 L160 222 L194 192" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path d="M126 192 L160 222 L194 192" fill="none" stroke="${GOLD}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M100 236 C130 246 190 246 220 236 L220 247 C190 257 130 257 100 247 Z" fill="${GOLD}" ${S}/>` +
    `<path d="M106 262 C132 272 188 272 214 262" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/>` +
    coin(124, 222, 9) + coin(196, 222, 9) + coin(160, 262, 7),
  head:
    // the wings first (they go out from the back of the hat), the tall back of the hat, then its low front with a gold edge
    pair((f) => `<path d="M${f(118)} 64 L${f(52)} 56" stroke="${INK}" stroke-width="7.6" stroke-linecap="round"/><path d="M${f(118)} 64 L${f(52)} 56" stroke="${HAT}" stroke-width="4" stroke-linecap="round"/>` +
      cel(`M${f(56)} 46 C${f(40)} 44 ${f(30)} 52 ${f(34)} 62 C${f(38)} 72 ${f(56)} 72 ${f(64)} 64 C${f(70)} 56 ${f(66)} 48 ${f(56)} 46 Z`, HAT, left(f) ? 40 : 268, 50, 0.84)) +
    cel('M104 74 C100 34 128 22 160 22 C192 22 220 34 216 74 Z', HAT, 128, 32, 0.9) +
    cel('M56 104 C62 74 96 62 160 62 C224 62 258 74 264 104 C236 92 200 88 160 88 C120 88 84 92 56 104 Z', HAT, 96, 70, 0.92) +
    `<path d="M58 102 C86 90 122 86 160 86 C198 86 234 90 262 102" fill="none" stroke="${GOLD}" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M150 66 L170 66 L172 82 L148 82 Z" fill="${GOLD}" ${s2}/><circle cx="160" cy="74" r="4" fill="${RED}" ${s2}/>` +
    hi('M84 80 C100 70 118 66 136 65', 4, 0.3) + hi('M118 36 C128 28 140 25 150 25', 4, 0.3),
  // the ingot held up out to his right
  pawR: ingot(232, 246) + pawOverR,
  hidesEars: true, // under the hat
});

// ---------------------------------------------------------------------------------------------------------------------------
// 6. 招财猫 the fortune cat (a onesie): a cream-white cat hood with pointed ears (one orange, one black patch), closed happy eyes,
//    and the fortune cat's raised beckoning paw up beside the hood; a red collar with a big gold bell; a gold koban coin in his
//    left paw; a white tail with a ginger tip.
const LC = '#fff7ec';
const LC_ORANGE = '#f2a03d';
const LC_BLACK = '#3d3845';
const luckycat = (): CostumeLayer => ({
  back: '',
  body: tint(LC) + belly('#ffffff') +
    // calico patches on the suit
    `<path d="M104 222 C110 212 124 212 126 224 C126 234 112 238 104 232 Z" fill="${LC_ORANGE}" opacity=".9"/>` +
    `<path d="M200 244 C206 236 218 238 218 248 C216 256 204 256 200 250 Z" fill="${LC_BLACK}" opacity=".85"/>` +
    // the red collar, the big gold bell on it
    rope('M108 196 C134 212 186 212 212 196', RED, 9) +
    cel(disc(160, 222, 12), GOLD, 154, 216, 0.86) +
    `<path d="M149 220 L171 220" stroke="${INK}" stroke-width="1.8"/><path d="M160 224 L160 232" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><circle cx="160" cy="226" r="2.4" fill="${DARK}"/>`,
  head:
    // the pointed ears (behind the hood's edge), then the hood, the ears' patches, the closed happy eyes, the whiskers
    pair((f) => cel(`M${f(80)} 70 C${f(78)} 52 ${f(80)} 36 ${f(88)} 26 C${f(104)} 32 ${f(118)} 40 ${f(126)} 50 Z`, LC, left(f) ? 88 : 210, 36, 0.88)) +
    hood(LC) +
    `<path d="M88 30 C102 34 114 42 122 48 L96 60 C92 50 90 40 88 30 Z" fill="${LC_ORANGE}" ${s2}/>` +
    `<path d="M232 30 C218 34 206 42 198 48 L224 60 C228 50 230 40 232 30 Z" fill="${LC_BLACK}" ${s2}/>` +
    pair((f) => `<path d="M${f(126)} 58 C${f(132)} 50 ${f(142)} 50 ${f(148)} 58" fill="none" stroke="${DARK}" stroke-width="3.4" stroke-linecap="round"/>`) +
    `<path d="M156 63 L164 63 L160 68 Z" fill="#f08aa0"/>` +
    pair((f) => `<path d="M${f(122)} 66 L${f(106)} 64 M${f(122)} 70 L${f(108)} 72" stroke="${DARK}" stroke-width="1.4" stroke-linecap="round" opacity=".6"/>`) +
    // the beckoning paw, raised up beside the hood on his right, its pink pads facing out
    cel('M254 92 C252 76 254 58 262 46 C266 38 278 38 282 46 C288 58 284 78 276 96 Z', LC, 262, 52, 0.88) +
    `<ellipse cx="270" cy="62" rx="6" ry="5" fill="#f6b6c2"/>` + [262, 270, 278].map((x) => `<circle cx="${x}" cy="${x === 270 ? 48 : 51}" r="2.4" fill="#f6b6c2"/>`).join('') +
    `<path d="M262 46 C264 42 268 40 270 40 M276 46 C276 42 274 40 270 40" fill="none" ${s2}/>`,
  tail: ropeTail('M210 250 C244 256 262 232 252 206', LC, 11) + `<path d="M252 206 C250 196 256 190 262 194" fill="none" stroke="${INK}" stroke-width="16.6" stroke-linecap="round"/><path d="M252 206 C250 196 256 190 262 194" fill="none" stroke="${LC_ORANGE}" stroke-width="11" stroke-linecap="round"/>`,
  // the koban coin out to his left, and a pink-padded glove on his right
  pawL: cel('M86 222 C86 208 120 208 120 222 L120 256 C120 270 86 270 86 256 Z', GOLD, 92, 214, 0.88) +
    `<path d="M92 228 L114 228 M92 250 L114 250" stroke="#c8962a" stroke-width="2" stroke-linecap="round"/><path d="M98 234 L108 234 L108 244 L98 244 Z" fill="none" stroke="#c8962a" stroke-width="2"/>` +
    hi('M92 222 C94 216 100 214 106 214', 2.5, 0.7) + pawOverL,
  pawR: gloveR(LC) + `<ellipse cx="182" cy="268" rx="5" ry="3.4" fill="#f6b6c2"/>`,
  hidesEars: true,
});

// ---------------------------------------------------------------------------------------------------------------------------
// 7. 舞狮 the lion dance (a onesie): a red lion-dance head as the hood, its open mouth his face: a gold rim round the opening,
//    a white fluffy fringe round it, two huge lion eyes with gold lids on top, a horn over a little round mirror, fluffy ears;
//    a red suit with gold scales and a fringed hem; a fluffy red tail with a gold tip; gold gloves with fluffy cuffs.
const LD = '#e0362c';
const FLUFF = '#fffdf7';
const OPENING = 'M160 76 C210 76 250 102 250 138 C250 174 210 198 160 198 C110 198 70 174 70 138 C70 102 110 76 160 76 Z';
/** A fluffy edge: a row of white puffs along a path given as points. */
const puffs = (pts: [number, number][], r: number) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${FLUFF}" ${s2}/>`).join('');
const liondance = (): CostumeLayer => ({
  back: '',
  body: tint(LD) +
    // gold scale arcs in rows
    [[208, [118, 140, 162, 184, 206]], [226, [108, 130, 152, 174, 196]], [244, [118, 140, 162, 184, 206]]].map(([y, xs]) =>
      (xs as number[]).map((x) => `<path d="M${x - 9} ${y} C${x - 9} ${(y as number) + 10} ${x + 9} ${(y as number) + 10} ${x + 9} ${y}" fill="none" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`).join('')).join('') +
    // the fringed hem
    `<path d="M104 258 C130 270 190 270 216 258" fill="none" stroke="${INK}" stroke-width="10.6" stroke-linecap="round"/><path d="M104 258 C130 270 190 270 216 258" fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round"/>`,
  head: hood(LD) +
    // the gold rim round the mouth (his face), then the white fluff round it, sides and chin
    `<path d="${OPENING}" transform="translate(160 137) scale(1.04) translate(-160 -137)" fill="none" stroke="${INK}" stroke-width="11.6"/>` +
    `<path d="${OPENING}" transform="translate(160 137) scale(1.04) translate(-160 -137)" fill="none" stroke="${GOLD}" stroke-width="6"/>` +
    fringe(FLUFF, 'fluff', 0.36, 1.14, 19) +
    `<path d="M112 192 Q118 212 132 204 Q140 222 152 208 Q160 224 168 208 Q180 222 188 204 Q202 212 208 192 C180 202 140 202 112 192 Z" fill="${FLUFF}" ${S}/>` +
    // fluffy ears, high on its head
    pair((f) => `<circle cx="${f(82)}" cy="58" r="13" fill="${GOLD}" ${S}/><circle cx="${f(80)}" cy="56" r="6.5" fill="${FLUFF}"/>`) +
    // the huge eyes: white, a dark pupil looking up, a gold lid over the top
    pair((f) => `<circle cx="${f(120)}" cy="52" r="15" fill="${FLUFF}" ${S}/><circle cx="${f(122)}" cy="54" r="7.5" fill="${DARK}"/><circle cx="${f(124)}" cy="51" r="2.6" fill="#fff"/>` +
      `<path d="M${f(104)} 48 C${f(106)} 32 ${f(134)} 32 ${f(136)} 48 C${f(126)} 40 ${f(114)} 40 ${f(104)} 48 Z" fill="${GOLD}" ${S}/>` +
      `<path d="M${f(100)} 32 C${f(112)} 26 ${f(128)} 26 ${f(140)} 32" fill="none" stroke="${INK}" stroke-width="9.6" stroke-linecap="round"/><path d="M${f(100)} 32 C${f(112)} 26 ${f(128)} 26 ${f(140)} 32" fill="none" stroke="${FLUFF}" stroke-width="6" stroke-linecap="round"/>`) +
    // the horn and the little round mirror under it
    cel('M152 46 C152 36 156 28 160 24 C164 28 168 36 168 46 Z', GOLD, 156, 30, 0.84) +
    `<circle cx="160" cy="58" r="8" fill="#c9eaff" ${S}/><path d="M156 55 C157 53 159 52 161 52" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  tail: ropeTail('M210 250 C244 256 266 234 256 208', LD, 13) +
    cel('M244 206 C240 190 254 180 266 188 C276 196 272 212 260 214 C254 214 248 212 244 206 Z', GOLD, 250, 190, 0.86),
  pawL: gloveL(GOLD) + puffs([[126, 258], [138, 256], [150, 258]], 4.5),
  pawR: gloveR(GOLD) + puffs([[170, 258], [182, 256], [194, 258]], 4.5),
  hidesEars: true,
});

export const MYTH_COSTUMES: Record<string, () => CostumeLayer> = { wukong, nezha, change, houyi, caishen, luckycat, liondance };
