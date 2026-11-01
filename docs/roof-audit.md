# A measured roof, a retained reading

The roof workshop asks a specific question: does *altiora octava parte* make the
middle ornament an eighth as tall, or an eighth taller? Operate both readings,
check the Latin against the complete printed page, and keep the experiment.

## Try the actual work

[Open the roof workshop](https://antonsoo.github.io/embater/#order=doric&columns=6&view=roof&trial=0.5).
For a local build, use the README quickstart and the same fragment.

1. Choose **Try a middle ornament only h/8 tall**. Compare the blue envelope
   with the middle ornament. **Match Vitruvius's middle height** changes it to
   h + h/8 = 9h/8. Arrow keys operate the trial slider.
2. Change the columns, spacing and scale. The current roof, Latin reading,
   measurements and downloadable files stay together. **Enlarge roof** provides
   keyboard scrolling on a narrow screen.
3. Select **acroterion** for its Greek and Latin names; read complete printed
   page 74, including its apparatus. The Doric reading also retains IV.3.6 on
   page 84: Vitruvius refers its tympana, simae and coronae back to Ionic work.
4. **Save illustrated reading** downloads a script-free HTML file containing
   the roof, its full front for context, exact settings, Latin and modern
   English, complete source pages, six font subsets, and licenses. Open it
   directly from disk. Its SVG/CSV download links work without the application.
5. **Reopen these exact choices** returns to the selected experiment when
   connected. SVG metadata and CSV also carry its settings and reopening link.

![The operated Ionic roof and its Latin reading](assets/roof-desktop.png)

## Audit findings and corrections

These are defects reproduced against the actual drawings or operated browser,
not an inference from passing helper tests.

| Before | Result |
|---|---|
| An ornament requested at height 1 reached 1.012; the centre plinth began inside the roof. | Actual vertices meet the requested total; plinths sit above the roof slope on explicitly modern grey wedges. |
| Cornice lips extended beyond the projection used to calculate h. | The actual horizontal corona extremities span 9h. |
| Ionic/Corinthian corner shafts grew by 1/50, while their bases and capitals retained the ordinary diameter. | These members use each column's own diameter. Axes and capital tops stay fixed; shaft lengths accommodate the larger members. This joining convention is stated as modern. |
| The drawn Ionic groove stopped after 7.6 quarter turns although a helper test exercised eight. | The actual drawing reaches all eight prescribed quarter-radius stations and meets its eye. The continuous curve and fillet remain modern interpolation. |
| A link requesting 2.6 feet calculated 2.6 while its quarter-step slider displayed 2.5. | Both use 2.5, with a visible rounding notice. Saved settings retain that operated value. |
| Arrow navigation between orders lost focus after rebuilding the form. | Focus remains on the new radio, allowing another arrow press. |
| Closing the source could focus a replaced or hidden trigger. | A visible current matching source button receives focus; otherwise the current heading does. |
| The standalone SVG painted its blue envelope grey because a chosen-line selector won. | The export uses a specific trial selector; native SVG and HTML openings verify the actual blue stroke. |
| Saved measurements lost the order settings that produced them. | HTML, SVG and CSV retain the experiment and its reopening URL. |
| Seven fractions emitted by geometry labels were absent from retained fonts. | All formatter fractions are covered. The supplementary subset grew from 3,560 to 4,292 bytes. A native print of 10⅔ embeds EmbaterLatinextra. |
| Concurrent background source transfers pushed a cold foreground reading past its real 15-second deadline. | Installation uses one background transfer; controlled foreground reads complete before that deadline. |
| Updating an edition fetched unchanged source pages again. | Matching old or interrupted-cache responses are SHA-256 checked against the new inventory before reuse. Damaged or absent bytes are fetched. |

## Source and model boundaries

The original Krohn 1912 PDF was downloaded again for this audit. Its 16,915,191
bytes have SHA-256
`b13a68789a8a1dc567b6f9b47eabe6a37a306329fbfc2c1a027a6c30a90d5139`.
Re-rendering all 26 retained vocabulary pages reproduced every byte, including
pages 67, 69, 71–74, 79 and 84 inspected for the relevant rules. The manifest
identifies printed pages and corresponding PDF pages separately.

[Printed page 74](https://archive.org/details/vitruviidearchit00vitr_1/page/n91/mode/1up)
gives *tam alta, quantum* (equality) and *altiora octava parte quam* (higher by an
eighth). [Printed page 84](https://archive.org/details/vitruviidearchit00vitr_1/page/n101/mode/1up)
contains the Doric cross-reference. English readings are modern and have not had
independent philological review.

Palmettes, plinths, insets, mounting wedges and normal cornice thickness are
illustrative. A height rule does not establish an ornament's historical outline.
The nominal front and actual widened shaft span are reported separately;
the text does not uniquely settle their combination. Above 50 feet, the taper
is a modern stepped continuation. Architrave dimensions outside the stated
12–30-foot range, and dependent roof projections, are a numeric extension;
the saved reading flags those cases. No metres conversion or surveyed-building
claim is made. SVG coordinates round to three decimals; CSV preserves the
unrounded model. The full front provides context; its every source passage is
not embedded in this roof reading.

The portable HTML embeds pages 73, 74 and 84 for Doric; 72, 73 and 74 for Ionic
and Corinthian. Source bytes, fonts and licenses are checked before saving.
Cancellation, a changed drawing, a failed hash or the actual 45-second deadline
cannot produce a partial reading. The saved file contains no scripts or
automatic external requests. Its external source/reopening links need a network.

## Operated evidence

Chromium 153.0.8010.12 and Firefox 155.0 were operated at 1440 and 375 pixels:
keyboard controls, source identity, source-return focus, native SVG/CSV/HTML,
script-disabled opening, embedded downloads, complete edition takeover,
offline reload and byte-identical offline reading. Deliberate wrong-source,
cancelled, changed-drawing and stalled-request runs refused incomplete files;
a subsequent save recovered. Dark screenshots wait for the actual theme to
settle. The roof journey found no serious/critical axe findings or runtime errors.

An independent Python parser reads the actual SVG/CSV/HTML rather than importing
the model. It checks the drawn ornament extents, corona width, blue envelope,
settings, independently calculated h, source/font/license bytes, corner shaft and
base widths, and all nine Ionic quarter-radius stations in emitted grooves.
A separate font-cmap check covers every fraction the formatter emits.

The slow-link fixture shares one 4,096-byte JPEG chunk every 32 ms across all
image streams (nominally 128,000 bytes/s). Headers and other assets are
unthrottled; registration starts after the initial plate is ready. Before the
change both browsers timed out. After it, the foreground page finished in
12,152 ms (Chromium) and 9,494 ms (Firefox), with two rather than four peak JPEG
streams. These are observations for this controlled fixture, not a guarantee
for arbitrary networks. Initial full-edition storage still downloads the source
collection; incomplete storage never displays Ready.

The edition-upgrade fixture begins with the preceding published build, removes
one scan, damages another, and fails a new script request. The old worker stays
active and its cache survives. Retry reuses 35 of 37 source images, fetches the
two missing/damaged images, and verifies every new cached file. Both old tabs
retain their fragments and report their edition mismatch. Explicit repair also
recovers a subsequently damaged current cache. The recorded network-byte total
belongs to that fixture, not to an arbitrary upgrade.

Receipts: [roof journey](review/roof-audit/roof-browser.json),
[portable readings](review/roof-audit/readings-browser.json),
[independent readings oracle](review/roof-audit/readings-artifacts.json),
[roof geometry oracle](review/roof-audit/roof-artifacts.json),
[edition upgrade](review/roof-audit/edition-upgrade.json),
[slow link before](review/roof-audit/slow-before.json) /
[after](review/roof-audit/slow-after.json),
[source reproduction](review/roof-audit/source-reproduction.json),
[font reproduction](review/roof-audit/fonts-reproduction.json),
[fraction coverage](review/roof-audit/geometry-glyphs.json).
These receipts establish local behavior. The subsequent
[publication record](roof-publication.md) retains canonical hosted-byte, public
browser and immutable raw-source evidence. Catalogue discovery is verified
separately in Officina.

## Reproduce

```sh
npm ci
npm run check
npm run verify:roof-artifacts
npm run verify:roof-study
```

Serve `dist/` with `npm run preview -- --port 4493`, then:

```sh
npm run test:roof -- http://127.0.0.1:4493/embater/ /tmp/roof-review
npm run test:roof-study -- http://127.0.0.1:4493/embater/ /tmp/roof-studies
python3 scripts/roof-artifacts.py /tmp/roof-review
python3 scripts/roof-study-artifacts.py /tmp/roof-studies
node scripts/edition-reuse.mjs /path/to/previous/dist dist /tmp/edition-review
EMBATER_SOURCE_TICK_MS=32 node scripts/source-priority.mjs dist /tmp/slow-review
```

Playwright's Chromium and Firefox must be installed. Source reproduction takes
the identified original PDF: `python3 scripts/vocabulary-sources.py /path/to/pdf`.
Font reproduction uses `scripts/vocabulary-fonts.py` with the original files
identified in `public/fonts/vocabulary-manifest.json` and dependencies pinned in
`scripts/requirements-fonts.txt`. Run `scripts/geometry-glyphs.py` with the same
Python dependencies for the emitted-fraction cmap check.

A native [Doric reading](../examples/roof/doric-reading.html.gz) is retained as
deterministic gzip. To open it: `gzip -dc examples/roof/doric-reading.html.gz > /tmp/roof-reading.html`.
The [Ionic SVG](../examples/roof/ionic.svg) and [CSV](../examples/roof/ionic.csv)
are actual browser downloads, with exact settings retained.
