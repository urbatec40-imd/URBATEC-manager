from __future__ import annotations

import re
import urllib.request
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / ".tmp-nomenclature"
PDF = TMP / "07-144.pdf"
URL = "https://www.joradp.dz/FTP/jo-francais/2007/F2007034.pdf"
TARGETS = {"1240", "1310", "2110", "2120", "2122"}
REGIME_RE = re.compile(r"^(APAPC|AM|AW|D)$", re.I)
CODE_RE = re.compile(r"^\s*([12]\d{3})(?:\s+|$)")

def clean(s: str | None) -> str:
    return re.sub(r"\s+", " ", (s or "").replace("\u00a0", " ").strip())

def download():
    TMP.mkdir(parents=True, exist_ok=True)
    if PDF.exists() and PDF.stat().st_size > 100_000:
        return
    urllib.request.urlretrieve(URL, PDF)

def probe_row(cells: list[str], page: int):
    cells = [clean(c) for c in cells]
    if not any(cells):
        return
    code = None
    for c in cells:
        m = CODE_RE.match(c)
        if m:
            code = m.group(1)
            break
    regime_i = next((i for i, c in enumerate(cells) if REGIME_RE.fullmatch(c)), None)
    if not code or code not in TARGETS or regime_i is None:
        return
    right = []
    for i in range(len(cells)-1, regime_i, -1):
        if cells[i]:
            right.append((i, cells[i]))
    x_positions = [i for i, c in enumerate(cells) if c.lower() in {"x", "×"}]
    papc_positions = [i for i, c in enumerate(cells) if "papc" in c.lower()]
    left = [c for c in cells[:regime_i] if c]
    print(f"\nPAGE {page} | RUBRIQUE {code}")
    print("RIGHT ->", right)
    print("REGIME ->", cells[regime_i])
    print("LEFT <-", left)
    print("X ->", x_positions or "none")
    print("PAPC ->", papc_positions or "none")
    print("CELLS ->", cells)

def main():
    download()
    with pdfplumber.open(PDF) as pdf:
        for page_no, page in enumerate(pdf.pages, start=1):
            if page_no < 5:
                continue
            try:
                tables = page.extract_tables({
                    "vertical_strategy": "lines",
                    "horizontal_strategy": "lines",
                    "snap_tolerance": 3,
                    "join_tolerance": 3,
                    "intersection_tolerance": 5,
                    "text_tolerance": 2,
                })
            except Exception:
                tables = []
            for table in tables or []:
                for row in table or []:
                    probe_row(row, page_no)

if __name__ == "__main__":
    main()
