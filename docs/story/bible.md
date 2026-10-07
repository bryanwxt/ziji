# The Word Thief — story bible

*字己 ZiJi's story. For the parent, for whoever writes the next season, and for the 3c engine's notes.*
*Spec: `docs/superpowers/specs/2026-10-06-ziji-story-bible-design.md`.*

---

## 1. Voice

**Who reads it:** a confident Year 2 reader, alone, on an iPad. A page takes him about 15 seconds.

- **Short sentences.** Most are under 12 words, and none is over 15.
- **Speech carries the jokes.** Narration sets the scene in a line or two, and then the characters talk.
- **Every page ends with a small pull forward:** a noise, a question or a door that won't open.
- **The Word-Keeper is talked to, never about.** Characters turn and speak out of the page: "Word-Keeper! Can you read that?"
- **Word slots** are Chinese words placed where the English word would go: "The {门|door} won't open." The app shows the English until he has heard the word, then the Chinese with the English beneath, then the Chinese alone once he owns it. So write every slot sentence so it reads naturally in English **and** with the Chinese dropped in. Use a slot for the *thing itself*, not an idiom ("the {门|door} creaked", not "open the {门|door} to opportunity").
- **Tone:**
  - the slapstick of *The 13-Storey Treehouse*: things fall on people, plans go sideways, and the narrator is surprised too;
  - the crew banter of *The Bad Guys*;
  - Professor Hush is *Charlie*'s mad inventor, all flourish;
  - like Sanderson, every clue is planted before it pays off, and nothing is solved by a rule the reader hasn't seen.
- **Nobody is mean for real.** Teasing is warm. Hush is ridiculous, never frightening. Nobody is hurt; things get bonked.

**The rules every chapter keeps** (checked by `scripts/story/check.ts`):
- Granny Dragon's lines and the 听一听 scene use only characters taught by the season's last term (Season 1: 二上).
- **Word slots:**
  - 6–10 per chapter, each used once;
  - every one a real word in the app from the season's terms;
  - listed in the chapter's frontmatter and in the outline.
- **Pages:** at most 60 English words and at most 4 speech lines.
- **Granny Dragon:** 1–3 lines a chapter.
  - Her lines come after the setup's last page. Say where she is: `@offstage` when she's a voice from somewhere else (Truffle stays in the picture and turns to it); otherwise she stands beside the cast.
  - Plain English lines before her Mandarin set her up ("Far below, a voice floated up from the void deck.").
- **Go page:** every chapter has a `## Go` section after `## Granny`: one page that hands over to the lesson, so the lesson is what the Word-Keeper *does* next ("Show me what these grey things are, Word-Keeper."). Its button says 出发！
- **Page length on screen:** a page too long for the screen is split between paragraphs by the reader (it never scrolls). `npm run story-walk` checks every page at the phone and iPad sizes.
- **听一听:**
  - 3–5 lines and 1–2 questions;
  - the right answer is said in the scene;
  - 谁 and 什么 first, 为什么 from chapter 10.
- **Rescued words:**
  - exactly one `[rescued]` line, in the payoff;
  - write it so any words can fill it ("The words burst out and zoom home.").
- **No real brands, shops or logos.** Generic places only.
- **Written fresh:** never copied or adapted from the textbook, worksheets or class material.
- **The child is never named:** he is the Word-Keeper.

---

## 2. Cast

### The Word-Keeper (the reader)

- **Who he is:**
  - The only human in 字己镇 who can still *see* words after Hush's machine takes them.
  - The crew needs him: things that lose their word stop working, and only he can read them back into the world.
  - His answers in lessons are what he *does* in the story.
- **Never named, never drawn.** The story is in a public repo, and every child who reads it should feel it's them. Characters look out of the page at him.
- **What the crew call him:** the Word-Keeper. Granny Dragon calls him 小朋友, and later 守字人. Truffle, grudgingly, calls him "partner".

### Truffle (松露)

- **Who:** a small grey tabby cat with green eyes and a white chest. He lives on the 8th floor of the HDB block with a bowl that says 松露. He's the hero, and in his own opinion the leader.
- **Wants:** a quiet life, a sunny windowsill, and to be thanked properly.
- **Trait:** proud and a bit grumpy; underneath, very soft. He'd never say so.
- **Running gag:** he claims every plan was his idea, especially the ones that weren't.
  - "As I was *just* about to say…"
  - "Obviously. That was my plan. I was testing you."
  - "Hmph! I knew that."
- **How he talks:** short, dry and a little grand. He says "Hmph!" when he's annoyed or embarrassed. (The English pages never carry Chinese outside a word slot, so it's always "Hmph", not 哼.) When he's really pleased, he purrs and pretends he didn't.
- **For 3b:** grey tabby, green eyes, a white chest, his tail held up when proud. Same face as the app's Truffle, redrawn soft and painted.

### Dog (小狗) — joins in chapters 4–5

