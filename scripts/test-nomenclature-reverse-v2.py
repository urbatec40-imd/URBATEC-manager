from __future__ import annotations

import json
import re
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / ".tmp-nomenclature" / "07-144.pdf"

REGIME_RE = re.compile(r"(?<![A-Z])(APAPC|PAPC|AM|AW|D)(?![A-Z])", re.I)
CODE_RE = re.compile(r"^\s*([12]\d{3})(?:\s+|$)")
DOC_NAMES = {
    "Étude d’impact": ("étude d’impact", "etude d’impact", "etude d'impact"),
    "Étude de dangers": ("étude de dangers", "etude de dangers"),
    "Notice d’impact": ("notice d’impact", "notice d'impact"),
    "Rapport sur les produits dangereux": ("rapport sur les produits dangereux", "rapport produits dangereux"),
}


def clean(v):
    if not v:
        return ""
    s = str(v).replace("\u00a0", " ")
    for a, b in {
        "Ã©":"é","Ã¨":"è","Ãª":"ê","Ã®":"î","Ã´":"ô","Ã¹":"ù","Ã§":"ç","Â":"",
        "â€™":"’","â€“":"–","â€œ":"“","â€":"”","È":"é","Ë":"ê","Í":"î","Ú":"û","‡":"à",
    }.items():
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s).strip()


def is_x(v):
    return clean(v).lower().strip(".") in {"x", "×"}


def is_regime(v):
    return bool(REGIME_RE.fullmatch(clean(v)))


def code_of(v):
    m = CODE_RE.match(clean(v))
    return m.group(1) if m else None


def find_regime_from_right(cells):
    for i in range(len(cells) - 1, -1, -1):
        if is_regime(cells[i]):
            return i
    return None


def document_headers(tables):
    headers = {}
    for table in tables:
        for row in (table or [])[:20]:
            for i, cell in enumerate(row or []):
                n = clean(cell).lower()
                for key, labels in DOC_NAMES.items():
                    if any(label in n for label in labels):
                        headers[key] = i
    return headers


def analyse_table(table, page_no):
    headers = document_headers([table])
    current = None
    results = []
    for raw in table or []:
        cells = [clean(c) for c in (raw or [])]
        if not cells:
            continue
        codes = [code_of(c) for c in cells]
        code = next((x for x in codes if x), None)
        if code:
            current = code
        if not current:
            continue

        # Reverse reading: start from the decision side.
        regime_idx = find_regime_from_right(cells)
        if regime_idx is None:
            continue
        regime = clean(cells[regime_idx]).upper().replace("PAPC", "APAPC")
        right = cells[regime_idx + 1 :]
        rayon = next((c for c in right if c and not is_x(c)), "")

        docs = {k: False for k in DOC_NAMES}
        if headers:
            for key, idx in headers.items():
                if idx < len(cells):
                    docs[key] = is_x(cells[idx])
        else:
            r_idx = next((i for i in range(regime_idx + 1, len(cells)) if clean(cells[i]) == rayon), None)
            if r_idx is not None:
                for off, key in enumerate(docs, 1):
                    if r_idx + off < len(cells):
                        docs[key] = is_x(cells[r_idx + off])

        # Reconstruct all meaningful left-side text as a single legal phrase.
        left = [c for c in cells[:regime_idx] if c and not code_of(c)]
        left_text = clean(" ".join(left))
        if not left_text:
            continue

        decision_signal = any(docs.values()) or regime in {"AM", "AW", "APAPC", "D"}
        if not decision_signal:
            continue

        results.append({
            "rubrique": current,
            "page": page_no,
            "regime": regime,
            "rayon": rayon,
            "documents": docs,
            "leftText": left_text,
            "cells": cells,
        })
    return results


def main():
    if not PDF.exists():
        raise SystemExit(f"PDF introuvable: {PDF}")

    page_count = 0
    table_count = 0
    raw_row_count = 0
    decision_rows = []
    codes = set()

    settings_list = [
        {"vertical_strategy": "lines", "horizontal_strategy": "lines", "snap_tolerance": 3, "join_tolerance": 3, "intersection_tolerance": 5, "text_tolerance": 2},
        {"vertical_strategy": "text", "horizontal_strategy": "lines", "snap_tolerance": 3, "join_tolerance": 3, "min_words_vertical": 1, "min_words_horizontal": 1},
    ]

    with pdfplumber.open(PDF) as pdf:
        page_count = len(pdf.pages)
        for page_no, page in enumerate(pdf.pages, 1):
            if page_no < 5:
                continue
            page_tables = []
            for settings in settings_list:
                try:
                    page_tables = page.extract_tables(settings) or []
                except Exception:
                    page_tables = []
                if page_tables:
                    break
            table_count += len(page_tables)
            for table in page_tables:
                raw_row_count += len(table or [])
                for row in analyse_table(table, page_no):
                    decision_rows.append(row)
                    if row["rubrique"]: codes.add(row["rubrique"])

    print(f"PDF pages: {page_count}")
    print(f"Tables detected: {table_count}")
    print(f"Raw table rows: {raw_row_count}")
    print(f"Decision rows detected: {len(decision_rows)}")
    print(f"Rubriques detected: {len(codes)}")

    for target in ("1240", "1310", "2110", "2120", "2122"):
        matches = [r for r in decision_rows if r["rubrique"] == target]
        print(f"\nTEST {target}: {len(matches)} decision rows")
        for i, r in enumerate(matches[:8], 1):
            print(f"  {i}. regime={r['regime']} rayon={r['rayon']} docs={r['documents']}")
            print(f"     left={r['leftText'][:280]}")

    out = ROOT / "public" / "data" / "nomenclature-07-144-reverse-test-v2.json"
    out.write_text(json.dumps(decision_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote diagnostic: {out}")


if __name__ == "__main__":
    main()
