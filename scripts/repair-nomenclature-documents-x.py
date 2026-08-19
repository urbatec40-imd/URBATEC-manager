from __future__ import annotations

import json
import re
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / ".tmp-nomenclature" / "07-144.pdf"
OUT = ROOT / "public" / "data" / "nomenclature-07-144.json"
REGIMES = {"AM", "AW", "APAPC", "D"}

def clean(v: str | None) -> str:
    if not v:
        return ""
    return re.sub(r"\s+", " ", v.replace("\u00a0", " ").strip())

def is_x(v: str | None) -> bool:
    return clean(v).lower() in {"x", "×"}

def norm(v: str) -> str:
    return re.sub(r"\s+", " ", clean(v).lower()).strip()

def extract_table_rows():
    current_code = None
    out = []
    with pdfplumber.open(PDF) as pdf:
        for page_no, page in enumerate(pdf.pages, start=1):
            if page_no < 5:
                continue
            tables = page.extract_tables({
                "vertical_strategy": "lines",
                "horizontal_strategy": "lines",
                "snap_tolerance": 3,
                "join_tolerance": 3,
                "intersection_tolerance": 5,
                "text_tolerance": 2,
            })
            for table in tables:
                for raw in table or []:
                    cells = [clean(c) for c in (raw or [])]
                    if not cells:
                        continue
                    for idx, cell in enumerate(cells):
                        m = re.fullmatch(r"(1\d{3}|2\d{3})", cell)
                        if m:
                            current_code = m.group(1)
                            break
                    regime_idx = next((i for i, c in enumerate(cells) if c in REGIMES), None)
                    if current_code is None or regime_idx is None:
                        continue
                    nonempty_before = [(i, c) for i, c in enumerate(cells[:regime_idx]) if c]
                    nonempty_after = [(i, c) for i, c in enumerate(cells[regime_idx + 1:], start=regime_idx + 1) if c]
                    if not nonempty_before:
                        continue
                    condition = nonempty_before[-1][1]
                    rayon = nonempty_after[0][1] if nonempty_after else ""
                    x_cells = cells[regime_idx + 2:regime_idx + 6]
                    x_cells += [""] * (4 - len(x_cells))
                    docs = {
                        "impact": is_x(x_cells[0]),
                        "danger": is_x(x_cells[1]),
                        "notice": is_x(x_cells[2]),
                        "rapportDangereux": is_x(x_cells[3]),
                    }
                    out.append({"rubrique": current_code, "condition": condition, "regime": cells[regime_idx], "rayon": rayon, "documents": docs, "page": page_no})
    return out

def repair():
    if not PDF.exists():
        raise SystemExit(f"PDF introuvable: {PDF}")
    data = json.loads(OUT.read_text(encoding="utf-8"))
    table_rows = extract_table_rows()
    repairs = 0
    for item in data.get("rubriques", []):
        code = item.get("rubrique")
        for decision in item.get("decisionRows", []):
            candidates = [r for r in table_rows if r["rubrique"] == code and r["regime"] == decision.get("regime")]
            target = None
            dcond = norm(decision.get("rawCondition", ""))
            if dcond:
                target = next((r for r in candidates if dcond and (dcond == norm(r["condition"]) or dcond in norm(r["condition"]) or norm(r["condition"]) in dcond)), None)
            if target is None and candidates:
                target = candidates[0]
            if target is not None:
                old = json.dumps(decision.get("documents", {}), sort_keys=True)
                new = json.dumps(target["documents"], sort_keys=True)
                decision["documents"] = target["documents"]
                if target["rayon"]:
                    decision["rayon"] = target["rayon"]
                if old != new:
                    repairs += 1
    data["generatorNote"] = (data.get("generatorNote", "") + " Documents X repaired from table cells preserving empty columns.").strip()
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Repaired document X mapping for {repairs} decision rows")

if __name__ == "__main__":
    repair()