- **Who:** a scruffy, sandy-coloured puppy who lives at the playground and has read every Greek myth. Twice. Out loud.
- **Wants:** to be a hero, like Heracles.
- **Trait:** loyal, brave and far too excited.
- **Running gag:** he compares every disaster to a Greek myth and gets it slightly wrong. The Word-Keeper usually knows better.
  - "This is just like Heracles and the… Hydra-cat!" ("It's a hydra." "A hydra-*cat*.")
  - "Like Odysseus! Who sailed for ten years because he… forgot where he parked."
  - "Don't look at Hush! It's like Medusa! If you look, you turn into… a bun?"
- **How he talks:** fast, lots of exclamation marks, and he says "Wait, wait, wait—" before every idea.
- **For 3b:** a sandy puppy with one floppy ear and a red scarf he calls his "cape", carrying a library book about myths.

### Pig (小猪) — joins in chapters 6–7

- **Who:** a round, pink pig who lives behind the hawker centre and knows every stall by smell.
- **Wants:** lunch. Then second lunch.
- **Trait:** always hungry. She smells trouble before anyone sees it, literally.
- **Running gag:** her nose twitches: "I smell… trouble. And also chicken rice."
  - "Something's wrong. The noodles smell *sad*."
  - "Follow me. My nose is never wrong. Except about durian."
  - "Is this a good time for a snack? It's always a good time for a snack."
- **How she talks:** calm and cheerful, food in every sentence, and the cleverest one in a crisis, which surprises everyone.
- **For 3b:** a round pink pig with a yellow headband and a tiffin carrier she never puts down.

### Ox (牛) — joins in chapter 8

- **Who:** a big, gentle ox who works at the wet market, carrying crates.
- **Wants:** to do exactly what he's told, correctly.
- **Trait:** takes everything literally.
- **Running gag:** idioms and instructions go wrong.
  - Told to "hold your horses", he goes looking for horses.
  - "Keep an eye on the door" — he puts a marble by the door.
  - He's also where the **tone misfires** live (rule 2): he means 买 (buy) and says 卖 (sell), and the shop is suddenly his.
- **How he talks:** slowly and politely, in full sentences: "Excuse me. I have done it. The horses are not here."
- **For 3b:** a big brown ox with short round horns and a blue apron, very strong and very careful.

### Granny Dragon (龙奶奶)

- **Who:** an old, small, green dragon who runs the kopitiam at the void deck. She's been there longer than anyone remembers.
- **Wants:** everyone fed, and everyone talking to each other.
- **Trait:** kind, patient, and quietly knows more than she says. She is Season 1's mystery thread.
- **She speaks only Mandarin,** slowly and simply, and she never switches to English, whatever happens.
  - Her audio plays first.
  - The English appears only when he taps, after he has heard it.
  - She's the character he understands more of as he learns. That's the point of her.
- **What she talks about:** food (你们饿了吗？, 吃饭了！, 小心，汤很热 — hot food is 烫 once he has it; never the colloquial 很烧), school (今天学了什么？), the weather (下雨了！), and gentle questions (你们去哪儿？, 你看见了吗？). She uses short sentences and words he has met.
- **Her secret:** she knew Hush when he was a boy. She doesn't say it until a later season.
- **For 3b:** a small, round, jade-green dragon with white whiskers, round glasses, a flowered apron and a kopi pot.

### Professor Hush

- **Who:** a tall, thin inventor in a purple coat much too long for him, with wild white hair and a monocle. He lives somewhere under 字己镇.
- **Wants:** silence. Specifically, a world with no words in it.
- **Trait:** theatrical and vain. He announces himself. He loves his own inventions.
- **His machine, the Hush-o-Matic:** a brass vacuum cleaner on wheels with a big funnel, a glass belly where you can see the stolen words swirling, and a horn that goes *SHHHHHH*. When it takes a word, the thing stops working and goes grey.
- **Catchphrase:** "SHHHHHH! Silence is GOLDEN!" (He has a gold-painted "S" on his coat.)
- **Never scary:** he trips on his coat, his machine hiccups words back out, and he's terrible at escaping.
- **His secret** (§5): as a boy, he was laughed at for stumbling over his grandmother's language. He decided that if no one had words, no one could be laughed at.
- **For 3b:** purple coat, monocle, white hair, the gold "S", and the brass Hush-o-Matic with its glass belly.

### Townsfolk

- **Uncle Rahim:** runs the drinks stall at the hawker centre. Booming and friendly, he calls everyone "boss".
- **Auntie Mei:** the vegetable auntie at the wet market. Sharp-eyed, she always gives the crew an extra orange.
- **Ms Pereira:** the school's librarian. Calm, and Dog's hero after Heracles.

---

## 3. 字己镇

- A Singapore neighbourhood in tropical weather: thunderstorms that come and go, rain trees, the glow after rain, and laundry on bamboo poles.
- **When a place loses its words, it stops working:** a 门 won't open, a 鱼 forgets how to swim. The place goes grey and its signs go blank.
- **When the words come back, colour floods back in.** The town map on Home lights each restored place.

