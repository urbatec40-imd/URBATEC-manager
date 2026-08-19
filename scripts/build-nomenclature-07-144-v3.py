from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

try:
    import pdfplumber
except ImportError as exc:
    raise SystemExit("Installez pdfplumber : python -m pip install pdfplumber") from exc

PDF_URL = "https://www.joradp.dz/FTP/jo-francais/2007/F2007034.PDF"
ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / ".tmp-nomenclature"
PDF = TMP / "07-144.pdf"
OUT = ROOT / "public" / "data" / "nomenclature-07-144.json"

FAMILIES = {
    "1000": "Substances", "1100": "Très toxiques", "1200": "Toxiques", "1300": "Comburantes",
    "1400": "Explosibles", "1500": "Inflammables", "1600": "Combustibles", "1700": "Corrosives",
    "1800": "Divers", "2000": "Activité", "2100": "Élevage d’animaux & Activité agricole",
    "2200": "Agro alimentaires", "2300": "Textiles, Cuirs et Peaux", "2400": "Bois- papier- carton- imprimerie",
    "2500": "Matériaux, minerais et métaux", "2600": "Chimie, Caoutchouc", "2700": "Déchets et traitements des eaux",
    "2800": "Aquaculture et Pêche", "2900": "Divers",
}
REGIMES = {"AM", "AW", "APAPC", "D"}


