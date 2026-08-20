from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / ".tmp-nomenclature"
PDF = TMP / "07-144.pdf"
OUT = ROOT / "public" / "data" / "nomenclature-07-144-semantic-v1.json"
URL = "https://www.joradp.dz/FTP/jo-francais/2007/F2007034.pdf"
CODE_RE = re.compile(r"(?<!\d)([12]\d{3})(?!\d)")
REGIME_RE = re.compile(r"^(AM|AW|APAPC|PAPC|D)$", re.I)
XVAL = {"x", "×"}
FAMILIES = {
    "1000":"Substances","1100":"Très toxiques","1200":"Toxiques","1300":"Comburantes","1400":"Explosibles","1500":"Inflammables","1600":"Combustibles","1700":"Corrosives","1800":"Divers","2000":"Activité","2100":"Élevage d’animaux & Activité agricole","2200":"Agro alimentaires","2300":"Textiles, Cuirs et Peaux","2400":"Bois, papier, carton, imprimerie","2500":"Matériaux, minerais et métaux","2600":"Chimie, Caoutchouc","2700":"Déchets et traitements des eaux","2800":"Aquaculture et Pêche","2900":"Divers"
}
DOC_HEADERS = {
    "impact": ("étude d’impact", "etude d’impact", "etude d'impact"),
    "danger": ("étude de dangers", "etude de dangers"),
    "notice": ("notice d’impact", "notice d'impact"),
    "rapportDangereux": ("rapport sur les produits dangereux",),
}


def clean(s: str | None) -> str:
    if not s:
        return ""
    repl={"Ã©":"é","Ã¨":"è","Ãª":"ê","Ã®":"î","Ã´":"ô","Ã¹":"ù","Ã§":"ç","Ã‰":"É","Ã€":"À","Ã‚":"Â","Ã”":"Ô","Ã›":"Û","Â":"","â€™":"’","â€“":"–","â€œ":"“","â€":"”","È":"é","Ë":"ê","Í":"î","Ú":"û","‡":"à"}
    for a,b in repl.items(): s=s.replace(a,b)
    return re.sub(r"\s+"," ",s.replace("\u00a0"," ")).strip()


def is_family(code: str)->bool:
    return code.endswith("00")


def code_of(s: str)->str|None:
    m=CODE_RE.search(clean(s)); return m.group(1) if m else None


def regime_of(s: str)->str|None:
    m=REGIME_RE.fullmatch(clean(s))
    if not m:
        return None
    value=m.group(1).upper()
    return "APAPC" if value=="PAPC" else value


def group_lines(page):
    words=page.extract_words(x_tolerance=1,y_tolerance=2,keep_blank_chars=False,use_text_flow=False)
    buckets: list[list[dict]]=[]
    for w in sorted(words,key=lambda z:(float(z["top"]),float(z["x0"]))):
        if not buckets or abs(float(w["top"])-float(buckets[-1][0]["top"]))>3.5:
            buckets.append([w])
        else:
            buckets[-1].append(w)
    return [sorted(b,key=lambda z:float(z["x0"])) for b in buckets]


def header_positions(lines):
    pos={}
    for line in lines[:35]:
        for w in line:
            t=clean(w["text"]).lower()
            for key, labels in DOC_HEADERS.items():
                if any(label in t for label in labels):
                    pos[key]=float(w["x0"])
            if "d’affichage" in t or "d'affichage" in t:
                pos["rayon"]=float(w["x0"])
            if "type" in t and "autorisation" in t:
                pos["regime"]=float(w["x0"])
    return pos


def classify_x(x, headers):
    if not headers:
        return None
    candidates=[(abs(x-p),k) for k,p in headers.items()]
    return min(candidates)[1]


