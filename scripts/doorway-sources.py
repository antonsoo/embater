#!/usr/bin/env python3
"""Reproduce complete source plates from a hash-pinned public-domain PDF.

python3 scripts/doorway-sources.py /path/to/krohn-1912.pdf [--write]
Without --write, checks the retained pixels and bytes without editing them.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://archive.org/download/vitruviidearchit00vitr_1/vitruviidearchit00vitr_1.pdf'
PDF_HASH = 'b13a68789a8a1dc567b6f9b47eabe6a37a306329fbfc2c1a027a6c30a90d5139'
PDF_BYTES = 16915191

def digest(data):
    return hashlib.sha256(data).hexdigest()

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('pdf', type=Path)
parser.add_argument('--write', action='store_true')
a = parser.parse_args()
original = a.pdf.read_bytes()
if len(original) != PDF_BYTES or digest(original) != PDF_HASH:
    raise SystemExit('Original PDF differs from the reviewed source.')
plates = []
with tempfile.TemporaryDirectory(prefix='embater-doorways-') as tmp:
    subprocess.run(['pdftoppm', '-f', '106', '-l', '107', '-scale-to', '2100',
                    '-jpeg', '-jpegopt', 'quality=90', str(a.pdf), str(Path(tmp)/'page')], check=True)
    for printed, pdf_page in [(88, 106), (89, 107)]:
        rendered = (Path(tmp)/f'page-{pdf_page}.jpg').read_bytes()
        dest = ROOT/f'public/sources/doorways/krohn-{printed}.jpg'
        if a.write:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(rendered)
        retained = dest.read_bytes()
        # PDF render bytes can depend on Poppler/JPEG versions; report rather than silently replace.
        if retained != rendered:
            raise SystemExit(f'Page {printed} differs from this PDF render; inspect tool versions and pixels.')
        plates.append({'page': printed, 'pdfPage': pdf_page, 'path': f'sources/doorways/krohn-{printed}.jpg',
                       'url': f'https://archive.org/details/vitruviidearchit00vitr_1/page/n{pdf_page-1}/mode/1up',
                       'bytes': len(retained), 'sha256': digest(retained)})
manifest = {'title': 'Vitruvii De architectura libri decem', 'editor': 'F. Krohn',
            'year': 1912, 'originalUrl': URL, 'originalBytes': PDF_BYTES,
            'originalSha256': PDF_HASH, 'render': ['pdftoppm', '-f', '106', '-l', '107',
            '-scale-to', '2100', '-jpeg', '-jpegopt', 'quality=90', '<pdf>', '<prefix>'],
            'plates': plates}
manifest_path = ROOT/'public/sources/doorways/manifest.json'
ts_path = ROOT/'src/content/doorway-plates.ts'
ts = '/** Complete pages reproduced by scripts/doorway-sources.py; see source manifest. */\nexport const DOOR_PLATES = '+json.dumps(plates, ensure_ascii=False, indent=2)+' as const;\n'
if a.write:
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    ts_path.write_text(ts)
else:
    if json.loads(manifest_path.read_text()) != manifest:
        raise SystemExit('Source manifest differs from the independently reproduced identity.')
print(json.dumps({'originalSha256': PDF_HASH, 'plates': plates, 'renderBytesMatch': True}, indent=2))
