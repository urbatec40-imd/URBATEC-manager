from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / ".tmp-nomenclature"
PDF = TMP / "07-144.pdf"
OUT = ROOT / "public" / "data" / "nomenclature-07-144.json"
PDF_URLS = [
    "https://www.joradp.dz/FTP/jo-francais/2007/F2007034.pdf",
    "https://creg.gov.dz/T%C3%A9l%C3%A9charger/487/autorisation-dexploitation-de-letablissement-classe/13053/decret-executif-n07-144-du-19-mai-2007.pdf",
]
FAMILIES = {
    "1000": "Substances", "1100": "Très toxiques", "1200": "Toxiques", "1300": "Comburantes",
    "1400": "Explosibles", "1500": "Inflammables", "1600": "Combustibles", "1700": "Corrosives",
    "1800": "Divers", "2000": "Activité", "2100": "Élevage d’animaux & Activité agricole",
    "2200": "Agro alimentaires", "2300": "Textiles, Cuirs et Peaux", "2400": "Bois- papier- carton- imprimerie",
    "2500": "Matériaux, minerais et métaux", "2600": "Chimie, Caoutchouc", "2700": "Déchets et traitements des eaux",
    "2800": "Aquaculture et Pêche", "2900": "Divers",
}
REGIME_RE = re.compile(r"(?<![A-Z])(APAPC|AM|AW|D)(?![A-Z])", re.I)
RUBRIQUE_RE = re.compile(r"^\s*(1\d{3}|2\d{3})(?:\s+|$)")
NUMBER = r"[0-9]+(?:[.,][0-9]+)?"
DOC_KEYS = ("impact", "danger", "notice", "rapportDangereux")
DOC_LABELS = {
    "impact": ("étude d’impact", "etude d’impact", "etude d'impact"),
    "danger": ("étude de dangers", "etude de dangers"),
    "notice": ("notice d’impact", "notice d’impact", "notice d'impact"),
    "rapportDangereux": ("rapport sur les produits dangereux", "rapport produits dangereux"),
}


def clean(text: str) -> str:
    replacements = {
        "È": "é", "Ë": "ê", "Í": "î", "Î": "î", "Ú": "û", "˚": "°", "‡": "à",
        "Ã©": "é", "Ã¨": "è", "Ãª": "ê", "Ã®": "î", "Ã´": "ô", "Ã¹": "ù", "Ã§": "ç",
        "Ã‰": "É", "Ã€": "À", "Ã‚": "Â", "Ã”": "Ô", "Ã›": "Û",
        "â€™": "’", "â€“": "–", "â€œ": "“", "â€": "”", "Â": "",
    }
    for a, b in replacements.items():
        text = text.replace(a, b)
    return re.sub(r"\s+", " ", text).strip()


def parse_number(s: str) -> float | None:
    try:
        return float(s.replace("\u00a0", "").replace(" ", "").replace(",", "."))
    except ValueError:
        return None


def infer_unit(text: str) -> str:
    t = clean(text).lower()
    rules = [
        (r"animaux\s*[- ]?équivalents?", "animaux-équivalents"),
        (r"m\s*3\s*/\s*j|m\s*³\s*/\s*j", "m³/j"),
        (r"kg\s*/\s*j|kilogrammes?\s*/\s*jour", "kg/j"),
        (r"t\s*/\s*j|tonnes?\s*/\s*jour", "t/j"),
        (r"\bkw\b", "kW"), (r"\bkva\b", "kVA"), (r"\bmw\b", "MW"),
        (r"litres?\s*/\s*j|l\s*/\s*j", "L/j"),
        (r"\bkg\b|kilogrammes?\b", "kg"), (r"\btonnes?\b|\bt\b", "t"),
        (r"m\s*3|m\s*³|mètres? cubes?", "m³"),
        (r"\bm2\b|m\s*²|mètres? carrés?", "m²"),
        (r"\bbar\b", "bar"), (r"\bpa\b", "Pa"), (r"°c|celsius", "°C"),
        (r"volts?", "V"), (r"ampères?", "A"),
    ]
    for pattern, unit in rules:
        if re.search(pattern, t, re.I):
            return unit
    return ""


def parse_bounds(text: str):
    t = clean(text)
    unit = infer_unit(t)
    patterns = [
        (rf"supérieure?\s+ou\s+égale\s+à\s*({NUMBER})", "min_inc"),
        (rf"supérieure?\s+à\s*({NUMBER})", "min"),
        (rf"plus\s+de\s*({NUMBER})", "min"),
        (rf"inférieure?\s+ou\s+égale\s+à\s*({NUMBER})", "max_inc"),
        (rf"inférieure?\s+à\s*({NUMBER})", "max"),
        (rf"moins\s+de\s*({NUMBER})", "max"),
        (rf"de\s*({NUMBER})\s+à\s*({NUMBER})", "range"),
        (rf"entre\s*({NUMBER})\s+et\s*({NUMBER})", "range"),
    ]
    for pattern, kind in patterns:
        m = re.search(pattern, t, re.I)
        if not m:
            continue
        if kind == "range":
            a, b = parse_number(m.group(1)), parse_number(m.group(2))
            if a is not None and b is not None:
                return a, True, b, True, unit
        else:
            n = parse_number(m.group(1))
            if n is None:
                continue
            if kind == "min_inc": return n, True, None, False, unit
            if kind == "min": return n, False, None, False, unit
            if kind == "max_inc": return None, False, n, True, unit
            return None, False, n, False, unit
    return None


