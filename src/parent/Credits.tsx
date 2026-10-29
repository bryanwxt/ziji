import { PASSAGES } from '../content';
import { LICENCE_URL } from '../langdu/credit';
import type { PassageCredit } from '../types';

/** Each Global Storybooks story the app reads from, once (spec 2026-10-15 §2.1), in story order. */
const STORIES: PassageCredit[] = [...new Map(PASSAGES.filter((p) => p.credit).map((p) => [p.story!.id, p.credit!])).values()];

export function Credits() {
  return (
    <section class="panel">
      <h2>Credits</h2>
      <ul>
        <li>HSK 3.0 character and word lists — elkmovie/hsk30, MIT License, © 2021 Pleco Inc.</li>
        <li>Make Me a Hanzi dictionary (meanings, radicals, components) — GNU LGPL v3 or later.</li>
        <li>English for school characters and words: short glosses written for this app from CC-CEDICT (MDBG and contributors) — CC BY-SA 4.0, shared under the same licence. Other words show CC-CEDICT's own English, shortened; the weekly list checks pasted words against its headwords.</li>
        <li>Hanzi Writer — MIT License. Stroke data (hanzi-writer-data) — Arphic Public License.</li>
        <li>pinyin-pro, ts-fsrs, Preact — MIT License. idb, canvas-confetti — ISC License.</li>
        <li>Lucide icons — ISC License (portions MIT, from Feather).</li>
        <li>Fonts: LXGW WenKai 霞鹜文楷 and Nunito — SIL Open Font License 1.1.</li>
        <li>Passages marked ZiJi were written for this app.</li>
        <li>Sentences from <a href="https://tatoeba.org" target="_blank" rel="noopener noreferrer">Tatoeba</a> (tatoeba.org), <a href="https://creativecommons.org/licenses/by/2.0/fr/" target="_blank" rel="noopener noreferrer">CC BY 2.0 FR</a>: some weekly-list fill-in sentences, each confirmed by a parent before it is asked.</li>
        <li>
          Read-aloud stories and their pictures from <a href="https://global-asp.github.io/storybooks-chinese/" target="_blank" rel="noopener noreferrer">Global Storybooks</a> (African Storybook), each under its own licence; "adapted" ones have small wording changes:
          <ul class="credits__stories">
            {STORIES.map((c) => (
              <li key={c.source}>
                <a href={c.source} target="_blank" rel="noopener noreferrer">{c.title}</a> — text {c.text}, illustration {c.illustration}, translation {c.translation} — <a href={LICENCE_URL[c.licence]} target="_blank" rel="noopener noreferrer">{c.licence}</a>
                {c.adapted ? ', adapted' : ''}
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </section>
  );
}
