from __future__ import annotations

import re
import urllib.request
from pathlib import Path
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / ".tmp-nomenclature"
PDF = TMP / "07-144.pdf"
PDF_URL = "https://www.joradp.dz/FTP/jo-francais/2007/F2007034.pdf"
TARGETS = {"1240", "1310", "2110", "2120", "2122"}
CODE_RE = re.compile(r"^\s*([12]\d{3})(?:\s+|$)")
REGIME_RE = re.compile(r"(?<![A-Z])(APAPC|PAPC|AM|AW|D)(?![A-Z])", re.I)


def clean(s: str | None) -> str:
    if not s:
        return ""
    return re.sub(r"\s+", " ", s.replace("\u00a0", " ").strip())


def main() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    if not PDF.exists() or PDF.stat().st_size < 100_000:
        urllib.request.urlretrieve(PDF_URL, PDF)

    found = {k: [] for k in TARGETS}
    tables_seen = 0
    rows_seen = 0

    with pdfplumber.open(PDF) as pdf:
        print(f"PDF pages: {len(pdf.pages)}")
        for page_no, page in enumerate(pdf.pages, 1):
            if page_no < 5:
                continue
            tables = page.extract_tables({
                "vertical_strategy": "lines",
                "horizontal_strategy": "lines",
                "snap_tolerance": 3,
                "join_tolerance": 3,
                "intersection_tolerance": 5,
            }) or []
            if tables:
                tables_seen += len(tables)
            for table in tables:
                for raw in table:
                    rows_seen += 1
                    cells = [clean(x) for x in (raw or [])]
                    if not cells:
                        continue
                    codes = []
                    for c in cells:
                        m = CODE_RE.match(c)
                        if m:
                            codes.append(m.group(1))
                    target = next((c for c in codes if c in TARGETS), None)
                    if target and len(found[target]) < 8:
                        regimes = [(i, c) for i, c in enumerate(cells) if REGIME_RE.fullmatch(c)]
                        x = [i for i, c in enumerate(cells) if clean(c).lower() in {"x", "×", "x.", "×."}]
                        found[target].append({"page": page_no, "cells": cells, "regimes": regimes, "x": x})

    print(f"Tables detected: {tables_seen}")
    print(f"Raw table rows: {rows_seen}")
    for code in sorted(TARGETS):
        items = found[code]
        print(f"\n=== {code}: {len(items)} rows captured ===")
        for item in items:
            print(f"PAGE {item['page']}")
            print("CELLS:", " | ".join(item["cells"]))
            print("REGIMES:", item["regimes"])
            print("X POSITIONS:", item["x"])


if __name__ == "__main__":
    main()
