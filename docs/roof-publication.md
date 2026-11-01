# Published roof reading and audited order geometry

The [roof workshop](https://antonsoo.github.io/embater/#order=doric&columns=6&view=roof&trial=0.5)
is published. This record separates the source, reviewed build, canonical static
files and actual browser operation. The [audit](roof-audit.md) describes the
learning question, reproduced defects, source evidence and modern conventions.

| Boundary | Observed result on 2026-11-01 |
|---|---|
| Source | `934432fb2da774e69f398ab000142a48387b3a98` matched `origin/main`, with a clean worktree at the check. |
| Clean build | Fresh archive/install of runtime revision `5b89066d9fe4480ccf469181376f7743e9e4b850`; lint, typecheck, 69 tests and production build passed. Biome reported 12 existing warnings and three informational notes in other review scripts. |
| Build identity | All 90 working/reviewed files matched the clean build. Manifest SHA-256 `b4e59b20c564c9727868bca3fac92176e299570a9eb5f54cecec6945815afd67`. Later source changes up to `934432f` only retained documentation and native examples. |
| Pages | Fast-forward commit `f30ed2b1696d1008f4d155f959aba80bd4c8892f` on `gh-pages`, containing the reviewed `dist/` and `.nojekyll`. Pages reported this commit built. |
| Canonical bytes | All 90 files, the root entry and explicit index matched the captured clean-build inventory. No cache-busting URL was used. |
| Browser operation | Chromium 153.0.8010.12 and Firefox 155.0, each at 1440 and 375 pixels; source checks, controls, native files, current-edition takeover and offline reload completed. |
| Source CI | The observed `check` job in run `41352344217` failed with `steps: []`; no source CI success is claimed. Pages availability is verified separately. |

The native source-backed files also passed an independent parser: source image,
font and license bytes, exact settings/reopening link, unrounded measurements,
actual ornament vertices, corner shaft/base widths, and the emitted Ionic groove's
quarter-radius stations. Public and local portable-reading hashes matched.
Native SVG and HTML openings check the blue envelope's computed stroke, which
had been wrong despite numerically correct coordinates in the earlier export.

The public portable-reading journey also deliberately substitutes a bad source,
cancels a held request, changes the drawing during saving and reaches the actual
45-second stalled-request deadline. No partial reading downloads; a later save
recovers. Those browser routes disable service-worker interception for controlled
fault injection. Ordinary controlled-offline routes wait for the complete current
edition and produce the same native reading as the online route.

After the browser runs, the canonical root, explicit index and service worker
were fetched again and still matched the reviewed build.

Evidence:

- [Clean build inventory](review/roof-audit/clean-build.json)
- [All canonical public files](review/roof-audit/public-files.json)
- [Public roof operation](review/roof-audit/public-roof-browser.json)
- [Public portable reading and failure recovery](review/roof-audit/public-readings-browser.json)
- [Independent public reading checks](review/roof-audit/public-readings-artifacts.json)
- [Independent public roof checks](review/roof-audit/public-roof-artifacts.json)
- [Immutable raw source and native example identity](review/roof-audit/public-source.json)
- [Canonical entries after browser work](review/roof-audit/public-entry-after-browsers.json)

The raw source comparison used immutable GitHub URLs, including the audit,
SVG, CSV, compressed native HTML and font manifest. Documentation follow-ups do
not imply a different hosted runtime. This is a static web publication; no tag
or registry release is claimed. Palmettes and assembly conventions remain
modern, the English has not had independent philological review, and initial
full-edition installation still transfers the retained source collection.

## Later source clarification

The [published scroll clarification](ionic-scroll-boundary.md#published-clarification)
supersedes the earlier wording that called all eight quarter stations
“prescribed.” The actual drawing continues a half-eye decrement around one
fixed centre; that full layout is a modern choice. The follow-up retains its own
fresh build, all 90 canonical hosted files, live browser and native-artifact
receipts. The earlier receipts above remain observations of their named edition.
