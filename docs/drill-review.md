# Read a building through its names

This local revision improves the existing vocabulary drill. It adds no historical
word entries, proposed etymologies or reconstructed buildings. Its inputs remain
`src/content/terms.ts` and `src/content/world.ts`; their original qualifications
remain visible in the word cards.

## Reproduce the original learning failure

At parent revision `db1abef0c1885407e764aa4618431f9d2d2ab29d`, open
`drill.html#deck=egypt`. With the first random sample at zero and later samples
near one, the multiple-choice answers include **wꜣḏ wadj** twice. They represent
the closed and open papyrus columns. Selecting the second identical label can
produce **Not quite**. In Find it, the same word can identify only the internally
chosen shape, although the prompt supplies no distinction.

[The captured baseline](drill-review/before.json) records the duplicate choices,
the verdict, and the absence of language controls or keyboard targets in the
plate. [The original screenshot](assets/drill-before.png) shows the subsequent
Find it question, not the preceding duplicate-choice screen. The Greek abacus
entry on that Egyptian plate is deliberately present in its vocabulary; it is
not an ID collision or a newly detected historical error.

## Use the revised exercise

Run the README quickstart, then open:

```
http://127.0.0.1:4412/embater/drill.html#deck=doric&lang=la&mode=study
```

1. In **Study plate**, choose **flutes**. The blue geometry, Greek and Latin
   names, source notes, and Vitruvius IV.3.9 belong together. Open the Latin
   passage and compare `stria` with `striis`. This edition already supplied both;
   the drill now exposes the contextual passage as well as the word card.
2. Choose **Name it** in Latin. Every option comes from a Latin entry, including
   Latin-only parts omitted from Greek practice. Change to Greek and inspect the
   different vocabulary population. An absent translation is not invented.
3. Choose **Find it**. Tab to a numbered part button. Focus previews its geometry;
   arrow keys, Home and End move among buttons. Enter or Space answers. Focus
   and hovering alone do not grade. A wrong answer highlights the attempted
   shape in red and matching shapes in blue; buttons reveal their English names.
4. Choose **Reveal without grading** if you need the word notes first. Next word
   restores a keyboard path into the next question. A reveal does not change boxes.
5. On Egypt / Egyptian, **wꜣḏ** accepts either stored papyrus form and explains
   that the deck uses the same name for both. The name-choice list has one such
   option. The same grouping also handles the two Doric Latin `guttae` entries.
6. Expand **Keep your progress or share this exercise**. Download all boxes as
   JSON; restore that file after leaving and returning. Invalid, oversized or
   unrelated files leave current progress intact. The exercise link restores
   settings; it does not share answers or the local learning record.

## Decisions and boundaries

The selectable language population is derived from existing entries in each
visible deck. The first stored word in that language is the quiz label; additional
variants remain in the study card. Exact NFC-normalized displayed spelling, with
whitespace normalized, defines a shared-label group. This is a rule for asking a
fair question with the available clue, not a claim that the shapes or all senses
of the word are interchangeable. Words are not stripped of Greek accents.

The study plate offers named native controls and readable notes. Find it remains
a visual identification task; anonymous numbered controls are useful to sighted
keyboard users and are not presented as an equivalent nonvisual geometry lesson.
Small details are schematic. Romanized forms and conventional readings are the
existing aids, not recordings or established ancient pronunciation.

Progress keys distinguish deck, language, direction and displayed-name group.
Recognizing a label does not establish the ability to locate its shape. A correct
answer advances one box; a miss returns it to the first. Shared labels advance as
one question. These are selection weights, not a measured fluency score or a
calendar-based spaced-repetition schedule. Session right/asked counts restart
when the exercise settings change. The older `embater-drill-v1` record is retained
untouched: it contains too little information to attribute past answers to a
language or direction honestly. New progress uses `embater-drill-v2`.

Files are bounded to 64 KiB, carry a named schema/version, and accept only known
entry keys with integer boxes 1 through 5. Restoring deliberately replaces all
new-format boxes after validation. Storage denial falls back to this visit plus
a downloadable file. Concurrent imports accept the latest selection. There is
no remote account or synchronization between tabs or devices.

## Source check

The revised drill reuses the original word cards and Latin excerpts. As a direct
spot check, inspected the actual bundled complete image
`public/sources/krohn-1912/p85.jpg`: IV.3.9 prints *Columnas autem striari xx
striis oportet*. Its image includes the following construction and the apparatus.
The drill's source disclosure supplies that existing sentence, its English and
Krohn p.85. This is a checked example, not a new philological review of all world
vocabulary, whose differing source strength remains explicit in its notes.

