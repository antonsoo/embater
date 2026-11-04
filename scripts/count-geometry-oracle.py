#!/usr/bin/env python3
"""Check independent SVG extents and exact decimal arithmetic against renderer output."""
import csv
from fractions import Fraction
import io
import json
import math
import sys
from xml.etree import ElementTree as ET

cases = 0
circles_checked = 0
for line in sys.stdin:
    case = json.loads(line)
    root = ET.fromstring(case['svg'])
    columns = [n for n in root.iter() if 'data-trial-column' in n.attrib]
    radius = Fraction(columns[0].attrib['r'])
    scale = 2 * radius
    xs = [Fraction(n.attrib['cx']) for n in columns]
    ys = [Fraction(n.attrib['cy']) for n in columns]
    assert len(columns) == 2 * (case['flank'] + 6) - 4
    assert len(set(zip(xs, ys))) == len(columns), 'No corner counted twice'
    centre = ((max(xs) - min(xs)) / scale, (max(ys) - min(ys)) / scale)
    # These are independent exact-decimal input calculations, not rounded TS numbers.
    expected = (5 * Fraction(str(case['trial']['frontPitch'])), (case['flank'] - 1) * Fraction(str(case['trial']['flankPitch'])))
    assert all(math.isclose(float(a), float(b), abs_tol=1e-12) for a, b in zip(centre, expected))
    selected = next(n for n in root.iter() if n.tag.endswith('rect') and n.attrib.get('stroke') == '#1f4e9c')
    for row in csv.DictReader(io.StringIO(case['csv'])):
        extra = 0 if row['endpoints'] == 'axes' else 1 if row['endpoints'] == 'faces' else 1 + 2 * Fraction(str(case['trial']['margin']))
        w, length = (dimension + extra for dimension in expected)
        assert math.isclose(float(row['width_D']), float(w), abs_tol=1e-12)
        assert math.isclose(float(row['length_D']), float(length), abs_tol=1e-12)
        assert math.isclose(float(row['length_over_width']), float(length / w), abs_tol=1e-12)
        if row['endpoints'] == case['trial']['edge']:
            assert math.isclose(float(selected.attrib['width']) / float(scale), float(w), abs_tol=1e-12)
            assert math.isclose(float(selected.attrib['height']) / float(scale), float(length), abs_tol=1e-12)
    _, _, width, height = map(float, root.attrib['viewBox'].split())
    for node in columns + [selected]:
        if node.tag.endswith('circle'):
            left, top = float(node.attrib['cx']) - float(radius), float(node.attrib['cy']) - float(radius)
            right, bottom = left + 2 * float(radius), top + 2 * float(radius)
        else:
            left, top = float(node.attrib['x']), float(node.attrib['y'])
            right, bottom = left + float(node.attrib['width']), top + float(node.attrib['height'])
        assert 0 <= left <= right <= width and 0 <= top <= bottom <= height
    cases += 1
    circles_checked += len(columns)
assert cases == 567
print(json.dumps({'cases': cases, 'circle_positions': circles_checked, 'checks': ['exact decimal dimensions', 'unique corner sharing', 'selected ruler versus SVG geometry', 'all CSV endpoints', 'geometry inside viewBox']}, indent=2))
