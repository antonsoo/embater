#!/usr/bin/env python3
"""Check actual browser artifacts, independently using Fraction and retained bytes.
Requires Python 3 and Poppler (pdftotext/pdfinfo). No third-party Python packages.
"""
import argparse
import base64
import csv
from fractions import Fraction as F
import gzip
import hashlib
import html
import json
from pathlib import Path
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
a = argparse.ArgumentParser(description=__doc__)
a.add_argument('directory', nargs='?', type=Path, default=ROOT/'examples/doorways')
a.add_argument('--output', type=Path, default=ROOT/'docs/doorway-review/artifacts.json')
args = a.parse_args()
p = args.directory
sha = lambda b: hashlib.sha256(b).hexdigest()
state = json.loads((p/'drawing.json').read_text())['choices']
ceiling = F(str(state['ceiling']))
height = ceiling * F(5 if state['reading']=='supplied' else 4, 7)
width = height * (F(11, 24) if state['kind']=='doric' else F(2, 5))
jamb = height / 14
jamb_top = jamb * F(13, 14)
divisor = 3 if height <= 16 else 4 if height <= 25 else 8 if height <= 30 else None
loss = jamb / divisor if divisor else F(0)
trial_inset = loss/2 if state['trial']=='rule' else F(str(state['trial']))*jamb
expected = {
    'Ceiling height': ceiling, 'Opening height': height, 'Opening width at foot': width,
    'Jamb width at foot': jamb, 'Jamb width at head': jamb_top,
    'Whole opening contraction': loss, 'Opening width at head': width-loss,
    'Each upper corner inset': loss/2, 'Lintel height': jamb_top,
    'Trial upper width': width-2*trial_inset,
    'Trial upper width minus rule': loss-2*trial_inset,
}
with (p/'measurements.csv').open(newline='') as f:
    rows = list(csv.DictReader(f))
assert len(rows)==len(expected)
errors = []
for row in rows:
    exact = expected[row['Measure']]
    error = abs(float(row['Roman feet'])-float(exact))
    assert error < 1e-12, (row, str(exact), error)
    errors.append(error)
# Independent Fraction oracle for all six metric fits, without importing model code.
metric_cases=[]
for rule,ratio in [('ionic',F(2,5)),('doric',F(11,24)),('square',F(1,2))]:
    for fit in ['height','width']:
        h,b=F(4882,1000),F(2427,1000)
        ph,pb=(h,h*ratio) if fit=='height' else (b/ratio,b)
        metric_cases.append({'rule':rule,'fit':fit,'height':str(ph),'width':str(pb),'heightError':str(ph-h),'widthError':str(pb-b)})
chosen=next(c for c in metric_cases if c['rule']==state['comparison']['rule'] and c['fit']==state['comparison']['fit'])
metric_expected=[F(4882,1000),F(2427,1000),F(44,1000),F(2339,1000),F(chosen['height']),F(chosen['width']),F(chosen['heightError']),F(chosen['widthError'])]
with (p/'metric.csv').open(newline='') as f: metric_rows=list(csv.DictReader(f))
assert len(metric_rows)==8
for row,exact in zip(metric_rows,metric_expected):
    assert abs(float(row['Metres'])-float(exact))<1e-12,(row,exact)
assert F(4882,1000)*F(1,2)-F(2427,1000)==F(14,1000)
assert F(2427,1000)*2-F(4882,1000)==-F(28,1000)
reading = gzip.decompress((p/'reading.html.gz').read_bytes()).decode()
assert not re.search(r'<script\b', reading, re.I)
images = [base64.b64decode(b) for b in re.findall(r'src="data:image/jpeg;base64,([^"]+)"', reading)]
manifest = json.loads((ROOT/'public/sources/doorways/manifest.json').read_text())
survey = json.loads((ROOT/'public/sources/erechtheion/manifest.json').read_text())
manifest['plates'] += survey['plates']
assert [sha(b) for b in images] == [row['sha256'] for row in manifest['plates']]
for image, plate in zip(images, manifest['plates']):
    assert image == (ROOT/'public'/plate['path']).read_bytes()
