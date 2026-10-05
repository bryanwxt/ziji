/** Storybook paper primitives for the worlds (spec 2026-10-04 §2): layers with a shade and a sunlit top edge, soft shadows
 *  drawn as shapes (never live filters, spec §6), no ink outlines. Every id is passed in, prefixed by the world. */
import { P } from './palette';

const f = (n: number) => +n.toFixed(1);

export const grad = (id: string, top: string, bottom: string) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;

/** The whole canvas: a sky (or water) gradient. */
export const sky = (id: string, top: string, bottom: string) => `<defs>${grad(id, top, bottom)}</defs><rect width="360" height="480" fill="url(#${id})"/>`;

/** A paper layer: a soft shadow under it, a light-to-dark shade, and a sunlit top edge along `edgeD`. */
export function layer(id: string, d: string, top: string, bottom: string, edge: string, edgeD: string): string {
  return `<defs>${grad(id, top, bottom)}</defs><path d="${d}" transform="translate(0 3)" fill="${P.shadow}" opacity=".14"/><path d="${d}" fill="url(#${id})"/><path d="${edgeD}" fill="none" stroke="${edge}" stroke-width="2" stroke-linecap="round"/>`;
}

/** A ground layer from its top edge (a path from x=0 to x=360): closed down to the bottom of the canvas. */
export const ground = (id: string, edgeD: string, top: string, bottom: string, edge: string) => layer(id, `${edgeD} V480 H0Z`, top, bottom, edge, edgeD);

/** A soft round shadow on the ground under something (a gradient, not a blur filter). */
export function groundShadow(id: string, cx: number, cy: number, rx: number, ry = 5): string {
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${P.shadow}" stop-opacity=".22"/><stop offset="1" stop-color="${P.shadow}" stop-opacity="0"/></radialGradient></defs><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})"/>`;
}

/** A soft light (evening lamps, a volcano's glow): a radial gradient, not a filter. */
export function glow(id: string, cx: number, cy: number, r: number, color: string, strength = 0.55): string {
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${strength}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/>`;
}

/** Lifts paper shapes off the page: the same shapes, dropped a little and darkened, behind them. */
export const lift = (markup: string) => `<g transform="translate(0 2.5)" fill="${P.shadow}" opacity=".14">${markup.replace(/fill="[^"]*"/g, '')}</g>${markup}`;

export function cloud(x: number, y: number, s = 1): string {
  const top = `<path d="M${x} ${y} a${18 * s} ${18 * s} 0 0 1 ${34 * s} ${-6 * s} a${14 * s} ${14 * s} 0 0 1 ${26 * s} ${8 * s} a${11 * s} ${11 * s} 0 0 1 ${-2 * s} ${22 * s} h${-58 * s} a${12 * s} ${12 * s} 0 0 1 0 ${-24 * s}Z" fill="${P.white}"/>`;
  const under = `<path d="M${x - 8 * s} ${y + 16 * s} h${70 * s} a${8 * s} ${8 * s} 0 0 1 ${-6 * s} ${8 * s} h${-58 * s} a${8 * s} ${8 * s} 0 0 1 ${-6 * s} ${-8 * s}Z" fill="${P.cloudShade}"/>`;
  return lift(top) + under;
}

/** A tree built from leaf clusters in three greens, with sunlit dots; (x, y) is the middle of the crown. */
export function leafyTree(x: number, y: number, s = 1): string {
  const c = (dx: number, dy: number, r: number, fill: string) => `<circle cx="${x + dx * s}" cy="${y + dy * s}" r="${r * s}" fill="${fill}"/>`;
  const trunk = `<path d="M${x - 6 * s} ${y + 110 * s} C${x - 4 * s} ${y + 84 * s} ${x - 8 * s} ${y + 58 * s} ${x - 2 * s} ${y + 28 * s} L${x + 4 * s} ${y + 28 * s} C${x} ${y + 58 * s} ${x + 4 * s} ${y + 84 * s} ${x + 6 * s} ${y + 110 * s}Z" fill="${P.trunk}"/>`;
  const crown = c(-22, 20, 24, P.leaf1) + c(26, 20, 22, P.leaf1) + c(0, -8, 30, P.leaf2) + c(-22, -2, 20, P.leaf2) + c(22, -4, 22, P.leaf3) + c(4, 16, 24, P.leaf3);
  const lights = `<g opacity=".85">${c(-6, -18, 9, P.leafLight)}${c(18, -12, 7, P.leafLight)}${c(-26, -8, 6, P.leafLight)}</g>`;
  return lift(trunk) + lift(crown) + lights;
}

export function tuft(x: number, y: number, color: string, s = 1): string {
  return `<path d="M${x} ${y} q${-4 * s} ${-14 * s} ${-10 * s} ${-18 * s} q${8 * s} ${6 * s} ${10 * s} ${12 * s} q${1 * s} ${-12 * s} ${6 * s} ${-20 * s} q${2 * s} ${12 * s} ${2 * s} ${20 * s} q${4 * s} ${-8 * s} ${12 * s} ${-12 * s} q${-6 * s} ${8 * s} ${-8 * s} ${18 * s}Z" fill="${color}"/>`;
}

