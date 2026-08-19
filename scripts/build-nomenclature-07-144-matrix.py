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

REGIMES = {"AM", "AW", "APAPC", "D"}
REGIME_RE = re.compile(r"(?<![A-Z])(AM|AW|APAPC|D)(?![A-Z])")
RUBRIQUE_RE = re.compile(r"^\s*(1\d{3}|2\d{3})(?:\s+|$)")

NUMBER = r"[0-9]+(?:[.,][0-9]+)?"


def clean(text: str) -> str:
    replacements = {
        "È": "é", "Ë": "ê", "Í": "î", "Î": "î", "Ú": "û", "˚": "°",
        "‡": "à", "Ã©": "é", "Ã¨": "è", "Ãª": "ê", "Ã®": "î", "Ã´": "ô",
        "Ã¹": "ù", "Ã§": "ç", "â€™": "’", "â€“": "–", "Â": "",
    }
    for a, b in replacements.items():
        text = text.replace(a, b)
    return re.sub(r"\s+", " ", text).strip()


def parse_number(s: str) -> float | None:
    try:
        return float(s.replace(" ", "").replace("\u00a0", "").replace(",", "."))
    except ValueError:
        return None


def infer_unit(text: str) -> str:
    t = clean(text).lower()
    patterns = [
        (r"animaux\s*[- ]?équivalents?", "animaux-équivalents"),
        (r"m\s*3\s*/\s*j|m\s*³\s*/\s*j", "m³/j"),
        (r"kg\s*/\s*j|kilogrammes?\s*/\s*jour", "kg/j"),
        (r"t\s*/\s*j|tonnes?\s*/\s*jour", "t/j"),
        (r"\bkw\b", "kW"),
        (r"\bkva\b", "kVA"),
        (r"\bmw\b", "MW"),
        (r"litres?\s*/\s*j|l\s*/\s*j", "L/j"),
        (r"\bkg\b|kilogrammes?\b", "kg"),
        (r"\btonnes?\b|\bt\b", "t"),
        (r"m\s*3|m\s*³|mètres? cubes?", "m³"),
        (r"\bm2\b|m\s*²|mètres? carrés?", "m²"),
        (r"\bbar\b", "bar"),
        (r"\bpa\b", "Pa"),
        (r"°c|celsius", "°C"),
    ]
    for pattern, unit in patterns:
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


def extract_condition_label(text: str) -> str:
    return clean(text).strip("-:; ")


def looks_like_group(text: str) -> bool:
    t = clean(text).lower()
    return bool(re.match(r"^(?:[0-9]+|[a-z])\s*[.)-]\s+", t) or t.endswith(":") or re.search(r"(?:étant|est)\s*:\s*$", t))


def decode_row(line: str):
    """Decode a matrix row where the regime/rayon/X columns appear on one line."""
    s = clean(line)
    m = REGIME_RE.search(s)
    if not m:
        return None
    left = clean(s[:m.start()])
    right = clean(s[m.end():])
    if not left:
        return None

    # First numeric token after the regime is the display radius when present.
    nums = re.findall(NUMBER, right)
    rayon = nums[0] if nums else ""
    tail = right
    if nums:
        tail = tail[tail.find(nums[0]) + len(nums[0]):]

    x_flags = [bool(re.search(r"(?:^|\s)[x×](?:$|\s)", token, re.I)) for token in re.findall(r"[x×]|\S+", tail)]
    x_count = sum(x_flags)
    docs = {
        "impact": False,
        "danger": False,
        "notice": False,
        "rapportDangereux": False,
    }
    # The matrix columns are: impact, danger, notice, rapport.
    # Keep the exact four-column order; X count alone is insufficient, so read the last four tokens when available.
    compact = re.findall(r"[x×]|[^\s]+", tail)
    if len(compact) >= 4:
        last4 = compact[-4:]
        docs = {
            "impact": last4[0].lower() in {"x", "×"},
            "danger": last4[1].lower() in {"x", "×"},
            "notice": last4[2].lower() in {"x", "×"},
            "rapportDangereux": last4[3].lower() in {"x", "×"},
        }
    elif x_count:
        # Fallback for extraction that collapses empty cells: preserve left-to-right X order.
        positions = [i for i, flag in enumerate(x_flags) if flag]
        for p in positions:
            if p == positions[0]: docs["impact"] = True
            elif len(positions) > 1 and p == positions[1]: docs["danger"] = True
            elif len(positions) > 2 and p == positions[2]: docs["notice"] = True
            elif len(positions) > 3 and p == positions[3]: docs["rapportDangereux"] = True

    return m.group(1), left, rayon, docs


