/* Tap-fun art (spec §15): the 12 zodiac animals as small ink faces (drawn in a 48×48 box centred on 0,0),
 * a gem, a baby dinosaur and sprinkler spray. §13 ink rules; original drawings, no IP. */

const INK = '#2a2630';
const S = `stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;
const eyes = (y = -2, gap = 7) => `<g fill="${INK}"><circle cx="${-gap}" cy="${y}" r="2.2"/><circle cx="${gap}" cy="${y}" r="2.2"/></g>`;
const cheeks = (y = 5) => `<g fill="#edb8c0" opacity=".8"><ellipse cx="-11" cy="${y}" rx="3" ry="2"/><ellipse cx="11" cy="${y}" rx="3" ry="2"/></g>`;
const smile = (y = 6) => `<path d="M-3 ${y} q3 3 6 0" fill="none" ${S} stroke-width="2"/>`;
const head = (fill: string, rx = 17, ry = 16) => `<ellipse cx="0" cy="0" rx="${rx}" ry="${ry}" fill="${fill}" ${S}/>`;

export const ANIMAL_FACES: Record<string, string> = {
  rat:
    `<circle cx="-13" cy="-13" r="8" fill="#c7c8d6" ${S}/><circle cx="13" cy="-13" r="8" fill="#c7c8d6" ${S}/>` +
    `<circle cx="-13" cy="-13" r="3.5" fill="#edb8c0"/><circle cx="13" cy="-13" r="3.5" fill="#edb8c0"/>` +
    head('#dcdde6', 15, 14) + eyes(-2, 6) + `<circle cx="0" cy="4" r="2.6" fill="#edb8c0" ${S} stroke-width="1.6"/>` +
    `<path d="M-4 5 l-12 -2 M-4 7 l-12 3 M4 5 l12 -2 M4 7 l12 3" ${S} stroke-width="1.4"/>`,
  ox:
    `<path d="M-14 -10 q-10 -6 -8 -16 q4 8 12 8Z M14 -10 q10 -6 8 -16 q-4 8 -12 8Z" fill="#fffaf0" ${S}/>` +
    head('#b88b62', 17, 16) + eyes(-4, 7) + `<ellipse cx="0" cy="7" rx="10" ry="7" fill="#ffe0cc" ${S}/>` +
    `<g fill="${INK}"><ellipse cx="-4" cy="7" rx="1.6" ry="2.2"/><ellipse cx="4" cy="7" rx="1.6" ry="2.2"/></g>` +
    `<path d="M-5 13 q5 4 10 0" fill="none" stroke="#efc472" stroke-width="2.4"/>`,
  tiger:
    `<path d="M-15 -10 l-4 -9 l9 4Z M15 -10 l4 -9 l-9 4Z" fill="#e9a063" ${S}/>` + head('#e9a063') +
    `<path d="M-5 -13 h10 M-5 -9 h10 M-5 -5 h10 M0 -13 v8" ${S} stroke-width="2"/>` +
    `<path d="M-17 -2 h6 M-17 3 h5 M17 -2 h-6 M17 3 h-5" ${S} stroke-width="2"/>` + eyes(-1, 7) +
    `<ellipse cx="0" cy="7" rx="7" ry="5" fill="#fffaf0" ${S} stroke-width="1.8"/><circle cx="0" cy="5" r="1.8" fill="${INK}"/>`,
  rabbit:
    `<ellipse cx="-7" cy="-22" rx="5" ry="13" fill="#fffaf0" ${S}/><ellipse cx="7" cy="-22" rx="5" ry="13" fill="#fffaf0" ${S}/>` +
    `<ellipse cx="-7" cy="-21" rx="2" ry="8" fill="#edb8c0"/><ellipse cx="7" cy="-21" rx="2" ry="8" fill="#edb8c0"/>` +
    head('#fffaf0', 15, 14) + eyes(-1, 6) + cheeks(5) + `<path d="M-2 4 l2 2 l2 -2" fill="none" ${S} stroke-width="1.6"/>` + smile(8),
  dragon:
    `<path d="M-9 -14 l-5 -10 l7 5Z M9 -14 l5 -10 l-7 5Z" fill="#efc472" ${S}/>` + head('#9fcf90') +
    `<path d="M-16 6 q-8 2 -10 8 M16 6 q8 2 10 8" fill="none" ${S} stroke-width="1.8"/>` + eyes(-3, 7) +
    `<ellipse cx="0" cy="7" rx="8" ry="5" fill="#b8d8aa" ${S} stroke-width="1.8"/><g fill="${INK}"><circle cx="-3" cy="6" r="1.4"/><circle cx="3" cy="6" r="1.4"/></g>` +
    `<path d="M-6 -16 l3 3 l3 -3 l3 3 l3 -3" fill="none" ${S} stroke-width="1.6"/>`,
  snake:
    `<path d="M-14 6 C-16 -14 16 -14 14 6 C12 14 -12 14 -14 6Z" fill="#b8d8aa" ${S}/>` +
    `<g fill="#86b67a"><circle cx="-6" cy="-6" r="2"/><circle cx="5" cy="-8" r="2"/><circle cx="0" cy="-2" r="1.6"/></g>` + eyes(0, 7) +
    `<path d="M0 12 v6 l-3 3 M0 18 l3 3" fill="none" stroke="#e2705d" stroke-width="2" stroke-linecap="round"/>`,
  horse:
    `<path d="M-8 -16 l-3 -8 l7 4Z M8 -16 l3 -8 l-7 4Z" fill="#b88b62" ${S}/>` +
    `<path d="M-12 -12 C-10 -24 10 -24 12 -12 C14 -2 12 12 0 18 C-12 12 -14 -2 -12 -12Z" fill="#b88b62" ${S}/>` +
    `<path d="M-4 -20 q-4 6 -2 12 M0 -21 q-3 7 -1 12 M4 -20 q-2 6 0 11" fill="none" stroke="${INK}" stroke-width="3"/>` + eyes(-2, 6) +
    `<ellipse cx="0" cy="10" rx="7" ry="5" fill="#ffe0cc" ${S} stroke-width="1.8"/><g fill="${INK}"><circle cx="-3" cy="10" r="1.3"/><circle cx="3" cy="10" r="1.3"/></g>`,
  goat:
    `<path d="M-8 -12 C-22 -14 -22 -2 -12 -4 M8 -12 C22 -14 22 -2 12 -4" fill="none" stroke="#8f8a93" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M-8 -12 C-22 -14 -22 -2 -12 -4 M8 -12 C22 -14 22 -2 12 -4" fill="none" ${S} stroke-width="1.6"/>` +
    head('#fffaf0', 14, 15) + eyes(-2, 6) + smile(5) + `<path d="M-4 13 l4 9 l4 -9Z" fill="#fffaf0" ${S} stroke-width="1.8"/>`,
  monkey:
    `<circle cx="-17" cy="0" r="6" fill="#b88b62" ${S}/><circle cx="17" cy="0" r="6" fill="#b88b62" ${S}/>` + head('#b88b62') +
    `<path d="M0 -6 C-4 -14 -14 -10 -10 -2 C-14 4 -8 14 0 13 C8 14 14 4 10 -2 C14 -10 4 -14 0 -6Z" fill="#ffe0cc" ${S} stroke-width="1.8"/>` +
    eyes(-2, 5) + `<g fill="${INK}"><circle cx="-2" cy="4" r="1.2"/><circle cx="2" cy="4" r="1.2"/></g>` + smile(7),
  rooster:
    `<path d="M-8 -14 q-2 -10 5 -8 q1 -8 7 -4 q5 -6 7 2 q-1 6 -4 8Z" fill="#e2705d" ${S}/>` + head('#fffaf0', 14, 15) + eyes(-3, 6) +
    `<path d="M-5 2 l5 6 l5 -6Z" fill="#efc472" ${S} stroke-width="1.8"/><path d="M-2 9 q2 7 4 0" fill="#e2705d" ${S} stroke-width="1.6"/>`,
  dog:
    `<path d="M-14 -10 C-26 -10 -24 10 -16 8Z M14 -10 C26 -10 24 10 16 8Z" fill="#b88b62" ${S}/>` + head('#f1e1b0') + eyes(-3, 7) +
    `<ellipse cx="0" cy="5" rx="4.5" ry="3.2" fill="${INK}"/><path d="M0 8 v3 M-5 11 q5 4 10 0" fill="none" ${S} stroke-width="1.8"/>` +
    `<path d="M2 12 q2 5 4 0" fill="#e2705d" ${S} stroke-width="1.4"/>`,
  pig:
    `<path d="M-14 -9 l-5 -10 l10 4Z M14 -9 l5 -10 l-10 4Z" fill="#edb8c0" ${S}/>` + head('#edb8c0') + eyes(-4, 7) +
    `<ellipse cx="0" cy="5" rx="7" ry="5" fill="#e6a3b0" ${S}/><g fill="${INK}"><ellipse cx="-2.5" cy="5" rx="1.4" ry="2"/><ellipse cx="2.5" cy="5" rx="1.4" ry="2"/></g>`,
};

