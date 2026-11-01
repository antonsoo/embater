#!/usr/bin/env python3
"""Independently inspect a downloaded illustrated vocabulary HTML, not app state.

Requires fontTools/Brotli from requirements-fonts.txt. Run after the browser saves
an actual file; verifies font cmaps and ranges, images, licenses and native CSV.
"""
import argparse
import base64
import csv
import hashlib
from html.parser import HTMLParser
import io
import json
from pathlib import Path
import re
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('html', type=Path)
a = p.parse_args()
raw = a.html.read_bytes()
html = raw.decode()
sha = lambda b: hashlib.sha256(b).hexdigest()

class Reading(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.text = []
        self.images = []
        self.csv = []
        self.scripts = 0
        self.remote = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('style', 'script'):
            self.skip += 1
        if tag == 'script':
            self.scripts += 1
        if tag == 'img':
            self.images.append(base64.b64decode(attrs['src'].split(',', 1)[1]))
        if tag == 'a' and attrs.get('download', '').endswith('.csv'):
            self.csv.append(base64.b64decode(attrs['href'].split(',', 1)[1]))
        for key in ('src', 'srcset', 'poster'):
            if re.match(r'https?:', attrs.get(key, '')):
                self.remote.append(attrs[key])
    def handle_endtag(self, tag):
        if tag in ('style', 'script'):
            self.skip -= 1
    def handle_data(self, data):
        if not self.skip:
            self.text.append(data)

reading = Reading()
reading.feed(html)
assert reading.scripts == 0 and reading.remote == []
assert not re.search(r'url\(["\x27]?https?:', html)
manifest = json.loads((ROOT/'public/fonts/vocabulary-manifest.json').read_text())
paths = [ROOT/f'src/fonts/eb-garamond-{name}.woff2' for name in ('latin','latin-ext','greek','greek-ext')]
paths += [ROOT/font['path'] for font in manifest['fonts']]
expected = {sha(path.read_bytes()) for path in paths}
coverage = set()
fonts = []
for face in re.findall(r'@font-face\{([^}]+)\}', html):
    encoded = re.search(r'url\(data:font/woff2;base64,([^)]*)\)', face).group(1)
    data = base64.b64decode(encoded)
    points = set(TTFont(io.BytesIO(data)).getBestCmap())
    declared = set()
    for start, end in re.findall(r'U\+([0-9A-F]+)(?:-([0-9A-F]+))?', face.split('unicode-range:',1)[1]):
        declared.update(range(int(start,16),int(end or start,16)+1))
    assert points == declared, f'CSS/cmap mismatch: missing {sorted(points-declared)}, excess {sorted(declared-points)}'
    coverage.update(points)
    fonts.append({'sha256':sha(data),'bytes':len(data),'codepoints':len(points)})
assert len(fonts) == 9 and {font['sha256'] for font in fonts} == expected
missing = sorted({ord(c) for c in ''.join(reading.text) if ord(c)>=32}-coverage)
assert not missing, f'Unretained text glyphs: {missing}'
source_manifest = json.loads((ROOT/'public/sources/vocabulary/manifest.json').read_text())
source_hashes = {p['sha256']:p['page'] for p in source_manifest['plates']}
pages = [source_hashes[sha(image)] for image in reading.images]
assert len(reading.csv) == 1
rows = list(csv.reader(io.StringIO(reading.csv[0].decode())))
assert rows[0] == ['English part','Language','Stored name','Reading aid','Literal sense','Source']
assert all(len(row)==6 for row in rows)
for path in ('public/FONT-LICENSE.txt','public/fonts/VOCABULARY-OFL.txt','public/LICENSE.txt'):
    license_text = (ROOT/path).read_text()
    assert license_text.replace('\r\n','\n') in ''.join(reading.text).replace('\r\n','\n'), f'Missing license: {path}'
print(json.dumps({'htmlBytes':len(raw),'htmlSha256':sha(raw),'fonts':fonts,
                  'allTextGlyphsRetained':True,'sourcePages':pages,'csvRows':len(rows)-1,
                  'scripts':reading.scripts,'automaticRemoteResources':reading.remote,
                  'licenseTextsMatch':True},indent=2))
