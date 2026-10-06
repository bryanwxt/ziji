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

/** Truffle's gradients, with this instance's ids. No clip-paths: WebKit repaints a clipped shape on every frame of his live
 *  animation at a real cost (lesson start went from ~1 s to ~5 s in the fit sweep), so his stripes are drawn inside his outline instead. */
export function truffleDefs(id: string): string {
  const g = (name: string) => `${id}-tf-${name}`;
  return [
    // user space: every furry part (head, body, ears, lids) shares one light, from the upper left
    `<radialGradient id="${g('fur')}" gradientUnits="userSpaceOnUse" cx="128" cy="80" r="215"><stop offset="0" stop-color="#cbc6cd"/><stop offset="0.55" stop-color="${SWATCH.fur}"/><stop offset="1" stop-color="${SWATCH.furDeep}"/></radialGradient>`,
    `<linearGradient id="${g('tail')}" gradientUnits="userSpaceOnUse" x1="236" y1="190" x2="226" y2="256"><stop offset="0" stop-color="#bdb8c0"/><stop offset="1" stop-color="${SWATCH.furDeep}"/></linearGradient>`,
    `<radialGradient id="${g('chest')}" gradientUnits="userSpaceOnUse" cx="146" cy="140" r="150"><stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="${SWATCH.chest}"/><stop offset="1" stop-color="#e6dccb"/></radialGradient>`,
    `<linearGradient id="${g('ear')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd3ce"/><stop offset="1" stop-color="#eea4a3"/></linearGradient>`,
  ].join('');
}
