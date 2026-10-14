// The story's painted look for its SVG characters (Granny Dragon, HushScene; spec 2026-10-07 3b §2, §5; docs/story/style.md): one
// shared palette, soft edges, never black ink on fur. Truffle himself is light cel with no gradients (src/ui/cel.ts, spec 2026-10-13
// §7). The story's gradients need ids unique to each SVG (cleanId): WebKit can't paint a gradient defined in another svg.

export const SWATCH = {
  sky: '#a9d3e8', skyDeep: '#6fa8c9', leaf: '#7fae6a', leafDeep: '#4f7d4a', cream: '#f6ecd6', terracotta: '#d98a62',
  sun: '#f4c66b', shadow: '#7a7398', fur: '#a9a4ab', furDeep: '#7d7882', chest: '#fbf5ea', jade: '#6dbb94',
} as const;

/** A valid, unique id fragment from preact's useId (which may hold ':'). */
export const cleanId = (raw: string): string => raw.replace(/[^\w-]/g, '-');
