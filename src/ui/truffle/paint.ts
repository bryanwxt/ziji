// The story's painted look for SVG characters (spec 2026-10-07 3b §2, §5; docs/story/style.md): one shared palette, soft edges
// (never black ink on fur), gradients lit from the upper left. Each SVG gets its own gradient ids: WebKit can't paint a gradient
// defined in another svg, and a hidden one (display:none) paints nothing at all.

export const SWATCH = {
  sky: '#a9d3e8', skyDeep: '#6fa8c9', leaf: '#7fae6a', leafDeep: '#4f7d4a', cream: '#f6ecd6', terracotta: '#d98a62',
  sun: '#f4c66b', shadow: '#7a7398', fur: '#a9a4ab', furDeep: '#7d7882', chest: '#fbf5ea', jade: '#6dbb94',
} as const;

/** Soft edge colours: a darker shade of each fill, never #2a2630. */
export const EDGE = { fur: '#6f6a75', chest: '#b9ae9d', face: '#4a4250' } as const;

/** Art strings refer to `url(#tf-…)`; each Truffle rewrites them to its own ids. */
export const paintIds = (art: string, id: string): string => art.replaceAll('url(#tf-', `url(#${id}-tf-`);

/** A valid, unique id fragment from preact's useId (which may hold ':'). */
export const cleanId = (raw: string): string => raw.replace(/[^\w-]/g, '-');

// the outlines the stripes are clipped to (the same paths as parts.ts draws)
const HEAD_D = 'M160 34 C212 34 250 60 256 98 C266 104 268 116 261 122 C268 130 265 142 254 146 C242 178 204 198 160 198 C116 198 78 178 66 146 C55 142 52 130 59 122 C52 116 54 104 64 98 C70 60 108 34 160 34Z';
const TORSO_D = 'M110 186 C112 158 208 158 210 186 C230 200 234 238 216 258 C200 276 120 276 104 258 C86 238 90 200 110 186Z';
const TAIL_D = 'M212 252 C246 256 262 226 248 204 C244 196 252 190 258 194 C246 182 232 194 236 208 C244 228 234 242 210 240Z';

/** Truffle's gradients and the clips his tabby stripes sit inside, with this instance's ids. */
export function truffleDefs(id: string): string {
  const g = (name: string) => `${id}-tf-${name}`;
  return [
    // user space: every furry part (head, body, ears, lids) shares one light, from the upper left
    `<radialGradient id="${g('fur')}" gradientUnits="userSpaceOnUse" cx="128" cy="80" r="215"><stop offset="0" stop-color="#cbc6cd"/><stop offset="0.55" stop-color="${SWATCH.fur}"/><stop offset="1" stop-color="${SWATCH.furDeep}"/></radialGradient>`,
    `<linearGradient id="${g('tail')}" gradientUnits="userSpaceOnUse" x1="236" y1="190" x2="226" y2="256"><stop offset="0" stop-color="#bdb8c0"/><stop offset="1" stop-color="${SWATCH.furDeep}"/></linearGradient>`,
    `<radialGradient id="${g('chest')}" gradientUnits="userSpaceOnUse" cx="146" cy="140" r="150"><stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="${SWATCH.chest}"/><stop offset="1" stop-color="#e6dccb"/></radialGradient>`,
    `<linearGradient id="${g('ear')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd3ce"/><stop offset="1" stop-color="#eea4a3"/></linearGradient>`,
    `<clipPath id="${g('headclip')}"><path d="${HEAD_D}"/></clipPath>`,
    `<clipPath id="${g('torsoclip')}"><path d="${TORSO_D}"/></clipPath>`,
    `<clipPath id="${g('tailclip')}"><path d="${TAIL_D}"/></clipPath>`,
  ].join('');
}
