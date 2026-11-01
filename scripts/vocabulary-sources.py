#!/usr/bin/env python3
"""Reproduce full source pages for the vocabulary's existing Vitruvius excerpts.

Requires Node (with installed dev dependencies), Poppler, and Python's standard
library. No network request is made. Pass the original identified PDF; --write
explicitly regenerates assets. Otherwise every retained byte is checked.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://archive.org/download/vitruviidearchit00vitr_1/vitruviidearchit00vitr_1.pdf'
HASH = 'b13a68789a8a1dc567b6f9b47eabe6a37a306329fbfc2c1a027a6c30a90d5139'
SIZE = 16915191
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('pdf', type=Path)
parser.add_argument('--write', action='store_true')
args = parser.parse_args()
sha = lambda data: hashlib.sha256(data).hexdigest()
original = args.pdf.read_bytes()
if len(original) != SIZE or sha(original) != HASH:
    raise SystemExit('Original PDF differs from the identified 1912 witness.')
rules = json.loads(subprocess.check_output([
    'node', '--import', 'tsx', '--input-type=module', '-e',
    'import {RULES} from "./src/core/rules.ts";process.stdout.write(JSON.stringify([...RULES.values()]));'
], cwd=ROOT))
pages = sorted({page for rule in rules for page in range(rule['page'], rule.get('pageEnd', rule['page']) + 1)})
plates = []
with tempfile.TemporaryDirectory(prefix='embater-vocabulary-') as temporary:
    for printed in pages:
        pdf_page = printed + 18
        prefix = Path(temporary) / f'p{printed}'
        subprocess.run(['pdftoppm', '-f', str(pdf_page), '-l', str(pdf_page), '-scale-to', '2100',
                        '-jpeg', '-jpegopt', 'quality=90', '-singlefile', str(args.pdf), str(prefix)], check=True)
        rendered = prefix.with_suffix('.jpg').read_bytes()
        dest = ROOT / f'public/sources/vocabulary/p{printed}.jpg'
        if args.write:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(rendered)
        if dest.read_bytes() != rendered:
            raise SystemExit(f'Printed page {printed} differs from the fresh render. Check tool versions and pixels.')
        plates.append({'page': printed, 'pdfPage': pdf_page,
                       'path': f'sources/vocabulary/p{printed}.jpg',
                       'url': f'https://archive.org/details/vitruviidearchit00vitr_1/page/n{pdf_page-1}/mode/1up',
                       'bytes': len(rendered), 'sha256': sha(rendered)})
manifest = {'title': 'Vitruvii De architectura libri decem', 'editor': 'F. Krohn', 'year': 1912,
            'originalUrl': URL, 'originalBytes': SIZE, 'originalSha256': HASH,
            'render': ['pdftoppm', '-f', '<printed page + 18>', '-l', '<same PDF page>',
                       '-scale-to', '2100', '-jpeg', '-jpegopt', 'quality=90', '-singlefile', '<pdf>', '<prefix>'],
            'plates': plates}
manifest_path = ROOT / 'public/sources/vocabulary/manifest.json'
ts_path = ROOT / 'src/content/vocabulary-plates.ts'
if args.write:
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    ts_path.write_text('/** Complete printed pages reproduced by scripts/vocabulary-sources.py. */\nexport const VOCABULARY_PLATES = ' + json.dumps(plates, ensure_ascii=False, indent=2) + ' as const;\n')
else:
    if json.loads(manifest_path.read_text()) != manifest:
        raise SystemExit('Retained manifest differs from the reproduced source identities.')
    # The generated TypeScript must name the same pages, paths and digests.
    actual = json.loads(subprocess.check_output([
        'node', '--import', 'tsx', '--input-type=module', '-e',
        'import {VOCABULARY_PLATES} from "./src/content/vocabulary-plates.ts";process.stdout.write(JSON.stringify(VOCABULARY_PLATES));'
    ], cwd=ROOT))
    if actual != plates:
        raise SystemExit('App source identities differ from the reproduced manifest.')
print(json.dumps({'originalSha256': HASH, 'rules': len(rules), 'pages': len(plates),
                  'retainedBytes': sum(p['bytes'] for p in plates), 'renderBytesMatch': True,
                  'plates': plates}, indent=2))
