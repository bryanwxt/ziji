import { lift } from './paper';

const g = (name: string, x: number, y: number, art: string) => `<g data-prop="${name}" transform="translate(${x} ${y})">${art}</g>`;

/** Truffle's own things in the yard (spec 2026-10-04 §2), each drawn around the point where it touches the ground. */
export const bowl = (x: number, y: number) => g('bowl', x, y, lift('<path d="M-13 -4 q13 9 26 0 l-3 4 q-10 5 -20 0Z" fill="#f2b8c6"/><ellipse cx="0" cy="-4" rx="13" ry="3.5" fill="#f6cbd6"/><ellipse cx="0" cy="-4.5" rx="8" ry="2" fill="#c98a5a"/>'));
export const ball = (x: number, y: number) => g('ball', x, y, lift('<circle cx="0" cy="-9" r="9" fill="#ef6f6c"/>') + '<path d="M-8 -11 q8 -4 16 0" stroke="#ffffff" stroke-width="2" fill="none"/>');
export const birdhouse = (x: number, y: number) => g('birdhouse', x, y, lift('<rect x="-2" y="-34" width="4" height="34" fill="#b8804c"/><path d="M-12 -34 l12 -12 l12 12Z" fill="#e2725b"/><rect x="-9" y="-34" width="18" height="14" rx="2" fill="#f6d28b"/>') + '<circle cx="0" cy="-27" r="3" fill="#7a5233"/>');
export const sprinkler = (x: number, y: number) => g('sprinkler', x, y, lift('<rect x="-3" y="-14" width="6" height="14" rx="2" fill="#5aa86a"/><path d="M-10 -14 h20 l-4 -6 h-12Z" fill="#7cc48a"/><circle cx="0" cy="-22" r="3" fill="#ffd166"/>'));