## Verification

The browser reviewer operates the production site through native controls in
Chromium and Firefox, at 1440 and 375 px, in light and dark. It reads each stored
word/card through the study plate; exercises each deck-language pair in both
question directions; checks unique choices, shared-label acceptance, ungraded
focus and reveal; opens a real Latin rule; saves and reopens actual progress;
rejects a fractional-box file without replacing current answers; and reopens
an explicit exercise link. It checks layout and automated accessibility.

It then waits for the current controlling worker and complete-edition readiness,
inventories its cache, disables the browser origin's network, reloads, and studies,
answers and downloads again. This checks the new edition's existing offline
mechanism; it does not change or re-audit every worker failure/recovery behavior.
Separate cases deny storage, supply corrupt progress and preserve older records.
Browser expectations use the source entries; this is not an independent oracle
for their historical truth.

```
npm ci
npm run check
# In another terminal:
npm run preview -- --port 4492
npm run test:drill -- http://127.0.0.1:4492/embater/ /tmp/embater-drill-review
```

Production build: `npm run build`, output `dist/`. Verified source:
`024c1b0a4ed04bcf8fa1b221772ee8a77e2a460b`.

The [clean archive/build record](drill-review/build.json) identifies Node 26.7.0,
npm 12.0.1 and every output file. A fresh `git archive` checkout completed
`npm ci && npm run check`: 54 tests passed, zero type/lint errors. The lint command
still reports 12 existing warnings and three informational suggestions in older
review scripts. The [unmodified check transcript](drill-review/clean-check.txt)
retains them. All 55 build files, including the worker, match the workspace build
byte for byte. The [development quickstart receipt](drill-review/development.json)
records the working source-language card, source passage, no page errors and no
development worker registration.

[Final browser receipt](drill-review/browser.json) ·
[Browser transcript](drill-review/browser.txt).

| Browser | Width | Theme | Part-language readings | Deck-language exercises | Offline / files | Page errors / axe violations |
| --- | ---: | --- | ---: | ---: | --- | --- |
| Chromium | 1440 | light | 124 | 19 | passed / 54 | 0 / 0 |
| Chromium | 1440 | dark | 124 | 19 | passed / 54 | 0 / 0 |
| Chromium | 375 | light | 124 | 19 | passed / 54 | 0 / 0 |
| Chromium | 375 | dark | 124 | 19 | passed / 54 | 0 / 0 |
| Firefox | 1440 | light | 124 | 19 | passed / 54 | 0 / 0 |
| Firefox | 1440 | dark | 124 | 19 | passed / 54 | 0 / 0 |
| Firefox | 375 | light | 124 | 19 | passed / 54 | 0 / 0 |
| Firefox | 375 | dark | 124 | 19 | passed / 54 | 0 / 0 |

The worker cache contains the 54 canonical files other than `sw.js`; the
build inventory contains 55 files including that worker. Each exercise column
counts one deck/language pair operated in Study, Name it and Find it. The reading
count includes the same shape in different languages, not 124 different shapes.
Two combinations have a single distinct name and therefore display guidance
instead of a one-option naming quiz. Accessibility scans ran in all three modes;
this does not claim manual assistive-technology certification.

The final separate regression answered **lotus** when asked **wꜣḏ**: it recorded
a miss, colored the lotus red, colored both papyrus forms blue, kept the correct
group in box 1, and disabled further answers until Next word. Blocked storage,
corrupt progress and untouched v1 data each retained an operable exercise.

Reviewed screenshots: [desktop study plate](assets/drill-study-desktop.png),
[phone study plate](assets/drill-study-mobile.png),
[shared papyrus answer in dark mode](assets/drill-papyrus-dark.png),
[phone Find it in dark mode](assets/drill-find-mobile-dark.png).
The drawing remains the visual focus; phone questions precede it, then part
controls and word notes follow in a single column. Long source cards require
scrolling on phones. No runtime dependencies were added.

Suggested repository description: Draw ancient architecture from its sources
and learn its Greek, Latin and native vocabulary.
Topics: `ancient-greek`, `latin`, `vitruvius`, `architecture`, `vocabulary`,
`education`, `svg`.

## Publication boundary

The work is local. No remote push, Pages deployment or CI execution is claimed.
The existing canonical live site and older publication receipts describe the
previous edition. Do not interpret their public URLs as delivery evidence for
this vocabulary revision.