export const GEM =
  `<path d="M-12 -4 l6 -8 h12 l6 8 l-12 16Z" fill="#6ea4d4" ${S}/>` +
  `<path d="M-12 -4 h24 M-6 -12 l2 8 l4 16 M6 -12 l-2 8 l-4 16" fill="none" ${S} stroke-width="1.6"/>` +
  `<path d="M-3 -9 l2 -2" stroke="#fffaf0" stroke-width="2.4" stroke-linecap="round"/>`;

export const BABY_DINO =
  `<path d="M-14 12 C-16 -2 -6 -8 2 -6 C6 -14 16 -14 16 -6 C16 0 10 2 6 0 C8 6 8 12 6 12Z" fill="#9fcf90" ${S}/>` +
  `<circle cx="10" cy="-8" r="1.8" fill="${INK}"/><path d="M12 -3 q-3 2 -6 0" fill="none" ${S} stroke-width="1.6"/>` +
  `<path d="M-14 12 C-18 10 -22 12 -24 8 C-20 8 -18 6 -16 4" fill="#9fcf90" ${S}/>` +
  `<path d="M-12 14 C-12 4 4 4 4 14Z" fill="#fffaf0" ${S}/><path d="M-12 14 l3 -4 l3 4 l3 -4 l3 4 l3 -4 l1 4" fill="none" ${S} stroke-width="1.6"/>`;
