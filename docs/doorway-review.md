# A half changes the doorway

This room is implemented and reviewed locally. It has not been pushed or
deployed. The [read-only public observation](doorway-review/before.json)
records the existing root response and the absent doorway route before this
work. A local build and browser run do not establish hosted publication.

## Try the actual work

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4412/embater/`, then choose **Doorways**. The entry is
also `doorways.html`. Keep the 28-foot ceiling and Ionic doorway:

1. Compare the opening heights, 20 and 16 Roman feet. The supplied half changes
   both the aperture width and the contraction band.
2. Move the upper corners, then choose **Match this reading**. The solid blue
   trial and dashed red rule coincide. The uniformly enlarged corner exposes
   differences that are small in the whole elevation.
3. Select **Without it**, then Doric. The casing note identifies the borrowed
   Ionic rule across the Doric lacuna; it is not presented as recovered Latin.
4. Compare **At 25** and **Just above: 25.01**. The text’s step changes; the desk
   does not interpolate. At exactly 25 the lower band is a declared convention.
5. Select a word using the keyboard, read its contextual note and follow **Read
   the sentence**. Change the complete source page, enlarge it and pan it with
   arrow keys. The source viewer verifies bytes before displaying an image.
6. Save and reopen JSON. Keep measurements, a standalone SVG or an illustrated
   reading. Open the reading with scripts and networking disabled, then use its
   own native file downloads.

The explicit **Copy drawing link** action preserves the drawing and survey-comparison choices.
Operating the controls does not silently rewrite the current URL. A bad link or
file reports its problem; opening a file recomputes measurements. A late file
read cannot overwrite newer drawing choices. An in-progress illustrated save
captures the drawing when Save was pressed, can be cancelled and has a deadline.

## What is prescribed and what is chosen

Let C be pavement-to-coffered-ceiling height, H opening height, B lower opening
width, J lower jamb width and D the whole opening’s loss of width at its head.
All lengths are Roman feet, without an assumed metric conversion.

| Quantity | Reading or model | Basis |
| --- | --- | --- |
| H with the supplied half | 5C/7 | IV.6.1: 2½ of 3½ parts, p. 88 |
| H omitting only that half | 4C/7 | Omit Krohn’s second ⟨semis⟩; keep other editorial choices |
| B, Doric | 11H/24 | IV.6.1: 5½ of 12 parts, p. 88 |
| B, Ionic | 2H/5 | IV.6.3: one of 2½ parts, p. 89 |
| J, Ionic | H/14 | XIIII actually printed in IV.6.3 |
| J, Doric | H/14 | Explicitly borrow Ionic across Krohn’s Doric lacuna |
| J at its head | 13J/14 | Casing’s own contraction in IV.6.2 |
| D, H ≤ 16 | J/3 | IV.6.1; lower-band endpoint convention |
| D, 16 < H ≤ 25 | J/4 | Same passage and convention |
| D, 25 < H ≤ 30 | J/8 | Same passage and convention |
| D, H > 30 | 0 | Perpendicular opening sides; casing still narrows |
| Upper opening width | B − D | Treat the contraction as loss from the whole width |
| Each upper corner inset | D/2 | Symmetric allocation, stated model choice |
| Lintel height | 13J/14 | Upper jamb width, IV.6.2 |

The main drawings share a ceiling and uniform scale. Each ruler has seven
half-parts, not seven feet. The corner uses one scale on both axes. Its blue
trial can enter the stone: the casing continues to follow the computed rule.
The selected opening stays empty; the leaf construction later in IV.6 is not
silently invented. Mouldings, consoles, frieze, wall depth, optical perception
and structural performance are outside this model.

## Almost a double square

The same room has a second desk at `doorways.html#measured-doorway`. It compares
the North Door reported in *The Erechtheum* (1927), edited by James Morton Paton,
measured, drawn and restored by Gorham Phillips Stevens. This is a comparison
with that report's interpreted original opening, not a new measurement or a
claim about today's clear opening. Pages 98–99 explicitly omit later inner
linings; their original-opening interpretation remains attached to the numbers.

| Reported quantity | Metres | Source |
| --- | --- | --- |
| Opening height | 4.882 | Printed p. 99, PDF p. 129 |
| Lower opening width | 2.427 | Same paragraph |
| Inward movement of each jamb | 0.044 | Same paragraph; rounded reported value |
| Upper opening width | 2.339 | Derived: 2.427 − 2 × 0.044 |

