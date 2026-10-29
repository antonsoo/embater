# Embater

**Draw Greek temples from Vitruvius's own rules, check those rules against real buildings, and learn the Greek, Latin and native name of every part.**

[![License: MIT](https://img.shields.io/badge/license-MIT-1f4e9c)](LICENSE)
[![Live site](https://img.shields.io/badge/live-antonsoo.github.io%2Fembater-b3321f)](https://antonsoo.github.io/embater/)

![A Doric hexastyle front computed from Vitruvius, with the triglyphs selected and their Greek name, sources and Euripides quotation beside it](docs/assets/orders-doric.png)

Vitruvius wrote the only architectural treatise that survives from antiquity, and he
builds a Doric temple from a single number. Divide the front into 42 parts; one part is
the module, which "in Greek is called *embatēr*". Every column, beam and groove follows.

Most diagrams of the classical orders redraw Renaissance plates. Embater computes each
drawing from Vitruvius's Latin instead, rule by rule. It draws what the text fixes in
black and what a draughtsman has to invent in grey, and names every part in the
languages of the people who built it. It then checks two of his rules against
measurements of real temples.

**[Open the site](https://antonsoo.github.io/embater/)**: [Orders](https://antonsoo.github.io/embater/) ·
[Plans and evidence](https://antonsoo.github.io/embater/plans.html) ·
[World](https://antonsoo.github.io/embater/world.html) ·
[Drill](https://antonsoo.github.io/embater/drill.html)

## What it shows

**The orders.** Doric, Ionic, Corinthian and Tuscan fronts with four, six or eight
columns, at any of Vitruvius's spacings, at any size in Roman feet. Size matters to
Vitruvius: taller columns taper less (III.3.12), and an Ionic architrave's height
depends on how tall its columns are (III.5.8). Select any of about fifty parts to get
its Greek and Latin name, the literal meaning, the dictionary that attests it, and the
Latin sentence that sizes it, with Krohn's page number.

![The Ionic corner column and entablature, with the volute selected; its Latin and Greek names and Vitruvius's spiral rule beside it](docs/assets/ionic-detail.png)

Some of what the vocabulary turns up:

- The module's Greek name, ἐμβάτης, otherwise means a felt half-boot (LSJ). The temple
  stands on its κρηπίς, a man's high boot, and its columns on a στυλοβάτης, a "column-stepper".
- The Doric cushion is ἐχῖνος, a hedgehog or sea-urchin. The pediment is ἀετός, an eagle,
  "from its resemblance to outspread wings". The frieze, ζῳοφόρος, "figure-bearing", shares
  its name with the zodiac.
- The hollow in an Attic base is σκοτία, "darkness", for the shadow it holds. Vitruvius's
  other Greek name for it, τροχίλος, is also the Egyptian plover that Herodotus says
  cleans the crocodile's teeth.
- The Athenian building accounts call the centres of the volutes ὀφθαλμοί, "eyes", as
  Vitruvius's Latin does (*oculus*). The Latin for a rafter, *cantherius*, is a gelding.

**The plans.** Vitruvius's seven plan types, from a temple *in antis* (Greek ναὸς ἐν
παραστάσιν) to the open-roofed hypaethral, laid out from III.2 and IV.4.

**The world.** Schematic plates with sourced vocabulary:

- **Egypt:** the plant columns of Karnak, and the Greek kitchen words for
  Egyptian monuments (πυραμίς is also a cake; ὀβελίσκος is a little roasting spit).
- **Ur:** the ziggurat, whose Akkadian name *ziqqurratum* also named a ziggurat-shaped cake.
- **Sanchi:** the stupa as an egg (*aṇḍa*) under a royal umbrella (*chattra*).
- **China:** a Han hall known only from clay tomb models.
- **Tenochtitlan:** the Templo Mayor, seven temples built one inside the next.

![The Sanchi stupa plate with the harmikā selected and its Sanskrit entry from Monier-Williams](docs/assets/world-india.png)

**The drill.** Name a highlighted part, or find a named one, on the same drawings. A
Leitner schedule brings missed words back sixteen times as often as known ones.
Progress stays in your browser.

## What the evidence says

### The printed numbers are corrections, and the arithmetic says they are right

The manuscripts of IV.3.3 give the Doric front as **28** modules for four columns and
**32** for six. Every modern text prints **27** and **42**, which Krohn's apparatus credits
to the sixteenth-century editor Philander. Embater lays the front out from the triglyph
rhythm instead: triglyphs one module wide, square metopes 1½ wide, one triglyph over
every column and two between. The front then measures 27 and 42 exactly.

The test suite goes further. Try every whole number of triglyphs between the columns:
a four-column front can only measure 19½, 27, 34½…, and a six-column front 29½, 42,
54½…. Neither 28 nor 32 is reachable. The same holds for the one-triglyph spacing (19½ and
29½, credited to Barbaro) and the eustyle Ionic front (11½, 18 and 24½, where the
manuscripts have 19 and 25). Vitruvius's other numbers cross-check too. A dipteral plan
of eight by fifteen columns has an inner ring of exactly **34**, the number Krohn prints
for the columns Hermogenes removed (the manuscripts have 38). And his systyle spacing
leaves a gap between bases equal to one base, as III.3.2 says it should.

### Vitruvius's flank rule describes the temples of his sources, not the Parthenon

He wants the long side of a six-column temple to have eleven columns, twice as many
gaps as the front, and calls temples with twelve a mistake (III.4.3). The Perseus
Digital Library catalogue lists 31 six-column peripteral temples with their counts.

![Flank column counts of 31 Greek six-column temples by date, with reference lines at 11, 12 and 13](docs/assets/flanks-chart.png)

| Period (by the middle of each date range) | Temples | Median columns on the flank | Range |
|---|---:|---:|---|
| Before 500 BCE | 10 | 15 | 12–17 |
| 500–401 BCE | 14 | 13 | 12–16 |
| 400 BCE and later | 5 | 11 | 11–15 |

Two rows Perseus itself flags as uncertain are drawn hollow and left out of the
medians. From 400 BCE on, four of the five temples have exactly eleven. The fifth,
Delphi, was rebuilt on its Archaic foundations. The "doubled" six by twelve he
condemns appears four times, all dated between 529 and 480 BCE.

### No measured Doric column is as slender as Vitruvius's

![Column height in lower diameters for nine Doric and five Ionic temples by date](docs/assets/slenderness-chart.png)

Vitruvius makes a Doric column seven diameters tall, and says the first Doric columns,
modelled on a man's foot, were six (IV.1.6, IV.3.4). The nine Doric temples in Perseus
with both a column height and a lower diameter, from the sixth to the fourth century,
measure **4.2 to 5.6**. His Ionic rules fit better: the measured Ionic columns run from
9.3 to 11.0, around his 8½–10.

The data pipeline is reproducible. `scripts/perseus_fetch.py` stores every catalogue
entry with its page hash. `scripts/build_temples.py` holds the hand-read counts, and
refuses to run unless each row's quoted sentence appears verbatim in its Perseus entry.
The page shows the quotation for every point and lists the six entries left out, and why.

## How it works

```mermaid
flowchart LR
  K["Krohn 1912 Latin<br/>src/core/rules.ts"] --> E["Order builders<br/>doric.ts, ionic.ts, tuscan.ts, plan.ts"]
  E -->|"pieces: part id, shape,<br/>text-fixed or chosen"| R["SVG renderer"]
  V["Vocabulary<br/>LSJ, Lewis and Short,<br/>Monier-Williams, Wiktionary"] --> C["Part cards, key, drill"]
  R --> C
  P["Perseus catalogue"] --> S["build_temples.py<br/>quoted, verified rows"] --> D["Evidence charts"]
```

- **One model, three uses.** Each order builder returns a list of pieces in modules. A
  piece is a rectangle, polygon or circle with a part id, and it records whether the text
  fixes its size (`"text"`) or the drawing had to choose (`"chosen"`). The same pieces
  feed the drawing, the clickable key, the tests and the drill.
- **Rules, not proportions copied from a plate.** `src/core/rules.ts` quotes each passage
  of Krohn's Teubner text (Leipzig 1912) with its printed page. Every number was checked
  against the scanned page, because the OCR and an online transcription both misread
  some (one gave "12" for xxvii). Where the manuscripts disagree with the printed
  number, the rule records both and the editor.
- **What is grey, and why.** Vitruvius promised diagrams for entasis, the volute and the
  curved stylobate, and they are lost. He also leaves the echinus profile, the number of
  guttae under a regula, the acroteria and the leaves of a Corinthian capital to the
  draughtsman. All of these are drawn grey, and so is the horizontal placement of the
  volute's eye, a disputed reading.
- **No framework.** Vite, TypeScript and hand-written SVG. About 60 KB of gzipped
  JavaScript across the four pages, self-hosted fonts (EB Garamond, GFS Didot), no
  network requests after load, no tracking.

Tests (`npm test`, 35 of them) check the claims above, not just that things render:

- the reachable front widths;
- square metopes and the half-metopes;
- the taper bands, the volute's 4½ and 3½ parts, and both bases summing to half a diameter;
- the Corinthian abacus diagonal and the 6 × 11 and 34-column plans;
- the evidence medians;
- that every part drawn anywhere has a sourced name;
- the Leitner weighting, measured over 40,000 draws.

## Run it

```sh
git clone https://github.com/antonsoo/embater.git && cd embater
npm ci
npm run dev        # http://127.0.0.1:4412/embater/
```

`npm run check` runs Biome, strict TypeScript, the tests and the production build into
`dist/`. `npm run data:build` regenerates `src/data/temples.ts` from
`data/perseus-temples.json`. `npm run data:fetch` refreshes that file from Perseus.

## Accuracy and limitations

- **The drawings are a model of Vitruvius, not of any building.** He wrote in the first
  century BCE, and his Doric is not the Parthenon's. Where his wording is obscure (the
  volute's eye, the Tuscan roof's fall), the drawing follows one reading and says so.
- **Perseus is a curated catalogue, not a census.** Its dates are its own, a few
  dimensions are marked "ca.", and two Ionic values are estimates (drawn hollow). The
  chart nudges dots apart when they share a row, and its periods use the middle of each
  date range.
- **The English translations are new and literal.** They have not been reviewed by a
  second philologist. Greek and Latin senses come from LSJ and Lewis & Short through
  Logeion; Sanskrit from Monier-Williams.
- **Some non-classical sources are secondary.** Egyptian, Chinese and Akkadian senses
  come from Wiktionary entries that cite the standard dictionaries (Wb, Faulkner, the
  Chicago Assyrian Dictionary). Where I could not confirm a word, such as the Akkadian
  for baked brick, the part has an English name only.
- **The world plates are schematic.** They are not computed from an ancient rulebook,
  and not measured drawings.

## Related

[Gonia](https://github.com/antonsoo/gonia) works single problems from Vitruvius in
depth: the Doric corner, entasis on the Parthenon, the volute with a compass, the Babylon
tower. Embater links to those rooms from the relevant parts.
[Stoicheia](https://github.com/antonsoo/stoicheia) reads Euclid in Greek and Latin.

## License

Code: [MIT](LICENSE). The Perseus-derived data (`data/perseus-temples.json`,
`src/data/temples.ts`) is © Tufts University, CC BY-SA 3.0 US, and is shared under the
same license. Fonts: SIL Open Font License (`src/fonts/LICENSE.txt`). See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
