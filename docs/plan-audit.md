# A description is not a complete plan

The [plan workshop](https://antonsoo.github.io/embater/plans.html#type=dipteral&clear=2&flank=17)
now distinguishes what Vitruvius states, what follows arithmetically within the model,
and what the drawing supplies. The audit corrected two pieces of geometry and removed
an overclaim in the legend: a black outline did not mean that every coordinate had
been prescribed by the text.

## Try the actual work

1. Select **Prostyle**, then **Amphiprostyle**. Four rear columns appear. The cella
   allocation remains 12.5 diameters, with an 8 by 10.5 clear floor in the default
   model. The plan does not take a second porch out of that room.
2. Select **Dipteral**, then change the long side from **15** to **17** columns.
   The inner ring changes from **34** to **38**. Read the distinction between the
   prescribed eight-column front and the chosen long side.
3. Read Krohn's printed page **66**. The main text has `xxxiv`; the apparatus at
   line 4 attributes it to Philander and reports `xxxviii` in the manuscripts.
   Enlarge the complete page and pan with the keyboard. Both numbers can agree
   with a drawing if its underlying rectangle changes. This is not a proof that
   either number is what Vitruvius wrote.
4. Select **Hypaethral**. Find the two door openings and the open central space.
   Read the end of III.2.8 across pages **63–64**: the entrances are explicit;
   the interior column count, room sizes and aperture sizes in our drawing are not.
5. Change the clear spacing to **1.5**, **2** or **3** lower diameters. Column
   arrangement and spacing are separate decisions. Read the live claim table,
   including the assumptions needed to turn each passage into coordinates.
6. **Save illustrated reading** captures this selection with its diagram, Latin,
   English, complete cited pages, fonts and licenses. Open the downloaded HTML
   offline. **Save diagram (SVG)** provides an independently styled drawing.
   **Copy plan link** restores the choices, including in an already-open tab and
   through browser Back. Experimenting itself does not rewrite the URL.

## Reproduced geometry defects

### The missing cella

The previous generator used a body 10 diameters wide and 20 long, a 7.5-diameter
front porch, and a 12.5-diameter cella allocation. In the amphiprostyle it inserted
another 7.5-diameter porch inside the same body. The clear cella became **8 × 3**,
while the prostyle's was **8 × 10.5**. The floor was nevertheless marked as text-derived.
The [baseline geometry](review/plan-audit/before-geometry.json) and both browser
captures retain this behavior.

III.2.4 adds rear columns and a pediment to the prostyle description. It does not
prescribe that extra partition or shrinking the cella. IV.4.1 supplies a 2:1 body,
a cella a quarter longer than the width, and the remaining three quarters for the
front porch. The corrected drawing adds rear columns and extends their platform,
keeping the body and rooms unchanged. This is one illustrative combination of
III.2 and IV.4, not a unique reconstruction of every amphiprostyle temple. The
cella allocation is treated as including both end walls; subtracting their chosen
thicknesses gives the displayed clear floor. A plan view does not depict the pediment.

### The closed rear entrance

III.2.8 continues on printed page 64: `valvarum ex utraque parte in pronao et postico`.
The hypaethral plan previously had a continuous rear wall. It now has openings at
both ends. Their widths remain drawing choices. The internal colonnade's second
storey is described in the text but cannot be represented by this ground plan.

## What the seven descriptions determine

| Plan | Prescribed arrangement in III.2 | Additional model choices |
|---|---|---|
| In antis | Two columns between antae | Body proportions combined with IV.4; uniform walls and door width |
| Prostyle | Two corner columns added opposite the antae | Four-column row and IV.4 body combined in this illustration |
| Amphiprostyle | Prostyle features, with rear columns and pediment | Same cella preserved; no invented internal rear porch |
| Peripteral | Six front and back, eleven on each side | Room partitions and platform margins |
| Pseudodipteral | Eight front and back, fifteen on each side; walls opposite the middle four | End setbacks, internal porch partitions and columns |
| Dipteral | Eight at each end, double exterior colonnade | 13, 15 or 17 on a flank; concentric rectangular grid |
| Hypaethral | Ten at each end, double exterior colonnade, two-storey interior colonnade, open middle, entrances at both ends | 17, 19 or 21 on a flank; interior counts and dimensions |

All use a selectable uniform clear gap. III.3.2–4 describes pycnostyle (1.5 D),
systyle (2 D) and diastyle (3 D) separately from the plan names. Selecting one here
does not establish that an ancient building used it. No dimensions in Roman feet,
loads, structural feasibility, historical roof form or named building are inferred.

For a rectangular perimeter with front count F and flank count L, there are
`2F + 2L - 4` columns: corners are counted once. The selected inner ring removes
one axis interval on every side, giving `(F - 2)` by `(L - 2)`. For F = 8:

| Chosen outer rectangle | Chosen inner rectangle | Inner columns |
|---|---|---:|
| 8 × 13 | 6 × 11 | 30 |
| 8 × 15 | 6 × 13 | 34 |
| 8 × 17 | 6 × 15 | 38 |

The initial 15 and 19 flank counts extend III.4.3's double-intercolumniation rule.
That passage specifically says *in peripteris*. They are therefore labeled choices
for the dipteral and hypaethral models. The seven plan names alone do not fix the
complete geometry. Agreement between a chosen plan and an editorial reading cannot
independently authenticate that reading.

## Printed source audit

All seven retained images were opened and read against their visible printed page
numbers. The Internet Archive metadata uses leaf numbers one greater than the image
endpoint indices; metadata alone was not treated as sufficient identification.

| Printed page | Image endpoint index | Relevant passage |
|---|---:|---|
| 62 | 79 | III.2.1–3, names, in antis, start of prostyle |
| 63 | 80 | III.2.3–8, prostyle through hypaethral |
| 64 | 81 | End of III.2.8; III.3.1–4, spacing |
| 66 | 83 | III.3.8, Hermogenes and the editorial 34 |
| 69 | 86 | III.4.3, doubling the intercolumniations |
| 85 | 102 | Start of IV.4.1, cella proportions |
| 86 | 103 | Continuation of IV.4.1, porch and antae |

The [manifest](../public/sources/krohn-1912/manifest.json) records original image
URLs, byte sizes and SHA-256 values. The plan reader and export verify those actual
bytes. The citations now give the spanning pages for prostyle, hypaethral access
and the cella passage. The added Latin completes the hypaethral entrance sentence;
English remains a new teaching translation, without independent philological review.
The public-domain scans retain the full page and critical apparatus, not a crop that
would conceal the variant readings.

## Portable reading and failure behavior

The downloaded HTML includes the selected geometry, the full claim table and all
its cited passages, complete cited source images, four EB Garamond subsets and the
MIT/OFL notices. It has no scripts or remote asset dependencies; external citation
links need a connection. The SVG has its own style, title and explanatory description.

Saving takes a selection snapshot before fetching assets. Changing the plan while
those requests finish cannot change the saved reading. Cancellation produces no
file. A mismatched source refuses the entire illustrated export. A late response
for a previously selected printed page cannot replace a newer selection. Fit mode
shows the entire page; enlarged mode permits horizontal and vertical keyboard pan.

## Verification

The focused geometry checks preserve the cella under all three spacings, verify the
34/38 distinction, ensure both rear-wall segments leave the central doorway clear,
and check positive, bounded geometry and complete cited-page coverage across every
offered combination. These join the existing order, vocabulary and evidence checks.

`npm run test:plans` operates the built application in Chromium and Firefox, at
1440 and 375 pixels in both light and dark themes. Each context changes all seven
plans through all three spacings, tries each alternative flank count, operates the
part vocabulary by keyboard, opens the shared state, uses Back, reads and hashes
all seven source images, enlarges and pans a page, and checks accessibility/overflow.
It uses the actual native HTML and SVG downloads, checks embedded image/font/license
bytes, reopens the reading without JavaScript or network requests, and exports the
same HTML after an offline reload. Both engines also exercise delayed/corrupt sources,
frozen export selection and cancellation. A tagged A4 PDF is retained for print review.

Local review passed in all eight contexts, with 27 model operations per context
and both fault reviews. The existing count comparison, all five offline routes,
and the 503/404/stalled-body/eviction/corrupt-install checks also passed in both
engines. The eight-page A4 reading has tags and no JavaScript; its text and second
page were inspected. A stale static dipteral caption found in that print review
was corrected before the final local replay.

- [Local plan and download evidence](review/plan-audit/local/review.json)
- [Existing count workshop and offline navigation](review/plan-audit/existing/browser.json)
- [Offline failure cases](review/plan-audit/offline.json)
- [Actual illustrated reading, gzip-compressed](review/plan-audit/local/dipteral-17-reading.html.gz)
- [Actual standalone SVG](review/plan-audit/local/dipteral-17.svg)
- [Printed reading](review/plan-audit/local/dipteral-17-reading.pdf)

Generated review artifacts are excluded from source formatting so their downloaded
bytes remain intact. Browser assertions inspect their actual accessible titles,
embedded assets and standalone behavior.

Publication evidence is recorded separately below when the reviewed build is served.
