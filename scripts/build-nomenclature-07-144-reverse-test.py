from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / ".tmp-nomenclature"
PDF = TMP / "07-144.pdf"
OUT = ROOT / "public" / "data" / "nomenclature-07-144-reverse-test.json"
PDF_URL = "https://www.joradp.dz/FTP/jo-francais/2007/F2007034.pdf"
REGIMES = {"AM", "AW", "APAPC", "PAPC", "D"}
CODE_RE = re.compile(r"^\s*([12]\d{3})(?:\s+|$)")
NUMBER = r"[0-9]+(?:[.,][0-9]+)?"
DOC_KEYS = ("impact", "danger", "notice", "rapportDangereux")
DOC_LABELS = {
    "impact": ("étude d’impact", "etude d’impact", "etude d'impact"),
    "danger": ("étude de dangers", "etude de dangers"),
    "notice": ("notice d’impact", "notice d'impact"),
    "rapportDangereux": ("rapport sur les produits dangereux", "rapport produits dangereux"),
}


def clean(s: str | None) -> str:
    if not s:
        return ""
    replacements = {
        "Ã©": "é", "Ã¨": "è", "Ãª": "ê", "Ã®": "î", "Ã´": "ô", "Ã¹": "ù", "Ã§": "ç",
        "Ã‰": "É", "Ã€": "À", "Ã‚": "Â", "Ã”": "Ô", "Ã›": "Û", "Â": "",
        "â€™": "’", "â€“": "–", "â€œ": "“", "â€": "”",
        "È": "é", "Ë": "ê", "Í": "î", "Ú": "û", "‡": "à",
    }
    for a, b in replacements.items():
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s.replace("\u00a0", " ")).strip()


def norm(s: str) -> str:
    return clean(s).lower().replace("’", "'")


def is_code(s: str) -> str | None:
    m = CODE_RE.match(clean(s))
    return m.group(1) if m else None


def is_family(code: str) -> bool:
    return code.endswith("00")


def is_regime(s: str) -> bool:
    return norm(s).replace(" ", "") in {"am", "aw", "apapc", "papc", "d"}


def regime_value(s: str) -> str:
    v = clean(s).upper().replace(" ", "")
    return "APAPC" if v == "PAPC" else v


def is_x(s: str) -> bool:
    return norm(s).strip(".") in {"x", "×"}


def infer_unit(text: str) -> str:
    t = norm(text)
    for pattern, unit in [
        (r"animaux\s*-?équivalents?", "animaux-équivalents"),
        (r"\bkg\b|kilogrammes?", "kg"), (r"\btonnes?\b|\bt\b", "t"),
        (r"m\s*[³3]\b|mètres? cubes?", "m³"), (r"m\s*[²2]\b|mètres? carrés?", "m²"),
        (r"\bkw\b", "kW"), (r"\bkva\b", "kVA"), (r"\bmw\b", "MW"),
        (r"litres?|\bl\b", "L"),
    ]:
        if re.search(pattern, t, re.I):
            return unit
    return ""


def parse_bounds(text: str):
    t = clean(text)
    unit = infer_unit(t)
    tests = [
        (rf"supérieure?\s+ou\s+égale\s+à\s*({NUMBER})", "min_inc"),
        (rf"supérieure?\s+à\s*({NUMBER})", "min"),
        (rf"plus\s+de\s*({NUMBER})", "min"),
        (rf"inférieure?\s+ou\s+égale\s+à\s*({NUMBER})", "max_inc"),
        (rf"inférieure?\s+à\s*({NUMBER})", "max"),
        (rf"moins\s+de\s*({NUMBER})", "max"),
        (rf"de\s*({NUMBER})\s+à\s*({NUMBER})", "range"),
    ]
    for pattern, kind in tests:
        m = re.search(pattern, t, re.I)
        if not m:
            continue
        values = [float(x.replace(",", ".")) for x in m.groups() if x is not None]
        if kind == "range":
            return values[0], True, values[1], True, unit
        if kind == "min_inc":
            return values[0], True, None, False, unit
        if kind == "min":
            return values[0], False, None, False, unit
        if kind == "max_inc":
            return None, False, values[0], True, unit
        return None, False, values[0], False, unit
    return None


def table_headers(table: list[list[str]]) -> dict[str, int]:
    found: dict[str, int] = {}
    for row in table[:20]:
        for i, cell in enumerate(row):
            n = norm(cell)
            for key, labels in DOC_LABELS.items():
                if any(norm(label) in n for label in labels):
                    found[key] = i
    return found