def decision_from_line(line, headers):
    regime_idx=None
    regime=None
    for i,w in enumerate(line):
        r=regime_of(w["text"])
        if r:
            regime_idx=i
            regime=r
            break
    if regime is None:
        return None

    docs={k:False for k in DOC_HEADERS}
    rayon=""
    doc_positions=[v for k,v in headers.items() if k in DOC_HEADERS]
    first_doc_x=min(doc_positions) if doc_positions else float("inf")

    for w in line[regime_idx+1:]:
        t=clean(w["text"])
        x=float(w["x0"])
        if t.lower().strip(".") in XVAL:
            k=classify_x(x,headers)
            if k in docs:
                docs[k]=True
        elif not rayon and re.search(r"\d",t) and x < first_doc_x:
            rayon=t

    left=clean(" ".join(clean(w["text"]) for w in line[:regime_idx]))
    return {"regime":regime,"rayon":rayon,"condition":left,"documents":docs}


def flush_pending(item, pending, pre):
    if pending is None:
        return None
    extra=" ".join(pre)
    if extra:
        pending["condition"]=clean((pending.get("condition") or "")+" "+extra)
    item["decisionRows"].append(pending)
    return None


def parse():
    TMP.mkdir(parents=True,exist_ok=True)
    if not PDF.exists() or PDF.stat().st_size<100_000:
        urllib.request.urlretrieve(URL,PDF)

    by_code={}
    with pdfplumber.open(PDF) as pdf:
        for pno,page in enumerate(pdf.pages,1):
            if pno<5:
                continue
            lines=group_lines(page)
            headers=header_positions(lines)
            current_code=None
            pre=[]
            pending=None

            for line in lines:
                text=clean(" ".join(w["text"] for w in line))
                code=code_of(text)

                if code:
                    if current_code and not is_family(current_code):
                        pending=flush_pending(by_code[current_code], pending, pre)
                        pre=[]

                    current_code=code
                    if current_code not in by_code:
                        by_code[current_code]={
                            "rubrique":current_code,
                            "famille":current_code[:2]+"00",
                            "familleLabel":FAMILIES.get(current_code[:2]+"00",""),
                            "designation":"",
                            "decisionRows":[],
                        }

                    after=re.sub(r"^.*?\b"+re.escape(code)+r"\b","",text,count=1).strip(" :-")
                    pre=[after] if after and not is_family(current_code) else []
                    continue

                if not current_code or is_family(current_code):
                    continue

                item=by_code[current_code]
                decision=decision_from_line(line,headers)
                if decision:
                    pending=flush_pending(item,pending,pre)
                    pending=decision
                    pre=[]
                else:
                    if text and not text.startswith("Nota") and not text.startswith("ANNEXE"):
                        pre.append(text)

            if current_code and not is_family(current_code):
                pending=flush_pending(by_code[current_code], pending, pre)

    rubriques=[]
    for code,item in by_code.items():
        if is_family(code):
            continue
        rows=[]
        seen=set()
        for r in item["decisionRows"]:
            key=json.dumps(r,ensure_ascii=False,sort_keys=True)
            if key not in seen:
                seen.add(key)
                rows.append(r)
        item["decisionRows"]=rows
        item["designation"]=rows[0]["condition"] if len(rows)==1 and rows else (code if not rows else "")
        item["isSelectable"]=bool(rows)
        item["source"]="Décret exécutif n° 07-144 du 19 mai 2007"
        item["sourceUrl"]=URL
        rubriques.append(item)

    data={"version":"07-144-semantic-v1","rubriques":sorted(rubriques,key=lambda x:x["rubrique"])}
    OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"Generated semantic test: {len(rubriques)} rubriques / {sum(len(r['decisionRows']) for r in rubriques)} decisions -> {OUT}")
    for code in ["1240","1310","2110","2120","2122"]:
        item=next((x for x in rubriques if x["rubrique"]==code),None)
        print(f"TEST {code}: {json.dumps(item,ensure_ascii=False)[:1800] if item else 'NOT FOUND'}")


if __name__=="__main__":
    parse()
