from __future__ import annotations

import json
import re
import shutil
import subprocess
import urllib.request
from pathlib import Path

PDF_URL = "https://www.joradp.dz/FTP/jo-francais/2007/F2007034.PDF"
ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / ".tmp-nomenclature"
PDF = TMP / "07-144.pdf"
TXT = TMP / "07-144-layout.txt"
OUT = ROOT / "public" / "data" / "nomenclature-07-144.json"

FAMILIES = {
    "1000": "Substances", "1100": "Très toxiques", "1200": "Toxiques", "1300": "Comburantes",
    "1400": "Explosibles", "1500": "Inflammables", "1600": "Combustibles", "1700": "Corrosives",
    "1800": "Divers", "2000": "Activité", "2100": "Élevage d’animaux & Activité agricole",
    "2200": "Agro alimentaires", "2300": "Textiles, Cuirs et Peaux", "2400": "Bois- papier- carton- imprimerie",
    "2500": "Matériaux, minerais et métaux", "2600": "Chimie, Caoutchouc", "2700": "Déchets et traitements des eaux",
    "2800": "Aquaculture et Pêche", "2900": "Divers",
}

CODE_RE = re.compile(r"^\s*(1\d{3}|2\d{3})\s+(.*)$")
REF_RE = re.compile(r"\bvoir\s+((?:\d{4})(?:\s*,\s*\d{4})*)", re.I)


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
        (("animaux", "animaux-equivalents", "élevage"), "nombreAnimaux", "Nombre d’animaux", "number", "animaux"),
        (("m3/j", "m³/j", "m3 par jour"), "capaciteTraitement", "Capacité de traitement", "number", "m³/j"),
        (("kg/j", "t/j", "tonne/j", "tonnes/j"), "capaciteProduction", "Capacité de production", "number", "kg/j ou t/j"),
        (("puissance", "kw", "kva", "mw"), "puissance", "Puissance installée", "number", "kW/kVA/MW"),
        (("volume", "m3", "m³"), "volume", "Volume / capacité de stockage", "number", "m³"),
        (("surface", "m2", "m²", "superficie"), "surface", "Surface", "number", "m²"),
        (("quantité", "kg", "tonne", "litre", "l"), "quantite", "Quantité", "number", "selon rubrique"),
    ]
    out: list[dict[str, str]] = []
    for tokens, key, label, typ, unit in rules:
        if any(tok in t for tok in tokens) and not any(x["key"] == key for x in out):
            out.append({"key": key, "label": label, "type": typ, "unit": unit})
    return out


def main() -> None:
    if shutil.which("pdftotext") is None:
        raise SystemExit("pdftotext is required")

    TMP.mkdir(parents=True, exist_ok=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(PDF_URL, PDF)
    subprocess.run(["pdftotext", "-layout", "-enc", "UTF-8", str(PDF), str(TXT)], check=True)

    pages = TXT.read_text(encoding="utf-8", errors="replace").split("\f")
    rows: list[dict] = []

    for page_no, page in enumerate(pages, start=1):
        if page_no < 5:
            continue
        lines = [clean(x) for x in page.splitlines()]
        current_code: str | None = None
        current_parts: list[str] = []

        def flush() -> None:
            nonlocal current_code, current_parts
            if not current_code:
                return
            designation = clean(" ".join(current_parts))
            if not designation:
                return
            # Remove repeated table headers/footers and column labels.
            bad = {
                "N° Rayon de la rubrique", "Désignation de l’activité", "Type d’autorisation",
                "Etude d’impact", "Etude de danger", "Notice d’impact", "Rapport sur les produits dangereux",
                "ANNEXE (Suite)",
            }
            if designation in bad:
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

        for line in lines:
            if not line or line in {"ANNEXE (Suite)", "JOURNAL OFFICIEL DE LA REPUBLIQUE ALGERIENNE N° 34", "22 mai 2007"}:
                continue
            match = CODE_RE.match(line)
            if match:
                flush()
                current_code = match.group(1)
                rest = match.group(2).strip()
                # Keep only the designation-like portion on the first line; headers/regimes are ignored later.
                current_parts = [rest] if rest else []
            elif current_code:
                current_parts.append(line)
        flush()

    unique: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for row in rows:
        d = clean(row["designation"])
        if not d or len(d) < 4:
            continue
        if d.startswith(("a)", "b)", "c)", "1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.", "9.")) and len(d) < 80:
            continue
        # Standalone headings are not activities.
        if d.lower() in {v.lower() for v in FAMILIES.values()}:
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
        "generatorNote": "Extraction from the official PDF using pdftotext -layout; review legal thresholds against the official table before filing.",
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {len(unique)} rubrique records -> {OUT}")


if __name__ == "__main__":
    main()
