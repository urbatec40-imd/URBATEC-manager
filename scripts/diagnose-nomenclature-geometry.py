from __future__ import annotations

import re
import urllib.request
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / ".tmp-nomenclature"
PDF = TMP / "07-144.pdf"
URLS = [
    "https://www.joradp.dz/FTP/jo-francais/2007/F2007034.pdf",
    "https://creg.gov.dz/T%C3%A9l%C3%A9charger/487/autorisation-dexploitation-de-letablissement-classe/13053/decret-executif-n07-144-du-19-mai-2007.pdf",
]
TARGETS = {"1310", "2110", "2122"}


def clean(s: str | None) -> str:
    return re.sub(r"\s+", " ", (s or "").replace("\u00a0", " ").strip())


def download_pdf() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    if PDF.exists() and PDF.stat().st_size > 100_000:
        return
    for url in URLS:
        try:
            urllib.request.urlretrieve(url, PDF)
            if PDF.exists() and PDF.stat().st_size > 100_000:
                return
        except Exception:
            pass
    raise SystemExit("Impossible de télécharger le PDF officiel.")


def main() -> None:
    download_pdf()
    with pdfplumber.open(PDF) as pdf:
        print(f"PDF pages: {len(pdf.pages)}")
        for page_no, page in enumerate(pdf.pages, start=1):
            if page_no < 5:
                continue
            words = page.extract_words(x_tolerance=1, y_tolerance=2, keep_blank_chars=False, use_text_flow=False)
            hits = [w for w in words if clean(w.get("text")) in TARGETS]
            if not hits:
                continue
            print(f"\n===== PAGE {page_no} =====")
            for hit in hits[:20]:
                target = clean(hit["text"])
                top = float(hit["top"])
                same_line = [w for w in words if abs(float(w["top"]) - top) <= 3.5]
                same_line.sort(key=lambda w: float(w["x0"]))
                print(f"\nTARGET {target} at x={float(hit['x0']):.1f}-{float(hit['x1']):.1f}, y={top:.1f}")
                print("ROW WITH POSITIONS:")
                print(" | ".join(f"{clean(w['text'])}@{float(w['x0']):.1f}" for w in same_line))

                nearby = [w for w in words if abs(float(w["top"]) - top) <= 55]
                lines: dict[int, list[dict]] = {}
                for w in nearby:
                    key = round(float(w["top"]) / 3) * 3
                    lines.setdefault(key, []).append(w)
                print("CONTEXT WITH POSITIONS:")
                for key in sorted(lines):
                    line_words = sorted(lines[key], key=lambda w: float(w["x0"]))
                    print("  " + " | ".join(f"{clean(w['text'])}@{float(w['x0']):.1f}" for w in line_words))

                print("DECISION-LIKE LINES:")
                for key in sorted(lines):
                    line_words = sorted(lines[key], key=lambda w: float(w["x0"]))
                    texts = [clean(w["text"]) for w in line_words]
                    if any(t.upper() in {"AM", "AW", "APAPC", "PAPC", "D"} for t in texts) or any(t.lower() in {"x", "×"} for t in texts):
                        print("  " + " | ".join(f"{clean(w['text'])}@{float(w['x0']):.1f}" for w in line_words))


if __name__ == "__main__":
    main()
