#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

PDF_URL = "https://www.joradp.dz/FTP/jo-francais/2007/F2007034.PDF"
ROOT = Path(__file__).resolve().parents[1]
PUBLIC_DATA = ROOT / "public" / "data"
CACHE = ROOT / ".cache" / "07144.pdf"
OUTPUT = PUBLIC_DATA / "nomenclature-07-144.json"

FAMILIES = [
    ("1000", "Substances"), ("1100", "Très toxiques"), ("1200", "Toxiques"),
    ("1300", "Comburantes"), ("1400", "Explosibles"), ("1500", "Inflammables"),
    ("1600", "Combustibles"), ("1700", "Corrosives"), ("1800", "Divers"),
    ("2000", "Activité"), ("2100", "Élevage d’animaux & Activité agricole"),
    ("2200", "Agro alimentaires"), ("2300", "Textiles, Cuirs et Peaux"),
    ("2400", "Bois- papier- carton- imprimerie"), ("2500", "Matériaux, minerais et métaux"),
    ("2600", "Chimie, Caoutchouc"), ("2700", "Déchets et traitements des eaux"),
    ("2800", "Aquaculture et Pêche"), ("2900", "Divers"),
]

FAMILY_BY_PREFIX = {code[:2]: (code, label) for code, label in FAMILIES}
HEADER_WORDS = {
    "designation de l’activite", "designation de l'activité", "type d’autorisation",
    "type d'autorisation", "etude d’impact", "etude d'impact", "etude de danger",
    "notice d’impact", "notice d'impact", "rapport sur les produits dangereux",
    "rayon d’affichage", "rayon d'affichage", "annexe", "suite",
}


def download_pdf() -> None:
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    if CACHE.exists() and CACHE.stat().st_size > 100_000:
        return
    print(f"Downloading {PDF_URL}")
    urllib.request.urlretrieve(PDF_URL, CACHE)


def extract_text() -> str:
    try:
        result = subprocess.run(
            ["pdftotext", "-layout", str(CACHE), "-"],
            check=True, capture_output=True, text=True, encoding="utf-8", errors="replace"
        )
        return result.stdout
    except FileNotFoundError:
        print("pdftotext is required. Install poppler-utils.", file=sys.stderr)
        raise SystemExit(2)


def clean(s: str) -> str:
    s = s.replace("\u0000", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def normalize_search(s: str) -> str:
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", s).lower() if unicodedata.category(c) != "Mn")


def infer_profile(text: str) -> list[dict]:
    n = normalize_search(text)
    fields: list[dict] = []

    def add(key: str, label: str, unit: str, required: bool = True, typ: str = "number"):
        if not any(f["key"] == key for f in fields):
            fields.append({"key": key, "label": label, "type": typ, "unit": unit, "required": required})

    if "animal-equivalent" in n or "animaux-equivalents" in n or "animaux" in n or "elevage" in n:
        add("nombreAnimaux", "Nombre d’animaux", "sujets")
    if re.search(r"m3\s*/\s*j|m³\s*/\s*j|m3/j|m³/j", n):
        add("capaciteM3Jour", "Capacité de traitement", "m³/j")
    if re.search(r"kg\s*/\s*j|kg/j", n):
        add("capaciteKgJour", "Capacité", "kg/j")
    if re.search(r"t\s*/\s*j|t/j|tonnes?\s*/\s*j", n):
        add("capaciteTonnesJour", "Capacité", "t/j")
    if "kw" in n or "puissance" in n:
        add("puissance", "Puissance", "kW")
    if "m2" in n or "m²" in n or "surface" in n:
        add("surface", "Surface", "m²")
    if "litre" in n or re.search(r"\bl\b", n) or "liquide" in n:
        add("quantiteLitres", "Quantité / capacité", "L")
    if "tonne" in n or re.search(r"\bt\b", n) and "t/j" not in n:
        add("quantiteTonnes", "Quantité", "t")
    if "pression" in n:
        add("pression", "Pression", "bar")
    if "temperature" in n or "point d eclair" in n or "point d’eclair" in n:
        add("temperature", "Température", "°C")
    if "debit" in n:
        add("debit", "Débit", "m³/h")
    if not fields:
        # Always keep an explicit project measurement rather than inventing criteria.
        fields.append({"key": "capacite", "label": "Capacité / quantité", "type": "number", "unit": "", "required": False})
    return fields


def parse(text: str) -> list[dict]:
    # The official PDF is columnar. We intentionally retain the raw block and infer
    # input fields from the legal wording instead of guessing thresholds.
    lines = text.splitlines()
    rows: list[dict] = []
    current = None
    current_parts: list[str] = []

    rubric_re = re.compile(r"^\s*(\d{4})\s*$")

    def flush():
        nonlocal current, current_parts
        if current is None:
            return
        designation = clean(" ".join(current_parts))
        designation = re.sub(r"(DÈsignation de l.*?)(?=Type|Rayon|$)", "", designation, flags=re.I)
        designation = clean(designation)
        if not designation or designation.lower() in HEADER_WORDS:
            current = None
            current_parts = []
            return
        prefix = current[:2]
        fam = FAMILY_BY_PREFIX.get(prefix, ("", "Autre"))
        rows.append({
            "rubrique": current,
            "designation": designation,
            "famille": fam[0],
            "familleLabel": fam[1],
            "conditions": [],
            "inputProfile": infer_profile(designation),
            "source": "Décret exécutif n° 07-144 du 19 mai 2007",
            "sourceUrl": "https://www.joradp.dz/FTP/jo-francais/2007/F2007034.PDF",
        })
        current = None
        current_parts = []

    for raw in lines:
        m = rubric_re.match(raw)
        if m:
            code = m.group(1)
            # Only treat a four-digit number as a new rubric in the appendix section.
            if 1000 <= int(code) <= 2999:
                flush()
                current = code
                continue
        if current is not None:
            s = clean(raw)
            if not s:
                continue
            low = normalize_search(s)
            if low in {normalize_search(x) for x in HEADER_WORDS}:
                continue
            # Skip pure table values / page artifacts; keep legal prose.
            if re.fullmatch(r"[xX]+", s):
                continue
            if re.fullmatch(r"(?:AM|AW|APAPC|D)(?:\s+(?:AM|AW|APAPC|D))*", s):
                continue
            current_parts.append(s)
    flush()

    # Deduplicate by (rubrique, designation) and exclude obvious cross-reference-only rows.
    seen = set()
    out = []
    for r in rows:
        key = (r["rubrique"], r["designation"])
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def main() -> None:
    download_pdf()
    text = extract_text()
    rows = parse(text)
    PUBLIC_DATA.mkdir(parents=True, exist_ok=True)
    data = {
        "version": "07-144",
        "date": "19 mai 2007",
        "sourceUrl": "https://www.joradp.dz/FTP/jo-francais/2007/F2007034.PDF",
        "families": [{"code": c, "label": l} for c, l in FAMILIES],
        "rubriques": rows,
        "generated": True,
        "generatorNote": "Extracted from the official Journal Officiel PDF. Threshold logic must be validated per rubrique; the generator does not invent legal thresholds.",
    }
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {OUTPUT} with {len(rows)} rubrique records")


if __name__ == "__main__":
    main()
