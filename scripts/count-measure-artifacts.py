#!/usr/bin/env python3
"""Read actual browser downloads. Geometry comes from SVG extents, not the TS formulas."""
import csv
import hashlib
import json
import math
import re
import sys
from base64 import b64decode
from pathlib import Path
from xml.etree import ElementTree as ET

root = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/embater-measure-review")
receipts = []
for path in sorted(root.glob("*-light.svg")) + sorted(root.glob("*-dark.svg")):
    tree = ET.fromstring(path.read_text())
    nodes = list(tree.iter())
    circles = [node for node in nodes if "data-trial-column" in node.attrib]
    assert circles
    radius = float(circles[0].attrib["r"])
    scale = 2 * radius
    assert all(float(c.attrib["r"]) == radius for c in circles)
    xs = [float(c.attrib["cx"]) for c in circles]
    ys = [float(c.attrib["cy"]) for c in circles]
    width, length = (max(xs) - min(xs)) / scale, (max(ys) - min(ys)) / scale
    # Count occupied points on an edge, and then the union without counting corners twice.
    fronts = sum(y == min(ys) for y in ys)
    flanks = sum(x == min(xs) for x in xs)
    assert fronts == 6 and len(circles) == 2 * fronts + 2 * flanks - 4
    platform = next(n for n in nodes if n.tag.endswith("rect") and n.attrib.get("fill") == "#eceee9")
    measured = {
        "axes": (width, length),
        "faces": (width + 2 * radius / scale, length + 2 * radius / scale),
        "platform": (float(platform.attrib["width"]) / scale, float(platform.attrib["height"]) / scale),
    }
    with path.with_suffix(".csv").open(newline="") as handle:
        records = list(csv.DictReader(handle))
    assert len(records) == 3
    for row in records:
        w, l = measured[row["endpoints"]]
        assert math.isclose(float(row["width_D"]), w, abs_tol=1e-12)
        assert math.isclose(float(row["length_D"]), l, abs_tol=1e-12)
        assert math.isclose(float(row["length_over_width"]), l / w, abs_tol=1e-12)
        assert int(row["flank_columns"]) == flanks
    html = path.with_suffix(".html").read_text()
    image = re.search(r'data-source-page="69" src="data:image/jpeg;base64,([^"]+)"', html)
    assert image
    digest = hashlib.sha256(b64decode(image[1])).hexdigest()
    assert digest == "783d80afa3c7401f826a74f484832d5f7e5d79255b19ae3e74b3bf35fa3878b4"
    fonts = re.findall(r"url\(data:font/woff2;base64,([^)]*)\)", html)
    expected = {
        "88603384163d301aebd5bd769832a8bfe3c9004ec24178417b9817f0ad32c63b",
        "f8d3fa06e20989a938972165406a1b731cdc7fe33ff2b0b6798c75aa63709901",
        "f6475b2f7530f248b5d3a0237d97dc2e1987665153dcb888fbeea3b0f9019b56",
        "3cd432d0dc2b756e69eea4325fd40f3515a31753445238f7fb5d349588192511",
    }
    assert {hashlib.sha256(b64decode(f)).hexdigest() for f in fonts} == expected
    assert path.with_name(path.stem + "-offline.html").read_text() == html
    assert "<script" not in html
    assert "Trial settings" in path.read_text()
    receipts.append({"file": path.name, "columns": len(circles), "endpoints": measured, "source_sha256": digest, "fonts": len(fonts)})
assert len(receipts) == 8, f"Expected eight browser downloads; got {len(receipts)}"
print(json.dumps({"downloads": receipts, "method": "SVG circle and rectangle extents / independent CSV parser; retained source and font SHA-256"}, indent=2))
