# The Word Thief — style sheet

*One page that both layers follow: the painted backgrounds the parent makes in Gemini, and the SVG characters drawn in code.*
*Spec: `docs/superpowers/specs/2026-10-07-ziji-story-art-design.md` §2.*

## Look

- **Medium:** hand-painted watercolour and gouache, with soft edges and visible paper grain.
- **Feel:** big skies, gentle light, places that look lived-in. The mood is calm, cosy, a little magical.
- **For the parent:** this is Ghibli-*inspired* in feel. The prompts describe the qualities and never name a studio or a film. That keeps Gemini consistent and avoids refusals.

## Light

- It comes **from the upper left**, always, in every scene and on every character.
- **Tropical light:**
  - bright, clear mornings;
  - golden late afternoons;
  - the glow just after rain;
  - warm lamplight at night.
- **Shadows are cool blue-violet** (`shadow`), never black or grey-brown.

## Palette

| Name | Hex | Use |
|---|---|---|
| `sky` | `#a9d3e8` | skies, cool light |
| `sky-deep` | `#6fa8c9` | sky gradients, shadows on water |
| `leaf` | `#7fae6a` | rain trees, plants |
| `leaf-deep` | `#4f7d4a` | foliage shadow |
| `cream` | `#f6ecd6` | HDB walls, paper |
| `terracotta` | `#d98a62` | tiles, roofs, warm accent |
| `sun` | `#f4c66b` | sunlight, lamps, gold |
| `shadow` | `#7a7398` | shadows (blue-violet, never black) |
| `fur` | `#a9a4ab` | Truffle's grey |
| `fur-deep` | `#7d7882` | Truffle's shading and edge |
| `chest` | `#fbf5ea` | Truffle's white chest and paws |
| `jade` | `#6dbb94` | Granny Dragon |

Each scene keeps to these families and adds **one** warm accent of its own: a red lantern, an orange umbrella, a yellow bus.

## Content of a background

- **No people and no animals.** The cast is drawn in code and stands in front of the painting.
- **No readable text** anywhere: no letters, numbers, Chinese characters or signs with writing. Signs are blank shapes, because the app puts the words in.
- **No brands or logos.** Places are generic.
- **Singapore details:**
  - HDB blocks with corridor plants;
  - void decks with stone tables;
  - kopitiam counters;
  - laundry on bamboo poles;
  - rain trees;
  - covered walkways;
  - hawker stalls;
  - the wet market's ice and scales.

## Composition

- **4:3 landscape,** at eye level, as if a small child is standing in the scene.
- **The lower-middle third is clear, flat open ground** (floor, path, grass) where the characters will stand. Nothing important goes there.
- **The interest sits in the upper two-thirds:** the sky, the building, the stall.
- **Depth:** a soft foreground edge, the scene, then a hazy background.

## Characters (SVG)

- **No hard black outlines.** An edge is a darker shade of its own fill: Truffle's fur edge is `fur-deep`-ish (`#6f6a75`), and Granny Dragon's is a deep jade (`#3f7f63`).
- **Shading:** soft gradients lit from the upper left, with a pale rim on the shadow side.
- **Texture:** a few painted strokes only (tabby stripes, scale marks), never busy.
- **Shapes:** round, friendly, chunky. Faces are big and readable at 120 px.
- **Eyes:** pupils stay dark. That's the one place a near-black (`#2f2a36`) is allowed, because it reads best.
- **Every character** casts a soft `shadow`-coloured ground shadow, never black.
