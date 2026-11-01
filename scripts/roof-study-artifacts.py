"""Independently inspect native roof readings, their embedded settings and actual geometry."""
import base64
import csv
import gzip
from fractions import Fraction as F
import hashlib
from html import unescape
from html.parser import HTMLParser
import io
import json
import math
from pathlib import Path
import re
import sys
from urllib.parse import parse_qs, urlparse
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SVG = "{http://www.w3.org/2000/svg}"
directory = Path(sys.argv[1] if len(sys.argv)>1 else "/tmp/claude-1000/embater-audit/studies")
files = sorted([*directory.glob("*.html"),*directory.glob("*.html.gz")])
assert files, f"No native readings in {directory}"
sha = lambda data: hashlib.sha256(data).hexdigest()
fonts = {sha(path.read_bytes()) for path in (ROOT/"src/fonts").glob("*.woff2")}
font_licenses = [(ROOT/"public/FONT-LICENSE.txt").read_bytes().decode(),(ROOT/"public/fonts/VOCABULARY-OFL.txt").read_bytes().decode()]

class Reading(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images=[]
        self.downloads={}
        self.scripts=0
        self.settings=[]
        self.in_settings=False
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag=="script": self.scripts+=1
        if tag=="img": self.images.append(attrs)
        if tag=="a" and "download" in attrs: self.downloads[attrs["download"]]=attrs["href"]
        if tag=="pre" and attrs.get("id")=="saved-settings": self.in_settings=True
    def handle_endtag(self,tag):
        if tag=="pre": self.in_settings=False
    def handle_data(self,data):
        if self.in_settings: self.settings.append(data)

def decode(uri):
    head,data=uri.split(",",1)
    assert head.startswith("data:") and ";base64" in head
    return base64.b64decode(data,validate=True)

def coordinates(element):
    if element.tag==SVG+"polygon":
        return [tuple(map(float,p.split(","))) for p in element.attrib["points"].split()]
    if element.tag==SVG+"rect":
        x,y,w,h=(float(element.attrib[k]) for k in ["x","y","width","height"])
        return [(x,y),(x+w,y+h)]
    raise AssertionError(element.tag)

results=[]
for file in files:
    raw=gzip.decompress(file.read_bytes()) if file.suffix==".gz" else file.read_bytes()
    html=raw.decode()
    parsed=Reading();parsed.feed(html)
    assert parsed.scripts==0
    settings=json.loads("".join(parsed.settings))
    assert settings["format"]=="embater-orders-v1"
    expected_pages=[73,74,84] if settings["order"]=="doric" else [72,73,74]
    images={int(image["data-source-page"]):decode(image["src"]) for image in parsed.images}
    assert sorted(images)==expected_pages
    for page,bytes_ in images.items():
        assert bytes_==(ROOT/f"public/sources/vocabulary/p{page}.jpg").read_bytes()
    embedded_fonts=re.findall(r"src:url\((data:font/woff2;base64,[A-Za-z0-9+/=]+)\)",html)
    assert len(embedded_fonts)==6
    for uri in embedded_fonts: assert sha(decode(uri)) in fonts
    decoded_html=unescape(html)
    for license_ in font_licenses: assert license_ in decoded_html
    assert (ROOT/"public/LICENSE.txt").read_bytes().decode() in decoded_html
    assert "@import" not in html and not re.search(r"url\(['\"]?https?://",html)
    svg_text=next(decode(uri).decode() for name,uri in parsed.downloads.items() if name.endswith(".svg"))
    csv_text=next(decode(uri).decode() for name,uri in parsed.downloads.items() if name.endswith(".csv"))
    root=ET.fromstring(svg_text)
    metadata=root.find(SVG+"metadata")
    assert metadata is not None
    assert json.loads(metadata.text)==settings
    rows={row["Measurement"]:row for row in csv.DictReader(io.StringIO(csv_text))}
    assert json.loads(rows["Settings"]["Drawing units"])==settings
    assert rows["Reopen experiment"]["Drawing units"]==settings["reopenUrl"]
    query=parse_qs(urlparse(settings["reopenUrl"]).fragment)
    assert query["order"]==[settings["order"]]
    assert int(query["columns"][0])==settings["columns"]
    assert float(query["feet"][0])==settings["unitFeet"]
    assert float(query["trial"][0])==settings["trialRatio"]
    assert query.get("target",["corner"])[0]==settings["trialTarget"]
    n=settings["columns"]
    if settings["order"]=="doric":
        between=2 if settings["spacing"]=="diastyle" else 1
        nominal=F(5,2)*((n-2)*(between+1)+between+2)+2
        h=(nominal+F(4,3))/9
    else:
        clear={"pycnostyle":F(3,2),"systyle":F(2),"eustyle":F(9,4),"diastyle":F(3)}[settings["spacing"]]
        nominal=n+(n-1)*clear+(F(3,4) if settings["spacing"]=="eustyle" else 0)
        column={"pycnostyle":F(10),"systyle":F(19,2),"eustyle":F(19,2),"diastyle":F(17,2)}[settings["spacing"]]+(F(2,3) if settings["order"]=="corinthian" else 0)
        feet=column*F(str(settings["unitFeet"]))
        divisor=13 if feet<=20 else F(25,2) if feet<=25 else 12 if feet<=30 else 12-F(math.ceil((feet-30)/5),2)
        epistyle=F(1,2) if feet<=15 else column/divisor
        projection=epistyle*F(4,7)
        h=(nominal+2*projection)/9
    actual_h=float(rows["Tympanum h"]["Drawing units"])
    assert abs(actual_h-float(h))<1e-10
    assert abs(float(rows["Tympanum h"]["Roman feet"])-float(h)*settings["unitFeet"])<1e-10
    svgs=[ET.fromstring(svg) for svg in re.findall(r"<svg\b[\s\S]*?</svg>",html)]
    assert len(svgs)==2
    front=svgs[1]
    shafts=[el for el in front.iter() if el.get("data-part")=="shaft" and "solid" in el.get("class","").split()]
    assert len(shafts)==n
    widths=[max(x for x,y in coordinates(el))-min(x for x,y in coordinates(el)) for el in shafts]
    unit=2 if settings["order"]=="doric" else 1
    for index,width in enumerate(widths):
        expected=unit*(1.02 if index in [0,n-1] else 1)
        assert abs(width-expected)<.002
    if settings["order"]!="doric":
        bases=[el for el in front.iter() if el.get("data-part")=="plinth"]
        assert len(bases)==n
        ratio=1.5 if settings["base"]=="attic" else 1.375
        for base,width in zip(bases,widths,strict=True):
            assert abs(float(base.attrib["width"])-ratio*width)<.002
    if settings["order"]=="ionic":
        eyes=[el for el in front.iter() if el.get("data-part")=="oculus" and el.tag==SVG+"circle"]
        grooves=[el for el in front.iter() if el.get("data-part")=="volute" and "groove" in el.get("class", "").split()]
        assert len(eyes)==len(grooves)==2*n
        for index,(eye,groove) in enumerate(zip(eyes,grooves,strict=True)):
            own_diameter=1.02 if index//2 in [0,n-1] else 1
            p=own_diameter*float(F(19,18) if feet<=25 else F(10,9))/19
            points=coordinates(groove)
            outer=points[:len(points)//2]
            assert len(outer)==257
            cx,cy=float(eye.attrib["cx"]),float(eye.attrib["cy"])
            for quarter in range(9):
                x,y=outer[quarter*32]
                assert abs(math.hypot(x-cx,y-cy)-(4.5-quarter/2)*p)<.002
    results.append({"file":file.name,"order":settings["order"],"columns":n,"sourcePages":expected_pages,"fontSubsets":len(embedded_fonts),"htmlSha256":sha(raw),"independentH":float(h),"drawnShaftWidths":widths,"modelNotes":settings["modelNotes"]})
print(json.dumps(results,indent=2))