/** Tall grass: long blades leaning out from (x, y), for the meadow. */
export function tallGrass(x: number, y: number, s = 1, color: string = P.grassTall): string {
  const blade = (dx: number, h: number, lean: number) => `<path d="M${f(x + dx * s - 3 * s)} ${y} C${f(x + dx * s - 2 * s)} ${f(y - h * 0.5 * s)} ${f(x + (dx + lean * 0.4) * s)} ${f(y - h * 0.8 * s)} ${f(x + (dx + lean) * s)} ${f(y - h * s)} C${f(x + (dx + lean * 0.5) * s + 2 * s)} ${f(y - h * 0.7 * s)} ${f(x + dx * s + 3 * s)} ${f(y - h * 0.4 * s)} ${f(x + dx * s + 4 * s)} ${y}Z" fill="${color}"/>`;
  return blade(-14, 70, -14) + blade(-6, 92, -6) + blade(2, 104, 4) + blade(10, 84, 12) + blade(18, 64, 18);
}

export function flower(x: number, y: number, color: string, r = 4.5): string {
  const petals = [0, 1, 2, 3, 4].map((k) => { const a = (k * 2 * Math.PI) / 5; return `<circle cx="${(x + r * Math.cos(a)).toFixed(1)}" cy="${(y + r * Math.sin(a)).toFixed(1)}" r="${(r * 0.75).toFixed(1)}" fill="${color}"/>`; }).join('');
  return `<path d="M${x} ${y + 3} q1 9 -1 16" stroke="${P.stem}" stroke-width="1.6" fill="none"/>${petals}<circle cx="${x}" cy="${y}" r="${(r * 0.55).toFixed(1)}" fill="${P.sun}"/>`;
}

/** A white picket fence with pointed tops; (x, y) is the top-left of the posts. */
export function picketFence(x: number, y: number, count: number): string {
  const posts = Array.from({ length: count }, (_, i) => `<path d="M${x + 4 + i * 15} ${y + 30} V${y} l5 -7 l5 7 V${y + 30}Z" fill="${P.cream}"/>`).join('');
  const rails = `<rect x="${x}" y="${y + 6}" width="${count * 15 + 4}" height="6" rx="2" fill="${P.creamShade}"/><rect x="${x}" y="${y + 20}" width="${count * 15 + 4}" height="6" rx="2" fill="${P.creamShade}"/>`;
  return lift(posts + rails);
}

/** A rounded boulder with a lit top; (x, y) is where it sits on the ground. */
export function rock(x: number, y: number, s = 1, fill: string = P.stone, light: string = P.stoneEdge): string {
  const body = `<path d="M${f(x - 22 * s)} ${y} C${f(x - 24 * s)} ${f(y - 14 * s)} ${f(x - 12 * s)} ${f(y - 26 * s)} ${f(x + 2 * s)} ${f(y - 26 * s)} C${f(x + 16 * s)} ${f(y - 26 * s)} ${f(x + 26 * s)} ${f(y - 14 * s)} ${f(x + 24 * s)} ${y}Z" fill="${fill}"/>`;
  return lift(body) + `<path d="M${f(x - 14 * s)} ${f(y - 16 * s)} C${f(x - 8 * s)} ${f(y - 23 * s)} ${f(x + 6 * s)} ${f(y - 24 * s)} ${f(x + 12 * s)} ${f(y - 19 * s)}" fill="none" stroke="${light}" stroke-width="${f(3 * s)}" stroke-linecap="round"/>`;
}

/** A fern: long pointed fronds fanning up from (x, y); `flip` mirrors it. */
export function fern(x: number, y: number, s = 1, flip = false, color: string = P.leaf1, light: string = P.leaf3): string {
  const k = flip ? -1 : 1;
  const frond = (ang: number, len: number, fill: string) => {
    const a = (ang * Math.PI) / 180;
    const tx = x + k * Math.sin(a) * len * s, ty = y - Math.cos(a) * len * s;
    const nx = Math.cos(a) * 9 * s * k, ny = Math.sin(a) * 9 * s;
    return `<path d="M${x} ${y} Q${f((x + tx) / 2 + nx)} ${f((y + ty) / 2 + ny)} ${f(tx)} ${f(ty)} Q${f((x + tx) / 2 - nx)} ${f((y + ty) / 2 - ny)} ${x} ${y}Z" fill="${fill}"/>`;
  };
  return lift(frond(-50, 52, color) + frond(-20, 70, light) + frond(10, 76, color) + frond(40, 60, light) + frond(68, 44, color));
}

