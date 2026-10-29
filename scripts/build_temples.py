#!/usr/bin/env python3
"""Turn the Perseus temple entries into the two datasets the Plans page draws.

    python3 scripts/build_temples.py

Every number below was read by hand from the Perseus text, and every row carries the
sentence it came from. The script refuses to run if a quoted sentence is not found,
verbatim, in the fetched entry, so a row cannot drift from its source.
Writes src/data/temples.ts.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

# Peripteral temples with six columns on the front: (flank count, quoted source, status, note).
FLANKS: dict[str, tuple[int, str, str, str]] = {
    "Aegina, Temple of Aphaia": (12, "Doric peripteral temple, 6 x 12 columns.", "ok", ""),
    "Akragas, Temple of Concord": (13, "6 x 13; peripteral", "ok", ""),
    "Akragas, Temple of Hera": (13, "6 x 13; peripteral", "ok", ""),
    "Akragas, Temple of Herakles": (15, "6 x 15; peripteral", "ok", ""),
    "Assos, Temple of Athena": (13, "Doric peripteral temple, 6 x 13 columns.", "ok", ""),
    "Athens, Old Temple of Athena": (12, "A Doric peripteral temple, 6 x 12 columns", "ok", ""),
    "Athens, Pre-Parthenon": (16, "Doric peripteral temple, 6 x 16 columns.", "ok", ""),
    "Athens, Temple of Hephaistos": (13, "Doric peripteral temple, 6 x 13 columns.", "ok", ""),
    "Bassae, Temple of Apollo": (15, "Doric peripteral temple, 6 x 15 columns", "ok", ""),
    "Corinth, Temple of Apollo": (15, "Doric peripteral temple, 6 x 15 columns.", "ok", ""),
    "Delos, Delian Temple of Apollo": (13, "Doric peripteral temple, 6 x 13 columns.", "ok", ""),
    "Delphi, Temple of Apollo": (
        15,
        "Peripteral Doric temple, 6 x 15 columns",
        "ok",
        "Rebuilt in the fourth century on the Archaic temple foundations, which fixed its plan.",
    ),
    "Delphi, Temple of Athena Pronaia": (12, "Doric peripteral temple, 6 x 12 columns", "ok", ""),
    "Epidauros, Temple of Asklepios": (11, "Small Doric peripteral temple, 6 x 11 columns", "ok", ""),
    "Eretria, Temple of Dionysos": (11, "The temple is peripteral in plan, with 6 x 11 columns", "ok", ""),
    "Metapontum, Tavole Palatine": (12, "the temple is peripteral with 6 x 12 columns", "ok", ""),
    "Olympia, Metroon": (11, "Doric peripteral temple, 6 x 11 columns", "ok", ""),
    "Olympia, Temple of Hera": (16, "6 x 16 columns", "ok", ""),
    "Olympia, Temple of Zeus": (13, "Doric peripteral temple, 6 x 13 columns", "ok", ""),
    'Poseidonia, "Temple of Poseidon"': (14, "The temple is peristyle, with 6 x 14 columns", "ok", ""),
    "Poseidonia, Temple of Athena": (13, "an external colonnade of 6 x 13 columns", "ok", ""),
    "Priene, Temple of Athena": (11, "Hexastyle peripteral temple with eleven columns on the sides", "ok", ""),
    "Samos, First Hekatompedon Temple": (
        17,
        "Debated, but generally accepted as being peripteral (6 x 17)",
        "uncertain",
        "An eighth-century timber colonnade; Perseus calls the restoration debated.",
    ),
    "Samos, Temple C": (
        11,
        "A peripteral (6 x 11) temple",
        "uncertain",
        "Perseus notes it is uncertain whether the front had six columns.",
    ),
    "Selinus, Temple C": (17, "Hexastyle peripteral temple with seventeen columns on the sides.", "ok", ""),
    "Selinus, Temple E": (15, "hexastyle peripteral with 15 columns to the side", "ok", ""),
    "Selinus, Temple F": (14, "a hexastyle temple with 14 columns on the side", "ok", ""),
    "Sounion, Temple of Poseidon": (13, "Peripteral temple, 6 x 13 columns", "ok", ""),
    "Syracuse, Temple of Apollo": (17, "6 x 17;", "ok", ""),
    "Syracuse, Temple of Athena": (14, "6 x 14;", "ok", ""),
    "Syracuse, Temple of Zeus Olympios": (17, "6 x 17;", "ok", ""),
}

# Peripteral entries left out of the chart, and why.
EXCLUDED: dict[str, str] = {
    "Smyrna, Temple of Athena": "Colonnade restored on two sides only; Perseus calls the restoration open to question.",
    "Miletus, Temple of Athena": "Perseus prefers a recent restoration with eight columns on the front and calls the older 6 x 10 probably incorrect.",
    "Thermon, Temple of Apollo": "Five columns on the front.",
    "Samos, North Building": "Five columns on the front.",
    "Metapontum, Temple B": "Two phases with different plans, 9 x 17 and 7 x 15.",
    "Eretria, Temple of Apollo Daphnephoros": "Several successive buildings with different plans.",
}

# Column height and lower diameter in metres, with the sentence each number comes from.
SLENDER: list[dict[str, object]] = [
    {"name": 'Poseidonia, "Basilica"', "order": "Doric", "height": 6.45, "diameter": 1.44,
     "quote": "Lower column diameter 1.44 m.; axial intercolumniation 2.87 m. (fronts), 3.10 m. (flanks). Exterior column height 6.45 m."},
    {"name": "Athens, Old Temple of Athena", "order": "Doric", "height": 7.4, "diameter": 1.63,
     "quote": "lower diameter external column: ca. 1.63 m fronts", "quote2": "height external columns: ca. 7.4 m"},
    {"name": "Metapontum, Tavole Palatine", "order": "Doric", "height": 5.21, "diameter": 1.06,
     "quote": "Lower column diameter 1.06 m.", "quote2": "Height of columns (including capitals) 5.21 m."},
    {"name": "Poseidonia, Temple of Athena", "order": "Doric", "height": 6.12, "diameter": 1.26,
     "quote": "Lower diameter of external columns 1.26 m. Height of external columns 6.12 m."},
    {"name": "Olympia, Temple of Zeus", "order": "Doric", "height": 10.43, "diameter": 2.25,
     "quote": "external front column lower diameter: 2.25 m", "quote2": "height external columns: 10.43 m"},
    {"name": 'Poseidonia, "Temple of Poseidon"', "order": "Doric", "height": 8.88, "diameter": 2.11,
     "quote": "Lower column diameter of exterior columns 2.11 m. (fronts)", "quote2": "Height of exterior columns 8.88 m."},
    {"name": "Athens, Temple of Hephaistos", "order": "Doric", "height": 5.71, "diameter": 1.02,
     "quote": "lower diameter external columns: 1.02 m", "quote2": "height external columns: 5.71 m"},
    {"name": "Athens, Parthenon", "order": "Doric", "height": 10.43, "diameter": 1.91,
     "quote": "lower diameter exterior columns: 1.91 m", "quote2": "height exterior columns: 10.43 m"},
    {"name": "Epidauros, Temple of Asklepios", "order": "Doric", "height": 5.2, "diameter": 0.93,
     "quote": "external column diameter: ca. 0.93 m", "quote2": "external column height: ca. 05.2 m"},
    {"name": "Samos, Hera Temple of Rhoikos and Theodoros", "order": "Ionic", "height": 18.0, "diameter": 1.5,
     "quote": "Columns: 1.5 m. in diameter at base, estimated height ca. 18 m.", "estimated": True},
    {"name": "Metapontum, Temple D", "order": "Ionic", "height": 6.11, "diameter": 0.692,
     "quote": "The column height is estimated at between 5.97 m. and 6.25 m., with a lower column diameter of 67.6 cm. - 70.8 cm.",
     "estimated": True, "label": "Metapontum, Temple D (middle of the estimates)"},
    {"name": "Athens, Erechtheion", "order": "Ionic", "height": 7.64, "diameter": 0.817,
     "quote": "lower diameter exterior columns: 0.817 m", "quote2": "height exterior columns: 7.64 m",
     "label": "Athens, Erechtheion, north porch"},
    {"name": "Athens, Erechtheion", "order": "Ionic", "height": 6.59, "diameter": 0.60,
     "quote": "lower diameter exterior columns: 0.60 m; height exterior columns: 6.59 m",
     "label": "Athens, Erechtheion, east porch"},
    {"name": "Didyma, Hellenistic Temple of Apollo", "order": "Ionic", "height": 19.71, "diameter": 2.02,
     "quote": "Height of columns ca. 19.71 m.; lower column diameter 2.02 m."},
]

# Where Perseus states the order for each slenderness row.
ORDER_SOURCES: dict[str, str] = {
    'Poseidonia, "Basilica"': "Doric",
    "Athens, Old Temple of Athena": "A Doric peripteral temple",
    "Metapontum, Tavole Palatine": "Doric",
    "Poseidonia, Temple of Athena": "Doric and Ionic. The columns of the exterior colonnade",
    "Olympia, Temple of Zeus": "Doric peripteral temple",
    'Poseidonia, "Temple of Poseidon"': "Doric",
    "Athens, Temple of Hephaistos": "Doric peripteral temple",
    "Athens, Parthenon": "Doric peripteral temple",
    "Epidauros, Temple of Asklepios": "Small Doric peripteral temple",
    "Samos, Hera Temple of Rhoikos and Theodoros": "Ionic temple",
    "Metapontum, Temple D": "Ionic",
    "Athens, Erechtheion": "Ionic temple",
    "Didyma, Hellenistic Temple of Apollo": "The columns of the peristyle were Ionic",
}


def years(text: str) -> tuple[int, int]:
    """'ca. 500 BC - ca. 480 BC' -> (-500, -480); a single date gives the same year twice."""
    found = re.findall(r"(\d+)\s*(BC|AD)", text)
    if not found:
        raise ValueError(f"No date in {text!r}")
    values = [(-int(n) if era == "BC" else int(n)) for n, era in found]
    return values[0], values[-1]


def text_of(entry: dict[str, object]) -> str:
    return " ".join(str(entry.get(k) or "") for k in ("summary", "plan", "dimensions", "order", "history"))


def main() -> None:
    data = json.loads(Path("data/perseus-temples.json").read_text())
    by_name = {t["name"]: t for t in data["temples"]}

    flanks = []
    for name, (flank, quote, status, note) in FLANKS.items():
        entry = by_name[name]
        if quote not in text_of(entry):
            raise SystemExit(f"{name}: quoted source not found: {quote!r}")
        start, end = years(entry["date"])
        flanks.append({
            "name": name, "url": entry["url"], "date": entry["date"], "start": start, "end": end,
            "front": 6, "flank": flank, "quote": quote, "status": status, "note": note,
            "region": entry["region"], "period": entry["period"],
        })
    for name in EXCLUDED:
        if name not in by_name:
            raise SystemExit(f"Excluded entry {name} is not in the Perseus data")

    slender = []
    for row in SLENDER:
        entry = by_name[str(row["name"])]
        source = text_of(entry)
        for key in ("quote", "quote2"):
            if key in row and str(row[key]) not in source:
                raise SystemExit(f"{row['name']}: quoted source not found: {row[key]!r}")
        if ORDER_SOURCES[str(row["name"])] not in source:
            raise SystemExit(f"{row['name']}: order source not found")
        start, end = years(entry["date"])
        quote = str(row["quote"]) + (f" … {row['quote2']}" if "quote2" in row else "")
        slender.append({
            "name": str(row.get("label", row["name"])), "url": entry["url"], "date": entry["date"],
            "start": start, "end": end, "order": row["order"],
            "height": row["height"], "diameter": row["diameter"],
            "ratio": round(float(row["height"]) / float(row["diameter"]), 2),
            "estimated": bool(row.get("estimated", False)), "quote": quote,
        })

    header = (
        "// Generated by scripts/build_temples.py from data/perseus-temples.json. Do not edit.\n"
        f"// Source: {data['source']}, fetched {data['fetched']}; {data['license']}.\n\n"
    )
    body = (
        "export interface FlankRow {\n  name: string;\n  url: string;\n  date: string;\n  start: number;\n  end: number;\n"
        "  front: number;\n  flank: number;\n  quote: string;\n  status: \"ok\" | \"uncertain\";\n  note: string;\n"
        "  region: string | null;\n  period: string | null;\n}\n\n"
        "export interface SlenderRow {\n  name: string;\n  url: string;\n  date: string;\n  start: number;\n  end: number;\n"
        "  order: \"Doric\" | \"Ionic\";\n  height: number;\n  diameter: number;\n  ratio: number;\n  estimated: boolean;\n  quote: string;\n}\n\n"
        f"export const FLANKS: FlankRow[] = {json.dumps(flanks, ensure_ascii=False, indent=2)};\n\n"
        f"export const EXCLUDED: Record<string, string> = {json.dumps(EXCLUDED, ensure_ascii=False, indent=2)};\n\n"
        f"export const SLENDER: SlenderRow[] = {json.dumps(slender, ensure_ascii=False, indent=2)};\n\n"
        f"export const PERSEUS_FETCHED = {json.dumps(data['fetched'])};\n"
    )
    Path("src/data/temples.ts").write_text(header + body)
    print(f"{len(flanks)} flank rows, {len(slender)} slenderness rows written to src/data/temples.ts")


if __name__ == "__main__":
    main()
