# Singapore MOE Primary Chinese (2024 syllabus): outcomes and assessment, P1–P6

Context: the child entered P1 in 2025 and is in P2 in 2026. That makes them the second cohort on the 2024 syllabus: P3 in 2027, P4 in 2028 (end-of-P4 subject banding), P5 in 2029, and P6/PSLE in 2030. The syllabus rollout table lists P1 2024 → P6 2029 for the first cohort, with Foundation Chinese (基础华文) starting at P5 in 2028 — [MOE 2024 syllabus, Ch.5 §1](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf).

Note on the sources: I read the 2024 syllabus in full from a local text extraction of the MOE PDF (scratchpad `2024_Chinese_Syllabus.txt`, cited below as "2024 syllabus"). The 2015 syllabus is cited as "2015 syllabus". The extraction lost the shaded year columns in every target table. So the syllabus text says *what* the targets are but not *which grade* each one starts or ends in. Where I assign a grade, I worked it out from the official textbook character lists (see Q1) and marked it as inferred. moe.gov.sg (direct download of the 2024 syllabus PDF) and the moe.edu.sg school sites (booklets and briefing slides) blocked automated download (moe.gov.sg returned an HTML page instead of the PDF; moe.edu.sg returned 404 or HTML), so for school-level assessment I only had search snippets.

## Q1. Stage targets per skill, 人文素养, 通用能力, and character targets

### Takeaway
The 2024 syllabus keeps the 2015 structure: a foundation stage (P1–4) and an orientation stage (P5–6), and three courses (Foundation Chinese 基础华文, standard 华文, Higher Chinese 高级华文). It sets targets for six language skills plus 人文素养 and 通用能力, and the targets rise in a spiral from stage to stage. The 2024 syllabus raised the lower-primary character recognition targets: about **700–750 characters by end-P2** (2015: 600–650) and **1300–1350 by end-P4** (2015: 1200–1300). The P6 targets (1600–1700 for 华文, 1800–1900 for 高级华文) and all six writing targets are unchanged from 2015. In P1–P3, Higher Chinese adds characters to *write* but not to *recognise*.

