from __future__ import annotations

import json
import re
import shutil
import subprocess
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

PDF_URL = "https://www.joradp.dz/FTP/jo-francais/2007/F2007034.PDF"
ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / ".tmp-nomenclature"
PDF = TMP / "07-144.pdf"
XML = TMP / "07-144-bbox.xml"
OUT = ROOT / "public" / "data" / "nomenclature-07-144.json"

FAMILIES = {
    "1000": "Substances", "1100": "Très toxiques", "1200": "Toxiques", "1300": "Comburantes",
    "1400": "Explosibles", "1500": "Inflammables", "1600": "Combustibles", "1700": "Corrosives",
    "1800": "Divers", "2000": "Activité", "2100": "Élevage d’animaux & Activité agricole",
    "2200": "Agro alimentaires", "2300": "Textiles, Cuirs et Peaux", "2400": "Bois- papier- carton- imprimerie",
    "2500": "Matériaux, minerais et métaux", "2600": "Chimie, Caoutchouc", "2700": "Déchets et traitements des eaux",
    "2800": "Aquaculture et Pêche", "2900": "Divers",
}

CODE_RE = re.compile(r"^(1\d{3}|2\d{3})$")


def clean(text: str) -> str:
    replacements = {
        "dØ": "dé", "DØ": "Dé", "prØ": "pré", "rØ": "ré", "Ł": "é", "Œ": "œ",
        "": "’", "": "œ", "oø": "où", "Ã©": "é", "Ã¨": "è", "Ãª": "ê", "Ã®": "î",
        "Ã´": "ô", "Ã¹": "ù", "Ã§": "ç", "Ã ": "à", "â€™": "’", "â€œ": "“", "â€": "”",
    }
    for a, b in replacements.items():
        text = text.replace(a, b)
    return re.sub(r"\s+", " ", text).strip()


def infer_profile(text: str) -> list[dict[str, str]]:
    t = clean(text).lower()
    rules = [
        (("animaux-equivalents", "animaux", "élevage", "volailles", "ovins", "bovins"), "nombreAnimaux", "Nombre d’animaux-équivalents", "number", "animaux-équivalents"),
        (("m3/j", "m³/j", "m3 par jour"), "capaciteTraitement", "Capacité de traitement", "number", "m³/j"),
        (("kg/j", "t/j", "tonne/j", "tonnes/j"), "capaciteProduction", "Capacité de production", "number", "kg/j ou t/j"),
        (("puissance", "kw", "kva", "mw"), "puissance", "Puissance installée", "number", "kW/kVA/MW"),
        (("volume total de stockage", "volume total", "volume de stockage", "m3", "m³"), "volume", "Volume / capacité de stockage", "number", "m³"),
        (("surface", "m2", "m²", "superficie"), "surface", "Surface", "number", "m²"),
        (("quantité", "kg", "tonne", "litre", "litres", "l"), "quantite", "Quantité", "number", "selon rubrique"),
    ]
    out: list[dict[str, str]] = []
    for tokens, key, label, typ, unit in rules:
        if any(tok in t for tok in tokens) and not any(x["key"] == key for x in out):
            out.append({"key": key, "label": label, "type": typ, "unit": unit})
    return out


def page_lines(page: ET.Element) -> list[list[tuple[float, str]]]:
    lines: list[tuple[float, list[tuple[float, str]]]] = []
    for line in page.iter("line"):
        words: list[tuple[float, str]] = []
        for word in line.findall("word"):
            try:
                x = float(word.attrib["xMin"])
            except Exception:
                continue
            text = clean("".join(word.itertext()))
            if text:
                words.append((x, text))
        if not words:
            continue
        try:
            y = float(line.attrib["yMin"])
        except Exception:
            y = 0.0
        lines.append((y, sorted(words)))
    lines.sort(key=lambda item: item[0])
    return [words for _, words in lines]


def main() -> None:
    if shutil.which("pdftotext") is None:
        raise SystemExit("pdftotext is required")

    TMP.mkdir(parents=True, exist_ok=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(PDF_URL, PDF)
    subprocess.run(["pdftotext", "-bbox-layout", "-enc", "UTF-8", str(PDF), str(XML)], check=True)

    tree = ET.parse(XML)
    root = tree.getroot()
    ns = "{http://www.w3.org/1999/xhtml}"
    pages = root.findall(f".//{ns}page") or root.findall(".//page")

    rows: list[dict] = []
    for page_no, page in enumerate(pages, start=1):
        if page_no < 5:
            continue
        current_code: str | None = None
        current_parts: list[str] = []

        def flush() -> None:
            nonlocal current_code, current_parts
            if not current_code:
                return
            designation = clean(" ".join(current_parts))
            designation = re.sub(r"\b(?:AM|AW|APAPC|D)\b", " ", designation)
            designation = clean(designation)
            if len(designation) < 6:
                return
            if designation.lower() in {v.lower() for v in FAMILIES.values()}:
                return
            family = current_code[:2] + "00"
            rows.append({
                "rubrique": current_code,
                "famille": family,
                "familleLabel": FAMILIES.get(family, "Installation classée"),
                "designation": designation,
                "conditions": [],
                "inputProfile": infer_profile(designation),
                "source": "Décret exécutif n° 07-144 du 19 mai 2007",
                "sourceUrl": PDF_URL,
                "sourcePage": page_no,
            })
            current_parts = []

        for words in page_lines(page):
            code = None
            code_x = 9999.0
            for x, text in words:
                if x < 180 and CODE_RE.fullmatch(text):
                    code = text
                    code_x = x
                    break
            if code:
                flush()
                current_code = code
                # Designation column starts after the first code column and before regime/document columns.
                first = [text for x, text in words if 80 <= x <= 430 and abs(x - code_x) > 2 and text != code]
                current_parts = [" ".join(first)] if first else []
                continue

            if current_code:
                # Keep the main designation area only; ignore right-side regime / distance / X columns.
                main = [text for x, text in words if 80 <= x <= 430]
                if main:
                    current_parts.append(" ".join(main))

        flush()

    unique: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for row in rows:
        d = clean(row["designation"])
        d = re.sub(r"\b(?:JOURNAL OFFICIEL|ANNEXE|SUITE)\b.*$", "", d, flags=re.I).strip()
        if not d:
            continue
        key = (row["rubrique"], d)
        if key in seen:
            continue
        seen.add(key)
        row["designation"] = d
        unique.append(row)

    data = {
        "version": "07-144",
        "date": "19 mai 2007",
        "sourceUrl": PDF_URL,
        "families": [{"code": k, "label": v} for k, v in FAMILIES.items()],
        "rubriques": unique,
        "generated": True,
        "generatorVersion": "v5-bbox",
        "generatorNote": "Extraction from the official PDF with bounding boxes to preserve nomenclature columns.",
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {len(unique)} rubrique records -> {OUT}")


if __name__ == "__main__":
    main()
