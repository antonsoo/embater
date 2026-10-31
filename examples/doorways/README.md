# A 28-foot ceiling, read with the supplied half

These are actual Chromium downloads from the local doorway room, not manually
constructed examples. The selected opening is Ionic, 20 Roman feet tall, with
an intentionally parallel blue trial. The comparison opening omits the supplied
half and is 16 feet tall. The drawing records choices; it is not an ancient survey.

| File | Use |
| --- | --- |
| `drawing.json` | Restore the choices with **Open drawing** |
| `measurements.csv` | Full numeric precision, Roman feet, basis for each value |
| `drawing.svg` | Independent drawing with trial, description and model metadata |
| `reading.html.gz` | Complete illustrated reading, compressed for storage |
| `reading.pdf` | Chromium print of that same HTML, A4 |

```sh
gzip -dc examples/doorways/reading.html.gz > /tmp/embater-doorway-reading.html
```

Open the decompressed HTML in a browser. It needs no scripts or connection;
external source links need a connection. Its native JSON/CSV/SVG downloads
match the three files beside it. The PDF is untagged; physical printing and
independent philological review are not verified.

From the repository root, `npm run verify:doorway-artifacts` checks these files
against exact fractions, retained source and font bytes, complete licenses,
and PDF text bounds. It requires Python 3 and Poppler.

To regenerate with `npm run preview` running:

```sh
npm run test:doorways -- http://127.0.0.1:4412/embater/ docs/doorway-review/local
```
