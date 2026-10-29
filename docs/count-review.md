# Count the spaces

The comparison distinguishes columns from the spaces they enclose. It uses the
existing transcription of Vitruvius III.4.3 (Krohn 1912, p. 69) and the existing
Perseus catalogue extraction, regenerated during this review without a diff.

The learner chooses a reading, selects a building, sees its quotation, and can
include the two uncertain restorations in the tally. The default excludes them:
4 of 29 records have eleven flank columns and 4 of 29 have twelve. Including
uncertainty gives 5 of 31 with eleven. Selinus C has seventeen; Aphaia has twelve;
Priene has eleven. These are catalogue counts, not a sample designed for statistical
inference. The drawings use uniform centre spacing to make the counts visible.
They do not recover a temple's dimensions, spacing, foundations or orientation.

The source wording was also checked against the public
[Perseus record for Selinus C](https://perseus-aa.github.io/items/aa_394.html)
and [Morgan's translation of III.4](https://lexundria.com/vitr/3.4/mg).
The Latin and English in this app remain the existing Krohn-based transcription
and new translation; the latter has not had a second philological review.

## Operation and artifacts

`node scripts/compare-browser.mjs BASE_URL OUTPUT_DIRECTORY` operates the actual
built app in Chromium and Firefox at 1440 and 375 pixels in both themes.
[Local results](review/count-browser.json) record eight contexts. Each context:

- changes from eleven to twelve predicted columns, checks Aphaia's match, and
  changes back to the stated rule;
- checks Priene, includes uncertain restorations, and selects an uncertain record
  by keyboard with focus returned to the temple selector;
- downloads real HTML, SVG and CSV files, then opens the HTML offline without an
  HTTP request;
- reloads all five pages offline after the controlling worker confirms the edition;
- checks accessible names, contrast, overflow and uncaught page errors.

An independent Python `csv.DictReader` pass read all 31 exported records, including
two flagged restorations, and checked every spaces = columns - 1 relation.
The retained [Selinus reading](review/selinus-reading.html) and
[CSV](review/temple-counts.csv) are actual browser downloads. Data remains
CC BY-SA 3.0 US, Tufts University; original illustration and English are MIT.

## Offline behavior

The build generates integrity values for every page, asset and font. Installation
only completes when that edition is saved; the footer inspects the controlling
worker and the full cache inventory. It does not promise external sources offline.

`node scripts/offline-review.mjs OUTPUT_JSON` serves the built site with deliberate
failures. Both browsers retained a saved page during HTTP 503 and a stalled HTML
body; preserved a real HTTP 404; left an evicted page unavailable; withdrew readiness
when a file was missing; and refused to activate an install containing a substituted
JavaScript asset. [Fault results](review/offline.json).

Build with Node 24 or later: `npm ci && npm run check`. The production output is
`dist/`. `npm run data:build` verifies every extracted quotation against the retained
catalogue and regenerates the TypeScript data. Hosted-file and public-browser results
are recorded separately in `docs/review/` after publication.
