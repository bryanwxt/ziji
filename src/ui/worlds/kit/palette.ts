/** Every colour the storybook worlds use (spec 2026-10-04 §2, §7): clear sky blues, fresh greens, warm accents. */
export const P = {
  // paper and light
  shadow: '#2b3a2a', white: '#ffffff', cream: '#fffaf0', creamShade: '#f4ead2', paperSky: '#f6f1df',
  sun: '#ffd166', sunDeep: '#f4b942', warm: '#ffb86b', ember: '#ff7a45',
  // sky and cloud
  sky: '#a9dcf6', skyDeep: '#7cc6ee', cloudShade: '#dcebf5', mist: '#e7f3f8',
  // greens (leaves, hills, tufts)
  leaf1: '#4f9f55', leaf2: '#5fb262', leaf3: '#6cbd6a', leafLight: '#8fd486',
  far: '#c9e6cf', farLow: '#b9dcbf', farEdge: '#e2f2e3',
  hill1: '#b4e28e', hill1Low: '#93cf70', hill1Edge: '#d6f0b4',
  hill2: '#97d474', hill2Low: '#72bd55', hill2Edge: '#bfe79a',
  hill3: '#6fbd52', hill3Low: '#56a442', hill3Edge: '#93d070',
  tuft1: '#4a9e4a', tuft2: '#57ad52', stem: '#4f9a4a', grassTall: '#3f8f45',
  // earth, wood, stone
  trunk: '#9c6a40', wood: '#b8804c', woodDark: '#7a5233', woodLight: '#d9a066',
  dirt: '#c08a5a', dirtLow: '#a8744a', dirtEdge: '#d9a873',
  stone: '#a7adb5', stoneLow: '#8c939c', stoneEdge: '#c9ced4', rockWarm: '#c7b299', rockWarmLow: '#ad977c',
  // mountains far away
  peak: '#c3d3e6', peakLow: '#b2c4da', snow: '#f4f8fc',
  // sand and sea
  sand: '#f3dca6', sandLow: '#e6c88a', sandEdge: '#fbecc4',
  sea: '#7fcbe6', seaLow: '#5fb3d6', seaEdge: '#bfe8f5', deep: '#3f86b8', deepLow: '#2f6f9f', foam: '#e9f7fb',
  // space
  night: '#2c2f5e', nightLow: '#4a4a86', moonRock: '#cfcbe0', moonRockLow: '#b4afcb', moonEdge: '#e6e3f1', crater: '#a59fbe', glass: '#bfe6f4',
  // accents
  red: '#ef6f6c', redDeep: '#d9534f', coral: '#e2725b', orange: '#ff9f43', pink: '#ff8fa3', pinkSoft: '#f6cbd6', pinkDeep: '#f2b8c6',
  blush: '#fff2f2', lilac: '#c8b6ff', purple: '#9b7fd9', teal: '#4fc1b5', blue: '#5b9bd5', yellow: '#f6d28b', mint: '#7cc48a', mintDeep: '#5aa86a',
  brownFood: '#c98a5a', egg: '#fbf1d8', eggSpot: '#e8cfa0',
  // evening
  dusk: '#3d3a6b', duskTop: '#8f8cc4', duskLow: '#f6c9a8', duskSea: '#4a6fa5', duskSeaLow: '#2c4a7a', lamp: '#ffe29a',
} as const;