/** A palm tree: a curved trunk from (x, y) leaning right, a crown of drooping leaves, two coconuts. */
export function palm(x: number, y: number, s = 1): string {
  const tx = x + 26 * s, ty = y - 130 * s;
  const trunk = `<path d="M${f(x - 8 * s)} ${y} C${f(x - 4 * s)} ${f(y - 50 * s)} ${f(x + 6 * s)} ${f(y - 100 * s)} ${f(tx - 5 * s)} ${f(ty)} L${f(tx + 5 * s)} ${f(ty + 2 * s)} C${f(x + 16 * s)} ${f(y - 98 * s)} ${f(x + 8 * s)} ${f(y - 50 * s)} ${f(x + 8 * s)} ${y}Z" fill="${P.wood}"/>`;
  const rings = [0.2, 0.4, 0.6, 0.8].map((t) => { const yy = y - 130 * s * t; const xx = x + 26 * s * t * t; return `<path d="M${f(xx - 7 * s)} ${f(yy)} q${f(7 * s)} ${f(3 * s)} ${f(14 * s)} 0" stroke="${P.woodDark}" stroke-width="1.6" fill="none" opacity=".5"/>`; }).join('');
  const leaf = (dx: number, dy: number, fill: string) => `<path d="M${f(tx)} ${f(ty)} Q${f(tx + dx * 0.5 * s)} ${f(ty + (dy - 26) * s)} ${f(tx + dx * s)} ${f(ty + dy * s)} Q${f(tx + dx * 0.45 * s)} ${f(ty + (dy - 12) * s)} ${f(tx)} ${f(ty)}Z" fill="${fill}"/>`;
  const crown = leaf(-58, 30, P.leaf1) + leaf(60, 34, P.leaf1) + leaf(-40, 6, P.leaf2) + leaf(44, 8, P.leaf2) + leaf(-10, -22, P.leaf3) + leaf(22, -20, P.leaf3);
  const nuts = `<circle cx="${f(tx - 4 * s)}" cy="${f(ty + 6 * s)}" r="${f(5 * s)}" fill="${P.woodDark}"/><circle cx="${f(tx + 5 * s)}" cy="${f(ty + 7 * s)}" r="${f(5 * s)}" fill="${P.woodDark}"/>`;
  return lift(trunk) + rings + lift(crown) + nuts;
}

/** Seaweed swaying up from (x, y). */
export function seaweed(x: number, y: number, h: number, color: string = P.leaf2): string {
  const w = 7;
  let d = `M${x - w} ${y}`;
  const steps = 5;
  for (let i = 1; i <= steps; i++) d += ` Q${x - w + (i % 2 ? 12 : -12)} ${f(y - (h * (i - 0.5)) / steps)} ${x - w * (1 - i / steps) * 0.6} ${f(y - (h * i) / steps)}`;
  for (let i = steps; i >= 1; i--) d += ` Q${x + w * 0.6 + (i % 2 ? 12 : -12)} ${f(y - (h * (i - 0.5)) / steps)} ${x + w * (1 - (i - 1) / steps)} ${f(y - (h * (i - 1)) / steps)}`;
  return lift(`<path d="${d}Z" fill="${color}"/>`);
}

/** A flat paper block (a cube seen from the front): a lit top band and a darker foot. (x, y) is its bottom-left. */
export function block(x: number, y: number, size: number, face: string, top: string, foot: string): string {
  return `<rect x="${x}" y="${y - size}" width="${size}" height="${size}" fill="${face}"/><rect x="${x}" y="${y - size}" width="${size}" height="${f(size * 0.22)}" fill="${top}"/><rect x="${x}" y="${f(y - size * 0.12)}" width="${size}" height="${f(size * 0.12)}" fill="${foot}"/>`;
}

/** A four-point sparkle star. */
export const star = (x: number, y: number, r: number, color: string = P.sun, part = '') =>
  `<path${part ? ` data-part="${part}"` : ''} d="M${x} ${f(y - r)} Q${f(x + r * 0.22)} ${f(y - r * 0.22)} ${f(x + r)} ${y} Q${f(x + r * 0.22)} ${f(y + r * 0.22)} ${x} ${f(y + r)} Q${f(x - r * 0.22)} ${f(y + r * 0.22)} ${f(x - r)} ${y} Q${f(x - r * 0.22)} ${f(y - r * 0.22)} ${x} ${f(y - r)}Z" fill="${color}"/>`;

/** A small shell and a starfish for sandy ground. */
export const shell = (x: number, y: number, color: string = P.pinkSoft) =>
  lift(`<path d="M${x - 8} ${y} Q${x} ${y - 16} ${x + 8} ${y}Z" fill="${color}"/>`) + `<path d="M${x} ${y} L${x} ${y - 9} M${x - 4} ${y} L${x - 2} ${y - 8} M${x + 4} ${y} L${x + 2} ${y - 8}" stroke="${P.white}" stroke-width="1.2" opacity=".7"/>`;
export function starfish(x: number, y: number, r = 8, color: string = P.coral): string {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.42 : r; return `${f(x + rr * Math.cos(a))} ${f(y + rr * Math.sin(a) * 0.6)}`; });
  return lift(`<path d="M${pts.join(' L')}Z" fill="${color}"/>`);
}