Choose Ionic 2/5, Doric 11/24 or the exact double square 1/2. Match either the
reported height or lower width; inspect the difference left in the other
dimension. Only that single predicted dimension is red. No ancient casing,
upper profile, Roman-foot length, ceiling height or doorway date is inferred.
The contraction bands from the Roman-foot desk are not applied to these data.

| Comparison | Height matched: rule width minus report | Lower width matched: rule height minus report |
| --- | --- | --- |
| Ionic 2/5 | −474.2 mm | +1185.5 mm |
| Doric 11/24 | −189.4167 mm | +413.2727 mm |
| Exact double square 1/2 | +14 mm | −28 mm |

The report says “essentially a double square”. Its figures are retained rather
than rounded into exact agreement. Calculated decimals do not add measurement
precision. The metric CSV is separate from the Roman-foot CSV. Editable JSON
version 2 and drawing links retain both desks; version 1 files and earlier
four-choice links open with the survey desk's Ionic/height default. The
illustrated reading includes this comparison and all four source pages.

The original survey PDF is 70,645,621 bytes, SHA-256
`0746b45d82dd5e0a067c35207e96a5f08e785cc52ae05c39c42a2da0f642321d`.
Both complete pages were visually inspected and freshly reproduced with:

```sh
python3 scripts/measured-sources.py /path/to/erechtheummeasur1192unse.pdf
```

[Retained manifest](../public/sources/erechtheion/manifest.json) and
[reproduction receipt](doorway-review/measured-source-check.json). This 1927 US
publication is public domain in the United States. Its text, including the
omitted linings and the qualification “essentially”, remains available beside
the working comparison and in the offline reading.

## Primary pages and language

