from __future__ import annotations

import re
import urllib.request
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / '.tmp-nomenclature'
PDF = TMP / '07-144.pdf'
PDF_URL = 'https://www.joradp.dz/FTP/jo-francais/2007/F2007034.pdf'
CODES = {'1240', '1310', '2110', '2120', '2122'}
REGIMES = {'AM', 'AW', 'APAPC', 'D', 'PAPC'}
CODE_RE = re.compile(r'^(1\d{3}|2\d{3})(?:\s+|$)')


def clean(v: str | None) -> str:
    if not v:
        return ''
    return re.sub(r'\s+', ' ', v.replace('\u00a0', ' ').strip())


def code_of(cells):
    for c in cells:
        m = CODE_RE.match(c)
        if m:
            return m.group(1)
    return None


def is_regime(v: str) -> bool:
    return clean(v).upper().replace(' ', '') in REGIMES


def is_x(v: str) -> bool:
    return clean(v).lower().strip('.') in {'x', '×'}


def main():
    TMP.mkdir(parents=True, exist_ok=True)
    if not PDF.exists() or PDF.stat().st_size < 100_000:
        print('Downloading official PDF...')
        urllib.request.urlretrieve(PDF_URL, PDF)

    hits = {c: [] for c in CODES}
    pages = 0
    tables_count = 0
    raw_rows = 0

    with pdfplumber.open(PDF) as pdf:
        pages = len(pdf.pages)
        for page_no, page in enumerate(pdf.pages, 1):
            if page_no < 5:
                continue
            settings_variants = [
                {
                    'vertical_strategy': 'lines',
                    'horizontal_strategy': 'lines',
                    'snap_tolerance': 3,
                    'join_tolerance': 3,
                    'intersection_tolerance': 5,
                },
                {
                    'vertical_strategy': 'text',
                    'horizontal_strategy': 'lines',
                    'snap_tolerance': 3,
                    'join_tolerance': 3,
                    'min_words_vertical': 1,
                    'min_words_horizontal': 1,
                },
            ]
            page_seen = False
            for settings in settings_variants:
                try:
                    tables = page.extract_tables(table_settings=settings) or []
                except Exception:
                    continue
                if not tables:
                    continue
                tables_count += len(tables)
                for table in tables:
                    for raw in table:
                        cells = [clean(x) for x in (raw or [])]
                        if not cells:
                            continue
                        raw_rows += 1
                        code = code_of(cells)
                        if code not in CODES:
                            continue
                        regime_idx = next((i for i in range(len(cells) - 1, -1, -1) if is_regime(cells[i])), None)
                        right = cells[regime_idx:] if regime_idx is not None else []
                        x_positions = [i for i, c in enumerate(cells) if is_x(c)]
                        hits[code].append({
                            'page': page_no,
                            'cells': cells,
                            'regimeIndex': regime_idx,
                            'regime': cells[regime_idx] if regime_idx is not None else '',
                            'rightSide': right,
                            'xPositions': x_positions,
                        })
                page_seen = True
                break
            if not page_seen:
                continue

    print(f'PDF pages: {pages}')
    print(f'Tables detected: {tables_count}')
    print(f'Raw table rows: {raw_rows}')
    for code in sorted(CODES):
        rows = hits[code]
        print(f'\n===== {code} : {len(rows)} raw rows =====')
        for i, row in enumerate(rows[:12], 1):
            print(f'[{i}] page={row["page"]} regime={row["regime"]!r} x={row["xPositions"]}')
            print('  LEFT :', ' | '.join(row['cells'][:row['regimeIndex']] if row['regimeIndex'] is not None else row['cells']))
            print('  RIGHT:', ' | '.join(row['rightSide']))


if __name__ == '__main__':
    main()