### Cited Findings
**Structure and time**
- The foundation stage (奠基阶段, P1–4) splits into stage 1 (P1–2) and stage 2 (P3–4). The orientation stage (定向阶段) is P5–6. P1–4 offers only 华文 and 高级华文. P5–6 adds 基础华文 for weaker students. P1 and P2 高级华文 runs only at selected schools (特选小学). Schools may handle P1 class streaming flexibly because P1 performance is unstable — [2024 syllabus, Ch.3 §1](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- Module model: core modules (核心单元) take 70–80% of time, and the PSLE "should be pegged to the core module level". The other 20–30% is spent on a support module (导入单元 at lower primary or 强化单元 at middle primary, the latter run as the "ABLE华文我也行" support scheme), a school-based module (校本单元), or an enrichment module (深广单元) for stronger and interested students — [2024 syllabus, Ch.3 §2](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- Learning focus for 华文 and 高级华文 in P1–4: "培养基础阅读和写作（写话、写段）能力，着重聆听、说话、口语互动、识字和写字的训练" (build basic reading and writing at the sentence and paragraph level, with emphasis on listening, speaking, oral interaction, character recognition and handwriting). In P5–6, 华文 focuses on oral interaction, reading, writing and written interaction, while 高级华文 focuses on reading, writing and written interaction — [2024 syllabus, Ch.3 §3](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- Weekly hours, the same as 2015: 华文 P1–P6 = 6, 6, 4.5, 4, 4.5, 4.5 h. 高级华文 = 7, 7, 5.5, 5, 5.5, 5.5 h. 基础华文 P5–6 = 2.5 h (as extracted) — [2024 syllabus, Ch.3 §4](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf); [2015 syllabus](https://www.moe.gov.sg/-/media/files/primary/chinese-primary-2015.pdf)
- The skill targets are derived from MOE's 语言能力描述 (language proficiency descriptors covering P1 to JC2) — [2024 syllabus, Ch.4 fn13](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)

**Character targets (syllabus numbers; year columns lost)**
- 识字 (recognise form, sound and meaning): four bands: 700–750, 1300–1350, 1600–1700, 1800–1900 characters, plus "能识别偏旁、部首" (identify radicals) — [2024 syllabus, Ch.4 reading 4(1)](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- The 2015 recognition bands were 600–650, 1200–1300, 1600–1700 and 1800–1900, tied to 《新加坡小学生字词表》 — [2015 syllabus](https://www.moe.gov.sg/-/media/files/primary/chinese-primary-2015.pdf)
- 写字 (write correctly): six bands: 300–350, 400–450, 700–750, 950–1000, 1000–1100, 1400–1500, plus basic strokes, stroke order and character structure (间架结构). These are identical to 2015 — [2024 syllabus, Ch.4 writing 5(1)](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf); [2015 syllabus](https://www.moe.gov.sg/-/media/files/primary/chinese-primary-2015.pdf)
- Cumulative unique characters in the official 《欢乐伙伴2.0》小学华文生字表 (识读字 = characters to recognise, 识写字 = characters to write), as I counted them from the local parsed lists (`moe2024.json`, `moe2024_hcl.json` in the scratchpad):
  - 华文 recognise: 182 / 364 / 566 / **746** / 901 / **1031** at end of 1A / 1B / 2A / 2B / 3A / 3B
  - 华文 write: 75 / 167 / 269 / **350** / 459 / 569
  - 高级华文 recognise: 189 / 365 / 566 / 746 / 901 / 1031 (the same as 华文)
  - 高级华文 write: 90 / 202 / 330 / **435** / 576 / **704**
  — [local count from 《欢乐伙伴2.0》生字表 (scratchpad parse; original source URL not recorded)]

**Language skills (knowledge-and-skill targets, listed in the syllabus from easiest to hardest)**
- 聆听 (listening). Text types: oral instructions and reports, dialogues, ads, news, children's rhymes, songs, stories, broadcasts, film/TV, and online audio/video. Targets:
  1. Distinguish syllables, initials, finals and tones, and sense mood and intonation.
  2. Understand the material: use visual and auditory cues; get specific details (who, when, where, cause, process, result); grasp the main content and key information; recognise common text types; hear implied meaning.
  3. Analyse it: sequence events, tell apart different viewpoints, and infer or predict from context and keywords.
  — [2024 syllabus, Ch.4 §1](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- 说话 (speaking). Types: things seen and heard, stories, reflections, show-and-tell. Targets:
  1. Read initials, finals, tones and syllables clearly and correctly.
  2. Plan content from experience; use props or slides; recount events; retell what was heard or read; speak on a topic in an organised way; give simple analysis.
  3. Use suitable volume and pace, speak clearly and completely, and use appropriate mood and intonation.
  — [2024 syllabus, Ch.4 §2](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- 口语互动 (oral interaction). Types: greeting, requesting, inviting, apologising, asking, informing, persuading, suggesting, praising, refusing, discussing, interviewing. Targets:
  1. Ask and respond to questions and requests; quote and report what others said; give and respond to opinions and suggestions; adapt content and wording to the audience.
  2. Use expressions and gestures; take turns effectively (话轮转换); complete tasks through collaborative discussion; adjust to the listener's reactions.
  — [2024 syllabus, Ch.4 §3](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- 阅读 (reading). Materials: rhymes, stories, fairy tales and fables; notices, posters, ads and menus; newspapers, magazines and web pages. Targets:
  1. The recognition counts above, plus radicals.
  2. Understand texts: use punctuation; use **pinyin**, pictures, video and reference tools; read aloud correctly, fluently and with expression; find specific information; recognise text types; grasp the main idea and theme; read implied meaning.
  3. Analyse, evaluate and apply: predict from the title or pictures; infer word and sentence meaning; predict outcomes; compare; summarise (paragraph gist, character traits, theme); give opinions; apply what was read.
  4. Use tools and resources.
  — [2024 syllabus, Ch.4 §4](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- 写作 (writing). Materials: stories, diaries, things seen and heard, feelings. Targets:
  1. The handwriting counts above.
  2. "**能使用汉语拼音进行输入（如汉字、词语、句子等）**" (type characters, words and sentences with pinyin input). 2015 had "（如汉字，句子）", so 2024 adds 词语 (words).
  3. Plan: observe, imagine, organise paragraphs into a full piece, choose material.
  4. Express: punctuation; complete sentences; record with text, pictures, charts or video; narrate clearly; describe vividly; reuse accumulated language.
  5. Revise: use reference tools; self-assessment and peer assessment under teacher guidance (the syllabus's own example: starts at **P5 for 华文 and P4 for 高级华文**).
  — [2024 syllabus, Ch.4 §5 and p.22 example](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf); [2015 syllabus](https://www.moe.gov.sg/-/media/files/primary/chinese-primary-2015.pdf)
- 书面互动 (written interaction). Materials: greeting cards, notes, letters, text messages, email, online posts. Targets:
  1. Choose a suitable medium and use each medium's format and wording.
  2. Ask and answer in writing; give and respond to opinions in writing; adapt to context and audience.
  — [2024 syllabus, Ch.4 §6](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- A 2015-syllabus example of how start points differ by course: turn-taking (话轮转换) started at P4 for 华文, P3 for 高级华文 and P5 for 基础华文 — [2015 syllabus p.17](https://www.moe.gov.sg/-/media/files/primary/chinese-primary-2015.pdf)

**人文素养 (one list for P1–6 华文, P1–6 高级华文 and P5–6 基础华文, with no grade split)**
- 价值观 (values): know yourself and respect others; care for family and respect elders; care for society and love the country; protect nature and care for the world; perseverance; responsibility; a sense of right and wrong. These are guided by the 21CC core values (respect, responsibility, resilience, integrity, care, harmony) and CCE2021 — [2024 syllabus, Ch.4 二 and Ch.1 fn3](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- 华族文化 (Chinese culture): traditional arts; festivals and customs; famous historical figures and stories; cultural elements in language and characters — [2024 syllabus](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- 新加坡本土文化 (Singapore local culture): local things and customs; stories of Singapore pioneers and history; multiracial, multicultural Singapore — [2024 syllabus](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- 跨文化 (cross-cultural): broad outlook; other countries' cultures and customs; famous foreign figures; tolerance of diversity. The 2015 syllabus framed 人文素养 differently, as values, Chinese culture, social knowledge, caring and global awareness — [2024 syllabus](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf); [2015 syllabus](https://www.moe.gov.sg/-/media/files/primary/chinese-primary-2015.pdf)

**通用能力 (P1–6, no grade split)**
- 思维能力 (thinking): observation, imagination and creativity; problem-solving; applying knowledge to life; adaptability; simple analysis, comparison and evaluation — [2024 syllabus, Ch.4 三](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- 学习能力 (learning): self-directed and cooperative learning; metacognitive planning and reflection; use of tools; managing emotions while learning — [2024 syllabus, Ch.4 三](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- 社交与情绪管理能力 (social-emotional): know your strengths; control emotions and handle stress; empathy; collaboration; responsible decisions — [2024 syllabus, Ch.4 三](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- 资讯科技运用能力 (ICT): communicate through ICT; self-directed and online learning; search for and process information; use word processing and slides to present — [2024 syllabus, Ch.4 三](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- MOE described the 2024 MTL curriculum as giving more weight to 21CC (cross-cultural skills, communication, critical and inventive thinking), gamification and differentiated resources. For Chinese it named the 小精灵动画 Hanyu Pinyin animations and the 神笔动画 (汉字小时候) character-learning animations. MOE was also working with industry on an AI tool for oracy practice outside school — [MOE press release 26 Aug 2023](https://www.moe.gov.sg/news/press-releases/20230826-primary-mother-tongue-languages-curriculum-to-nurture-21st-century-competencies-in-students) (search summary; the fetched page summary did not reproduce the Chinese-specific lines, so treat those details as moderately confident)
- News coverage of the launch: P1 lessons from 2024 use more animated videos, online games and AR; more real-life use such as buying food at the canteen and writing social-media posts; more technology in learning Hanyu Pinyin; the curriculum was piloted in 2023 in 10 schools for Chinese — [Straits Times via Magzter, 27 Aug 2023](https://www.magzter.com/de/stories/newspaper/The-Straits-Times/NEW-MOTHER-TONGUE-CURRICULUM-FOR-PRIMARY-1-PUPILS-FROM-2024); [The Star (ST syndication)](https://www.thestar.com.my/aseanplus/aseanplus-news/2023/08/27/new-curriculum-for-mother-tongue-languages-for-primary-1-pupils-in-singapore-from-2024)
- Other 2024 changes noted by commentators: the 导入 and 强化 support modules were consolidated; "multiple assessment methods" were added; there is more on technology, self-directed learning and cultural literacy. These are secondary commentary sources — [dao.sg comparison](https://dao.sg/article/2332757); [fcpi.org analysis](https://www.fcpi.org/articleDetail/3767?periodicalId=2)

### Inferences
- **Grade mapping of the character bands (inferred, high confidence for P2 and P4).** The textbook counts match the bands closely:
  - Recognition reaches 746 at end-P2, which fits 700–750 at **P2 for both 华文 and 高级华文**.
  - Recognition reaches 1031 at end-P3, which is on track for **1300–1350 at P4 (both courses)**.
  - That leaves **1600–1700 = 华文 P6** and **1800–1900 = 高级华文 P6**.
  - Writing: 华文 reaches 350 at end-P2, so **300–350 = 华文 P2**. 高级华文 reaches 435, so **400–450 = 高级华文 P2**.
  - By the same progression: **700–750 = 华文 P4**, **950–1000 = 高级华文 P4** (高级华文 is already at 704 by end-P3), **1000–1100 = 华文 P6**, **1400–1500 = 高级华文 P6**.
  - Where 基础华文 (P5–6) falls among these bands cannot be recovered from the text.
  - One search-engine summary garbled 1800–1900 as a "高级华文 P2" target. That reading is inconsistent with the textbook counts and should be ignored.
- **For this child at end-P2 (Nov 2026):** the targets are to recognise about 750 characters, write about 350 (华文), and type pinyin input at word and sentence level.
- **Grade start points of the other skill targets** (for example, when 能听出隐含信息 or 能就话题进行简单分析 begins) are not recoverable. The order within each list goes from easy to hard, so the later bullets are probably P5–6 targets. This is inferred.

### Gaps
- The shaded year columns for every skill bullet. I need the original PDF, a non-text render, or the CPDD teacher guide.
- An official per-term character list URL for 《欢乐伙伴2.0》 (my counts come from a local parse of unknown provenance). P4–P6 lists are not yet available or not parsed (the cohort is at P3 in 2026).
- The 2024 语言能力描述 (proficiency descriptors) themselves are not public in what I found.

## Q2. School assessment P1–P4 and what changed under the 2024 syllabus

### Takeaway
- **P1–P2:** no weighted assessments or exams, only bite-sized non-weighted checks with qualitative reporting. **P3–P4:** weighted assessments (WAs) plus an end-of-year exam, with no mid-year exam at any level since 2023.
- Common school-level CL components are 听写 (dictation), oral (朗读 + 看图说话 and/or conversation), 语文应用, 阅读理解 and 看图写话/作文, but each school sets its own formats and weightings.
- I found **no official source saying the 2024 syllabus changed school oral formats** (for example, moving video conversation down to P1–P4). Video-stimulus e-oral has been the PSLE format since 2017.

### Cited Findings
- From 2019, all weighted assessments and exams for P1 and P2 were removed, including the P2 year-end exam. Schools report learning with qualitative descriptors — [MOE "Learn for Life" press release, 28 Sep 2018](https://www.moe.gov.sg/news/press-releases/20180928-learn-for-life-preparing-our-students-to-excel-beyond-exam-results)
- Mid-year exams were removed for all primary and secondary levels by 2023 (announced in Parliament on 7 Mar 2022) — [MOE forum reply, 17 Mar 2022](https://www.moe.gov.sg/news/forum-letter-replies/20220317-removal-of-mid-year-exams-will-help-nurture-joy-for-learning); [Mothership](https://mothership.sg/2022/03/no-mid-year-exam/)
- School booklets (search snippets): P2 uses non-weighted assessments (classwork, homework, bite-sized tests). One P2 CL oral snippet described **reading aloud (5 sentences of 4 words each)**, picture description and oral conversation — [ACS(J) P2 Assessment Handbook 2026](https://www.acsj.moe.edu.sg/files/Primary_2__2026_Assessment_Handbook.pdf); [St Gabriel's 2024 P2 non-weighted plan](https://www.stgabrielspri.moe.edu.sg/files/2024p2.pdf); [Bedok Green 2026 booklet](https://www.bedokgreenpri.moe.edu.sg/files/2026_Assessment_Information_Booklet.pdf). I saw these only as snippets: I could not open the documents, and I could not tell which school the "5 sentences × 4 words" detail belongs to.
- P3 and P4 oral workshop slides from Woodlands Ring Primary (2023, 2015-syllabus era) describe a school oral of 朗读, 看图说话 and 会话. A tutor site summary claims the P3 oral is 20 marks/20% (10 for reading aloud, 10 for picture talk). That is unverified and school-specific — [Woodlands Ring Pri P3/P4 oral workshop 2023](https://www.woodlandsringpri.moe.edu.sg/files/p3%20and%20p4%20chinese%20language%20oral%20workshop%202023.pdf) (snippet only)
- The 2024 syllabus assessment guidance emphasises:
  - formative assessment woven into daily teaching, with summative assessment built on it;
  - avoiding excessive tests;
  - assessing two or more skills together and including higher-order thinking;
  - authentic tasks using ICT platforms for oral and written feedback;
  - self, peer and teacher co-assessment, portfolios and checklists.
  — [2024 syllabus, Ch.5 §5](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- PSLE oral has been an e-Examination with a video stimulus since 2017. About 85% of students reportedly found the video stimulus more engaging. MOE's rationale was that video better shows real-life situations — [SEAB PSLE formats 2026 page](https://www.seab.gov.sg/psle/psle-formats-examined-in-2026/); [KiasuParents](https://www.kiasuparents.com/kiasu/article/preparing-your-child-for-the-new-psle-chinese-oral-format) (secondary)

### Inferences
- In 2026 the child (P2) should have no graded exam. Expect frequent 听写, short reading-aloud checks, picture-talk and conversation practice, and short written tasks (sentence and picture writing, 看图写话), all non-weighted.
- P3 (2027) brings the first weighted assessments and an end-of-year exam.
- Many schools probably already practise video-based conversation in P3–P4 to mirror the PSLE. That is my inference; I could not verify it from any booklet.

### Gaps
- The full text of any 2026 P2–P4 school assessment booklet (moe.edu.sg PDFs could not be opened by my tools). The parent should get their own school's booklet, which is the authoritative source for formats and weights.
- Any MOE statement on 2024-syllabus-specific changes to school-based CL assessment (for example, e-oral or 视频会话 at P1–P4). I found none.

## Q3. Current PSLE Chinese format and announced changes

### Takeaway
The SEAB syllabuses for the 2026 PSLE are still marked "For Examination from 2017". Their formats are in the tables below, read straight from the SEAB PDFs.
- **华文 (0005):** Paper 1 Writing 40 marks (20%), Paper 2 Language Use & Comprehension 90 marks (45%), Paper 3 Oral 50 marks (25%) plus Listening 20 marks (10%).
- **高级华文 (0015):** Writing 40 marks plus Language Use & Comprehension 60 marks, with no oral or listening.
- **基础华文 (0025):** oral-heavy, 55%.
- I found **no SEAB announcement of a new format** for the 2024-syllabus cohort (PSLE 2029 for the first cohort, 2030 for this child).

### Cited Findings
**PSLE 华文 (0005)**, "For Examination from 2017" — [SEAB 0005 y26 syllabus](https://isomer-user-content.by.gov.sg/334/60adffb8-be52-41da-b09e-cdcc9130ffc7/0005_y26_sy.pdf)

| Paper | Duration | Marks / weight | Content |
|---|---|---|---|
| Paper 1 写作 | 50 min | 40 / 20% | Choose 1 of 2: 命题作文 (topic) or 看图作文 (picture), at least 100 characters. An SEAB-approved dictionary (print or electronic) is allowed |
| Paper 2 语文应用与阅读理解 | 1 h 40 min | 90 / 45% | 40 questions in total, broken down below |
| Paper 3 口试 (oral) | about 10 min | 50 / 25% | 朗读篇章 20 marks (10%) + 会话 30 marks (15%). The examiner holds a conversation based on a recorded video clip. The candidate first has 10 min to read the passage silently and watch the video, and may repeat both within that time |
| Paper 3 听力理解 (listening) | about 30 min | 20 / 10% | 10 MCQ. Text types: dialogues, notices, ads, instructions, introductions, stories |

Paper 2 breakdown:

| Section | Questions | Marks / weight | Format |
|---|---|---|---|
| 一 语文应用 | 15 | 30 / 15% | MCQ: pinyin, characters, words, phrases, sentences |
| 一 短文填空 | 5 | 10 / 5% | MCQ cloze |
| 二 阅读理解一 | 5 | 10 / 5% | MCQ |
| 三 完成对话 | 4 | 8 / 4% | MCQ |
| 四 阅读理解二 | 11 | 32 / 16% | Open-ended, on a functional text (实用文) and a passage; includes 书面互动 (written interaction) |

**PSLE 高级华文 (0015)**, "For Examination from 2017" — [SEAB 0015 y26 syllabus](https://isomer-user-content.by.gov.sg/334/fab96888-7d2b-4203-8424-d82aad41d039/0015_y26_sy.pdf)

| Paper | Duration | Marks / weight | Content |
|---|---|---|---|
| Paper 1 写作 | 50 min | 40 / 40% | Choose 1 of 2: 命题作文 or 完成文章 (complete the story), a narrative of **more than 200 characters** |
| Paper 2 语文应用与阅读理解 | 1 h 20 min | 60 / 60% | 23 questions in total, broken down below |

Paper 2 breakdown:

| Section | Questions | Marks / weight | Format |
|---|---|---|---|
| 一 综合填空 | 5 | 10 / 10% | MCQ |
| 一 字词改正 | 5 | 10 / 10% | Correct wrongly written characters and misused words |
| 二 阅读理解一 | 6 | 16 / 16% | Open-ended: extract key points, identify the theme |
| 三 阅读理解二 | 7 | 24 / 24% | Open-ended: summarise and generalise |

There is no oral or listening paper.

**PSLE 基础华文 (0025)** — [SEAB 0025 y26 syllabus](https://isomer-user-content.by.gov.sg/334/3b39adaa-5c92-4032-9796-8fefe30ecbae/0025_y26_sy.pdf)

| Paper | Duration | Marks / weight | Content |
|---|---|---|---|
| Paper 1 语文应用与阅读理解 | 40 min | 15 / 15% | 5 MCQ language use (5 marks) + 5 comprehension (10 marks) |
| Paper 2 口试 (oral) | about 10 min | 55 / 55% | 朗读 15 + video 会话 40 |
| Paper 3 听力 (listening) | about 30 min | 30 / 30% | 15 questions |

**Other findings**
- SEAB's 2026 formats page lists codes 0005, 0015 and 0025 and says that from 2017 the oral for standard and foundation MTL is an e-Examination. It notes no future format change — [SEAB PSLE formats examined in 2026](https://www.seab.gov.sg/psle/psle-formats-examined-in-2026/)
- **Conflicting secondary sources (unreliable):**
  - [sgschoolkaki](https://sgschoolkaki.com/learning/study-guides/psle-chinese-study-guide/exam-overview) gives a 4-paper, 160-mark format with 看图说话 in the oral. That is outdated or wrong.
  - [seashell.com.sg](https://www.seashell.com.sg/post/2026-%E6%96%B0%E5%8A%A0%E5%9D%A1%E5%B0%8F%E5%85%AD%E4%BC%9A%E8%80%83%E5%8D%8E%E6%96%87%E5%8F%A3%E8%AF%95%E5%85%A8%E6%94%BB%E7%95%A5%EF%BC%9A%E8%80%83%E8%AF%95%E5%86%85%E5%AE%B9%E3%80%81%E5%8E%86%E5%B9%B4%E9%A2%98%E7%9B%AE%E5%88%86%E6%9E%90%E4%B8%8E%E9%AB%98%E5%88%86%E6%8A%80%E5%B7%A7) says the oral is 20%.
  - [Le-Xue Education](https://lexueeducation.com/our_resources/lexue-psle-chinese-learning-2026/) claims a "refreshed 2026 PSLE Chinese structure" focused on functional reading.
  - All three conflict with the SEAB y26 syllabuses above, which should take precedence.
- Tutor sources note that since about 2023 conversation questions are often phrased as 你同意吗？ ("do you agree?") to defeat memorised answers. This is unverified commentary — [psleprep.sg](https://psleprep.sg/blog/psle-chinese-oral-exam-format-101)

### Inferences
- The 2024 syllabus states that the PSLE paper should be pegged to the core-module level. The first 2024-syllabus cohort sits the PSLE in 2029, so SEAB would likely publish a revised or confirmed format around 2027–2028. Until then the 2017 format is the best planning baseline for a 2030 PSLE. This is inferred, not announced.
- The 2024 syllabus adds more on digital and authentic literacy (pinyin input with words, video, online posts, ICT). If the PSLE changes, those areas are the likeliest to be affected. This is speculative.

### Gaps
- Any official SEAB or MOE statement on the PSLE CL, HCL or FCL format for the 2029/2030 cohorts. I found none as of Oct 2026.
- The detailed oral rubrics and AL band descriptors were not retrieved.

## Q4. 高级华文 differences and streaming timeline

### Takeaway
- **P1–P2:** 高级华文 runs only at selected schools. **P3–P4:** it is offered more widely (schools decide). The **key decision point is end-P4 subject-based banding (SBB)**, which recommends 基础华文, 华文 or 高级华文 for P5 based on P4 results, with a review at end-P5.
- 高级华文 gets about 1 extra hour a week, a higher writing target, an earlier start on some skills, and a PSLE without oral or listening.

### Cited Findings
- 高级华文 for P1 and P2 is offered only at selected schools. Both 华文 and 高级华文 exist in P1–P4, and 基础华文 is added only at P5–6 — [2024 syllabus, Ch.3 §1 note #](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- Differences in the syllabus:
  - more weekly hours (7 vs 6 in P1–2, 5.5 vs 4.5 in P3, 5 vs 4 in P4, 5.5 vs 4.5 in P5–6);
  - no 导入/强化 support modules;
  - richer and more complex text language on the same themes;
  - some targets start earlier (for example, self and peer review of writing at P4 instead of P5);
  - P5–6 focus on reading, writing and written interaction rather than oral interaction.
  — [2024 syllabus, Ch.3–4](https://www.moe.gov.sg/-/media/files/primary/cl-syllabus-pri-2024.pdf)
- SBB: at end-P4 the school recommends a subject combination based on year-end results. At end-P5 it reviews and adjusts if needed. Higher MTL "may also be offered if your child passes 4 subjects and does very well for Mother Tongue Language" — [MOE Subject-based banding page](https://www.moe.gov.sg/primary/curriculum/subject-based-banding)
- One school's P4 SBB briefing (search snippet, criteria vary by school) recommended HMTL at P5 for Band 1 in MTL plus Band 1 in EL and Maths and at least Band 2 in Science. The same briefing recommended Foundation subjects for students scoring below 23 marks in a subject and weak in 2 or more subjects — [Punggol Cove Pri P4 SBB 2026](https://www.punggolcovepri.moe.edu.sg/files/2026%20Curriculum%20Briefing/P4_Subject_Based_Banding_Briefing.pdf) / [Sengkang Pri SBB 2024](https://www.sengkangpri.moe.edu.sg/files/P4_SBB_Briefing_2024.pdf) (I could not tell which of these the snippet came from)
- Another snippet says schools commonly offer HCL to students with good CL grades who are roughly in the top 25% of their cohort. This is a secondary source — [iedusg](https://www.iedusg.com/psle/25519.html)

### Inferences
- For this child, the relevant milestone is the end-P4 results in Nov 2028, which drive P5 (2029) banding. HCL in P3–P4 depends on whether the school offers it at those levels and on its own criteria. The child is currently below level in Chinese (per project memory), so the practical target is to secure standard 华文 and avoid a Foundation recommendation.
- At PSLE, HCL is taken in addition to CL. It has no oral component, so HCL's oral and interaction emphasis in school is lower.

### Gaps
- MOE does not publish national HCL criteria; they are school-determined. I also found no official statement on P3–P4 HCL availability beyond "P1–2 at selected schools".
