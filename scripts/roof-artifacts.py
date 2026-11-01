"""Check native SVG geometry against native CSV without using the TypeScript model."""
import csv
import json
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

SVG = "{http://www.w3.org/2000/svg}"
directory = Path(sys.argv[1] if len(sys.argv) > 1 else "examples/roof")
results = []
files = sorted(directory.glob("*.csv"))
assert files, f"No native CSV/SVG pairs in {directory}"
for file in files:
    root = ET.parse(file.with_suffix(".svg")).getroot()
    with file.open(newline="") as handle:
        rows = {row["Measurement"]: row for row in csv.DictReader(handle)}
    h = float(rows["Tympanum h"]["Drawing units"])
    assert abs(float(rows["Middle ornament"]["Drawing units"]) / h - 9 / 8) < 1e-12
    assert abs(float(rows["Corner ornament"]["Drawing units"]) / h - 1) < 1e-12
    assert abs(float(rows["Corona front"]["Drawing units"]) / h - 9) < 1e-12
    ornaments = []
    current = None
    for element in root.iter():
        if element.get("data-part") != "acroterion":
            continue
        if element.tag == SVG + "rect":
            if current is not None:
                ornaments.append(current)
            y = float(element.attrib["y"])
            current = [y, y + float(element.attrib["height"])]
        elif element.tag == SVG + "polygon":
            ys = [float(pair.split(",")[1]) for pair in element.attrib["points"].split()]
            assert current is not None
            current.extend(ys)
    assert current is not None
    ornaments.append(current)
    assert len(ornaments) == 3
    drawn = [max(ys) - min(ys) for ys in ornaments]
    for actual, ratio in zip(drawn, [1, 9 / 8, 1], strict=True):
        assert abs(actual - h * ratio) < 0.002, (file, actual, h * ratio)
    trial = next(el for el in root.iter() if el.get("data-part") == "roof-trial")
    assert abs(float(trial.attrib["height"]) - float(rows["Blue trial envelope"]["Drawing units"])) < 0.001
    assert not list(root.iter(SVG + "script"))
    assert not list(root.iter(SVG + "image"))
    styles = "".join(el.text or "" for el in root.iter(SVG + "style"))
    assert "vector-effect:non-scaling-stroke" in styles
    results.append({"svg": file.with_suffix(".svg").name, "drawnOrnamentHeights": drawn,
                    "csvH": h, "maxAllowedRounding": 0.002})
print(json.dumps(results, indent=2))
