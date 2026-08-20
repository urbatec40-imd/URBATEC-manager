from __future__ import annotations
import json,re,urllib.request
from pathlib import Path
import pdfplumber
ROOT=Path(__file__).resolve().parents[1]; TMP=ROOT/'.tmp-nomenclature'; PDF=TMP/'07-144.pdf'; OUT=ROOT/'public/data/nomenclature-07-144-semantic-v3.json'
URL='https://www.joradp.dz/FTP/jo-francais/2007/F2007034.pdf'
CODE_START=re.compile(r'^\s*([12]\d{3})(?:\s|$)'); REG=re.compile(r'^(AM|AW|APAPC|PAPC|D)$',re.I); X={'x','×'}
FAM={'1000':'Substances','1100':'Très toxiques','1200':'Toxiques','1300':'Comburantes','1400':'Explosibles','1500':'Inflammables','1600':'Combustibles','1700':'Corrosives','1800':'Divers','2000':'Activité','2100':'Élevage d’animaux & Activité agricole','2200':'Agro alimentaires','2300':'Textiles, Cuirs et Peaux','2400':'Bois, papier, carton, imprimerie','2500':'Matériaux, minerais et métaux','2600':'Chimie, Caoutchouc','2700':'Déchets et traitements des eaux','2800':'Aquaculture et Pêche','2900':'Divers'}
# Geometry verified from official table pages.
COL={'rayon':310,'impact':355,'danger':405,'notice':444,'rapportDangereux':486}

def clean(s):
 s=(s or '').replace('\xa0',' ')
 reps={'Ã©':'é','Ã¨':'è','Ãª':'ê','Ã®':'î','Ã´':'ô','Ã¹':'ù','Ã§':'ç','Ã‰':'É','Ã€':'À','Ã‚':'Â','Ã”':'Ô','Ã›':'Û','Â':'','â€™':'’','È':'é','Ë':'ê','Í':'î','Ú':'û','‡':'à'}
 for a,b in reps.items(): s=s.replace(a,b)
 return re.sub(r'\s+',' ',s).strip()
def code_start(line):
 if not line:return None
 m=CODE_START.match(clean(line[0]['text'])); return m.group(1) if m else None
def regime_word(w):
 m=REG.fullmatch(clean(w['text']));
 if not m:return None
 v=m.group(1).upper(); return 'APAPC' if v=='PAPC' else v
def nearest_doc(x):
 return min(((abs(x-v),k) for k,v in COL.items() if k in ('impact','danger','notice','rapportDangereux')),default=(999,None))[1]
def decision(line):
 ri=None; rv=None
 for i,w in enumerate(line):
  r=regime_word(w)
  if r:ri=i;rv=r;break
 # D can be alone on its own line
 if rv is None and any(clean(w['text']).lower().strip('.') in X for w in line): rv=''; ri=len(line)
 if rv is None and len(line)==1 and clean(line[0]['text']).upper()=='D': rv='D'; ri=0
 if rv is None:return None
 docs={k:False for k in ('impact','danger','notice','rapportDangereux')}; rayon=''
 start=(ri+1 if ri is not None else 0)
 for w in line[start:]:
  t=clean(w['text']); x=float(w['x0'])
  if t.lower().strip('.') in X: docs[nearest_doc(x)]=True
  elif not rayon and re.fullmatch(r'\d+(?:[.,]\d+)?',t) and x < 350: rayon=t
 left=clean(' '.join(clean(w['text']) for w in line[:ri])) if ri is not None else ''
 return {'regime':rv,'rayon':rayon,'condition':left,'documents':docs}
def lines(page):
 ws=page.extract_words(x_tolerance=1,y_tolerance=2,keep_blank_chars=False,use_text_flow=False); out=[]
 for w in sorted(ws,key=lambda z:(float(z['top']),float(z['x0']))):
  if not out or abs(float(w['top'])-float(out[-1][0]['top']))>3.5:out.append([w])
  else:out[-1].append(w)
 return [sorted(x,key=lambda z:float(z['x0'])) for x in out]
def parse():
 TMP.mkdir(parents=True,exist_ok=True)
 if not PDF.exists() or PDF.stat().st_size<100000: urllib.request.urlretrieve(URL,PDF)
 items={}; current=None; pending=None; carry=[]
 with pdfplumber.open(PDF) as pdf:
  for pno,page in enumerate(pdf.pages,1):
   if pno<5:continue
   for ln in lines(page):
    txt=clean(' '.join(w['text'] for w in ln));
    if not txt:continue
    code=code_start(ln)
    if code:
     if current and pending:
      if carry: pending['condition']=clean(pending['condition']+' '+' '.join(carry)); carry=[]
      items[current]['decisionRows'].append(pending); pending=None
     current=code; item=items.setdefault(code,{'rubrique':code,'famille':code[:2]+'00','familleLabel':FAM.get(code[:2]+'00',''),'designation':'','decisionRows':[]})
     title=[]
     for w in ln:
      if clean(w['text'])==code: continue
      if regime_word(w): break
      title.append(clean(w['text']))
     if title and not code.endswith('00'): item['designation']=clean(' '.join(title))
     d=decision(ln)
     if d:
      if d['condition'].startswith(code): d['condition']=clean(d['condition'][len(code):])
      if not d['condition']: d['condition']=item['designation']
      pending=d
     carry=[]
     continue
    if not current or current.endswith('00'):continue
    d=decision(ln)
    if d:
     if pending:
      if carry: pending['condition']=clean(pending['condition']+' '+' '.join(carry)); carry=[]
      items[current]['decisionRows'].append(pending)
     pending=d
    else:
     if txt and not txt.startswith(('Nota','ANNEXE')): carry.append(txt)
  if current and pending:
   if carry:pending['condition']=clean(pending['condition']+' '+' '.join(carry))
   items[current]['decisionRows'].append(pending)
 rub=[]
 for code,it in items.items():
  if code.endswith('00'):continue
  seen=set(); rows=[]
  for r in it['decisionRows']:
   k=json.dumps(r,ensure_ascii=False,sort_keys=True)
   if k not in seen:seen.add(k);rows.append(r)
  it['decisionRows']=rows; it['isSelectable']=bool(rows); rub.append(it)
 data={'version':'07-144-semantic-v3','rubriques':sorted(rub,key=lambda x:x['rubrique'])}; OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
 print(f'Generated V3: {len(rub)} rubriques / {sum(len(x["decisionRows"]) for x in rub)} decisions')
 for c in ('1240','1310','2110','2120','2122'):
  x=next((r for r in rub if r['rubrique']==c),None); print(f'TEST {c}: '+(json.dumps(x,ensure_ascii=False)[:2400] if x else 'NOT FOUND'))
if __name__=='__main__':parse()
