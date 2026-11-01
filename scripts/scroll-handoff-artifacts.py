"""Inspect the actual compass CSVs downloaded through Embater's Gonia handoff."""
import csv
import hashlib
import json
import math
from pathlib import Path
import sys

folder=Path(sys.argv[1])
files=sorted(folder.glob('*-compass.csv'))
assert len(files)==4, 'Expected both engines and both viewport widths'
receipts=[]
for file in files:
    rows=list(csv.DictReader(file.open(newline='')))
    assert len(rows)==12
    previous=(0,54)
    for index,row in enumerate(rows,1):
        assert int(row['arc'])==index and int(row['pin'])==index
        centre=tuple(int(row[f'c{axis}_twelfths_e']) for axis in 'xy')
        start=tuple(int(row[f'start_{axis}_twelfths_e']) for axis in 'xy')
        end=tuple(int(row[f'end_{axis}_twelfths_e']) for axis in 'xy')
        assert start==previous
        assert end==(centre[0]+start[1]-centre[1],centre[1]-start[0]+centre[0])
        assert (start[0]-centre[0])**2+(start[1]-centre[1])**2==int(row['radius_squared_in_twelfths_e_squared'])
        assert float(row['sweep_degrees'])==90
        previous=end
    assert previous==(0,6)
    incoming=(previous[0]-centre[0],previous[1]-centre[1])
    eye_radius=previous
    cross=incoming[0]*eye_radius[1]-incoming[1]*eye_radius[0]
    dot=incoming[0]*eye_radius[0]+incoming[1]*eye_radius[1]
    angle=math.degrees(math.atan2(abs(cross),dot))
    assert abs(angle-float(rows[-1]['next_join_degrees']))<1e-10
    assert 8.13<angle<8.14
    receipts.append({'file':file.name,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'exactClockwiseQuarters':12,'endTwelfthsEyeDiameter':previous,'independentFinalDirectionDifferenceDegrees':angle,'contactDoesNotImplyTangency':True})
print(json.dumps(receipts,indent=2))
