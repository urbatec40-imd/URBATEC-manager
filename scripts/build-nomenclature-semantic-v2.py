from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / ".tmp-nomenclature"
PDF = TMP / "07-144.pdf"
OUT = ROOT / "public" / "data" / "nomenclature-07-144-semantic-v2.json"
URL = "https://www.joradp.dz/FTP/jo-francais/2007/F2007034.pdf"

RUBRIC_FIRST_RE = re.compile(r"^\s*([12]\d{3})(?:\s+|$)")
REGIME_RE = re.compile(r"^(AM|AW|APAPC|PAPC|D)$", re.I)
NUMBER_RE = re.compile(r"^\d+(?:[.,]\d+)?$")
XVAL = {"x", "×"}

FAMILIES = {
    "1000": "Substances", "1100": "Très toxiques", "1200": "Toxiques", "1300": "Comburantes",
    "1400": "Explosibles", "1500": "Inflammables", "1600": "Combustibles", "1700": "Corrosives",
    "1800": "Divers", "2000": "Activité", "2100": "Élevage d’animaux & Activité agricole",
    "2200": "Agro alimentaires", "2300": "Textiles, Cuirs et Peaux", "2400": "Bois, papier, carton, imprimerie",
    "2500": "Matériaux, minerais et métaux", "2600": "Chimie, Caoutchouc", "2700": "Déchets et traitements des eaux",
    "2800": "Aquaculture et Pêche", "2900": "Divers",
}

# Observed from the official 07-144 table geometry on pp. 27, 51 and 54.
COL = {
    "regime": 262.0,
    "rayon": 324.0,
    "impact": 355.0,
    "danger": 405.0,
    "notice": 444.0,
    "rapportDangereux": 486.0,
}


def clean(s: str | None) -> str:
    if not s:
        return ""
    repl = {
        "Ã©": "é", "Ã¨": "è", "Ãª": "ê", "Ã®": "î", "Ã´": "ô", "Ã¹": "ù", "Ã§": "ç",
        "Ã‰": "É", "Ã€": "À", "Ã‚": "Â", "Ã”": "Ô", "Ã›": "Û", "Â": "",
        "â€™": "’", "â€“": "–", "â€œ": "“", "â€": "”", "È": "é", "Ë": "ê",
        "Í": "î", "Ú": "û", "‡": "à",
    }
    for a, b in repl.items():
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s.replace("\u00a0", " ")).strip()


def is_family(code: str) -> bool:
    return code.endswith("00")


def first_code(line: list[dict]) -> str | None:
    if not line:
        return None
    first = clean(line[0].get("text", ""))
    m = RUBRIC_FIRST_RE.match(first)
    return m.group(1) if m else None


def regime_of(text: str) -> str | None:
    m = REGIME_RE.fullmatch(clean(text))
    if not m:
        return None
    value = m.group(1).upper()
    return "APAPC" if value == "PAPC" else value


def group_lines(page):
    words = page.extract_words(x_tolerance=1, y_tolerance=2, keep_blank_chars=False, use_text_flow=False)
    buckets: list[list[dict]] = []
    for w in sorted(words, key=lambda z: (float(z["top"]), float(z["x0"]))):
        if not buckets or abs(float(w["top"]) - float(buckets[-1][0]["top"])) > 3.5:
            buckets.append([w])
        else:
            buckets[-1].append(w)
    return [sorted(b, key=lambda z: float(z["x0"])) for b in buckets]


def title_after_code(line: list[dict], code: str) -> str:
    parts = []
    seen = False
    for w in line:
        t = clean(w["text"])
        if not seen:
            if t == code:
                seen = True
            continue
        if regime_of(t) or t.lower() in XVAL:
            break
        if NUMBER_RE.fullmatch(t) and float(w["x0"]) >= COL["rayon"]:
            break
        parts.append(t)
    return clean(" ".join(parts))


def nearest_doc(x: float) -> str | None:
    docs = {"impact": COL["impact"], "danger": COL["danger"], "notice": COL["notice"], "rapportDangereux": COL["rapportDangereux"]}
    return min(docs, key=lambda k: abs(x - docs[k])) if docs else None


