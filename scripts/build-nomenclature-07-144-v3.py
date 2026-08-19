from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path
from pypdf import PdfReader

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

CODE_RE = re.compile(r"^(1\d{3}|2\d{3})\s*(.*)$")


def normalize(text: str) -> str:
    replacements = {
        "dØ": "dé", "DØ": "Dé", "Ł": "é", "Œ": "œ", "": "’", "": "’", "": "œ", "oø": "où",
        "prØ": "pré", "rØ": "ré", "Ø": "é", "Ł": "é", "Ľ": "è", "Ø": "é", "Â": "",
        "Ã©": "é", "Ã¨": "è", "Ãª": "ê", "Ã®": "î", "Ã´": "ô", "Ã¹": "ù", "Ã§": "ç",
    }
    for a, b in replacements.items():
        text = text.replace(a, b)
    return re.sub(r"\s+", " ", text).strip()


def infer_profile(text: str) -> list[dict[str, str]]:
    t = normalize(text).lower()
    rules = [
        (("animaux", "animaux-equivalents", "élevage"), "nombreAnimaux", "Nombre d’animaux", "number", "animaux"),
        (("m3/j", "m³/j", "m3 par jour"), "capaciteTraitement", "Capacité de traitement", "number", "m³/j"),
        (("kg/j", "t/j", "tonne/j"), "capaciteProduction", "Capacité de production", "number", "kg/j ou t/j"),
        (("puissance", "kw", "kva", "mw"), "puissance", "Puissance", "number", "kW/kVA/MW"),
        (("surface", "m2", "m²", "superficie"), "surface", "Surface", "number", "m²"),
        (("volume", "m3", "m³"), "volume", "Volume", "number", "m³"),
        (("quantité", "kg", "tonne", "litre", "l"), "quantite", "Quantité", "number", "selon rubrique"),
    ]
    fields = []
    for tokens, key, label, typ, unit in rules:
        if any(tok in t for tok in tokens) and not any(f["key"] == key for f in fields):
            fields.append({"key": key, "label": label, "type": typ, "unit": unit})
    return fields


def add_record(rows: list[dict], page_no: int, code: str, text: str) -> dict:
    family = code[:2] + "00"
    return {
        "rubrique": code,
        "famille": family,
        "familleLabel": FAMILIES.get(family, "Installation classée"),
        "designation": normalize(text),
        "conditions": [],
        "inputProfile": infer_profile(text),
        "source": "Décret exécutif n° 07-144 du 19 mai 2007",
        "sourceUrl": PDF_URL,
        "sourcePage": page_no,
    }


def parse() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(PDF_URL, PDF)
    reader = PdfReader(str(PDF))
    rows: list[dict] = []
    in_table = False

    for idx, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        text = normalize(text)
        if "III. Nomenclature des installations classées" in text or "Désignation de l’activité" in text:
            in_table = True
        if not in_table:
            continue
        if "Désignation de l’activité" not in text and idx < 5:
            continue

        lines = [normalize(x) for x in (page.extract_text() or "").splitlines() if normalize(x)]
        current_code: str | None = None
        current_parts: list[str] = []
        for line in lines:
            m = CODE_RE.match(line)
            if m:
                code, rest = m.groups()
                if current_code and current_parts:
                    rows.append(add_record(rows, idx, current_code, " ".join(current_parts)))
                current_code = code
                current_parts = [rest] if rest else []
                continue
            if current_code:
                if line.startswith("Régime") or line.startswith("Rayon") or line.startswith("Affichage"):
                    continue
                current_parts.append(line)
        if current_code and current_parts:
            rows.append(add_record(rows, idx, current_code, " ".join(current_parts)))

    unique = []
    seen = set()
    for r in rows:
        d = r["designation"].strip()
        if not d:
            continue
        if d.lower() in {"substances", "très toxiques", "toxiques", "comburantes", "explosibles", "inflammables", "combustibles", "corrosives", "divers", "activité"}:
            continue
        key = (r["rubrique"], d)
        if key not in seen:
            seen.add(key)
            unique.append(r)

    data = {
        "version": "07-144",
        "date": "19 mai 2007",
        "sourceUrl": PDF_URL,
        "families": [{"code": k, "label": v} for k, v in FAMILIES.items()],
        "rubriques": unique,
        "generated": True,
        "generatorNote": "Extraction limitée aux pages de l’annexe III (nomenclature). Les seuils restent à valider dans le texte officiel.",
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {len(unique)} rubrique records -> {OUT}")


if __name__ == "__main__":
    parse()
