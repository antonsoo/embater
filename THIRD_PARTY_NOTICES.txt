# Third-party material

## Perseus Digital Library temple data

`data/perseus-temples.json` holds fields copied from the Perseus Art & Archaeology
Artifact Browser (building type "Temple"), and `src/data/temples.ts` holds counts and
measurements read from them, each with the quoted sentence it rests on.

© Tufts University. Licensed under the Creative Commons Attribution-ShareAlike 3.0
United States License (https://creativecommons.org/licenses/by-sa/3.0/us/). The two
files above are shared under the same license. Source:
https://www.perseus.tufts.edu/hopper/artifactBrowser?object=Building

## Fonts

EB Garamond (Georg Duffner and Octavio Pardo) and GFS Didot (Greek Font Society),
served from `src/fonts/`, under the SIL Open Font License 1.1. The full license and
copyright notices are in `src/fonts/LICENSE.txt`.

## Retained Vitruvius pages

`public/sources/krohn-1912/` contains complete printed pages 62–64, 66, 69, 85–86
of F. Krohn's 1912 Teubner edition, from the Internet Archive item
`vitruviidearchit00vitr_1`. The text and images are public domain. `manifest.json`
records each original image URL, image index, byte size and SHA-256. Printed page
numbers and the passages used by the plan lesson were visually checked. The
standalone plan reading embeds only the pages cited for its selected plan, with
source attribution; its fonts carry the included OFL notices.

## Quoted texts

The doorway room additionally retains complete printed pages 88–89 of the same
1912 Krohn edition in `public/sources/doorways/`. They were rendered from the
Internet Archive PDF, public domain. Its identity and the rendering command are
in `public/sources/doorways/manifest.json`; `scripts/doorway-sources.py` reproduces
and compares the retained bytes. Doorway Latin preserves the marked supplements
and lacuna, with normalized case, punctuation and line-break hyphenation.
English translations and contextual word notes are new; dictionary links point
to Lewis and Short and LSJ through Logeion. No modern English translation or
reconstructed ancient drawing is reproduced in the doorway lesson.

- Vitruvius, *De architectura*, ed. F. Krohn (Leipzig: Teubner, 1912). Public domain.
  Consulted as the Internet Archive scan `vitruviidearchit00vitr_1`
  (https://archive.org/details/vitruviidearchit00vitr_1); the PDF had SHA-256
  `b13a68789a8a1dc567b6f9b47eabe6a37a306329fbfc2c1a027a6c30a90d5139` when consulted.
- Aristotle, *Nicomachean Ethics*, ed. I. Bywater (1894), and Euripides, *Bacchae*, ed.
  G. Murray (1913), as published by the Perseus Digital Library.
- Genesis 11:3 in the King James Version (1611).
- One sentence of Darius I's Susa foundation charter (DSf §3j) in R. G. Kent's translation,
  *Old Persian: Grammar, Texts, Lexicon* (1953), quoted with attribution as published at
  avesta.org.

Short dictionary glosses are cited from Liddell, Scott and Jones, *A Greek–English
Lexicon* (9th ed.) and Lewis and Short, *A Latin Dictionary*, both through Logeion
(University of Chicago); Monier-Williams, *A Sanskrit–English Dictionary* (1899),
through the Cologne Digital Sanskrit Dictionaries; the Online Nahuatl Dictionary
(University of Oregon); and Wiktionary entries, whose own citations are named
where used.

## Retained Erechtheion survey pages

`public/sources/erechtheion/` retains complete unmodified printed pages 98–99
(PDF pages 128–129) of *The Erechtheum*, edited by James Morton Paton, measured,
drawn and restored by Gorham Phillips Stevens (Harvard University Press,
Cambridge, Massachusetts, 1927). This 1927 US publication is public domain in the
United States. Source: Internet Archive item `erechtheummeasur1192unse`. The
manifest records original PDF identity, page hashes and the rendering command;
`scripts/measured-sources.py` independently reproduces these pages. The lesson
compares reported dimensions of the survey's interpreted original opening,
explicitly omitting later inner linings. It does not reproduce a modern survey
or claim these are measurements of today's clear opening.
