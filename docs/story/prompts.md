# The Word Thief — background prompts for the Gemini app

*For the parent. Each background is one painting, made in the Gemini app and saved into `art/backgrounds/`. Claude crops, compresses and wires them in.*
*Style rules: `docs/story/style.md`.*

## Your steps

1. **Start with the test scene, `hdb-voiddeck`.** In the Gemini app:
   - ask for an image;
   - paste the **style paragraph** below, then the `hdb-voiddeck` prompt;
   - ask for a **4:3 landscape** image.

   Generate a few until one feels right, and use the reject checklist below to throw out bad ones fast.
2. **Save the one you pick** as `art/backgrounds/hdb-voiddeck.png` (any image format is fine), or just send it to me in chat and I'll save it.
3. **For every other scene, attach your approved `hdb-voiddeck` image first**, and add this line before the prompt:

   > Match the painting style, colours and light of the attached image exactly.

   Then paste the style paragraph and the scene's prompt. This is what makes all the scenes look like one book.
4. **Name each file by its id** (for example `hawker-noon.png`).

## Reject checklist

Throw an image away if any box fails:

- [ ] No text, letters, numbers or Chinese characters anywhere, including signs, shop fronts and labels
- [ ] No people and no animals
- [ ] The lower-middle third is clear, flat ground
- [ ] Light comes from the upper left
- [ ] It looks like the same painter as the reference image

## The style paragraph (paste first, every time)

> A hand-painted watercolour and gouache illustration for a children's picture book, soft edges and visible paper grain, gentle warm light from the upper left, cool blue-violet shadows (never black), big soft sky, lived-in everyday details, calm and cosy mood, tropical Singapore neighbourhood. Landscape 4:3, eye-level view. Keep the lower-middle third of the picture clear, flat open ground where characters can stand later. No people, no animals, no readable text, letters or numbers anywhere, signs are blank, no logos or brand names.

## Season 1 scenes

### `hdb-voiddeck` — the test scene (make this first)
> The open ground floor of a Singapore HDB block in the late morning: square pillars, a few round stone tables with stools, a small corner coffee stall with a counter, a big steaming pot and stacked cups, potted plants, a letterbox wall in the background, bright tropical daylight spilling in from the left beyond the pillars. Clear smooth floor in the lower middle.

### `hdb-morning`
> A corridor on the eighth floor of a Singapore HDB block on a sunny Saturday morning: a row of front doors with metal gates, potted plants and a shoe rack along the wall, laundry drying on bamboo poles outside the corridor railing, rain trees and other blocks beyond under a big blue sky, warm sunlight from the left. Clear tiled corridor floor in the lower middle.

### `hdb-night`
> The same HDB block seen from the void deck at night: warm yellow corridor lights glowing floor by floor, a deep blue night sky with a few stars, a soft streetlamp glow from the left, the stone tables and pillars of the void deck in the foreground, quiet and cosy. Clear open floor in the lower middle.

### `hawker-noon`
> Inside a busy-looking but empty Singapore hawker centre at noon: rows of small food stalls with blank signboards, steam rising from big pots and woks, ceiling fans, round tables and stools, trays and bowls stacked on counters, bright daylight pouring in from open sides on the left. Clear tiled floor between the tables in the lower middle.

### `market-morning`
> A Singapore wet market in the early morning: stalls with fish laid on ice, piles of green vegetables and fruit, hanging scales, plastic baskets, damp shining floor reflecting the light, morning sun slanting in from the left through the open side. Clear wet floor walkway in the lower middle.

### `school-field`
> A Singapore primary school on a bright morning: a low school building with corridors and a covered walkway, a green field, a rain tree with a bench under it, a bell on the wall, blue sky with soft clouds, sunlight from the left. Clear grassy ground in the lower middle.

### `school-garden`
> A small school garden behind a Singapore primary school: raised wooden planting beds, a lonely young sapling in the middle bed, a watering can, a trellis, butterflies' flowers, a fence and the school building behind, soft morning light from the left. Clear earth path in the lower middle.

### `playground-afternoon`
> A neighbourhood playground in a Singapore HDB estate in the late afternoon: a colourful slide and climbing frame, swings, a sandpit, a low gate in a fence, rubber flooring, HDB blocks and rain trees behind, golden light from the left with long soft shadows. Clear rubber floor in the lower middle.

## Later seasons (not needed yet)

- `mrt-evening`: an elevated MRT station at dusk, a train gliding in.
- `garden-morning`: a community garden with raised beds and bees.
- `sea-sunset`: a boardwalk by the sea at sunset, ships on the horizon.
- `chinatown-night`: a festival street with red lanterns at night.