def normalize(text: str) -> str:
    replacements = {
        "dØ": "dé", "DØ": "Dé", "Ł": "é", "Œ": "œ", "": "’", "": "œ", "oø": "où",
        "prØ": "pré", "rØ": "ré", "Ø": "é", "Ľ": "è", "Â": "", "Ã©": "é", "Ã¨": "è",
        "Ãª": "ê", "Ã®": "î", "Ã´": "ô", "Ã¹": "ù", "Ã§": "ç", "â€™": "’", "â€“": "–",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return re.sub(r"\s+", " ", text).strip()


def parse_number(text: str) -> float | None:
    s = text.strip().replace("\u00a0", "").replace(" ", "")
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    else:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def infer_unit(text: str) -> str:
    t = normalize(text).lower()
    if re.search(r"animaux[- ]?équivalents", t): return "animaux-équivalents"
    if re.search(r"m\s*³\s*/\s*j|m3\s*/\s*j", t): return "m³/j"
    if re.search(r"m\s*³|m3|mètres? cubes?", t): return "m³"
    if re.search(r"kg\s*/\s*j|kilogrammes?.*jour", t): return "kg/j"
    if re.search(r"t\s*/\s*j|tonnes?.*jour", t): return "t/j"
    if re.search(r"\bkW\b|kVA|MW", text, re.I): return "kW"
    if re.search(r"l\s*/\s*j|litres?.*jour", t): return "l/j"
    if re.search(r"\bkg\b|kilogrammes?\b", t): return "kg"
    if re.search(r"\bt\b|tonnes?\b", t): return "t"
    return ""


def bounds(text: str):
    t = normalize(text)
    unit = infer_unit(t)
    m = re.search(r"de\s+([\d\s.,]+)\s+(?:à|a)\s+([\d\s.,]+)", t, re.I)
    if m:
        a, b = parse_number(m.group(1)), parse_number(m.group(2))
        if a is not None and b is not None: return a, True, b, True, unit
    patterns = [
        (r"supérieure?\s+ou\s+égale\s+(?:à\s*)?([\d\s.,]+)", "min_inc"),
        (r"supérieure?\s+(?:à\s*)?([\d\s.,]+)", "min"),
        (r"plus\s+de\s+([\d\s.,]+)", "min"),
        (r"inférieure?\s+ou\s+égale\s+(?:à\s*)?([\d\s.,]+)", "max_inc"),
        (r"inférieure?\s+(?:à\s*)?([\d\s.,]+)", "max"),
        (r"moins\s+de\s+([\d\s.,]+)", "max"),
    ]
    for pattern, kind in patterns:
        m = re.search(pattern, t, re.I)
        if not m: continue
        n = parse_number(m.group(1))
        if n is None: continue
        if kind == "min_inc": return n, True, None, False, unit
        if kind == "min": return n, False, None, False, unit
        if kind == "max_inc": return None, False, n, True, unit
        return None, False, n, False, unit
    return None


def regime(value: str) -> str | None:
    v = normalize(value).replace(" ", "").upper()
    return v if v in REGIMES else None


def is_x(value: str | None) -> bool:
    return normalize(value or "").lower() in {"x", "×"}


def criterion(text: str) -> str:
    s = normalize(text)
    s = re.split(r"(?:\ba\)\s*|\bb\)\s*|\b[123456789]\.\s*|supérieure|inférieure|plus de|moins de|de\s+[\d])", s, maxsplit=1, flags=re.I)[0]
    return s.strip(" -:;,") or "Valeur de classement"


def extract() -> list[dict]:
    result: list[dict] = []
    current_code: str | None = None
    with pdfplumber.open(PDF) as pdf:
        for page_no, page in enumerate(pdf.pages, start=1):
            if page_no < 5: continue
            tables = page.extract_tables({
                "vertical_strategy": "lines", "horizontal_strategy": "lines",
                "snap_tolerance": 3, "join_tolerance": 3, "intersection_tolerance": 5,
                "text_tolerance": 2,
            })
            for table in tables:
                for row in table:
                    cells = [normalize(c or "") for c in (row or [])]
                    if len(cells) < 6: continue
                    cells += [""] * (8 - len(cells))
                    m = re.search(r"\b(1\d{3}|2\d{3})\b", cells[0])
                    if m: current_code = m.group(1)
                    if not current_code: continue
                    desc = cells[1]
                    reg = regime(cells[2])
                    if not desc or not reg: continue
                    parsed = bounds(desc) or bounds(" ".join(cells[:4]))
                    if not parsed: continue
                    lo, lo_inc, hi, hi_inc, unit = parsed
                    result.append({
                        "rubrique": current_code,
                        "criterion": criterion(desc),
                        "rawCondition": desc,
                        "min": lo, "minInclusive": lo_inc,
                        "max": hi, "maxInclusive": hi_inc,
                        "unit": unit or infer_unit(" ".join(cells)),
                        "regime": reg,
                        "rayon": cells[3],
                        "documents": {
                            "impact": is_x(cells[4]), "danger": is_x(cells[5]),
                            "notice": is_x(cells[6]), "rapportDangereux": is_x(cells[7]),
                        },
                        "sourcePage": page_no,
                    })
    return result


def build() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if not PDF.exists(): urllib.request.urlretrieve(PDF_URL, PDF)
    rows = extract()
    grouped: dict[str, dict] = {}
    for row in rows:
        item = grouped.setdefault(row["rubrique"], {
            "rubrique": row["rubrique"], "famille": row["rubrique"][:2] + "00",
            "familleLabel": FAMILIES.get(row["rubrique"][:2] + "00", "Installation classée"),
            "designation": row["criterion"], "decisionRows": [],
            "source": "Décret exécutif n° 07-144 du 19 mai 2007", "sourceUrl": PDF_URL,
        })
        item["decisionRows"].append(row)
    rubriques = []
    for item in grouped.values():
        unique, seen = [], set()
        for row in item["decisionRows"]:
            key = json.dumps(row, ensure_ascii=False, sort_keys=True)
            if key not in seen: seen.add(key); unique.append(row)
        item["decisionRows"] = unique
        rubriques.append(item)
    data = {
        "version": "07-144", "date": "19 mai 2007", "sourceUrl": PDF_URL,
        "families": [{"code": k, "label": v} for k, v in FAMILIES.items()],
        "rubriques": rubriques, "generated": True,
        "generatorNote": "decisionRows = lignes de matrice avec intervalle, régime, rayon et X des quatre documents.",
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {len(rubriques)} rubriques / {len(rows)} lignes de classement -> {OUT}")

if __name__ == "__main__":
    build()