def decision_from_right(cells: list[str], headers: dict[str, int]):
    # The right side is the legal decision side. Locate regime/PAPC first.
    regime_idx = next((i for i in range(len(cells) - 1, -1, -1) if is_regime(cells[i])), None)
    if regime_idx is None:
        return None

    regime = regime_value(cells[regime_idx])
    rayon = ""
    for i in range(regime_idx + 1, len(cells)):
        c = clean(cells[i])
        if c and not is_x(c):
            rayon = c
            break

    docs = {k: False for k in DOC_KEYS}
    if headers:
        for key, idx in headers.items():
            if idx < len(cells):
                docs[key] = is_x(cells[idx])
    else:
        # Preserve physical positions immediately to the right of the rayon.
        r_idx = next((i for i in range(regime_idx + 1, len(cells)) if clean(cells[i]) == rayon), None)
        if r_idx is not None:
            for off, key in enumerate(DOC_KEYS, 1):
                if r_idx + off < len(cells):
                    docs[key] = is_x(cells[r_idx + off])

    left = [clean(c) for c in cells[:regime_idx] if clean(c)]
    if not left:
        return None

    # Join wrapped fragments: legal text must be reconstructed before classification.
    text = " ".join(left)
    code_matches = list(re.finditer(r"\b[12]\d{3}\b", text))
    if code_matches:
        text = text[code_matches[-1].end():].strip(" :-")

    bounds = parse_bounds(text)
    if bounds:
        lo, lo_inc, hi, hi_inc, unit = bounds
    else:
        lo = hi = None
        lo_inc, hi_inc = True, False
        unit = infer_unit(text)

    return {
        "criterion": "",
        "rawCondition": text,
        "min": lo,
        "minInclusive": lo_inc,
        "max": hi,
        "maxInclusive": hi_inc,
        "unit": unit,
        "regime": regime,
        "rayon": rayon,
        "documents": docs,
    }


def build():
    TMP.mkdir(parents=True, exist_ok=True)
    if not PDF.exists() or PDF.stat().st_size < 100_000:
        urllib.request.urlretrieve(PDF_URL, PDF)

    families = {f"{i}000": "" for i in range(1, 30)}
    rows_by_code: dict[str, list[dict]] = {}
    designations: dict[str, list[str]] = {}

    with pdfplumber.open(PDF) as pdf:
        for page_no, page in enumerate(pdf.pages, 1):
            if page_no < 5:
                continue
            for table in page.extract_tables({
                "vertical_strategy": "lines",
                "horizontal_strategy": "lines",
                "snap_tolerance": 3,
                "join_tolerance": 3,
                "intersection_tolerance": 5,
            }) or []:
                headers = table_headers(table)
                current = None
                for raw in table:
                    cells = [clean(x) for x in (raw or [])]
                    if not cells:
                        continue
                    code = next((is_code(c) for c in cells if is_code(c)), None)
                    if code:
                        current = code
                        if not is_family(code):
                            # Text before the right-side decision is a better designation candidate.
                            before_regime = []
                            r_idx = next((i for i in range(len(cells)-1, -1, -1) if is_regime(cells[i])), None)
                            limit = r_idx if r_idx is not None else len(cells)
                            for c in cells[:limit]:
                                if c and not is_code(c) and not is_regime(c) and not is_x(c):
                                    before_regime.append(c)
                            txt = clean(" ".join(before_regime))
                            if txt and not re.search(r"\b(supérieure|inférieure|plus de|moins de|quantité|capacité|volume|surface|nombre)\b", norm(txt)):
                                designations.setdefault(code, []).append(txt)
                    if not current or is_family(current):
                        continue
                    decision = decision_from_right(cells, headers)
                    if decision:
                        decision["rubrique"] = current
                        decision["sourcePage"] = page_no
                        rows_by_code.setdefault(current, []).append(decision)

    rubriques = []
    for code in sorted(rows_by_code):
        candidates = [x for x in designations.get(code, []) if len(x) > 2]
        designation = max(candidates, key=len) if candidates else ""
        unique = []
        seen = set()
        for row in rows_by_code[code]:
            key = json.dumps(row, ensure_ascii=False, sort_keys=True)
            if key not in seen:
                seen.add(key)
                unique.append(row)
        rubriques.append({
            "rubrique": code,
            "famille": code[:2] + "00",
            "familleLabel": "",
            "designation": designation,
            "decisionRows": unique,
            "source": "Décret exécutif n° 07-144 du 19 mai 2007",
            "sourceUrl": PDF_URL,
        })

    data = {
        "version": "07-144-reverse-test",
        "sourceUrl": PDF_URL,
        "readingModel": "right-to-left decision first, then left-side semantic reconstruction",
        "rubriques": rubriques,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Reverse prototype: {len(rubriques)} rubriques / {sum(len(x['decisionRows']) for x in rubriques)} decision rows")
    for code in ("1240", "1310", "2110", "2120", "2122"):
        item = next((x for x in rubriques if x["rubrique"] == code), None)
        if item:
            print(f"TEST {code}: {item['designation']!r} | {len(item['decisionRows'])} decisions")
        else:
            print(f"TEST {code}: NOT FOUND")


if __name__ == "__main__":
    build()
