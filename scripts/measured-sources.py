#!/usr/bin/env python3
"""Reproduce the complete 1927 Erechtheum pp. 98-99 from a pinned original PDF."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
ROOT = Path(__file__).resolve().parents[1]
URL = 'https://archive.org/download/erechtheummeasur1192unse/erechtheummeasur1192unse.pdf'
SHA = '0746b45d82dd5e0a067c35207e96a5f08e785cc52ae05c39c42a2da0f642321d'
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('pdf', type=Path)
p.add_argument('--write', action='store_true')
a = p.parse_args()
original = a.pdf.read_bytes()
assert len(original) == 70645621 and hashlib.sha256(original).hexdigest() == SHA
plates = []
with tempfile.TemporaryDirectory(prefix='embater-survey-') as tmp:
    subprocess.run(['pdftoppm', '-f', '128', '-l', '129', '-scale-to', '2100', '-jpeg', '-jpegopt', 'quality=90', str(a.pdf), str(Path(tmp)/'page')], check=True)
    for printed, pdf in [(98,128),(99,129)]:
        data = (Path(tmp)/f'page-{pdf}.jpg').read_bytes()
        target = ROOT/f'public/sources/erechtheion/p{printed}.jpg'
        if a.write: target.write_bytes(data)
        assert target.read_bytes() == data, f'Printed p. {printed} differs from this render; inspect tool versions and pixels.'
        plates.append({'page':printed,'pdfPage':pdf,'path':f'sources/erechtheion/p{printed}.jpg','sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'url':f'{URL}#page={pdf}'})
manifest = {'title':'The Erechtheum, measured, drawn and restored','survey':'Gorham Phillips Stevens','editor':'James Morton Paton','year':1927,'publisher':'Harvard University Press, Cambridge, Massachusetts','originalUrl':URL,'originalBytes':len(original),'originalSha256':SHA,'rights':'1927 US publication; public domain in the United States. Complete unmodified page renders.','render':['pdftoppm','-f','128','-l','129','-scale-to','2100','-jpeg','-jpegopt','quality=90','<pdf>','<prefix>'],'plates':plates}
if a.write:
    (ROOT/'public/sources/erechtheion/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (ROOT/'src/content/measured-plates.ts').write_text('/** Complete 1927 survey pages; reproduced by scripts/measured-sources.py. */\nexport const MEASURED_PLATES = '+json.dumps(plates,indent=2)+' as const;\n')
else: assert json.loads((ROOT/'public/sources/erechtheion/manifest.json').read_text()) == manifest
print(json.dumps({'originalSha256':SHA,'renderBytesMatch':True,'plates':plates},indent=2))
