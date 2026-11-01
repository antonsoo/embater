#!/usr/bin/env python3
"""Retain small, licensed subsets for glyphs absent from the existing reading fonts.

Original font files are supplied explicitly and hash-pinned. Requires the versions
in requirements-fonts.txt. --write regenerates; otherwise every output is checked.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import subprocess
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://raw.githubusercontent.com/notofonts/noto-fonts/ffebf8c1ee449e544955a7e813c54f9b73848eac/hinted/ttf/'
SOURCES = [
    ('cjk', 'NotoSerifCJKtc', '234301038e76e7c35c43113785024700c4e4fe7bdce1d1fbbc42fca7e6683798',
     'https://raw.githubusercontent.com/notofonts/noto-cjk/f8d157532fbfaeda587e826d4cd5b21a49186f7c/Serif/OTF/TraditionalChinese/NotoSerifCJKtc-Regular.otf',
     lambda n: 0x3400 <= n <= 0x9fff),
    ('devanagari', 'NotoSerifDevanagari', '7d4e2b1a7712840218a2726d598490647959ed1104934f3d30a72e77b7c51dad',
     BASE+'NotoSerifDevanagari/NotoSerifDevanagari-Regular.ttf', lambda n: 0x900 <= n <= 0x97f),
    ('old-persian', 'NotoSansOldPersian', 'd7fd6043405eed81e3238a2c42469562d57e2b384c071e491d8750cb5cad6438',
     BASE+'NotoSansOldPersian/NotoSansOldPersian-Regular.ttf', lambda n: 0x103a0 <= n <= 0x103df),
    ('math', 'NotoSansMath', '80b61fd613d3519197e64fff6f7e71fdc7f3e6526440ea4115b554ef7fd59af7',
     BASE+'NotoSansMath/NotoSansMath-Regular.ttf', lambda n: 0x2700 <= n <= 0x27ff),
    ('latin-extra', 'NotoSerif', 'c8f669ceb2c9c60ccf55198b305e08a997ffca79a38cc7eeb551e643cbe66505',
     BASE+'NotoSerif/NotoSerif-Regular.ttf', lambda n: n < 0x3400 or 0xa720 <= n <= 0xa7ff),
]
p = argparse.ArgumentParser(description=__doc__)
for name, *_ in SOURCES:
    p.add_argument('--'+name, type=Path, required=True)
p.add_argument('--license', type=Path, required=True)
p.add_argument('--write', action='store_true')
a = p.parse_args()
sha = lambda b: hashlib.sha256(b).hexdigest()
license_bytes = a.license.read_bytes()
if sha(license_bytes) != '6a73f9541c2de74158c0e7cf6b0a58ef774f5a780bf191f2d7ec9cc53efe2bf2':
    raise SystemExit('The supplied SIL OFL differs from the identified source.')
text = subprocess.check_output(['node','--import','tsx','--input-type=module','-e',
    'import{GREEK_TERMS,PLAN_TERMS}from"./src/content/terms.ts";import{PLATES}from"./src/content/world.ts";import{RULES}from"./src/core/rules.ts";import{VOCABULARY_CONTEXTS}from"./src/content/vocabulary-contexts.ts";process.stdout.write(JSON.stringify([...GREEK_TERMS,...PLAN_TERMS,...PLATES,...RULES.values(),VOCABULARY_CONTEXTS]));'], cwd=ROOT).decode()
def unicode_ranges(codepoints):
    ranges=[]
    for n in sorted(codepoints):
        if ranges and ranges[-1][1] == n-1:ranges[-1][1]=n
        else:ranges.append([n,n])
    return ','.join(f'U+{start:04X}' if start == end else f'U+{start:04X}-{end:04X}' for start,end in ranges)
base_codepoints = set()
base_ranges=[]
base_styles=[]
for name in ['latin','latin-ext','greek','greek-ext']:
    points = TTFont(ROOT/f'src/fonts/eb-garamond-{name}.woff2').getBestCmap()
    base_codepoints.update(points)
    ranges=unicode_ranges(points)
    base_ranges.append(ranges)
    base_styles.append(f'@font-face{{font-family:"EB Garamond";font-style:normal;font-weight:400 700;font-display:swap;src:url(./eb-garamond-{name}.woff2) format("woff2");unicode-range:{ranges};}}')

missing = {ord(char) for char in text if ord(char) >= 32} - base_codepoints
plates, licenses, styles = [], [], []
for name, family, source_hash, url, belongs in SOURCES:
    source_path = getattr(a, name.replace('-','_'))
    data = source_path.read_bytes()
    if sha(data) != source_hash:
        raise SystemExit(f'{family}: original font differs from its identified source.')
    codepoints = sorted(n for n in missing if belongs(n))
    font = TTFont(io.BytesIO(data), recalcTimestamp=False)
    if not set(codepoints) <= set(font.getBestCmap()):
        raise SystemExit(f'{family}: selected source lacks required characters.')
    copyright_notice = font['name'].getDebugName(0)
    options = subset.Options()
    options.name_IDs = ['*']
    options.name_legacy = True
    options.name_languages = ['*']
    options.notdef_outline = True
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=codepoints)
    sub.subset(font)
    # Subsets are modified fonts, clearly named for this edition; original notices stay.
    new_name = 'Embater '+name.replace('-',' ').title()
    ps_name = 'Embater'+name.replace('-','').title()
    for record in font['name'].names:
        if record.nameID in [1,4,16]: record.string = new_name.encode(record.getEncoding())
        elif record.nameID in [2,17]: record.string = 'Regular'.encode(record.getEncoding())
        elif record.nameID in [3,6]: record.string = ps_name.encode(record.getEncoding())
    if 'CFF ' in font:
        cff = font['CFF '].cff
        cff.fontNames = [ps_name]
        cff.topDictIndex[0].FamilyName = new_name
        cff.topDictIndex[0].FullName = new_name
    font.flavor = 'woff2'
    buf = io.BytesIO()
    font.save(buf, reorderTables=True)
    result = buf.getvalue()
    dest = ROOT/f'src/fonts/vocabulary-{name}.woff2'
    if a.write: dest.write_bytes(result)
    if dest.read_bytes() != result:
        raise SystemExit(f'{name}: retained subset differs from this deterministic build.')
    actual = TTFont(io.BytesIO(result)).getBestCmap()
    if not set(codepoints) <= set(actual): raise SystemExit(f'{name}: subset lost a required glyph.')
    ranges = unicode_ranges(codepoints)
    plates.append({'name':name, 'path':str(dest.relative_to(ROOT)), 'source':url, 'sourceSha256':source_hash,
                   'copyright':copyright_notice, 'bytes':len(result), 'sha256':sha(result),
                   'codepoints':codepoints, 'range':ranges})
    licenses.append(f'{new_name}: subset derived from {family}.\n{copyright_notice}\nOriginal: {url}\n')
    styles.append(f'@font-face{{font-family:"Embater Supplement";font-style:normal;font-weight:400;font-display:swap;src:url(./vocabulary-{name}.woff2) format("woff2");unicode-range:{ranges};}}')
    missing.difference_update(codepoints)
if missing:
    raise SystemExit('Uncovered vocabulary glyphs: '+','.join(f'U+{n:04X}' for n in sorted(missing)))
notice = ('Embater vocabulary font subsets\n\n'+'\n'.join(licenses)+'\n'+license_bytes.decode()).encode()
outputs = {
    ROOT/'public/fonts/VOCABULARY-OFL.txt':notice,
    ROOT/'public/fonts/vocabulary-manifest.json':(json.dumps({'fonts':plates,'allCurrentVocabularyGlyphsCovered':True},ensure_ascii=False,indent=2)+'\n').encode(),
    ROOT/'src/fonts/vocabulary.css':('/* Small subsets for the current source-language vocabulary; see public/fonts/VOCABULARY-OFL.txt. */\n'+'\n'.join(base_styles+styles)+'\n').encode(),
}
imports = '\n'.join(f'import font{i} from "../fonts/vocabulary-{item["name"]}.woff2?url";' for i,item in sorted(enumerate(plates),key=lambda item:item[1]['name']))
entries = ',\n'.join('{url:font'+str(i)+',hash:'+json.dumps(item['sha256'])+',range:'+json.dumps(item['range'])+'}' for i,item in enumerate(plates))
ts = f'''// Source identities and reproduction: scripts/vocabulary-fonts.py.

{imports}
import {{ PLAN_FONTS }} from "./plan-fonts";
export const VOCABULARY_FONTS = [
...PLAN_FONTS.map((font,index)=>({{...font,range:{json.dumps(base_ranges)}[index] ?? font.range}})),
{entries}
] as const;
export const VOCABULARY_FONT_LICENSE_HASH = "{sha(notice)}";
'''
outputs[ROOT/'src/content/vocabulary-fonts.ts'] = ts.encode()
for path in [ROOT/'src/fonts/vocabulary.css',ROOT/'src/content/vocabulary-fonts.ts']:
    outputs[path] = subprocess.check_output([str(ROOT/'node_modules/.bin/biome'),'format','--stdin-file-path',str(path)],input=outputs[path],cwd=ROOT)
for dest,result in outputs.items():
    if a.write:
        dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(result)
    elif dest.read_bytes() != result:
        raise SystemExit(f'{dest.name}: retained provenance differs from the reproduced output.')
print(json.dumps({'fonts':plates,'allCurrentVocabularyGlyphsCovered':True,'subsetBytes':sum(x['bytes'] for x in plates),'licenseSha256':sha(notice)},ensure_ascii=False,indent=2))