def looks_like_group(text: str) -> bool:
    t = clean(text).lower()
    return bool(
        re.match(r"^(?:[0-9]+|[a-z])\s*[.)-]\s+", t)
        or t.endswith(":")
        or re.search(r"(?:étant|est)\s*:\s*$", t)
    )


def looks_like_non_designation(text: str) -> bool:
    t = clean(text).lower()
    starters = (
        "voir ", "visé", "vises ", "visés ", "à l’exclusion", "a l'exclusion",
        "la quantité", "le nombre", "la capacité", "la puissance", "la surface",
        "le volume", "contenant ", "contennant ", "supérieure", "inférieure",
        "plus de ", "moins de ", "1.", "2.", "3.", "4.", "cas ",
    )
    return (
        t.startswith(starters)
        or t.startswith("condition")
        or "visés par d'autres rubriques" in t
        or "visés par d’autres rubriques" in t
        or re.match(r"^\d+[.)]\s+", t) is not None
    )


def is_family(code: str) -> bool:
    return code.endswith("00")


def table_settings() -> list[dict]:
    return [
        {
            "vertical_strategy": "lines",
            "horizontal_strategy": "lines",
            "snap_tolerance": 3,
            "join_tolerance": 3,
            "edge_min_length": 20,
            "intersection_tolerance": 5,
        },
        {
            "vertical_strategy": "text",
            "horizontal_strategy": "lines",
            "snap_tolerance": 3,
            "join_tolerance": 3,
            "min_words_vertical": 1,
            "min_words_horizontal": 1,
        },
    ]


def normalize_cells(row) -> list[str]:
    # Never drop empty cells: their positions identify the X columns.
    return [clean(cell or "") for cell in row]


def detect_header_columns(table: list[list[str]]) -> dict[str, int]:
    result: dict[str, int] = {}
    for raw_row in table[:10]:
        cells = normalize_cells(raw_row)
        for idx, cell in enumerate(cells):
            n = cell.lower()
            for key, labels in DOC_LABELS.items():
                if any(label in n for label in labels):
                    result[key] = idx
    return result


def detect_regime_index(cells: list[str]) -> int | None:
    for idx, cell in enumerate(cells):
        if REGIME_RE.fullmatch(cell):
            return idx
    return None


def physical_document_columns(cells: list[str], header_cols: dict[str, int], rayon_idx: int | None) -> dict[str, bool]:
    docs = {k: False for k in DOC_KEYS}
    if header_cols:
        for key, idx in header_cols.items():
            if idx < len(cells):
                docs[key] = clean(cells[idx]).lower() in {"x", "×", "x.", "×."}
        return docs
    if rayon_idx is None:
        return docs
    # Fallback uses the four physical cells immediately after the rayon cell.
    for pos, key in enumerate(DOC_KEYS, start=rayon_idx + 1):
        if pos < len(cells):
            docs[key] = clean(cells[pos]).lower() in {"x", "×", "x.", "×."}
    return docs


def parse_table_row(cells: list[str], current_code: str | None, page_number: int, header_cols: dict[str, int]):
    if not any(cells):
        return None, current_code

    code = current_code
    for cell in cells[:4]:
        m = RUBRIQUE_RE.match(cell)
        if m:
            code = m.group(1)
            break
    if not code or is_family(code):
        return None, code

    regime_idx = detect_regime_index(cells)
    if regime_idx is None:
        return None, code
    regime = REGIME_RE.fullmatch(cells[regime_idx]).group(1).upper()  # type: ignore[union-attr]

    # Left side can contain [rubrique, designation/criterion, situation].
    # The last non-empty legal-text cell is the Situation; the previous one is its criterion.
    left = [c for c in cells[:regime_idx] if c and not RUBRIQUE_RE.fullmatch(c)]
    if not left:
        return None, code

    non_noise = [c for c in left if not ("visés par d'autres rubriques" in c.lower() or "visés par d’autres rubriques" in c.lower())]
    if not non_noise:
        return None, code

    if len(non_noise) >= 2:
        criterion = non_noise[-2]
        situation = non_noise[-1]
    else:
        criterion = ""
        situation = non_noise[-1]

    # Sometimes the designation itself is the only legal row (e.g. a single-case rubrique).
    if not situation:
        return None, code

    rayon_idx = None
    rayon = ""
    for idx in range(regime_idx + 1, len(cells)):
        cell = cells[idx]
        if re.search(r"\d", cell) and not re.fullmatch(r"[x×]", cell.lower()):
            rayon_idx = idx
            rayon = cell
            break

    docs = physical_document_columns(cells, header_cols, rayon_idx)
    parsed = parse_bounds(situation)
    if parsed:
        lo, lo_inc, hi, hi_inc, unit = parsed
    else:
        lo = hi = None
        lo_inc, hi_inc = True, False
        unit = infer_unit(situation or criterion)

    return {
        "rubrique": code,
        "criterion": criterion,
        "rawCondition": situation,
        "min": lo,
        "minInclusive": lo_inc,
        "max": hi,
        "maxInclusive": hi_inc,
        "unit": unit,
        "regime": regime,
        "rayon": rayon,
        "documents": docs,
        "sourcePage": page_number,
    }, code


