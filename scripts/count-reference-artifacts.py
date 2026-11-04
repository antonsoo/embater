#!/usr/bin/env python3
"""Independently recover both trials from native SVG/JSON/CSV browser downloads."""
import csv
import hashlib
import json
import math
from pathlib import Path
import re
import sys
from base64 import b64decode
from xml.etree import ElementTree as ET

root = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/embater-count-reference')
catalogue = json.loads(Path('data/perseus-temples.json').read_text())
source_record = next(r for r in catalogue['temples'] if r['name'] == 'Priene, Temple of Athena')
expected_source = '783d80afa3c7401f826a74f484832d5f7e5d79255b19ae3e74b3bf35fa3878b4'
receipts = []
for path in sorted(root.glob('*.json')):
    if not re.fullmatch(r'(chromium|firefox)-(1440|375)-(light|dark)\.json', path.name):
        continue
    work = json.loads(path.read_text())
    assert work['format'] == 'embater-count-comparison' and work['version'] == 1
    assert work['current']['trial']['frontPitch'] == 3
    assert work['current']['trial']['flankPitch'] == 1.5
    assert work['reference']['trial']['frontPitch'] == 3
    assert work['reference']['trial']['flankPitch'] == 3
    svg = ET.fromstring(path.with_suffix('.svg').read_text())
    nodes = list(svg.iter())
    circles = [n for n in nodes if 'data-trial-column' in n.attrib]
    crosses = [n for n in nodes if 'data-held-column' in n.attrib]
    scale = 2 * float(circles[0].attrib['r'])
    current = [(float(n.attrib['cx']), float(n.attrib['cy'])) for n in circles]
    reference = []
    for node in crosses:
        point = re.match(r'M([-\d.]+) ([-\d.]+)h6m-3 -3v6', node.attrib['d'])
        assert point
        reference.append((float(point[1]) + 3, float(point[2])))
    dimensions = {}
    for key, points in [('current', current), ('reference', reference)]:
        assert len(points) == len(set(points)) == 30
        width = (max(x for x, _ in points) - min(x for x, _ in points)) / scale
        length = (max(y for _, y in points) - min(y for _, y in points)) / scale
        assert width == 15
        assert length == (15 if key == 'current' else 30)
        dimensions[key] = (width, length)
        assert work[key]['flank'] == 11 and work[key]['temple'] == 'priene-temple-of-athena'
    with path.with_suffix('.csv').open(newline='') as stream:
        rows = list(csv.DictReader(stream))
    assert len(rows) == 6
    for row in rows:
        w, length = dimensions[row['trial']]
        extra = 0 if row['endpoints'] == 'axes' else 1 if row['endpoints'] == 'faces' else 1 + 2 * work[row['trial']]['trial']['margin']
        w += extra
        length += extra
        assert math.isclose(float(row['width_D']), w)
        assert math.isclose(float(row['length_D']), length)
        assert math.isclose(float(row['length_over_width']), length / w)
        assert row['source_quote'] == 'Hexastyle peripteral temple with eleven columns on the sides'
        assert row['source_url'] == source_record['url']
        assert row['source_quote'] in source_record['plan']
        assert 'Tufts' in row['source_credit'] and 'by-sa/3.0/us' in row['source_license']
    metadata = ''.join(next(n for n in nodes if n.tag.endswith('metadata')).itertext())
    assert source_record['url'] in metadata and rows[0]['source_quote'] in metadata
    html = path.with_suffix('.html').read_text()
    image = re.search(r'data-source-page="69" src="data:image/jpeg;base64,([^"]+)"', html)
    assert image and hashlib.sha256(b64decode(image[1])).hexdigest() == expected_source
    assert 'Column count unchanged' in html
    assert '<script' not in html
    assert path.with_name(path.stem + '-offline.json').read_bytes() == path.read_bytes()
    assert path.with_name(path.stem + '-embedded.json').read_bytes() == path.read_bytes()
    assert path.with_name(path.stem + '-embedded.csv').read_bytes() == path.with_suffix('.csv').read_bytes()
    for href, _ in re.findall(r'href="([^\"]+)" download="([^\"]+)"', html):
        assert href.startswith('data:')
    receipts.append({'file': path.name, 'current_dimensions_D': dimensions['current'], 'reference_dimensions_D': dimensions['reference'], 'unique_perimeter_columns_each': 30, 'native_csv_rows': len(rows), 'catalogue_quote_and_credits_match': True, 'source_sha256': expected_source, 'native_files_from_static_reading_match': True})
assert len(receipts) == 8, len(receipts)
print(json.dumps({'method': 'Independent SVG point extents and CSV parser; compare source quote with retained catalogue; source SHA-256 and native file identity', 'receipts': receipts}, indent=2))
