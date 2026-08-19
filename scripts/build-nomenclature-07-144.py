from __future__ import annotations

import json
import re
import subprocess
import urllib.request
from pathlib import Path

PDF_URL = "https://creg.gov.dz/T%C3%A9l%C3%A9charger/487/autorisation-dexploitation-de-letablissement-classe/13053/decret-executif-n07-144-du-19-mai-2007.pdf"
ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / ".tmp-nomenclature"
PDF = TMP / "07-144.pdf"
TXT = TMP / "07-144-layout.txt"
OUT = ROOT / "src" / "data" / "nomenclature-07-144.json"

FAMILIES = {
    "1000": "Substances",
    "1100": "Très toxiques",
    "1200": "Toxiques",
    "1300": "Comburantes",
    "1400": "Explosibles",
    "1500": "Inflammables",
    "1600": "Combustibles",
    "1700": "Corrosives",
    "1800": "Divers",
    "2000": "Activité",
    "2100": "Élevage d’animaux & Activité agricole",
    "2200": "Agro alimentaires",
    "2300": "Textiles, Cuirs et Peaux",
    "2400": "Bois, papier, carton, imprimerie",
    "2500": "Matériaux, minerais et métaux",
    "2600": "Chimie, Caoutchouc",
    "2700": "Déchets et traitements des eaux",
    "2800": "Aquaculture et Pêche",
    "2900": "Divers",
}

REGIME_RE = re.compile(r"\b(AM|AW|APAPC|D)\b")
RUBRIQUE_RE = re.compile(r"^\s*(1\d{3}|2\d{3})\s*$")


def clean_text(text: str) -> str:
    replacements = {
        "È": "è", "È": "è", "È": "é", "È": "é", "È": "é", "È": "é",
        "È": "é", "Ë": "ê", "Í": "î", "Î": "î", "Ú": "û", "˚": "°",
        "Ì": "É", "Ó": "É", "‡": "à", "&#x2019;": "’",
    }
    for a, b in replacements.items():
        text = text.replace(a, b)
    return re.sub(r"[ \t]+", " ", text)


def infer_profile(text: str) -> list[dict[str, str]]:
    t = text.lower()
    fields: list[dict[str, str]] = []
    rules = [
        (("quantité", "kg", "tonne", " t ", "litre", " l "), "quantite", "Quantité maximale susceptible d’être présente", "number", "kg/t/L selon la rubrique"),
        (("capacité", "kg/j", "t/j", "m3/j", "m³/j", "animaux", "animaux-équivalents", "véhicules", "voyageurs"), "capacite", "Capacité de l’installation", "number", "unité selon la rubrique"),
        (("puissance", "kw", "kva", "mw"), "puissance", "Puissance installée/absorbée", "number", "kW/kVA/MW selon la rubrique"),
        (("surface", "m2", "m²", "superficie"), "surface", "Surface concernée", "number", "m²"),
        (("volume", "m3", "m³"), "volume", "Volume de stockage/installation", "number", "m³"),
        (("pression", "bar", "pa"), "pression", "Pression de fonctionnement", "number", "bar/Pa"),
        (("température", "°c", "celsius"), "temperature", "Température de fonctionnement", "number", "°C"),
        (("distance", "rayon", "km"), "distance", "Distance / rayon", "number", "km"),
        (("nombre", "effectif", "personnel", "travailleur", "ouvrier"), "effectif", "Effectif", "number", "personnes"),
    ]
    seen = set()
    for tokens, key, label, typ, unit in rules:
        if any(tok in t for tok in tokens) and key not in seen:
            fields.append({"key": key, "label": label, "type": typ, "unit": unit})
            seen.add(key)
    if not fields:
        fields.append({"key": "capacite", "label": "Valeur caractéristique de la rubrique", "type": "number", "unit": "selon la rubrique"})
    return fields


def parse() -> dict:
    TMP.mkdir(parents=True, exist_ok=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(PDF_URL, PDF)
    subprocess.run(["pdftotext", "-layout", "-enc", "UTF-8", str(PDF), str(TXT)], check=True)
    raw = TXT.read_text(encoding="utf-8", errors="replace")
    raw = clean_text(raw)
    lines = raw.splitlines()

    rubriques: list[dict] = []
    current = None
    page = 0
    for line in lines:
        mpage = re.search(r"JOURNAL OFFICIEL.*?(\d+)\s*$", line)
        if mpage:
            try:
                page = int(mpage.group(1))
            except ValueError:
                pass
        m = RUBRIQUE_RE.match(line)
        if m:
            code = m.group(1)
            if current is not None:
                current["rawDescription"] = " ".join(current.pop("_lines")).strip()
                current["inputProfile"] = infer_profile(current["rawDescription"])
                rubriques.append(current)
            family = code[:2] + "00"
            family_key = code if code in FAMILIES else family
            current = {
                "rubrique": code,
                "famille": family_key,
                "familleLabel": FAMILIES.get(family_key, "Installation classée"),
                "designation": "",
                "conditions": [],
                "inputProfile": [],
                "source": "Décret exécutif n° 07-144 du 19 mai 2007",
                "sourceUrl": PDF_URL,
                "sourcePage": page,
                "_lines": [],
            }
            continue
        if current is None:
            continue
        s = line.strip()
        if not s or "JOURNAL OFFICIEL" in s or s.startswith("ANNEXE"):
            continue
        if REGIME_RE.search(s):
            rm = REGIME_RE.search(s)
            regime = rm.group(1)
            left = s[:rm.start()].strip(" -:;")
            right = s[rm.end():].strip()
            current["conditions"].append({"texte": left, "regime": regime, "meta": right})
        else:
            current["_lines"].append(s)

    if current is not None:
        current["rawDescription"] = " ".join(current.pop("_lines")).strip()
        current["inputProfile"] = infer_profile(current["rawDescription"])
        rubriques.append(current)

    # Remove obvious false positives and duplicate page continuations.
    clean = []
    seen = set()
    for r in rubriques:
        key = (r["rubrique"], r.get("rawDescription", "")[:120])
        if not r.get("rawDescription") or key in seen:
            continue
        seen.add(key)
        r["designation"] = r["rawDescription"][:240]
        clean.append(r)

    data = {
        "version": "07-144",
        "date": "19 mai 2007",
        "sourceUrl": PDF_URL,
        "familles": [{"code": k, "label": v} for k, v in FAMILIES.items()],
        "rubriques": clean,
        "parser": {
            "generatedBy": "URATEC Manager",
            "warning": "Les conditions extraites automatiquement doivent être vérifiées dans le texte officiel avant dépôt d’un dossier administratif.",
        },
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {len(clean)} rubrique records -> {OUT}")
    return data


if __name__ == "__main__":
    parse()