def extract_tables() -> tuple[list[dict], dict[str, str]]:
    rows: list[dict] = []
    designations: dict[str, str] = {}
    current_code: str | None = None

    with pdfplumber.open(PDF) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            if page_number < 5:
                continue
            for settings in table_settings():
                try:
                    tables = page.extract_tables(table_settings=settings)
                except Exception:
                    tables = []
                if not tables:
                    continue

                parsed_any = False
                for table in tables:
                    header_cols = detect_header_columns(table)
                    for raw_row in table:
                        cells = normalize_cells(raw_row)
                        code_in_row = None
                        for cell in cells[:4]:
                            m = RUBRIQUE_RE.match(cell)
                            if m:
                                code_in_row = m.group(1)
                                current_code = code_in_row
                                break
                        if code_in_row and is_family(code_in_row):
                            current_code = code_in_row
                            continue
                        if code_in_row and not is_family(code_in_row):
                            regime_idx = detect_regime_index(cells)
                            if regime_idx is not None:
                                title_cells = [c for c in cells[1:regime_idx] if c]
                                title_cells = [c for c in title_cells if not looks_like_non_designation(c)]
                                if title_cells:
                                    # Prefer the first real designation cell, not the situation cell.
                                    designations.setdefault(code_in_row, max(title_cells, key=len))

                        row, row_code = parse_table_row(cells, current_code, page_number, header_cols)
                        if row:
                            rows.append(row)
                            current_code = row_code
                            parsed_any = True
                if parsed_any:
                    break

    return rows, designations


def extract_text_designations() -> dict[str, str]:
    designations: dict[str, str] = {}
    current: str | None = None
    with pdfplumber.open(PDF) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            if page_number < 5:
                continue
            text = clean(page.extract_text(x_tolerance=1, y_tolerance=3, layout=True) or "")
            for raw in text.splitlines():
                line = clean(raw)
                m = RUBRIQUE_RE.match(line)
                if m:
                    current = m.group(1)
                    rest = clean(line[m.end():])
                    if rest and not is_family(current) and not looks_like_non_designation(rest):
                        designations.setdefault(current, rest)
                    continue
                if current is None or current in designations or is_family(current):
                    continue
                if not line or "JOURNAL OFFICIEL" in line or line.startswith("ANNEXE"):
                    continue
                if REGIME_RE.search(line) or looks_like_group(line) or looks_like_non_designation(line):
                    continue
                designations.setdefault(current, line)
    return designations


def extract() -> tuple[list[dict], dict[str, str]]:
    rows, table_designations = extract_tables()
    text_designations = extract_text_designations()
    designations = dict(text_designations)
    designations.update(table_designations)
    return rows, designations


def build() -> None:
    download_pdf()
    rows, designations = extract()

    grouped: dict[str, dict] = {}
    for row in rows:
        code = row["rubrique"]
        if is_family(code):
            continue
        item = grouped.setdefault(
            code,
            {
                "rubrique": code,
                "famille": code[:2] + "00",
                "familleLabel": FAMILIES.get(code[:2] + "00", "Installation classée"),
                "designation": designations.get(code, ""),
                "decisionRows": [],
                "source": "Décret exécutif n° 07-144 du 19 mai 2007",
                "sourceUrl": PDF_URLS[0],
            },
        )
        item["decisionRows"].append(row)

    for code, item in grouped.items():
        item["designation"] = clean(designations.get(code) or item["designation"])
        if not item["designation"] and len(item["decisionRows"]) == 1:
            item["designation"] = clean(item["decisionRows"][0].get("criterion") or item["decisionRows"][0].get("rawCondition", ""))

        unique, seen = [], set()
        for row in item["decisionRows"]:
            key = json.dumps(row, ensure_ascii=False, sort_keys=True)
            if key not in seen:
                seen.add(key)
                unique.append(row)
        item["decisionRows"] = unique

    rubriques = sorted(grouped.values(), key=lambda x: x["rubrique"])
    data = {
        "version": "07-144",
        "date": "19 mai 2007",
        "sourceUrl": PDF_URLS[0],
        "families": [{"code": k, "label": v} for k, v in FAMILIES.items()],
        "rubriques": rubriques,
        "generated": True,
        "generatorVersion": "matrix-v4-hierarchy-table-columns",
        "generatorNote": "Family 00 is hierarchy only; each rubrique owns its decision rows. X is mapped by physical document-column position and single-row rubriques are supported.",
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {len(rubriques)} rubriques / {sum(len(r['decisionRows']) for r in rubriques)} lignes de décision -> {OUT}")
    if not rubriques:
        raise SystemExit("Aucune rubrique extraite.")


if __name__ == "__main__":
    build()