| Place (id) | What it looks like | What goes wrong when it loses its words | Background ids (3b) | Season 1 |
|---|---|---|---|---|
| HDB block (`hdb`) | A 12-storey block, corridors of potted plants, a void deck with stone tables and Granny Dragon's kopitiam | Doors won't open, the lift is stuck, letters fly out of letterboxes | `hdb-morning`, `hdb-voiddeck`, `hdb-night` | ✓ home base |
| Hawker centre (`hawker`) | Rows of stalls, ceiling fans, steam and noise | Dishes lose their names and turn into grey mush; nobody can order | `hawker-noon` | ✓ |
| Wet market (`market`) | Wet floors, fish on ice, piles of vegetables, hanging scales | Fish forget how to be fish; scales won't weigh; buying and selling get muddled | `market-morning` | ✓ |
| School (`school`) | A low school with a field, a canteen (食阁), a library and a garden | Books go blank; the bell won't ring; the garden won't grow | `school-field`, `school-garden` | ✓ |
| Playground (`playground`) | Slides, swings, a sandpit and a rubber floor | The gate won't open; swings won't swing | `playground-afternoon` | ✓ |
| MRT station (`mrt`) | An elevated station, glass and steel, trains gliding in | Trains won't stop; maps go blank | `mrt-evening` | Season 2 |
| Community garden (`garden`) | Raised beds, a trellis, bees | Plants forget what they are | `garden-morning` | later |
| Park by the sea (`sea`) | A boardwalk, the sea, ships on the horizon | Waves stop; kites fall | `sea-sunset` | later |
| Chinatown at festival time (`chinatown`) | Lanterns, a market, a dragon dance | Lanterns go dark | `chinatown-night` | later |

---

## 4. The magic

Hard rules, stated in the story, never broken. Each is first *shown* by a scene and never lectured.

1. **A word works only if it is understood.** Seeing it is not enough.
   - First shown in chapter 2. Truffle can't see words, so he asks the Word-Keeper how to *say* the tap's and the towel's words. He's told only the sound. He shouts the sounds again and again, and nothing happens. When the Word-Keeper tells him what they *mean*, the water flows and the towel turns blue again.
2. **Tones change the spell.** 买/卖, 猫/毛 and 汤/糖 cause comic misfires.
   - First shown in chapter 8. Ox means to *buy* (买) a fish and says *sell* (卖), and the whole stall is suddenly his.
   - Later: Truffle asks for 汤 (soup) and gets a mountain of 糖 (sweets).
3. **Parts combine.** 木+木 → 林, 木+木+木 → 森, 森+林 → 森林, 日+月 → 明.
   - First shown in chapters 12–13. The school garden needs a forest. 木 next to 木 makes 林, three 木 make 森, and 森 next to 林 grows a whole 森林.
   - The crew discover more combinations over the seasons.

**The rule above the rules:** the magic never solves a problem with a rule the reader hasn't already been shown.

---

## 5. The arc

### The crew of 12

The zodiac animals join two or three a season, each rescued from a place that lost its words.
- **Season 1:** Dog, Pig, Ox.
- **Later seasons:** Rat, Tiger, Rabbit, Snake, Horse, Goat, Monkey, Rooster.
- Dragon is not in the crew: Granny Dragon is a dragon, and she has her own part to play.

Each has one trait and one running gag. For example, Monkey breaks everything.

### Hush's secret

As a boy, Hush stumbled over his grandmother's language and was laughed at. He decided: no words, no laughing.

The hints are planted early and paid off in the finale:
- **Season 1, hint 1** (chapters 9–14): Hush flinches, just for a moment, when Granny Dragon speaks.
- **Season 1, hint 2** (chapters 15–17): in his word-store, an old photo of a boy holding his grandmother's hand. The boy has Hush's ears.
- **Each later season:** one more hint.
  - A lullaby he hums without noticing.
  - A child's exercise book full of crossings-out.
  - Granny Dragon saying his first name.
- **Series finale:** the Word-Keeper teaches Hush. Not a fight, a lesson. Hush gets a word wrong, nobody laughs, and he tries again.

### The theme

Struggling with a language is normal and worth it. The story shows this through Truffle getting things wrong, Ox's misfires, and Hush. It never says it.

---

## 6. Seasons

| Season | Words from | Title | Shape |
|---|---|---|---|
| 1 | 一上, 一下, 二上 (catch-up) | *The Silent Street* | Hush hits Truffle's HDB block. The crew forms (Dog, Pig, Ox), restores the block, hawker centre, wet market, school and playground, and finds Hush's word-store. Hush escapes towards the MRT station. 18 chapters. |
| 2 | 二下 | (to come) | The machine runs loose on the MRT line. |
| 3 | 三上, from January | (to come) | — |

- One season per school term after that.
- Each season ends on a festival in its term where it can (parent spec §5.9).