def download_pdf() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    if PDF.exists() and PDF.stat().st_size > 100_000:
        return
    last_error = None
    for url in PDF_URLS:
        try:
            urllib.request.urlretrieve(url, PDF)
            if PDF.stat().st_size > 100_000:
                return
        except Exception as exc:
            last_error = exc
    raise SystemExit(f"Impossible de télécharger le PDF officiel : {last_error}")


def extract() -> list[dict]:
    rows: list[dict] = []
    current_code: str | None = None
    current_designation: list[str] = []
    current_group = ""
    page_number = 0

    with pdfplumber.open(PDF) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            if page_number < 5:
                continue
            text = page.extract_text(x_tolerance=1, y_tolerance=3, layout=True) or ""
            for raw_line in text.splitlines():
                line = clean(raw_line)
                if not line or "JOURNAL OFFICIEL" in line or line.startswith("ANNEXE"):
                    continue

                rubric_match = RUBRIQUE_RE.match(line)
                if rubric_match:
                    current_code = rubric_match.group(1)
                    rest = clean(line[rubric_match.end():])
                    current_designation = [rest] if rest else []
                    current_group = ""
                    continue

                if current_code is None:
                    continue

                decoded = decode_row(line)
                if decoded:
                    regime, condition_text, rayon, docs = decoded
                    parsed = parse_bounds(condition_text)
                    if parsed:
                        lo, lo_inc, hi, hi_inc, unit = parsed
                    else:
                        lo = hi = None
                        lo_inc, hi_inc = True, False
                        unit = infer_unit(condition_text)
                    rows.append({
                        "rubrique": current_code,
                        "criterion": current_group or current_designation[0] if current_designation else "Valeur de classement",
                        "group": current_group,
                        "rawCondition": extract_condition_label(condition_text),
                        "min": lo,
                        "minInclusive": lo_inc,
                        "max": hi,
                        "maxInclusive": hi_inc,
                        "unit": unit,
                        "regime": regime,
                        "rayon": rayon,
                        "documents": docs,
                        "sourcePage": page_number,
                    })
                    continue

                # Header / designation / group text. Only keep it until the first decision row.
                if looks_like_group(line):
                    current_group = line
                elif not current_group and len(" ".join(current_designation)) < 500:
                    current_designation.append(line)

    return rows, current_designation


def build() -> None:
    download_pdf()
    raw_rows, _ = extract()
    grouped: dict[str, dict] = {}
    for row in raw_rows:
        code = row["rubrique"]
        if code not in grouped:
            grouped[code] = {
                "rubrique": code,
                "famille": code[:2] + "00",
                "familleLabel": FAMILIES.get(code[:2] + "00", "Installation classée"),
                "designation": "",
                "decisionRows": [],
                "source": "Décret exécutif n° 07-144 du 19 mai 2007",
                "sourceUrl": PDF_URLS[0],
            }
        grouped[code]["decisionRows"].append(row)

    # Recover the designation independently from the PDF text by taking the first meaningful text after each code.
    with pdfplumber.open(PDF) as pdf:
        current: str | None = None
        desc_lines: dict[str, list[str]] = {}
        for page_no, page in enumerate(pdf.pages, start=1):
            if page_no < 5:
                continue
            text = clean(page.extract_text(x_tolerance=1, y_tolerance=3, layout=True) or "")
            for raw in text.splitlines():
                line = clean(raw)
                m = RUBRIQUE_RE.match(line)
                if m:
                    current = m.group(1)
                    rest = clean(line[m.end():])
                    desc_lines.setdefault(current, [])
                    if rest:
                        desc_lines[current].append(rest)
                    continue
                if current and line and not "JOURNAL OFFICIEL" in line and not line.startswith("ANNEXE"):
                    if REGIME_RE.search(line):
                        continue
                    if len(" ".join(desc_lines[current])) < 300 and not looks_like_group(line):
                        desc_lines[current].append(line)

    for code, item in grouped.items():
        designation = clean(" ".join(desc_lines.get(code, [])))
        if not designation:
            designation = clean(item["decisionRows"][0]["criterion"] if item["decisionRows"] else "")
        item["designation"] = designation[:500]
        # Deduplicate exact decision rows while preserving source order.
        unique = []
        seen = set()
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
        "generatorVersion": "matrix-v1",
        "generatorNote": "Matrice décisionnelle : Rubrique → désignation → groupe/critère → situation → régime → rayon → X documents.",
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {len(rubriques)} rubriques / {sum(len(r['decisionRows']) for r in rubriques)} lignes de décision -> {OUT}")
    if not rubriques:
        raise SystemExit("Aucune rubrique extraite. Vérifiez la version de pdfplumber et l’ouverture du PDF.")


if __name__ == "__main__":
    build()
