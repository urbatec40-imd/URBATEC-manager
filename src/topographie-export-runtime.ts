import L from 'leaflet';

type XY = { x:number; y:number };
type Coord = [number, number];
type ExportGeometry = { type:string; coordinates:any };
type ExportFeature = { type:string; geometry:ExportGeometry; properties?:Record<string, unknown> };

type Paper = { id:'A4'|'A3'|'A2'|'A1'; w:number; h:number };
const PAPERS:Paper[] = [
  { id:'A4', w:297, h:210 },
  { id:'A3', w:420, h:297 },
  { id:'A2', w:594, h:420 },
  { id:'A1', w:841, h:594 },
];
const SCALES = ['AUTO', '500', '1000', '2000', '5000', '10000'];

function prop(feature:ExportFeature, keys:string[]) {
  const p = feature.properties || {};
  for (const k of keys) {
    const v = p[k];
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  return '';
}
function sectionOf(f:ExportFeature) { return prop(f, ['se_no','se_no_nat','section','SECTION']); }
function ilotOf(f:ExportFeature) { return prop(f, ['il_no','il_no_nat','ilot','ILOT']); }
function areaOf(f:ExportFeature) { return Number(prop(f, ['SHAPE_Area','il_surf_de','il_surf_ca','area','AREA'])) || 0; }
function digits(v:string) { return v.replace(/[^0-9]/g,''); }

function utm32(lon:number, lat:number):XY {
  const a = 6378137.0;
  const eccSq = 0.0066943799901413165;
  const k0 = 0.9996;
  const zone = 32;
  const lambda0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
  const phi = lat * Math.PI / 180;
  const lambda = lon * Math.PI / 180;
  const eccPrimeSq = eccSq / (1 - eccSq);
  const N = a / Math.sqrt(1 - eccSq * Math.sin(phi) ** 2);
  const T = Math.tan(phi) ** 2;
  const C = eccPrimeSq * Math.cos(phi) ** 2;
  const A = Math.cos(phi) * (lambda - lambda0);
  const M = a * ((1 - eccSq / 4 - 3 * eccSq ** 2 / 64 - 5 * eccSq ** 3 / 256) * phi
    - (3 * eccSq / 8 + 3 * eccSq ** 2 / 32 + 45 * eccSq ** 3 / 1024) * Math.sin(2 * phi)
    + (15 * eccSq ** 2 / 256 + 45 * eccSq ** 3 / 1024) * Math.sin(4 * phi)
    - (35 * eccSq ** 3 / 3072) * Math.sin(6 * phi));
  const x = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T ** 2 + 72 * C - 58 * eccPrimeSq) * A ** 5 / 120) + 500000;
  const y = k0 * (M + N * Math.tan(phi) * (A ** 2 / 2 + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24 + (61 - 58 * T + T ** 2 + 600 * C - 330 * eccPrimeSq) * A ** 6 / 720));
  return { x, y };
}

