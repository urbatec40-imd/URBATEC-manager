from __future__ import annotations

import re
import urllib.request
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / ".tmp-nomenclature"
PDF = TMP / "07-144.pdf"
URLS = [
    "https://www.joradp.dz/FTP/jo-francais/2007/F2007034.pdf",
    "https://creg.gov.dz/T%C3%A9l%C3%A9charger/487/autorisation-dexploitation-de-letablissement-classe/13053/decret-executif-n07-144-du-19-mai-2007.pdf",
]
TARGETS = {"1240", "1310", "2110", "2120", "2122"}
CODE_RE = re.compile(r"(?<!\d)([12]\d{3})(?!\d)")
REGIME_RE = re.compile(r"^(AM|AW|APAPC|PAPC|D)$", re.I)


def clean(value: str | None) -> str:
    if not value:
        return ""
    replacements = {
        "Ã©": "é", "Ã¨": "è", "Ãª": "ê", "Ã®": "î", "Ã´": "ô", "Ã¹": "ù", "Ã§": "ç",
        "Ã‰": "É", "Ã€": "À", "Ã‚": "Â", "Ã”": "Ô", "Ã›": "Û", "Â": "",
        "â€™": "’", "â€“": "–", "â€œ": "“", "â€": "”",
        "È": "é", "Ë": "ê", "Í": "î", "Ú": "û", "‡": "à",
    }
    for a, b in replacements.items():
        value = value.replace(a, b)
    return re.sub(r"\s+", " ", value.replace("\u00a0", " ")).strip()


def download_pdf() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    if PDF.exists() and PDF.stat().st_size > 100_000:
        return
    last = None
    for url in URLS:
        try:
            urllib.request.urlretrieve(url, PDF)
            if PDF.exists() and PDF.stat().st_size > 100_000:
                return
        except Exception as exc:
            last = exc
    raise SystemExit(f"Impossible de télécharger le PDF officiel: {last}")


def settings_list():
    return [
        {"vertical_strategy": "lines", "horizontal_strategy": "lines", "snap_tolerance": 3, "join_tolerance": 3, "intersection_tolerance": 5, "text_tolerance": 2},
        {"vertical_strategy": "lines", "horizontal_strategy": "text", "snap_tolerance": 3, "join_tolerance": 3, "intersection_tolerance": 5, "text_tolerance": 2},
        {"vertical_strategy": "text", "horizontal_strategy": "lines", "snap_tolerance": 3, "join_tolerance": 3, "min_words_vertical": 1, "min_words_horizontal": 1},
    ]


def row_codes(cells: list[str]) -> set[str]:
    found: set[str] = set()
    for cell in cells:
        found.update(CODE_RE.findall(cell))
    return found


def print_row(cells: list[str]) -> None:
    parts = []
    for i, cell in enumerate(cells):
        c = clean(cell)
        if not c:
            continue
        if REGIME_RE.fullmatch(c):
            c = f"<REGIME:{c.upper()}>"
        elif c.lower() in {"x", "×"}:
            c = "<X>"
        parts.append(f"[{i}] {c}")
    if parts:
        print("    " + " | ".join(parts))


def main():
    download_pdf()
    print(f"PDF: {PDF} ({PDF.stat().st_size} bytes)")
    total_tables = 0
    total_rows = 0
    hits = {code: 0 for code in TARGETS}

    with pdfplumber.open(PDF) as pdf:
        print(f"PDF pages: {len(pdf.pages)}")
        for page_no, page in enumerate(pdf.pages, start=1):
            if page_no < 5:
                continue
            page_tables = []
            for settings in settings_list():
                try:
                    tables = page.extract_tables(settings)
                except Exception:
                    tables = []
                if tables:
                    page_tables = tables
                    break
            total_tables += len(page_tables)
            for table_no, table in enumerate(page_tables, start=1):
                for row_no, raw in enumerate(table or [], start=1):
                    cells = [clean(c) for c in (raw or [])]
                    if not any(cells):
                        continue
                    total_rows += 1
                    codes = row_codes(cells)
                    wanted = codes & TARGETS
                    if not wanted:
                        continue
                    for code in sorted(wanted):
                        hits[code] += 1
                        print(f"\n===== {code} | page {page_no} | table {table_no} | row {row_no} =====")
                        print_row(cells)
                        # Show physical right-to-left interpretation without changing data.
                        right = list(reversed([(i, c) for i, c in enumerate(cells) if c]))
                        if right:
                            print("    RIGHT->LEFT:")
                            print("    " + " -> ".join(f"[{i}] {c}" for i, c in right))

    print("\n===== SUMMARY =====")
    print(f"Tables detected: {total_tables}")
    print(f"Non-empty rows: {total_rows}")
    for code in sorted(TARGETS):
        print(f"{code}: {hits[code]} matching raw rows")


if __name__ == "__main__":
    main()
