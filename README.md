# 字己 ZiJi

*字己 = 自己学汉字* — a pun on 自己 (zìjǐ, "by myself"): Chinese-character practice a child does on his own.

A home-screen iPad app for daily Chinese character practice (P2 → P3), used by the child alone:
spaced-repetition flashcards, 听写 writing, a components fishing game, and a speaking step that alternates
a 看图说话 picture-story builder (8 ink scenes on common exam themes: five framed parts, try first then hear Truffle's
model, the whole story, then "Truffle asks" follow-up questions) with a 朗读 reading-aloud coach
(exam-etiquette warm-up with his self-introduction, echo reading by phrase, a full read with a loudness meter,
the same passage for 3 days; parents add school texts and mark misread characters, which return as priority words),
with **Truffle 松露** — the family's grumpy grey-and-white cat — as the mascot: he starts every session
unimpressed and warms up as the child gets answers right.
Learning a radical family (氵 水, 火, 木, 金, 土, 口, 亻, 讠, 辶, 心, 日) gives Truffle a power in three tiers, and every
character learned is caught as a card in the 字卡 collection (gold when he can also write it).
The daily treasure chest (press and hold to open) dresses Truffle: 12 zodiac 生肖 onesies — the first is the
child's own zodiac, set in the parent area — plus 8 outfits and 16 add-on accessories (face, neck, paw, back) that go with
any costume. Home sits in an ink-drawn world that changes as he learns: a journey of eight places unlocked by
the number of characters he knows (后院 backyard, 草丛 tall grass, 赛车山 race-track hills, 方块世界 block world,
恐龙谷 dino valley, 海底 under the sea, 月球基地 moon base, 海盗岛 treasure island), washed by the time of day, with a
week strip, a richer word of the day, and a strip of the world under each lesson. Each world has one thing to tap:
zodiac animals hide in the tall grass (collected in 字卡), gems are dug in the block world (a jar in Truffle's room), a
dinosaur egg hatches after his next lesson, and the island's X gives a bonus star a day. Everything the child sees is drawn in the app's own ink style; there are no emoji on child screens. Parents use the 🔒 PIN-protected area for
progress, school word lists, recordings, reward goals, settings and backups. All data stays on the iPad.

Design: `docs/superpowers/specs/2026-10-02-hanzi-buddy-design.md`, redesign `docs/superpowers/specs/2026-10-02-ziji-truffle-design.md`

## Develop

```bash
npm install
npm run dev        # http://localhost:5173 (also on your LAN for testing on the iPad)
npm test
npm run build
npm run content    # regenerate src/content/builtin.json from HSK 3.0 + Make Me a Hanzi
npx tsx scripts/build-glossary.ts <cedict_ts.u8>   # regenerate src/content/glossary.json (English on the 认字 card) from CC-CEDICT; CC BY-SA 4.0
```

## Put it on the iPad

1. Open the deployed URL in **Safari** on the iPad.
2. Tap **Share → Add to Home Screen**. Always open the app from that icon. Home-screen apps keep their data and work offline.
3. First launch: set the parent PIN, let your child wake Truffle, then do the 5-minute placement check together.
4. For good audio, install a Chinese voice: **Settings → Accessibility → Spoken Content → Voices → Chinese (China mainland)**.
5. Back up from the parent area every couple of weeks (Backup → Save backup file → Save to Files / iCloud Drive).

## iPad checklist (only real hardware can confirm these)

- [ ] 🔊 buttons speak Mandarin (not silence or an English voice).
- [ ] Speaking step: allow the microphone, record, play back, save. The recording plays in Parent → Recordings.
- [ ] 听写: finger writing is accepted; after 2 wrong strokes a hint appears.
- [ ] Add to Home Screen works; the app opens full-screen with the orange icon.
- [ ] Turn on Airplane Mode after one full session online: the app still opens, and flashcards and writing still work.
- [ ] Swipe the app away mid-session and reopen: it continues at the same card.
- [ ] Rotate to portrait: everything still fits.