def decision_from_line(line: list[dict]) -> dict | None:
    regime = None
    regime_i = -1
    for i, w in enumerate(line):
        r = regime_of(w["text"])
        if r:
            regime, regime_i = r, i
            break

    has_d = any(clean(w["text"]).upper() == "D" and float(w["x0"]) >= COL["regime"] - 35 for w in line)
    has_x = any(clean(w["text"]).lower() in XVAL and float(w["x0"]) >= COL["impact"] - 35 for w in line)

    if regime is None and not has_d and not has_x:
        return None

    if regime is None:
        regime = "D"
        regime_i = next((i for i, w in enumerate(line) if clean(w["text"]).upper() == "D" and float(w["x0"]) >= COL["regime"] - 35), len(line))

    condition_words = []
    for w in line[:regime_i]:
        x = float(w["x0"])
        t = clean(w["text"])
        if x >= COL["rayon"] - 15:
            continue
        if t:
            condition_words.append(t)
    condition = clean(" ".join(condition_words))

    rayon = ""
    documents = {"impact": False, "danger": False, "notice": False, "rapportDangereux": False}
    for w in line[regime_i + 1:]:
        t = clean(w["text"])
        x = float(w["x0"])
        if not rayon and NUMBER_RE.fullmatch(t) and x < COL["impact"] - 15:
            rayon = t
            continue
        if t.lower() in XVAL or t.lower() == "×":
            doc = nearest_doc(x)
            if doc:
                documents[doc] = True

    return {
        "regime": regime,
        "rayon": rayon,
        "condition": condition,
        "documents": documents,
    }


def append_continuation(pending: dict | None, line: list[dict]) -> dict | None:
    if pending is None:
        return None
    text = clean(" ".join(w["text"] for w in line))
    if not text or text.startswith("Nota") or text.startswith("ANNEXE"):
        return pending
    pending["condition"] = clean((pending.get("condition") or "") + " " + text)
    return pending


def parse():
    TMP.mkdir(parents=True, exist_ok=True)
    if not PDF.exists() or PDF.stat().st_size < 100_000:
        urllib.request.urlretrieve(URL, PDF)

    by_code: dict[str, dict] = {}
    pending: dict | None = None
    pending_code: str | None = None

    with pdfplumber.open(PDF) as pdf:
        for pno, page in enumerate(pdf.pages, 1):
            if pno < 5:
                continue
            lines = group_lines(page)
            for line in lines:
                text = clean(" ".join(w["text"] for w in line))
                if not text:
                    continue

                code = first_code(line)
                if code:
                    # Any new rubric closes the previous decision.
                    if pending is not None and pending_code in by_code:
                        by_code[pending_code]["decisionRows"].append(pending)
                    pending = None
                    pending_code = None

                    item = by_code.setdefault(code, {
                        "rubrique": code,
                        "famille": code[:2] + "00",
                        "familleLabel": FAMILIES.get(code[:2] + "00", ""),
                        "designation": title_after_code(line, code) if not is_family(code) else FAMILIES.get(code, ""),
                        "decisionRows": [],
                    })

                    if not is_family(code):
                        d = decision_from_line(line)
                        if d:
                            pending = d
                            pending_code = code
                        else:
                            title = title_after_code(line, code)
                            if title:
                                item["designation"] = title
                    continue

                if pending_code is None or pending_code not in by_code or is_family(pending_code):
                    continue

                d = decision_from_line(line)
                if d:
                    by_code[pending_code]["decisionRows"].append(pending)
                    pending = d
                else:
                    pending = append_continuation(pending, line)

        if pending is not None and pending_code in by_code:
            by_code[pending_code]["decisionRows"].append(pending)

    rubriques = []
    for code, item in by_code.items():
        if is_family(code):
            continue
        unique = []
        seen = set()
        for row in item["decisionRows"]:
            key = json.dumps(row, ensure_ascii=False, sort_keys=True)
            if key not in seen:
                seen.add(key)
                unique.append(row)
        item["decisionRows"] = unique
        item["isSelectable"] = bool(unique)
        if not item["designation"]:
            item["designation"] = code if not unique else unique[0]["condition"]
        item["source"] = "Décret exécutif n° 07-144 du 19 mai 2007"
        item["sourceUrl"] = URL
        rubriques.append(item)

    data = {
        "version": "07-144-semantic-v2",
        "rubriques": sorted(rubriques, key=lambda x: x["rubrique"]),
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    total = sum(len(r["decisionRows"]) for r in rubriques)
    print(f"Generated semantic v2: {len(rubriques)} rubriques / {total} decisions -> {OUT}")
    for code in ["1240", "1310", "2110", "2120", "2122"]:
        item = next((x for x in rubriques if x["rubrique"] == code), None)
        print(f"TEST {code}: {json.dumps(item, ensure_ascii=False)[:2600] if item else 'NOT FOUND'}")


if __name__ == "__main__":
    parse()
