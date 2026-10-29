# Contributing

Use Node 24 or later. `npm ci`, then `npm run dev` serves the site at
`http://127.0.0.1:4412/embater/`. `npm run check` runs lint, strict types, the
tests and a production build.

Every dimension in the Greek drawings should trace to a rule in
`src/core/rules.ts`, which quotes Krohn's Latin with its printed page. If a part's
form is not given by the text, draw it with `given: "chosen"` so it renders grey.
Vocabulary entries in `src/content/` need a literal meaning and a source for each
word; prefer LSJ, Lewis & Short, Monier-Williams or a dictionary-backed
Wiktionary entry, and say so in the `source` field.

The temple data comes from the Perseus catalogue. To change a row, edit
`scripts/build_temples.py` and quote the Perseus sentence it rests on; the script
refuses to run if the quotation is not in the entry. `python3
scripts/perseus_fetch.py` refreshes `data/perseus-temples.json` (it caches pages
in `.cache/perseus` and waits a second between requests).
