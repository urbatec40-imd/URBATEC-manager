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

CODE_ONLY = re.compile(r"^\s*(\d{4})\s*$")
CODE_WITH_TEXT = re.compile(r"^\s*(\d{4})\s+(.+?)\s*$")
REGIME_RE = re.compile(r"\b(AM|AW|APAPC|D)\b")


def normalize(text: str) -> str:
    replacements = {"È": "é", "Ë": "ê", "Í": "î", "Î": "î", "Ú": "û", "˚": "°", "Ì": "É", "Ó": "É", "‡": "à"}
    for a, b in replacements.items():
        text = text.replace(a, b)
    return re.sub(r"[ \t]+", " ", text).strip()


def infer_profile(text: str) -> list[dict[str, str]]:
    t = normalize(text).lower()
    rules = [
        (("quantité", "kg", "tonne", "litre", " l "), "quantite", "Quantité maximale susceptible d’être présente", "number", "kg/t/L selon la rubrique"),
        (("capacité", "kg/j", "t/j", "m3/j", "m³/j", "animaux", "animaux-équivalents", "véhicules", "voyageurs"), "capacite", "Capacité de l’installation", "number", "unité selon la rubrique"),
        (("puissance", "kw", "kva", "mw"), "puissance", "Puissance installée/absorbée", "number", "kW/kVA/MW selon la rubrique"),
        (("surface", "m2", "m²", "superficie"), "surface", "Surface concernée", "number", "m²"),
        (("volume", "m3", "m³"), "volume", "Volume de stockage/installation", "number", "m³"),
        (("pression", "bar", "pa"), "pression", "Pression de fonctionnement", "number", "bar/Pa"),
        (("température", "°c", "celsius"), "temperature", "Température de fonctionnement", "number", "°C"),
        (("distance", "rayon", "km"), "distance", "Distance / rayon", "number", "km"),
        (("nombre", "effectif", "personnel", "travailleur", "ouvrier"), "effectif", "Effectif", "number", "personnes"),
    ]
    fields: list[dict[str, str]] = []
    for tokens, key, label, typ, unit in rules:
        if any(tok in t for tok in tokens) and not any(f["key"] == key for f in fields):
            fields.append({"key": key, "label": label, "type": typ, "unit": unit})
    if not fields:
        fields.append({"key": "capacite", "label": "Valeur caractéristique de la rubrique", "type": "number", "unit": "selon la rubrique"})
    return fields


def close_current(rows: list[dict], current: dict | None) -> None:
    if not current:
        return
    raw = normalize(" ".join(current.pop("_lines")))
    if not raw:
        return
    current["designation"] = raw[:300]
    current["inputProfile"] = infer_profile(raw)
    rows.append(current)


def parse() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(PDF_URL, PDF)

    reader = PdfReader(str(PDF))
    rows: list[dict] = []
    current: dict | None = None
    page_number = 0

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        for raw_line in text.splitlines():
            line = normalize(raw_line)
            if not line:
                continue
            if "JOURNAL OFFICIEL" in line:
                continue
            if line.startswith("ANNEXE") or line.startswith("Désignation de l’activité"):
                continue

            match = CODE_WITH_TEXT.match(line)
            if match:
                close_current(rows, current)
                code, first_text = match.groups()
                family = code[:2] + "00"
                current = {
                    "rubrique": code,
                    "famille": family,
                    "familleLabel": FAMILIES.get(family, "Installation classée"),
                    "designation": first_text,
                    "conditions": [],
                    "inputProfile": [],
                    "source": "Décret exécutif n° 07-144 du 19 mai 2007",
                    "sourceUrl": PDF_URL,
                    "sourcePage": page_number,
                    "_lines": [first_text],
                }
                continue

            match = CODE_ONLY.match(line)
            if match:
                close_current(rows, current)
                code = match.group(1)
                family = code[:2] + "00"
                current = {
                    "rubrique": code,
                    "famille": family,
                    "familleLabel": FAMILIES.get(family, "Installation classée"),
                    "designation": "",
                    "conditions": [],
                    "inputProfile": [],
                    "source": "Décret exécutif n° 07-144 du 19 mai 2007",
                    "sourceUrl": PDF_URL,
                    "sourcePage": page_number,
                    "_lines": [],
                }
                continue

            if current is None:
                continue

            rm = REGIME_RE.search(line)
            if rm:
                regime = rm.group(1)
                left = line[:rm.start()].strip(" -:;")
                right = line[rm.end():].strip()
                if left:
                    current["conditions"].append({"texte": left, "regime": regime, "meta": right})
                elif current["conditions"] and right:
                    current["conditions"][-1]["meta"] = right
            else:
                current["_lines"].append(line)

    close_current(rows, current)

    unique: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for row in rows:
        key = (row["rubrique"], row["designation"][:180])
        if key not in seen:
            seen.add(key)
            unique.append(row)

    data = {
        "version": "07-144",
        "date": "19 mai 2007",
        "sourceUrl": PDF_URL,
        "families": [{"code": k, "label": v} for k, v in FAMILIES.items()],
        "rubriques": unique,
        "generated": True,
        "generatorNote": "Extraction automatique du Journal Officiel via pypdf. Les seuils et conditions doivent être vérifiés dans le texte officiel avant dépôt.",
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {len(unique)} rubrique records -> {OUT}")


if __name__ == "__main__":
    parse()
