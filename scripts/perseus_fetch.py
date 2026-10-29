#!/usr/bin/env python3
"""Fetch the Perseus Art & Architecture catalogue entries for temples and keep their fields.

    python3 scripts/perseus_fetch.py [--cache DIR]

Writes data/perseus-temples.json: for each of the catalogue's temples, the entry's URL, the
SHA-256 of the page as fetched, and the fields Perseus prints (date, dimensions, region,
period, architectural order, plan, summary). Pages are cached in DIR (default
.cache/perseus) so a rerun does not ask Perseus again; requests are spaced a second apart.
The Perseus catalogue is published under CC BY-SA 3.0 US by Tufts University.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import time
import urllib.request
from datetime import date
from pathlib import Path

BASE = "https://www.perseus.tufts.edu/hopper/"
LIST = BASE + "artifactBrowser?object=Building&field=Building%20Type&value=Temple"


def get(url: str) -> bytes:
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=60) as response:
                return response.read()
        except Exception:  # Perseus answers 503 "busy" under load; wait and retry.
            time.sleep(3 * (attempt + 1))
    raise SystemExit(f"Could not fetch {url}")


def clean(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


def field(page: str, name: str) -> str | None:
    match = re.search(r"<td><b>" + name + r":</b></td>\s*<td>(.*?)</td>", page, re.S)
    return clean(match.group(1)) if match else None


def paragraph(page: str, name: str) -> str | None:
    match = re.search(
        r"<b>" + name + r":</b>(.*?)(?=<b>[A-Z][A-Za-z ]+:</b>|<hr|</div>)", page, re.S
    )
    return clean(match.group(1)) if match else None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache", default=".cache/perseus")
    args = parser.parse_args()
    cache = Path(args.cache)
    cache.mkdir(parents=True, exist_ok=True)

    links: list[tuple[str, str]] = []
    for offset in range(0, 200, 10):
        page = get(LIST + (f"&page={offset}" if offset else "")).decode("utf-8", "replace")
        found = re.findall(r'<a href="(artifact\?[^"]*)"[^>]*>\s*([^<]*?)\s*</a>', page)
        new = [(html.unescape(a), html.unescape(b)) for a, b in found if html.unescape(a) not in {x for x, _ in links}]
        if not new:
            break
        links.extend(new)
        time.sleep(1)

    temples = []
    for href, name in links:
        path = cache / (hashlib.sha1(href.encode()).hexdigest()[:12] + ".html")
        if not path.exists():
            path.write_bytes(get(BASE + href))
            time.sleep(1)
        raw = path.read_bytes()
        page = raw.decode("utf-8", "replace")
        temples.append(
            {
                "name": name,
                "url": BASE + href,
                "sha256": hashlib.sha256(raw).hexdigest(),
                "date": field(page, "Date"),
                "dimensions": field(page, "Dimensions"),
                "region": field(page, "Region"),
                "period": field(page, "Period"),
                "order": paragraph(page, "Architectural Order"),
                "summary": field(page, "Summary"),
                "plan": paragraph(page, "Plan"),
                "history": paragraph(page, "History"),
            }
        )

    out = {
        "source": "Perseus Digital Library, Art & Archaeology Artifact Browser, Building Type: Temple",
        "license": "CC BY-SA 3.0 US, Tufts University",
        "fetched": date.today().isoformat(),
        "temples": temples,
    }
    Path("data/perseus-temples.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    print(f"{len(temples)} temples written to data/perseus-temples.json")


if __name__ == "__main__":
    main()
