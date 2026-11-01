"""Check every fraction produced by the drawing formatter against retained font bytes."""
import json
from pathlib import Path
import subprocess
from fontTools.ttLib import TTFont

root=Path(__file__).resolve().parents[1]
values=json.loads(subprocess.check_output(['node','--import','tsx','--input-type=module','-e',
    'import{fmtModules}from"./src/core/common.ts";process.stdout.write(JSON.stringify(Array.from({length:25},(_,i)=>fmtModules(i/24))));'],cwd=root))
characters={ord(char) for text in values for char in text}
coverage=set()
files=[]
for file in sorted((root/'src/fonts').glob('*.woff2')):
    if file.name.startswith('eb-garamond-') and 'italic' not in file.name or file.name.startswith('vocabulary-'):
        coverage.update(TTFont(file).getBestCmap())
        files.append(file.name)
missing=characters-coverage
assert not missing, [f'U+{n:04X}' for n in sorted(missing)]
print(json.dumps({'formatterValues':values,'missing':[],'fontFiles':files,'drawingFractionsCovered':True},ensure_ascii=False,indent=2))
