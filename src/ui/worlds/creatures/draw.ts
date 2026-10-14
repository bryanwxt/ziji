// Helpers for the worlds' creatures (spec 2026-10-13 §6–7): each is drawn in its own design box and placed by its ground point.
import { celEllipse, celPath, line, LINE, shadeOf, WLW, WLWI } from '../../cel';

const r1 = (n: number) => +n.toFixed(2);

/** Draw in a design box: `(ox, oy)` in the box lands on the ground point (0, 0), scaled by s; line widths stay WLW/WLWI on screen. */
export function box(s: number, ox: number, oy: number, draw: (k: Kit) => string): string {
  return `<g transform="scale(${s}) translate(${-ox} ${-oy})">${draw(kit(s))}</g>`;
}

export interface Kit {
  /** outer and inner line widths in the design box */
  w: number;
  wi: number;
  ell: (cx: number, cy: number, rx: number, ry: number, fill: string, o?: { shade?: string; k?: number; inner?: boolean }) => string;
  path: (d: string, fill: string, shadow?: string, o?: { shade?: string; inner?: boolean }) => string;
  stroke: (d: string, inner?: boolean, extra?: string) => string;
  /** a filled shape with no outline (a mark, a highlight, a shadow band) */
  flat: (d: string, fill: string, extra?: string) => string;
  /** a thick outlined stroke (a tail, a string): the line, then the colour inside it */
  rope: (d: string, color: string, width: number) => string;
}

function kit(s: number): Kit {
  const w = r1(WLW / s);
  const wi = r1(WLWI / s);
  return {
    w,
    wi,
    ell: (cx, cy, rx, ry, fill, o = {}) => celEllipse(cx, cy, rx, ry, fill, { shade: o.shade, k: o.k, w: o.inner ? wi : w }),
    path: (d, fill, shadow = '', o = {}) => celPath(d, fill, shadow, { shade: o.shade, w: o.inner ? wi : w }),
    stroke: (d, inner = true, extra = '') => `<path d="${d}" fill="none" ${line(inner ? wi : w)}${extra ? ` ${extra}` : ''}/>`,
    flat: (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra ? ` ${extra}` : ''}/>`,
    rope: (d, color, width) => `<path d="${d}" fill="none" ${line(r1(width + 2 * w))}/><path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`,
  };
}

export { LINE, shadeOf };
