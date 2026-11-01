#!/usr/bin/env python3
"""Compare canonical hosted bytes and immutable raw source to reviewed local bytes."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess
import urllib.request
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--base',default='https://antonsoo.github.io/embater/')
p.add_argument('--source',required=True)
p.add_argument('--encoding',choices=['gzip','identity'],default='gzip')
p.add_argument('--include-progress',action='store_true')
p.add_argument('--output',type=Path,required=True)
a=p.parse_args()
assert re.fullmatch('[a-f0-9]{40}',a.source)
sha=lambda b:hashlib.sha256(b).hexdigest()

def compare(item):
    kind,path,expected,url=item
    try:
        request=urllib.request.Request(url,headers={'User-Agent':'Embater-publication-audit','Accept-Encoding':a.encoding})
        with urllib.request.urlopen(request,timeout=30) as response:
            actual=response.read()
            if response.headers.get('Content-Encoding') == 'gzip':
                actual=gzip.decompress(actual)
            return {'kind':kind,'path':path,'url':url,'status':response.status,'contentEncoding':response.headers.get('Content-Encoding'),
                    'lastModified':response.headers.get('Last-Modified'),'age':response.headers.get('Age'),
                    'bytes':len(actual),'sha256':sha(actual),'expectedSha256':sha(expected),
                    'matches':actual==expected}
    except Exception as error:
        return {'kind':kind,'path':path,'url':url,'matches':False,'error':str(error)}

items=[]
for path in sorted((ROOT/'dist').rglob('*')):
    if path.is_file():
        relative=str(path.relative_to(ROOT/'dist'))
        items.append(('hosted',relative,path.read_bytes(),a.base+relative))
paths=['docs/vocabulary-audit.md','src/ui/drill.ts','src/core/drill-detail.ts',
       'src/content/vocabulary-contexts.ts','src/content/vocabulary-plates.ts',
       'src/content/vocabulary-fonts.ts','src/offline.ts','scripts/offline-worker.js',
       'public/fonts/VOCABULARY-OFL.txt','public/fonts/vocabulary-manifest.json',
       'public/sources/vocabulary/manifest.json']
paths += [str(path.relative_to(ROOT)) for path in sorted((ROOT/'public/sources/vocabulary').glob('*.jpg'))]
paths += [str(path.relative_to(ROOT)) for path in sorted((ROOT/'src/fonts').glob('vocabulary-*.woff2'))]
if a.include_progress:
    paths += ['docs/progress-concurrency-review.md','docs/progress-concurrency-design.md',
              'scripts/progress-tabs.mjs','src/drill.css']
for path in paths:
    expected=subprocess.check_output(['git','show',f'{a.source}:{path}'],cwd=ROOT)
    items.append(('source',path,expected,f'https://raw.githubusercontent.com/antonsoo/embater/{a.source}/{path}'))
with ThreadPoolExecutor(max_workers=8) as pool:
    rows=list(pool.map(compare,items))
result={'checkedAt':datetime.now(timezone.utc).isoformat(),'base':a.base,'source':a.source,'acceptEncoding':a.encoding,
        'hostedFiles':sum(r['kind']=='hosted' for r in rows),
        'sourceArtifacts':sum(r['kind']=='source' for r in rows),
        'allMatch':all(r['matches'] for r in rows),'rows':rows}
a.output.parent.mkdir(parents=True,exist_ok=True)
a.output.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='rows'}))
if not result['allMatch']:
    for row in rows:
        if not row['matches']:print(json.dumps(row))
    raise SystemExit(1)