function polygonRing(f:ExportFeature):Coord[] {
  if (f.geometry?.type === 'Polygon') return f.geometry.coordinates?.[0] || [];
  if (f.geometry?.type === 'MultiPolygon') return f.geometry.coordinates?.[0]?.[0] || [];
  if (f.geometry?.type === 'LineString') return f.geometry.coordinates || [];
  return [];
}
function utmRing(f:ExportFeature):XY[] { return polygonRing(f).map(([lon,lat]) => utm32(Number(lon), Number(lat))); }
function bounds(points:XY[]) {
  const xs = points.map(p=>p.x), ys = points.map(p=>p.y);
  return { minX:Math.min(...xs), maxX:Math.max(...xs), minY:Math.min(...ys), maxY:Math.max(...ys) };
}
function angle(a:XY,b:XY,c:XY) {
  const ux=a.x-b.x, uy=a.y-b.y, vx=c.x-b.x, vy=c.y-b.y;
  const nu=Math.hypot(ux,uy), nv=Math.hypot(vx,vy);
  if (!nu || !nv) return 180;
  const cos = Math.max(-1, Math.min(1, (ux*vx+uy*vy)/(nu*nv)));
  return Math.acos(cos) * 180 / Math.PI;
}
function significantPoints(points:XY[]):XY[] {
  if (points.length < 3) return points;
  const n = points[0].x === points.at(-1)?.x && points[0].y === points.at(-1)?.y ? points.length - 1 : points.length;
  const out:XY[] = [];
  const threshold = 15;
  for (let i=0;i<n;i++) {
    const prev = points[(i-1+n)%n], cur = points[i], next = points[(i+1)%n];
    if (angle(prev,cur,next) >= threshold) out.push(cur);
  }
  return out.length >= 3 ? out : [points[0], points[Math.floor(n/3)], points[Math.floor((2*n)/3)]];
}
function areaM2(points:XY[]) {
  let s = 0;
  for (let i=0;i<points.length;i++) {
    const a=points[i], b=points[(i+1)%points.length];
    s += a.x*b.y - b.x*a.y;
  }
  return Math.abs(s)/2;
}
function areaParts(m2:number) {
  const ha = Math.floor(m2 / 10000);
  const are = Math.floor((m2 - ha*10000)/100);
  const care = Math.round((m2 - ha*10000 - are*100)*100) / 100;
  return { ha, are, care };
}
function intervalForScale(scale:number) {
  if (scale <= 500) return 50;
  if (scale <= 1000) return 100;
  if (scale <= 2000) return 200;
  if (scale <= 5000) return 500;
  return 1000;
}
function autoScale(p:Paper, b:{minX:number;maxX:number;minY:number;maxY:number}) {
  const availX = p.w * 0.78 / 1000 * 1000;
  const availY = p.h * 0.68 / 1000 * 1000;
  const spanX = Math.max(1,b.maxX-b.minX), spanY=Math.max(1,b.maxY-b.minY);
  const sx = (availX*1000)/spanX;
  const sy = (availY*1000)/spanY;
  const target = Math.min(sx,sy);
  const candidates=[500,1000,2000,5000,10000];
  return candidates.find(s=>s>=target) || 10000;
}
function dxfHeader() {
  return ['0','SECTION','2','HEADER','0','ENDSEC','0','SECTION','2','TABLES','0','TABLE','2','LAYER','70','4',
    '0','LAYER','2','PARCELLE','70','0','62','1','6','CONTINUOUS',
    '0','LAYER','2','CARROYAGE','70','0','62','8','6','CONTINUOUS',
    '0','LAYER','2','ANNOTATION','70','0','62','7','6','CONTINUOUS',
    '0','LAYER','2','VOISINS','70','0','62','3','6','CONTINUOUS',
    '0','ENDTAB','0','ENDSEC','0','SECTION','2','ENTITIES'].join('\n');
}
function dxfEnd(){ return ['0','ENDSEC','0','EOF'].join('\n'); }
function dxfLine(a:XY,b:XY,layer='PARCELLE') { return ['0','LINE','8',layer,'10',a.x.toFixed(3),'20',a.y.toFixed(3),'30','0','11',b.x.toFixed(3),'21',b.y.toFixed(3),'31','0'].join('\n'); }
function dxfText(p:XY,text:string,height:number,layer='ANNOTATION') { return ['0','TEXT','8',layer,'10',p.x.toFixed(3),'20',p.y.toFixed(3),'30','0','40',height.toFixed(3),'1',text].join('\n'); }
function dxfPolyline(points:XY[],layer='PARCELLE') {
  const closed = points.length>2 ? 1 : 0;
  const out=['0','LWPOLYLINE','8',layer,'90',String(points.length),'70',String(closed)];
  for(const p of points) out.push('10',p.x.toFixed(3),'20',p.y.toFixed(3));
  return out.join('\n');
}
function makeDxf(f:ExportFeature, commune:string, paper:Paper, scale:number) {
  const pts=utmRing(f); if(pts.length<2) throw new Error('La géométrie sélectionnée ne contient pas de frontière exportable.');
  const b=bounds(pts); const grid=intervalForScale(scale);
  const sheetW=paper.w/1000*scale, sheetH=paper.h/1000*scale;
  const cx=(b.minX+b.maxX)/2, cy=(b.minY+b.maxY)/2;
  const frame={minX:cx-sheetW/2,maxX:cx+sheetW/2,minY:cy-sheetH/2,maxY:cy+sheetH/2};
  const sig=significantPoints(pts);
  const ap=areaParts(areaM2(pts));
  const lines:string[]=[dxfHeader(),dxfPolyline(pts,'PARCELLE')];
  const gx=Math.floor(frame.minX/grid)*grid, gy=Math.floor(frame.minY/grid)*grid;
  for(let x=gx;x<=frame.maxX;x+=grid) { lines.push(dxfLine({x,y:frame.minY},{x,y:frame.maxY},'CARROYAGE')); lines.push(dxfText({x:x+grid*0.03,y:frame.maxY-grid*0.15},`X ${Math.round(x)}`,Math.max(1.8,scale/600),'ANNOTATION')); }
  for(let y=gy;y<=frame.maxY;y+=grid) { lines.push(dxfLine({x:frame.minX,y},{x:frame.maxX,y},'CARROYAGE')); lines.push(dxfText({x:frame.minX+grid*0.02,y:y+grid*0.03},`Y ${Math.round(y)}`,Math.max(1.8,scale/600),'ANNOTATION')); }
  lines.push(dxfLine({x:frame.maxX-0.08*sheetW,y:frame.minY+0.08*sheetH},{x:frame.maxX-0.08*sheetW,y:frame.minY+0.17*sheetH},'ANNOTATION'));
  const na=frame.maxX-0.08*sheetW, nb=frame.minY+0.17*sheetH;
  lines.push(dxfLine({x:na,y:nb},{x:na-0.02*sheetW,y:nb-0.04*sheetH},'ANNOTATION'),dxfLine({x:na,y:nb},{x:na+0.02*sheetW,y:nb-0.04*sheetH},'ANNOTATION'),dxfText({x:na-0.015*sheetW,y:nb+0.015*sheetH},'N',Math.max(2.5,scale/400),'ANNOTATION'));
  for(let i=0;i<sig.length;i++) lines.push(dxfText(sig[i],`P${i+1}`,Math.max(2,scale/600),'ANNOTATION'));
  const titleX=frame.minX+0.06*sheetW, titleY=frame.maxY-0.06*sheetH;
  lines.push(dxfText({x:titleX,y:titleY},'EXTRAIT DU PLAN CADASTRAL',Math.max(2.5,scale/350),'ANNOTATION'));
  lines.push(dxfText({x:titleX,y:titleY-grid*0.25},`Commune : ${commune||'—'}`,Math.max(2,scale/500),'ANNOTATION'));
  lines.push(dxfText({x:titleX,y:titleY-grid*0.45},`Section : ${sectionOf(f)||'—'}   Ilot : ${ilotOf(f)||'—'}`,Math.max(2,scale/500),'ANNOTATION'));
  lines.push(dxfText({x:titleX,y:titleY-grid*0.65},`WGS84 / UTM 32N   Echelle 1/${scale}`,Math.max(2,scale/500),'ANNOTATION'));
  lines.push(dxfText({x:titleX,y:titleY-grid*0.85},`Surface : ${areaM2(pts).toFixed(2)} m²  |  ${ap.ha} ha ${ap.are} a ${ap.care.toFixed(2)} ca`,Math.max(2,scale/500),'ANNOTATION'));
  return `${lines.join('\n')}\n${dxfEnd()}\n`;
}
function download(text:string,name:string,type:string) {
  const blob=new Blob([text],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function escHtml(s:string){ return s.replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c)); }