font_data = [base64.b64decode(b) for b in re.findall(r'url\(data:font/woff2;base64,([^\)]+)\)', reading)]
assert len(font_data)==4
for data, subset in zip(font_data, ['latin','latin-ext','greek','greek-ext']):
    assert data == (ROOT/f'src/fonts/eb-garamond-{subset}.woff2').read_bytes()
for license in ['LICENSE.txt','FONT-LICENSE.txt']:
    assert (ROOT/'public'/license).read_bytes().decode() in html.unescape(reading)
for name, filename in [('doorway.json','drawing.json'),('doorway.csv','measurements.csv'),('doorway.svg','drawing.svg'),('erechtheion.csv','metric.csv')]:
    m = re.search(r'download="'+re.escape(name)+r'" href="data:[^;]+;base64,([^"]+)"', reading)
    assert m, name
    assert base64.b64decode(m[1]) == (p/filename).read_bytes()
identity_data=re.search(r'download="doorway-sources.json" href="data:[^;]+;base64,([^"]+)"',reading)
identities=json.loads(base64.b64decode(identity_data[1]))
assert identities['measuredSurvey']['originalPdf']['sha256']==survey['originalSha256']
assert [v['sha256'] for v in identities['measuredSurvey']['pages']]==[v['sha256'] for v in survey['plates']]
for phrase in ['supplied semis','The Ionic jamb is H/14','shared endpoints 16']:
    assert phrase in reading, phrase
svg = ET.fromstring((p/'drawing.svg').read_bytes())
assert svg.tag == '{http://www.w3.org/2000/svg}svg'
metadata = json.loads(svg.find('{http://www.w3.org/2000/svg}metadata').text)
assert metadata['choices']==state
bbox = subprocess.check_output(['pdftotext','-bbox',str(p/'reading.pdf'),'-'])
root = ET.fromstring(bbox)
ns = {'x':'http://www.w3.org/1999/xhtml'}
pages = root.findall('.//x:page',ns)
assert pages
for number, page in enumerate(pages,1):
    for word in page.findall('x:word',ns):
        assert float(word.get('xMin'))>=15 and float(word.get('yMin'))>=15, (number,word.text)
        assert float(word.get('xMax'))<=float(page.get('width'))-15, (number,word.text)
        assert float(word.get('yMax'))<=float(page.get('height'))-15, (number,word.text)
text = subprocess.check_output(['pdftotext',str(p/'reading.pdf'),'-']).decode()
for phrase in ['A half changes the doorway','The casing’s own taper','The Ionic opening and casing','Complete font notices']:
    assert phrase.casefold() in text.casefold(), phrase
with tempfile.TemporaryDirectory(prefix='embater-pdf-images-') as tmp:
    subprocess.run(['pdfimages','-j',str(p/'reading.pdf'),str(Path(tmp)/'source')], check=True)
    pdf_images = [f.read_bytes() for f in sorted(Path(tmp).glob('source-*.jpg'))]
    assert [sha(b) for b in pdf_images] == [row['sha256'] for row in manifest['plates']]
report = {'boundary':'Actual native browser downloads; no hosted-publication claim',
          'choices':state, 'metricFractionOracle':metric_cases, 'fractionOracle':{k:str(v) for k,v in expected.items()},
          'maximumNumericError':max(errors), 'imageHashes':[sha(b) for b in images],
          'fontHashes':[sha(b) for b in font_data], 'nativeFilesByteMatch':4,
          'pdfPages':len(pages), 'pdfWordsInside15PointMargins':True,
          'pdfSourceImagesByteMatch':len(pdf_images),
          'artifacts':[{ 'file':f.name, 'bytes':f.stat().st_size, 'sha256':sha(f.read_bytes())}
                       for f in sorted(p.iterdir()) if f.is_file()]}
args.output.parent.mkdir(parents=True,exist_ok=True)
args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'pdfPages':len(pages),'measurements':len(expected),'maximumNumericError':max(errors),'sourcePages':len(images),'fontSubsets':len(font_data)}))
