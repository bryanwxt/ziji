# Credits

字己 ZiJi is built on these open resources:

- **HSK 3.0 character and word lists** — [elkmovie/hsk30](https://github.com/elkmovie/hsk30), MIT License, © 2021 Pleco Inc.
  Used for the 600 built-in characters, their levels, the handwriting list, and example words.
- **Make Me a Hanzi** `dictionary.txt` — [skishore/makemeahanzi](https://github.com/skishore/makemeahanzi), GNU LGPL v3 or later
  (derived from Unihan and CJKlib). Used for meanings, radicals, components and stroke counts in `src/content/builtin.json`;
  those derived fields are distributed under the same licence.
- **CC-CEDICT** — [MDBG and contributors](https://www.mdbg.net/chinese/dictionary?page=cc-cedict), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
  Shortened English glosses in `src/content/glossary.json`, and the simplified headwords of 2–4 characters in `public/data/cedict-words.txt`
  (the weekly list's word check, loaded only in the parent area), and their first sense cut to four words in
  `public/data/cedict-glosses.txt` (English for a list word left blank, also parent area only); these adaptations are shared under the same licence.
- **Hanzi Writer** — [chanind/hanzi-writer](https://github.com/chanind/hanzi-writer), MIT License.
- **hanzi-writer-data** stroke data — Arphic Public License (derived from Make Me a Hanzi graphics / Arphic fonts).
- **pinyin-pro** — MIT License. **ts-fsrs** — MIT License. **canvas-confetti** — ISC License. **idb** — ISC License. **Preact** — MIT License.
- **LXGW WenKai (霞鹜文楷)** — [lxgw/LxgwWenKai](https://github.com/lxgw/LxgwWenKai), SIL Open Font License 1.1. Subset to the app's characters as `public/fonts/wenkai.woff2`; licence text in `public/fonts/LXGWWenKai-OFL.txt`.
- **Lucide icons** — via `lucide-preact`, ISC License (portions derived from Feather, MIT License).
- **Nunito** — via `@fontsource/nunito`, SIL Open Font License 1.1.
- Read-aloud passages marked ZiJi were written for this project. The weekly list's sentence bank (`src/content/weekSentences.json`) was written for this project too.
- **Tatoeba** — Sentences from Tatoeba ([tatoeba.org](https://tatoeba.org)), [CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/). A filtered
  subset of the Mandarin sentences (`src/content/tatoeba.json`, built by `scripts/build-tatoeba.ts`) offers a weekly-list fill-in sentence for a word
  with none of the app's own; each keeps its Tatoeba sentence id (`https://tatoeba.org/sentences/show/<id>`), and a parent confirms each before it is asked.
- **Global Storybooks Chinese** — [global-asp/sbc-source](https://github.com/global-asp/sbc-source) (commit `be28dab`) and its pictures
  ([global-asp/gsn-imagebank](https://github.com/global-asp/gsn-imagebank), commit `0df4097`), from the African Storybook. Each story keeps its own
  licence — [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) or
  [CC BY-NC 3.0](https://creativecommons.org/licenses/by-nc/3.0/) — and its author, illustrator and translator credits, shown under each passage and in
  the parent area's Credits. Stories changed for Singapore usage are marked "adapted"; the changes are listed in `scripts/storybooks/manifest.json`, the
  sources in `scripts/storybooks/SOURCE.md`.

Jun Da's *Modern Chinese Character Frequency List* was considered. On 2026-10-02 it stated no terms of use, so it is not used.

## Mascot

- **Truffle 松露** — original vector art of the family's cat, drawn for this app (no photos are included), including
  his power effects, zodiac onesies, outfits and accessories, and the app's ink icon set. Game mechanics (types, a collection, skins) are generic; no third-party
  characters or art are used.
