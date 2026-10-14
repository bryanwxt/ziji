// Every One River creature and thing for the stage cases' `creatures` sheet (spec 2026-10-13 §6–7): each at rest and, where its
// moment draws it differently, mid-moment. Each world's task adds its creatures to this list.
import { BOAT, RIPPLE } from '../../src/ui/worlds/creatures/boat';
import { KINGFISHER, otter } from '../../src/ui/worlds/creatures/home';
import { BUTTERFLY, HORNBILL, HORNBILL_FLY, MONKEY } from '../../src/ui/worlds/creatures/rainforest';
import { FROG, panda } from '../../src/ui/worlds/creatures/bamboo';
import { DRAGONFLY, DUCKS, KITE } from '../../src/ui/worlds/creatures/terraces';
import { BABY_DINO, NEST_ART, PTEROSAUR, PUFF } from '../../src/ui/worlds/creatures/dino';
import { KOI_ART, KOI_GLIMPSE, PAD_ART, PEARL, SKY_LANTERN, lotus } from '../../src/ui/worlds/creatures/lantern';
import { ANIMAL_FACES } from '../../src/ui/worlds/tapArt';

export const CREATURES: [string, string][] = [
  ['纸船 boat', RIPPLE + BOAT], ['zodiac rat', `<g transform="translate(0 -40) scale(1.6)"><circle r="26" fill="#fffdf7"/>${ANIMAL_FACES.rat}</g>`], ['zodiac dragon', `<g transform="translate(0 -40) scale(1.6)"><circle r="26" fill="#fffdf7"/>${ANIMAL_FACES.dragon}</g>`],
  ['otter', otter()], ['otter look', otter(0.6)], ['kingfisher', KINGFISHER], ['hornbill', HORNBILL], ['hornbill flying', HORNBILL_FLY], ['monkey', MONKEY], ['butterfly', BUTTERFLY],
  ['panda', panda()], ['panda chewing', panda(true)], ['frog', FROG], ['ducks', DUCKS], ['kite', KITE], ['dragonfly', DRAGONFLY],
  ['egg nest', NEST_ART], ['baby dino', BABY_DINO], ['pterosaur', PTEROSAUR], ['volcano puff', PUFF], ['lotus bud', PAD_ART + lotus(0)], ['lotus 2', PAD_ART + lotus(2)], ['lotus + pearl', PAD_ART + lotus(3) + `<g transform="translate(0 -28)">${PEARL}</g>`], ['koi at rest', KOI_GLIMPSE], ['koi leaping', KOI_ART], ['sky lantern', SKY_LANTERN],
];