The primary artifact is F. Krohn, *Vitruvii De architectura libri decem*
(Leipzig: Teubner, 1912), [Internet Archive PDF](https://archive.org/download/vitruviidearchit00vitr_1/vitruviidearchit00vitr_1.pdf).
The downloaded original is 16,915,191 bytes, SHA-256
`b13a68789a8a1dc567b6f9b47eabe6a37a306329fbfc2c1a027a6c30a90d5139`.

| Printed page | PDF page | Retained use |
| --- | --- | --- |
| 88 | 106 | Doorway kinds, supplied half, lower width, contraction bands, Doric lacuna and casing taper |
| 89 | 107 | Ionic width and XIIII casing divisor; subsequent leaf construction stays outside the model |

Both complete pages, including their apparatus, were independently rendered
from the downloaded PDF and visually inspected. In particular, p. 88 credits
the supplied *semis* to Rode. This does not establish that every manuscript has
one uniform alternative reading. The comparison omits only that supplement.

The source reproduction command, run with Poppler 24.02.0, is:

```sh
python3 scripts/doorway-sources.py /path/to/vitruviidearchit00vitr_1.pdf
```

It verifies the original PDF identity and freshly rendered image bytes against
the retained pages. `--write` is an explicit regeneration mode. Rendering bytes
may change with Poppler/JPEG versions; inspect that difference rather than
silently replacing an image. [Source check](doorway-review/source-check.json)
and [retained manifest](../public/sources/doorways/manifest.json).

Six short Latin passages preserve supplied words in angle brackets and the
editor’s lacuna as stars. English is newly translated; it has not had a second
philological review. Seven contextual notes distinguish opening, casing,
lintel, ceiling, contraction, leaves and the Greek word *thyromaton*.
[Lexical check](doorway-review/lexical-check.json) records the consulted Lewis
and Short/LSJ senses through the University of Chicago’s Logeion. The accented
Greek dictionary headword is distinguished from Krohn’s Latin lettering.

## Fault found by the audit

The original doorway implementation remembered source failures in open pages
and sent them over a BroadcastChannel. A newly opened tab missed those events:
it could say Ready offline while a retained source in CacheStorage was damaged.
The [reproduced baseline](doorway-review/audit-before.json) records this in both
Chromium and Firefox. Counting cache keys did not establish that the bytes were
usable.

The worker now hashes every canonical cached file against the build inventory
before reporting readiness. **Repair offline copy** replaces missing or damaged
files with SRI-verified network bytes, then performs another full audit. A false
network replacement leaves readiness failed. The operation has a deadline,
coalesces across tabs and leaves the drawing usable. Status messages carry both
a worker-instance identity and a sequence, so a restarted worker can report a
new failure without having its lower sequence discarded.

The recovery review damages a source, font and license, opens a third tab with
BroadcastChannel unavailable, rejects wrong repair bytes, repairs all failures,
then reloads offline. Chromium additionally stops and restarts the worker using
its debugging protocol. Firefox covers the other recovery cases; no forced
worker-stop result is claimed for it.

## Verification boundary

With a production preview running:

```sh
npm run check
npm run test:doorways -- http://127.0.0.1:4412/embater/ docs/doorway-review/local
npm run test:doorway-recovery -- http://127.0.0.1:4412/embater/ docs/doorway-review/recovery.json
npm run verify:doorway-artifacts
```

The browser review covers Chromium and Firefox, 1440 and 375 px, light and dark:
Orders → keyboard navigation → operated doorway → source reader → real native
downloads. It checks every boundary preset, all six measured fits, seven language notes, shared links,
JSON reopening, a rejected file, source/font/license bytes inside actual HTML,
and native JSON, both CSV files and SVG extracted from that file without scripts or networking.
A fresh context saves the edition from Orders, opens the previously unvisited
doorway offline, exports its reading and opens all six rooms.

Recovery uses a controlled HTTP fixture serving the production build with
uncacheable network responses, so HTTP cache cannot conceal a missing worker
entry. It corrupts and evicts a source, rejects a wrong network replacement,
repairs it with SRI-verified bytes, and checks status propagation across three tabs.
Separate delayed requests check source races, cancellation and save snapshots.
The original offline regression also checks 503, 404, stalled navigation bodies,
cache eviction and a corrupt installation. The build’s byte inventory and the
actual local receipts are retained separately from this narrative.

The Python artifact audit uses exact `Fraction` values independently of the
TypeScript model, inspects actual browser CSV and native downloads, compares
every retained source/font byte, checks complete licenses, and checks PDF text
bounds. All four JPEGs extracted from the PDF also byte-match the retained scans.
The PDF is untagged; physical printing is not verified.

Recorded results:

| Check | Local result | Receipt |
| --- | --- | --- |
| Fresh Node 24.22.1 install and full check | Passed; 44 unit tests; 12 pre-existing lint warnings | [Clean build](doorway-review/clean-build.json) |
| Production identity | All 51 files match the reviewed build | [File inventory](doorway-review/clean-build.json) |
| Doorway journeys | Eight browser/width/theme combinations; 72 boundary operations; two cold offline openings | [Browser receipt](doorway-review/local/receipt.json), [fresh-install replay](doorway-review/clean-browser.json) |
| Source failure and recovery | Both engines; two tabs; rejected replacement, repair, eviction, races, cancellation, deadline and late-file protection | [Recovery](doorway-review/recovery.json) |
| Original plan room | Both engines, both widths/themes; 27 model operations per combination and export/source failure checks | [Plan regression](doorway-review/plans-regression.json) |
| Original offline failure cases | Both engines; 503, 404, stalled body, eviction and corrupt install | [Offline regression](doorway-review/offline-regression.json) |
| Actual retained reading | 16 PDF pages; four byte-identical PDF source images; four embedded HTML font subsets; four matching native files | [Artifact audit](doorway-review/artifacts.json) |

## Design and publication handoff

The [design note](doorway-design.md) records the architectural plate, two-pigment
trial/rule distinction and restrained extension of the existing identity.
The actual screenshot is [desktop](assets/doorways-desktop.png); a narrow
[drawing view](assets/doorways-phone.png) is retained too.

Build command: `npm run build`. Static output: `dist/`, with base `/embater/`.
All six HTML entries, source images, fonts and notices are included in the
integrity-indexed worker edition. Readiness audits saved bytes on page entry, return to a visible tab, controller
change and explicit source-check failure. New tabs do not depend on earlier
failure messages. **Reload source page** requests a repair;
the worker only replaces that cache entry after integrity verification.

No push, tag, deployment, remote CI success or hosted-byte equality is claimed.
Existing public Officina discovery remains on the previously published rooms;
it should gain this doorway route only when the room and its review are public.

Suggested repository description: “Draw ancient temple proportions from Latin,
compare uncertain readings, and keep source-backed architectural experiments.”
Topics: `vitruvius`, `ancient-architecture`, `latin`, `ancient-greek`, `geometry`,
`interactive-learning`, `offline`, `svg`.
