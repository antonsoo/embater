# Read the page before saving the book

Application source `81fbec4c4652ded518f109f8eac4b262af6e5ab4` follows the
[vocabulary/source audit](vocabulary-audit.md) and [progress-integrity review](progress-concurrency-review.md).
The reader now bounds background installation traffic, preserves an accurate
saving state, and keeps dictionary-style Latin glyphs in the portable study.

## A cold visit is a different journey

The warmed source and offline replays passed, but a final catalogue journey exposed
a cold Firefox source read that reached the application's 15-second deadline.
An earlier driver failure at five seconds had merely observed “Loading”; its
source-state wait was corrected to cover the actual deadline. The later run
reported the application's timeout, not just the driver's shorter wait.

[Six direct cold probes](source-loading-review/public-cold-before.json) subsequently
completed successfully. Their request traces show headers arriving well before
the full image body. These probes show the failure is not universal; they do not
prove the exact cause of each untraced public timeout.

A controlled native-browser experiment isolates a concrete contention problem.
Its local HTTP server serves the actual production bytes. JPEG bodies share one
4 KiB chunk every 8 ms, nominally 500 KiB/s; headers and other resources are
unthrottled. Registration is delayed only until the initial plate/fonts are ready,
then released before opening page 71. The server gives no preference to the
foreground request. This is a **synthetic network condition**, not an Internet
speed benchmark or a latency guarantee.

| Browser | Earlier batch installation | Bounded installation |
| --- | --- | --- |
| Chromium | Source loads within the deadline; healthy partial install is reported failed | Source loads; healthy partial install remains saving |
| Firefox | Foreground source reaches its deadline; six image streams observed | Source loads within the deadline; four image streams observed, including foreground |

The [before receipt](source-loading-review/priority-before.json) and
[after receipt](source-loading-review/priority-after.json) retain elapsed times,
active image-stream peaks, partial-install status, actual source hashes and
successful later offline reads. The controlled run used WSL2 Linux, 14 CPUs in the process affinity mask and
47.05 GiB of physical memory. Its timing values describe this run, not learner
performance. The early driver label said about 512 KiB/s; 4 KiB / 0.008 s is
500 KiB/s. That metadata label is corrected without changing measurements.

## The small implementation change

Installation now uses three concurrent `cache.add` operations instead of queuing
the whole edition through one `addAll`. The resource requests retain their build
integrities. A partial cache can exist during installation, but **the worker is
not activated until every request succeeds**. Readiness still requires the current
controlling worker and its complete byte audit. This is not a weaker offline promise.

The initial 12-second footer check now distinguishes a still-installing worker
from a failed installation. A healthy long save says it is still saving and that
the workshop remains usable. It does not instruct a needless reload or claim the
partial edition is ready.

Both engines also exercise a deliberately failed installation (503 on a different
retained page), continued foreground reading, a successful retry after the network
recovers, complete-edition readiness, and a verified source read after going offline.
The [older three-tab recovery suite](source-loading-review/recovery.json) still
passes: source/font/license corruption, false repair rejection, successful repair,
eviction, stale replies, cancellation and late-file preservation. Worker restart
is exercised in Chromium only.

## Correct text can still have the wrong teaching appearance

The downloaded HTML already contained `oculus`, but its Latin language tag enabled
EB Garamond's locale-specific `v` alternates. Its visible word was `ocvlvs`, while
the workshop deliberately keeps dictionary-style `u` forms. The portable CSS now
carries the same font feature/language override as the workshop. This changes
rendering, not the encoded Latin, translations, vocabulary or source images.

Before: ![Latin locale alternate from the old saved file](assets/latin-before.png)

After: ![Dictionary-style u from the corrected saved file](assets/latin-after.png)

The [before](source-loading-review/glyph-before.json) and
[after](source-loading-review/glyph-after.json) compare actual word screenshots
with the same word rendered under the font's English dictionary forms. The older
Latin rendering differs; the corrected one matches. The native file driver checks
this equality in all four browser/width cases with scripts disabled, then restores
the word's Latin language tag. Font cmap coverage alone would not detect this issue.

The retained [HTML](../examples/vocabulary/eye-study.html.gz) and
[PDF](../examples/vocabulary/eye-study.pdf) are refreshed actual downloads. Their
[artifact receipt](source-loading-review/artifact.json) verifies the nine font blobs,
CSS/cmap coverage, included license texts, source image and native CSV. Underlying
font bytes, source pages and vocabulary CSV fields remain unchanged. Earlier
published receipts remain evidence for their named editions; the new HTML bytes
include the deliberate typography correction.

## Reproduce and review

```sh
REQUIRE_SOURCE_READY=1 node scripts/source-priority.mjs dist /tmp/embater-source-priority
npm run test:vocabulary -- http://127.0.0.1:4492/embater/ /tmp/embater-native-reading
```

The first command serves its own local, throttled fixture origin; the second uses
a fixed production preview. `source-priority.mjs <older-dist> <output>` without the
requirement flag records the older behavior without assuming a pass.

The [final clean build](source-loading-review/build.json) reproduces all 89 files
under an independent Node 24 test/build. The [eight grading configurations](source-loading-review/grading.json),
[20 progress scenarios](source-loading-review/progress.json) and
[four source/native-file/offline journeys](source-loading-review/source-offline.json)
pass, including elapsed source/export deadlines and subsequent successful retries.
Axe and viewport checks apply to the reviewed states, not every conceivable browser.

Hosted source, response variants and final catalogue journeys are recorded
separately after publication.

## Published reader

Source `e60e1674f110dbbe8fdfb8b3b33e463dcf0d2dc3` is on `main`. Reviewed
application `81fbec4` was published by fast-forward update of `gh-pages` to
`f02f66f47cb1ec69b6847332ba06edb0e7b07cfb`; `.nojekyll` remains present.

All **89 canonical production files** match the clean build through both
[gzip after decompression](source-loading-review/public-bytes.json) and
[identity responses](source-loading-review/public-identity.json). All **50 immutable
raw source artifacts** match their git blobs, including the bounded-install code,
source reader/verification drivers, portable typography, retained pages, fonts,
licenses and manifests.

The [six new cold Firefox visits](source-loading-review/public-cold-after.json)
all open the original page on the first attempt. This is an observed replay,
not a guarantee for every network. The [hosted source/file/offline journeys](source-loading-review/public-source-offline.json)
pass all four configurations, including native dictionary-glyph equality, elapsed
deadlines and actual successful retries. Their saved studies match the final local
files byte for byte. The [20 hosted progress scenarios](source-loading-review/public-progress.json)
and [eight hosted grading configurations](source-loading-review/public-grading.json)
also pass. This publication keeps the earlier progress protection and corrects the
newly exposed cold-source and portable-type presentation issues.

The [workflow receipt](source-loading-review/public-ci.json) distinguishes source
CI `41295109034` and source Pages `41295109087` (failure, **zero executed steps**)
from internal Pages deployment `41295254708` (success). No source-CI success is
claimed. Validation comes from the independently installed build, original/source
byte checks, controlled contention/failure cases, native files and hosted browsers.

```sh
python3 scripts/vocabulary-publication.py --include-progress --include-reader --source e60e1674f110dbbe8fdfb8b3b33e463dcf0d2dc3 --output /tmp/embater-reader-public.json
```

Use `--encoding identity` to check the uncompressed variant independently. The
catalogue's final immutable review pin links this reader audit as well as the
earlier learning-model and progress evidence. Documentation-only commits do not
change the reviewed application bytes.
