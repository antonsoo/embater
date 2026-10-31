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

The explicit **Copy drawing link** action preserves all four drawing choices.
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
downloads. It checks every boundary preset, seven language notes, shared links,
JSON reopening, a rejected file, source/font/license bytes inside actual HTML,
and native JSON/CSV/SVG extracted from that file without scripts or networking.
A fresh context saves the edition from Orders, opens the previously unvisited
doorway offline, exports its reading and opens all six rooms.

Recovery uses a controlled HTTP fixture serving the production build with
uncacheable network responses, so HTTP cache cannot conceal a missing worker
entry. It corrupts and evicts a source, rejects a wrong network replacement,
repairs it with SRI-verified bytes, and checks status propagation across two tabs.
Separate delayed requests check source races, cancellation and save snapshots.
The original offline regression also checks 503, 404, stalled navigation bodies,
cache eviction and a corrupt installation. The build’s byte inventory and the
actual local receipts are retained separately from this narrative.

The Python artifact audit uses exact `Fraction` values independently of the
TypeScript model, inspects actual browser CSV and native downloads, compares
every retained source/font byte, checks complete licenses, and checks PDF text
bounds. The PDF is untagged; physical printing is not verified.

## Design and publication handoff

The [design note](doorway-design.md) records the architectural plate, two-pigment
trial/rule distinction and restrained extension of the existing identity.
The actual screenshot is [desktop](assets/doorways-desktop.png); a narrow
[drawing view](assets/doorways-phone.png) is retained too.

Build command: `npm run build`. Static output: `dist/`, with base `/embater/`.
All six HTML entries, source images, fonts and notices are included in the
integrity-indexed worker edition. Source-failure signals invalidate stale ready
messages across already open tabs. **Reload source page** requests a repair;
the worker only replaces that cache entry after integrity verification.

No push, tag, deployment, remote CI success or hosted-byte equality is claimed.
Existing public Officina discovery remains on the previously published rooms;
it should gain this doorway route only when the room and its review are public.

Suggested repository description: “Draw ancient temple proportions from Latin,
compare uncertain readings, and keep source-backed architectural experiments.”
Topics: `vitruvius`, `ancient-architecture`, `latin`, `ancient-greek`, `geometry`,
`interactive-learning`, `offline`, `svg`.
