// Every prop at rest on its painting (spec 2026-10-13 §6), drawn round its ground point; moments (momentFx.ts) redraw it moving.
import type { WorldId } from '../../fun/worlds';
import { BOAT, RIPPLE } from './creatures/boat';
import { FROG, panda } from './creatures/bamboo';
import { DRAGONFLY, DUCKS, KITE } from './creatures/terraces';
import { KINGFISHER, otter } from './creatures/home';
import { BUTTERFLY, HORNBILL, MONKEY } from './creatures/rainforest';
import { NEST_ART, PTEROSAUR } from './creatures/dino';
import { KOI_GLIMPSE, PAD_ART, SKY_LANTERN, lotus } from './creatures/lantern';
import { RIVER } from './river';

/** Each world's props at rest; each world's task adds its creatures beside the boat. */
export const PROP_ART: Record<WorldId, Record<string, string>> = {
  home: { boat: RIPPLE + BOAT, otter: otter(), kingfisher: KINGFISHER },
  rainforest: { boat: RIPPLE + BOAT, hornbill: HORNBILL, monkey: MONKEY, butterfly: BUTTERFLY },
  bamboo: { boat: RIPPLE + BOAT, panda: panda(), frog: FROG },
  terraces: { boat: RIPPLE + BOAT, ducks: DUCKS, kite: KITE, dragonfly: DRAGONFLY },
  dino: { boat: RIPPLE + BOAT, nest: NEST_ART, pterosaur: PTEROSAUR, volcano: '' }, // the painting draws the volcano: its prop is only the tap and the puff
  lantern: { boat: RIPPLE + BOAT, lotus: PAD_ART + `<g data-part="bud">${lotus(0)}</g>`, koi: KOI_GLIMPSE, skylantern: SKY_LANTERN },
  cove: { boat: RIPPLE + BOAT },
  milkyway: { boat: RIPPLE + BOAT },
};

/** A prop in its place, tagged with its name so a moment can hide it while it plays. */
export const propAt = (world: WorldId, name: string) => {
  const s = RIVER[world].props[name]!;
  return `<g data-prop="${name}" transform="translate(${s.x} ${s.y})">${PROP_ART[world][name]}</g>`;
};

/** Every prop of a world, the farther (higher on the painting) first. */
export const propsOf = (world: WorldId) => Object.entries(RIVER[world].props).sort(([, a], [, b]) => a.y - b.y).map(([n]) => propAt(world, n)).join('');