function makePrintHtml(f:ExportFeature, commune:string, paper:Paper, scale:number) {
  const pts=utmRing(f), b=bounds(pts), sig=significantPoints(pts), grid=intervalForScale(scale), W=paper.w, H=paper.h;
  const pad=12, innerW=W-pad*2, innerH=H-pad*2;
  const scaleDen = scale;
  const spanX=Math.max(1,b.maxX-b.minX), spanY=Math.max(1,b.maxY-b.minY);
  const pxPerM = Math.min((innerW*0.68)/(spanX/scaleDen), (innerH*0.66)/(spanY/scaleDen));
  const sc=pxPerM/scaleDen;
  const ox=pad+innerW*0.16, oy=pad+innerH*0.68;
  const sx=(x:number)=>ox+(x-b.minX)*sc, sy=(y:number)=>oy-(y-b.minY)*sc;
  const poly=pts.map(p=>`${sx(p.x)},${sy(p.y)}`).join(' ');
  const xs=Math.floor(b.minX/grid)*grid, xe=Math.ceil(b.maxX/grid)*grid, ys=Math.floor(b.minY/grid)*grid, ye=Math.ceil(b.maxY/grid)*grid;
  let gridSvg='';
  for(let x=xs;x<=xe;x+=grid){gridSvg+=`<line x1="${sx(x)}" y1="${sy(ys)}" x2="${sx(x)}" y2="${sy(ye)}" class="grid"/><text x="${sx(x)+2}" y="${pad+10}" class="lab">${Math.round(x)}</text>`;}
  for(let y=ys;y<=ye;y+=grid){gridSvg+=`<line x1="${sx(xs)}" y1="${sy(y)}" x2="${sx(xe)}" y2="${sy(y)}" class="grid"/><text x="${pad+2}" y="${sy(y)-2}" class="lab">${Math.round(y)}</text>`;}
  const pointsSvg=sig.map((p,i)=>`<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="1.6" class="pt"/><text x="${sx(p.x)+3}" y="${sy(p.y)-3}" class="pttxt">P${i+1}</text>`).join('');
  const ap=areaParts(areaM2(pts));
  return `<!doctype html><html><head><meta charset="utf-8"><title>Extrait du plan</title><style>@page{size:${paper.id} landscape;margin:0}body{margin:0;font-family:Arial,sans-serif}.page{width:${W}mm;height:${H}mm;position:relative;border:0.35mm solid #111;box-sizing:border-box;padding:${pad}mm}.title{font-size:5.2mm;font-weight:700}.meta{font-size:3.2mm;line-height:1.5}.grid{stroke:#aaa;stroke-width:.18}.lab{font-size:2.3mm;fill:#555}.pt{fill:#111}.pttxt{font-size:2.4mm}.box{position:absolute;right:${pad}mm;top:${pad}mm;width:${innerW*0.28}mm}.north{font-size:4mm;font-weight:700}.tbl{border-collapse:collapse;font-size:2.4mm;width:100%}.tbl td,.tbl th{border:.2mm solid #333;padding:1.2mm}.scale{font-size:2.8mm}</style></head><body><div class="page"><div class="box"><div class="title">EXTRAIT DU PLAN CADASTRAL</div><div class="meta">Commune : <b>${escHtml(commune||'—')}</b><br>Section : <b>${escHtml(sectionOf(f)||'—')}</b><br>Ilot : <b>${escHtml(ilotOf(f)||'—')}</b><br>Système : <b>WGS84 / UTM 32N</b><br>Echelle : <b>1/${scale}</b></div><br><div class="north">↑ N</div><br><div class="meta"><b>Surface</b><br>${areaM2(pts).toFixed(2)} m²<br>${ap.ha} ha ${ap.are} a ${ap.care.toFixed(2)} ca</div><br><table class="tbl"><thead><tr><th>Pt</th><th>X</th><th>Y</th></tr></thead><tbody>${sig.map((p,i)=>`<tr><td>P${i+1}</td><td>${p.x.toFixed(2)}</td><td>${p.y.toFixed(2)}</td></tr>`).join('')}</tbody></table></div><div class="title" style="position:absolute;left:${pad}mm;top:${pad}mm">EXTRAIT DU PLAN — ${escHtml(sectionOf(f)||'')} / ${escHtml(ilotOf(f)||'')}</div><svg viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" style="position:absolute;left:0;top:0"><g>${gridSvg}</g><polygon points="${poly}" fill="none" stroke="#111" stroke-width="0.6"/>${pointsSvg}<line x1="${W-pad-12}" y1="${H-pad-25}" x2="${W-pad-12}" y2="${H-pad-8}" stroke="#111" stroke-width="0.6"/><text x="${W-pad-14}" y="${H-pad-27}" class="north">N</text></svg><div style="position:absolute;left:${pad}mm;bottom:${pad}mm;font-size:2.8mm">Carroyage UTM — intervalle ${grid} m — ${paper.id} — 1/${scale}</div></div><script>window.onload=()=>window.print()</script></body></html>`;
}
function showModal(f:ExportFeature, commune:string) {
  const old=document.getElementById('uratec-export-modal'); if(old) old.remove();
  const wrap=document.createElement('div'); wrap.id='uratec-export-modal'; wrap.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:Arial,sans-serif;';
  const box=document.createElement('div'); box.style.cssText='width:min(520px,94vw);background:#fff;border-radius:16px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.25);';
  box.innerHTML=`<div style="font-size:18px;font-weight:700;color:#0f172a">Extrait du Plan</div><div style="font-size:13px;color:#64748b;margin-top:4px">${escHtml(commune||'—')} • Section ${escHtml(sectionOf(f)||'—')} • Ilot ${escHtml(ilotOf(f)||'—')}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px"><label style="font-size:12px;font-weight:700">Papier<select id="xp-paper" style="display:block;width:100%;margin-top:5px;padding:9px"><option>A4</option><option>A3</option><option>A2</option><option>A1</option></select></label><label style="font-size:12px;font-weight:700">Echelle<select id="xp-scale" style="display:block;width:100%;margin-top:5px;padding:9px">${SCALES.map(s=>`<option value="${s}">${s==='AUTO'?'Automatique':'1/'+s}</option>`).join('')}</select></label></div><div style="font-size:12px;color:#475569;margin-top:12px;line-height:1.5">Le DXF sera généré en coordonnées réelles WGS84 / UTM 32N, avec carroyage, coordonnées X/Y, points de changement de direction, titre et cartouche. Le PDF utilise l'aperçu imprimable à l'échelle choisie.</div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap"><button id="xp-close" style="padding:9px 14px;border:1px solid #cbd5e1;background:#fff;border-radius:9px">Fermer</button><button id="xp-dwg" style="padding:9px 14px;border:1px solid #cbd5e1;background:#f8fafc;border-radius:9px">DWG</button><button id="xp-pdf" style="padding:9px 14px;border:0;background:#334155;color:#fff;border-radius:9px">Imprimer / PDF</button><button id="xp-dxf" style="padding:9px 14px;border:0;background:#0284c7;color:#fff;border-radius:9px">Exporter DXF</button></div><div id="xp-msg" style="font-size:12px;margin-top:10px;color:#64748b"></div>`;
  wrap.appendChild(box); document.body.appendChild(wrap);
  const paperEl=box.querySelector('#xp-paper') as HTMLSelectElement;
  const scaleEl=box.querySelector('#xp-scale') as HTMLSelectElement;
  const msg=box.querySelector('#xp-msg') as HTMLDivElement;
  const getCfg=()=>{const p=PAPERS.find(x=>x.id===paperEl.value)!; let s=scaleEl.value==='AUTO'?null:Number(scaleEl.value); const pts=utmRing(f); const b=bounds(pts); if(!s) s=autoScale(p,b); return {paper:p,scale:s};};
  box.querySelector('#xp-close')?.addEventListener('click',()=>wrap.remove());
  box.querySelector('#xp-dwg')?.addEventListener('click',()=>{msg.textContent='DWG réel nécessite un moteur CAD/ODA côté Desktop. Le DXF actuel est réel, métrique et ouvrable directement dans AutoCAD/Covadis.';});
  box.querySelector('#xp-dxf')?.addEventListener('click',()=>{try{const c=getCfg();const dxf=makeDxf(f,commune,c.paper,c.scale);const fn=`EXTRAIT_${digits(sectionOf(f))}_${digits(ilotOf(f))}_${c.paper.id}_1-${c.scale}.dxf`;download(dxf,fn,'application/dxf');msg.textContent=`DXF généré : ${fn}`;}catch(e){msg.textContent=`Erreur : ${(e as Error).message}`;}});
  box.querySelector('#xp-pdf')?.addEventListener('click',()=>{try{const c=getCfg();const html=makePrintHtml(f,commune,c.paper,c.scale);const win=window.open('','_blank','noopener,noreferrer'); if(!win){msg.textContent='Autorisez les fenêtres contextuelles pour imprimer.';return;} win.document.open(); win.document.write(html); win.document.close();}catch(e){msg.textContent=`Erreur : ${(e as Error).message}`;}});
}
function install() {
  const w=window as any;
  if (w.__uratecTopographieExportInstalled) return;
  w.__uratecTopographieExportInstalled=true;
  w.__uratecSelectedParcel=null;
  w.__uratecAllFeatures=[];
  const originalAddData=(L.GeoJSON.prototype as any).addData;
  (L.GeoJSON.prototype as any).addData=function(geojson:any){
    const result=originalAddData.call(this,geojson);
    try{
      this.eachLayer((layer:any)=>{
        if(layer?.feature && !layer.__uratecHooked){
          layer.__uratecHooked=true;
          w.__uratecAllFeatures.push(layer.feature);
          layer.on('click',()=>{ w.__uratecSelectedParcel=layer.feature; });
        }
      });
    }catch{}
    return result;
  };
  const attach=()=>{
    document.querySelectorAll('button').forEach(btn=>{
      if((btn as HTMLElement).dataset.uratecExportAttached==='1') return;
      if((btn.textContent||'').toLocaleLowerCase().includes('extrait du plan')){
        (btn as HTMLElement).dataset.uratecExportAttached='1';
        btn.addEventListener('click',(ev)=>{
          ev.preventDefault();
          const f=w.__uratecSelectedParcel as ExportFeature|null;
          if(!f){ alert('Sélectionnez d’abord une parcelle sur la carte.'); return; }
          const popup=document.querySelector('.leaflet-popup-content') as HTMLElement|null;
          const text=popup?.innerText||'';
          const m=text.match(/Commune\s*:\s*([^\n]+)/i);
          showModal(f,m?.[1]?.trim()||'');
        });
      }
    });
  };
  const mo=new MutationObserver(attach); mo.observe(document.body,{subtree:true,childList:true}); attach();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
