/** Storybook paper primitives for the worlds (spec 2026-10-04 §2): layers with a shade and a sunlit top edge, soft shadows
 *  drawn as shapes (never live filters, spec §6), no ink outlines. Every id is passed in, prefixed by the world. */
const SHADOW = '#2b3a2a';

export const grad = (id: string, top: string, bottom: string) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;

/** A paper layer: a soft shadow under it, a light-to-dark shade, and a sunlit top edge along `edgeD`. */
export function layer(id: string, d: string, top: string, bottom: string, edge: string, edgeD: string): string {
  return `<defs>${grad(id, top, bottom)}</defs><path d="${d}" transform="translate(0 3)" fill="${SHADOW}" opacity=".14"/><path d="${d}" fill="url(#${id})"/><path d="${edgeD}" fill="none" stroke="${edge}" stroke-width="2" stroke-linecap="round"/>`;
}

/** A soft round shadow on the ground under something (a gradient, not a blur filter). */
export function groundShadow(id: string, cx: number, cy: number, rx: number, ry = 5): string {
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${SHADOW}" stop-opacity=".22"/><stop offset="1" stop-color="${SHADOW}" stop-opacity="0"/></radialGradient></defs><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})"/>`;
}

/** Lifts paper shapes off the page: the same shapes, dropped a little and darkened, behind them. */
export const lift = (markup: string) => `<g transform="translate(0 2.5)" fill="${SHADOW}" opacity=".14">${markup.replace(/fill="[^"]*"/g, '')}</g>${markup}`;

export function cloud(x: number, y: number, s = 1): string {
  const top = `<path d="M${x} ${y} a${18 * s} ${18 * s} 0 0 1 ${34 * s} ${-6 * s} a${14 * s} ${14 * s} 0 0 1 ${26 * s} ${8 * s} a${11 * s} ${11 * s} 0 0 1 ${-2 * s} ${22 * s} h${-58 * s} a${12 * s} ${12 * s} 0 0 1 0 ${-24 * s}Z" fill="#ffffff"/>`;
  const under = `<path d="M${x - 8 * s} ${y + 16 * s} h${70 * s} a${8 * s} ${8 * s} 0 0 1 ${-6 * s} ${8 * s} h${-58 * s} a${8 * s} ${8 * s} 0 0 1 ${-6 * s} ${-8 * s}Z" fill="#dcebf5"/>`;
  return lift(top) + under;
}

/** A tree built from leaf clusters in three greens, with sunlit dots; (x, y) is the middle of the crown. */
export function leafyTree(x: number, y: number, s = 1): string {
  const c = (dx: number, dy: number, r: number, f: string) => `<circle cx="${x + dx * s}" cy="${y + dy * s}" r="${r * s}" fill="${f}"/>`;
  const trunk = `<path d="M${x - 6 * s} ${y + 110 * s} C${x - 4 * s} ${y + 84 * s} ${x - 8 * s} ${y + 58 * s} ${x - 2 * s} ${y + 28 * s} L${x + 4 * s} ${y + 28 * s} C${x} ${y + 58 * s} ${x + 4 * s} ${y + 84 * s} ${x + 6 * s} ${y + 110 * s}Z" fill="#9c6a40"/>`;
  const crown = c(-22, 20, 24, '#4f9f55') + c(26, 20, 22, '#4f9f55') + c(0, -8, 30, '#5fb262') + c(-22, -2, 20, '#5fb262') + c(22, -4, 22, '#6cbd6a') + c(4, 16, 24, '#6cbd6a');
  const lights = `<g opacity=".85">${c(-6, -18, 9, '#8fd486')}${c(18, -12, 7, '#8fd486')}${c(-26, -8, 6, '#8fd486')}</g>`;
  return lift(trunk) + lift(crown) + lights;
}

export function tuft(x: number, y: number, color: string, s = 1): string {
  return `<path d="M${x} ${y} q${-4 * s} ${-14 * s} ${-10 * s} ${-18 * s} q${8 * s} ${6 * s} ${10 * s} ${12 * s} q${1 * s} ${-12 * s} ${6 * s} ${-20 * s} q${2 * s} ${12 * s} ${2 * s} ${20 * s} q${4 * s} ${-8 * s} ${12 * s} ${-12 * s} q${-6 * s} ${8 * s} ${-8 * s} ${18 * s}Z" fill="${color}"/>`;
}

export function flower(x: number, y: number, color: string, r = 4.5): string {
  const petals = [0, 1, 2, 3, 4].map((k) => { const a = (k * 2 * Math.PI) / 5; return `<circle cx="${(x + r * Math.cos(a)).toFixed(1)}" cy="${(y + r * Math.sin(a)).toFixed(1)}" r="${(r * 0.75).toFixed(1)}" fill="${color}"/>`; }).join('');
  return `<path d="M${x} ${y + 3} q1 9 -1 16" stroke="#4f9a4a" stroke-width="1.6" fill="none"/>${petals}<circle cx="${x}" cy="${y}" r="${(r * 0.55).toFixed(1)}" fill="#ffd166"/>`;
}

/** A white picket fence with pointed tops; (x, y) is the top-left of the posts. */
export function picketFence(x: number, y: number, count: number): string {
  const posts = Array.from({ length: count }, (_, i) => `<path d="M${x + 4 + i * 15} ${y + 30} V${y} l5 -7 l5 7 V${y + 30}Z" fill="#fffaf0"/>`).join('');
  const rails = `<rect x="${x}" y="${y + 6}" width="${count * 15 + 4}" height="6" rx="2" fill="#f4ead2"/><rect x="${x}" y="${y + 20}" width="${count * 15 + 4}" height="6" rx="2" fill="#f4ead2"/>`;
  return lift(posts + rails);
}
