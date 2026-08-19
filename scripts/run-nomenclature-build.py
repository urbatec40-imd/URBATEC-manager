from __future__ import annotations

import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / ".tmp-nomenclature"
PDF = TMP / "07-144.pdf"
PDF_URLS = [
    "https://www.joradp.dz/FTP/jo-francais/2007/F2007034.pdf",
    "https://creg.gov.dz/T%C3%A9l%C3%A9charger/487/autorisation-dexploitation-de-letablissement-classe/13053/decret-executif-n07-144-du-19-mai-2007.pdf",
]


def download_pdf() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    if PDF.exists() and PDF.stat().st_size > 100_000:
        return
    last_error = None
    for url in PDF_URLS:
        try:
            urllib.request.urlretrieve(url, PDF)
            if PDF.exists() and PDF.stat().st_size > 100_000:
                return
        except Exception as exc:
            last_error = exc
    raise SystemExit(f"Impossible de télécharger le PDF officiel : {last_error}")


def main() -> None:
    source_path = ROOT / "scripts" / "build-nomenclature-07-144-matrix.py"
    source = source_path.read_text(encoding="utf-8")

    namespace = {
        "__name__": "__nomenclature_matrix__",
        "__file__": str(source_path),
        "download_pdf": download_pdf,
    }
    exec(compile(source, str(source_path), "exec"), namespace)
    namespace["build"]()


if __name__ == "__main__":
    main()
