# Twice as long, measured where?

Reviewed 3 November 2026. Implementation: `af37cc2`.

This local source extension makes a second part of the existing count passage
operable. A doubled number of spaces determines a length ratio only after
spacing and measuring endpoints have been chosen. The new bench keeps those
choices visible rather than turning an illustrative count diagram into a survey.

## Source and boundary

The Latin remains the existing transcription and new English of Vitruvius III.4.3.
The complete retained [Krohn 1912 printed page 69](../public/sources/krohn-1912/p69.jpg)
was inspected visually in this review. It contains the doubled-space instruction,
the doubled-length sentence, and the criticism of doubled column counts. The
relevant text runs from *sed ita* in line 3 through *videtur* in line 9.
The [Internet Archive image](https://archive.org/download/vitruviidearchit00vitr_1/page/n86_w1800.jpg)
is identified by SHA-256
`783d80afa3c7401f826a74f484832d5f7e5d79255b19ae3e74b3bf35fa3878b4`.
[Morgan's translation](https://lexundria.com/vitr/3.4/mg) was also consulted;
it does not replace the Krohn transcription or independently review the app's English.

The measuring experiment is modern. It supplies uniform circular shaft sections,
constant pitch within each direction, and a uniform platform margin beyond shaft
faces. It has no bases, corner contraction, walls, steps or surveyed dimensions.
“Outside shaft faces” is the envelope of those circles, not an assertion about
the extent of a complete ancient order. The grey platform is expressly chosen.
This room does not establish Vitruvius's intended measuring endpoints or accuse
him of a numerical error. The text's claim and the drawing assumptions remain
different kinds of evidence.

The selected catalogue record can contribute its count, never its dimensions.
Uncertain restorations keep their label in the trial premise and saved reading.
Changing between the two count readings changes the trial only when it is using
the reading's count. Neither a count match nor a convenient trial proves influence.

## What the learner can do

With the default 3 D axial pitches and a 1 D margin beyond shaft faces:

| Ruler | Width / D | Length / D | Length / width |
| --- | ---: | ---: | ---: |
| Centres | 15 | 30 | 2 |
| Outside shaft faces | 16 | 31 | 1.9375 |
| Trial platform edges | 18 | 33 | 1.833333… |

Halving just the flank pitch retains all 30 physical columns in the 6 × 11
ring; both centre spans become 15 D. The ratio changes because the pitch
assumption changes. Front and flank sliders work by keyboard, with a lock for
equal pitches. Margin and measuring endpoints are independent. The SVG coordinate
scale stays fixed as pitches change; tall trials scroll in their frame.
On a phone, the plan can be enlarged and panned without expanding the page.

The shared query preserves building, count reading, uncertainty inclusion, count
basis, ruler, pitches, margin and lock. Malformed choices fall back to admitted
settings. “Restore opened trial” restores the initial trial controls, not a
subsequently changed building selection. A refused clipboard write gives a
focused, selected text field containing the exact link.

The illustrated reading captures settings before asynchronous asset reads. It
verifies the source, four font subsets and license bytes before offering a
file. The standalone HTML has no scripts or automatic remote resources. It
embeds the full source page and real CSV/SVG downloads. The saved study reopens
from `file:` in both engines, and the same state can be saved again offline.
Cancel, failure and the 120-second save deadline produce no partial reading.

## Reproduce

Node 26.7.0 was used on this WSL2 host. The package requires Node 24 or later;
this review did not repeat the run on Node 24.

```sh
npm ci
npm run check
npm run preview -- --port 4426
```

In another terminal:

```sh
npm run test:count-measure -- http://127.0.0.1:4426/embater/ /tmp/embater-measure-review
npm run verify:count-artifacts -- /tmp/embater-measure-review
npm run test:count-failures -- http://127.0.0.1:4426/embater/ /tmp/embater-count-failures
node scripts/compare-browser.mjs http://127.0.0.1:4426/embater/ /tmp/embater-count-regression
```

`npm ci` installed the locked dependencies. `npm run check` passed typechecking,
all 71 tests and the production build. Biome reported no errors; its existing
compare/offline review scripts retain 12 warnings and 3 informational suggestions.
The new TypeScript and browser scripts have no lint diagnostics.
`npm run data:build` regenerated the 31 flank rows and 14 slenderness rows
without a tracked data change.

The [new browser receipt](count-measure-review/browser.json) records Chromium and
Firefox, 1440 and 375 px, light and dark. All eight contexts operated endpoints,
pitches, the lock, count readings, record selection, uncertainty, exact reload,
enlargement and keyboard panning; inspected the actual source; downloaded the
three new files; reopened the saved HTML offline; and repeated source reading
and saving after offline reload. Each had no uncaught page errors or automated
WCAG A/AA violations. No horizontal page overflow was observed. This is not
manual screen-reader certification.

The [artifact receipt](count-measure-review/artifacts.json) comes from a separate
Python CSV/XML reader. It recovers dimensions from the actual SVG circle and
rectangle extents, checks them against all three CSV rows in each of eight
browser downloads, checks corner sharing, and verifies the embedded source and
four font hashes. The native CSV saved from the script-free reading equals the
live download. The online and offline HTML downloads of the same state are
byte-identical in each context.

The [failure receipt](count-measure-review/failures.json) records both engines
with service workers deliberately blocked to isolate the reading's asset fetch.
It holds a source response while the building and trial change, then verifies
the saved original snapshot. It also checks cancellation before the held response
returns, rejection of a corrupt source, successful retry, clipboard failure and
malformed links. No partial file is accepted.

The [existing comparison journey](count-measure-review/regression.json) also
passed its eight contexts: catalogue counts, uncertain records, original SVG/CSV
exports, reading downloads, accessibility and offline navigation across all six
pages. These are browser observations, not just unit checks.

## Retained result and limits

[Desktop screenshot](assets/count-measure-desktop.png) and
[phone screenshot](assets/count-measure-phone.png) show the default trial.
The engraving fits the existing room; the phone keeps a legible overview and an
explicit enlargement control. Actual browser-download examples are in
[examples/count-measure](../examples/count-measure/). The PDF was printed by
Chromium; the trial and full source page were inspected after rasterization.
Physical printing and assistive-technology operation remain unverified.

The [local build inventory](count-measure-review/build.json) identifies all 89
production files. Build command: `npm run build`; output: `dist/`. No dependency
was added. This work has not been pushed or published, and no hosted-byte or new
remote-CI claim is made. Existing public-audit documents describe earlier editions.

Suggested repository description: **Draw ancient architectural rules, change their assumptions, and measure what the sources actually determine.**

Suggested topics: `vitruvius`, `ancient-greek`, `latin`, `architecture`,
`interactive-learning`, `svg`, `offline-first`.

The subsequent [count and transfer audit](count-audit.md) records defects found in
this local edition, the paired reference workflow, and later publication evidence.
