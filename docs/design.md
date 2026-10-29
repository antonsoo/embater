# Design notes

## What it is for

A reader who knows some Greek or Latin, or wants to, opens a temple drawing and asks
"what is that called, and why?" Embater answers from the sources: the part's name in
the builders' languages, its literal meaning, and the ancient sentence that sized it.
It is not a glossary with pictures. The drawing is computed from the text, so changing
the number of columns or the spacing re-derives the whole front.

## Decisions

- **Vitruvius as the rulebook.** He is the only ancient author who gives enough numbers
  to draw an order. Where he gives none, the drawing shows a convention in grey rather
  than borrowing a Renaissance answer silently.
- **Krohn's 1912 text, checked against the page images.** An online transcription and the
  OCR both misread numerals; every number in `src/core/rules.ts` was read off the scan.
  Manuscript disagreements are kept with the editor credited in Krohn's apparatus.
- **Real data for one claim at a time.** The Perseus catalogue is the largest openly
  licensed table of Greek temples with column counts and dimensions. Each row is read by
  hand and quoted; the build refuses a row whose quotation is not in the entry.
- **Visual identity.** Measured architectural engravings: graphite ink on a cool marble
  sheet, two ancient pigments as the only colours. Egyptian blue marks a selected part
  (Vitruvius says the first triglyphs were painted with blue wax) and minium red marks
  measurements. GFS Didot, the face of nineteenth-century Greek editions, for display;
  EB Garamond for text and polytonic Greek.
- **No framework.** The drawing code emits SVG strings from pure functions; the pages are
  small controllers around them.

## Left out of this version

- A side elevation and section of each order, which would show the mutules' slope, the
  Ionic capital's cushion and the leaning of the entablature (III.5.13).
- The stylobate's curvature and the entasis, whose diagrams Vitruvius promised and are lost.
- A Roman plate for the arch and the vault, which Gonia's arch room already treats in depth.
