import fs from 'node:fs';

const file = 'src/pages/TopographiePage.tsx';
let s = fs.readFileSync(file, 'utf8');

const start = s.indexOf('function openExtractPlan(');
const end = s.indexOf('\nfunction InfoCard(', start);
if (start < 0 || end < 0) {
  console.error('openExtractPlan or InfoCard boundary not found.');
  process.exit(1);
}

const replacement = String.raw`function openExtractPlan(parcel:Parcel,neighbours:Parcel[],commune:string,layers:KmzLayer[],paperId:string,orientation:'portrait'|'landscape',scaleChoice:string,baseMap:BaseMap){
 const paper=PAPERS.find(p=>p.id===paperId)||PAPERS[0];
 const pw=orientation==='landscape'?paper.w:paper.h,ph=orientation==='landscape'?paper.h:paper.w;
 const margin=10,headerH=16,bottomH=Math.min(56,Math.max(48,ph*.22)),mapX=margin,mapY=margin+headerH,mapW=pw-margin*2,mapH=ph-margin*2-headerH-bottomH;
 const all=[parcel,...neighbours],b=boundsOf(all);if(!b||mapW<=0||mapH<=0)return;
 const midLat=(b.minY+b.maxY)/2,mx=111320*Math.max(.2,Math.cos(midLat*Math.PI/180)),my=111320;
 const needW=Math.max(.1,(b.maxX-b.minX)*mx),needH=Math.max(.1,(b.maxY-b.minY)*my);
 const scales=[500,1000,2000,2500,5000];
 let scale=scaleChoice==='auto'?scales[scales.length-1]:Number(scaleChoice);
 if(scaleChoice==='auto')for(const candidate of scales){if(needW*1000/candidate<=mapW-2&&needH*1000/candidate<=mapH-2){scale=candidate;break}}
 if(!Number.isFinite(scale)||scale<=0)scale=1000;
 const targetPts=geometryPoints(parcel.geometry),centerPts=targetPts.length?targetPts:geometryPoints(all[0]?.geometry||parcel.geometry);
 const center=centerPts.reduce((a,p)=>({x:a.x+Number(p[0]),y:a.y+Number(p[1])}),{x:0,y:0});
 const centerLon=center.x/Math.max(1,centerPts.length),centerLat=center.y/Math.max(1,centerPts.length);
 const xy=(p:Position)=>({x:mapX+mapW/2+(Number(p[0])-centerLon)*mx*1000/scale,y:mapY+mapH/2+(centerLat-Number(p[1]))*my*1000/scale});
 const path=(f:Parcel)=>{const ps=geometryPoints(f.geometry);return ps.map((p,i)=>{const q=xy(p);return\`${i?'L':'M'}\${q.x.toFixed(3)} \${q.y.toFixed(3)}\`}).join(' ')+(f.geometry.type==='Polygon'?' Z':'')};
 const centroid=(f:Parcel)=>{const ps=geometryPoints(f.geometry);if(!ps.length)return{x:mapX+mapW/2,y:mapY+mapH/2};const c=ps.reduce((a,p)=>({x:a.x+Number(p[0]),y:a.y+Number(p[1])}),{x:0,y:0});return xy([c.x/ps.length,c.y/ps.length])};
 const sec=sectionOf(parcel.properties||{}),ilo=ilotOf(parcel.properties||{}),pno=prop(parcel.properties||{},['par_no','parcel_no','parcel','parcelle','PARCELLE','numero_parcelle','num_parcelle','lot','LOT','name'])||ilo||'—';
 const source=layers.map(l=>l.name).join(', ')||'KMZ cadastral local';
 const planNo=\`TOPO-\${(commune||'').slice(0,3).toUpperCase()||'CAD'}-\${sec||'—'}-\${ilo||'—'}\`;
 const gridStep=scale>=5000?500:scale>=2500?250:scale>=2000?200:scale>=1000?100:50;
 let grid='',gridLabels='';
 const xLeft=centerLon-(mapW/2)*scale/1000/mx,xRight=centerLon+(mapW/2)*scale/1000/mx;
 const yTop=centerLat+(mapH/2)*scale/1000/my,yBottom=centerLat-(mapH/2)*scale/1000/my;
 const xStart=Math.floor(((xLeft-centerLon)*mx)/gridStep)*gridStep+centerLon*mx;
 for(let xm=xStart;xm<=centerLon*mx+(xRight-centerLon)*mx+.001;xm+=gridStep){const lon=xm/mx,q=xy([lon,centerLat]);if(q.x>=mapX&&q.x<=mapX+mapW){grid+=\`<line x1="\${q.x.toFixed(2)}" y1="\${mapY}" x2="\${q.x.toFixed(2)}" y2="\${(mapY+mapH).toFixed(2)}" stroke="#94a3b8" stroke-width=".18"/>\`;gridLabels+=\`<text x="\${q.x.toFixed(2)}" y="\${(mapY+mapH+3).toFixed(2)}" text-anchor="middle" font-size="2.5" fill="#475569">\${Math.round(xm-centerLon*mx)}</text>\`}}
 const yStart=Math.floor(((yBottom-centerLat)*my)/gridStep)*gridStep+centerLat*my;
 for(let ym=yStart;ym<=centerLat*my+(yTop-centerLat)*my+.001;ym+=gridStep){const lat=ym/my,q=xy([centerLon,lat]);if(q.y>=mapY&&q.y<=mapY+mapH){grid+=\`<line x1="\${mapX}" y1="\${q.y.toFixed(2)}" x2="\${(mapX+mapW).toFixed(2)}" y2="\${q.y.toFixed(2)}" stroke="#94a3b8" stroke-width=".18"/>\`;gridLabels+=\`<text x="\${(mapX-1).toFixed(2)}" y="\${(q.y+1).toFixed(2)}" text-anchor="end" font-size="2.5" fill="#475569">\${Math.round(ym-centerLat*my)}</text>\`}}
 const neighbourPaths=neighbours.filter(f=>f!==parcel).map(f=>\`<path d="\${path(f)}" fill="#dbeafe" fill-opacity=".16" stroke="#64748b" stroke-width=".35"/>\`).join('');
 const labels=neighbours.map(f=>{const q=centroid(f),pp=f.properties||{},n=prop(pp,['par_no','parcel_no','parcel','parcelle','PARCELLE','numero_parcelle','num_parcelle','lot','LOT','name'])||ilotOf(pp)||sectionOf(pp)||'?';return\`<text x="\${q.x.toFixed(2)}" y="\${q.y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-size="\${f===parcel?'4':'3.2'}" font-weight="\${f===parcel?'700':'600'}" fill="\${f===parcel?'#991b1b':'#334155'}">\${esc(n)}</text>\`}).join('');
 const scaleBarMeters=scale>=5000?250:scale>=2500?200:scale>=2000?100:scale>=1000?100:50,scaleBarMm=scaleBarMeters*1000/scale,barX=mapX+8,barY=mapY+mapH-8;
 const z=16,t=tileXY(centerLon,centerLat,z),tx=Math.floor(t.x),ty=Math.floor(t.y),tileUrls:string[]=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)tileUrls.push(baseMap.url.replace('{z}',String(z)).replace('{x}',String(tx+dx)).replace('{y}',String(ty+dy)));
 const satW=Math.min(70,pw*.20),satH=Math.min(46,bottomH-8),satX=margin,satY=ph-margin-satH,satImages=tileUrls.map((u,i)=>\`<image href="\${u}" x="\${satX+(i%3)*(satW/3)}" y="\${satY+Math.floor(i/3)*(satH/3)}" width="\${satW/3+0.2}" height="\${satH/3+0.2}" preserveAspectRatio="none"/>\`).join('');
 const cartX=satX+satW+5,cartY=ph-margin-bottomH+2,cartW=pw-margin-cartX,cartH=bottomH-4;
 const svg=\`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 \${pw} \${ph}" width="\${pw}mm" height="\${ph}mm"><rect width="\${pw}" height="\${ph}" fill="white"/><rect x="\${margin}" y="\${margin}" width="\${pw-margin*2}" height="\${ph-margin*2}" fill="none" stroke="#0f172a" stroke-width=".5"/><text x="\${pw/2}" y="7" text-anchor="middle" font-size="4.5" font-weight="700">EXTRAIT DE PLAN CADASTRAL</text><text x="\${pw/2}" y="12" text-anchor="middle" font-size="3.1">Commune : \${esc(commune||'—')} • Section : \${esc(sec||'—')} • Ilot : \${esc(ilo||'—')} • Parcelle : \${esc(pno)}</text><rect x="\${mapX}" y="\${mapY}" width="\${mapW}" height="\${mapH}" fill="white" stroke="#0f172a" stroke-width=".5"/>\${grid}\${gridLabels}\${neighbourPaths}<path d="\${path(parcel)}" fill="#fde047" fill-opacity=".42" stroke="#dc2626" stroke-width="1.1"/>\${labels}<g transform="translate(\${mapX+mapW-14},\${mapY+14})"><line x1="0" y1="12" x2="0" y2="0" stroke="#111827" stroke-width=".8"/><path d="M0,-3 L-2,2 L2,2 Z" fill="#111827"/><text x="0" y="17" text-anchor="middle" font-size="3.2" font-weight="700">N</text></g><g><line x1="\${barX}" y1="\${barY}" x2="\${barX+scaleBarMm}" y2="\${barY}" stroke="#111827" stroke-width=".9"/><line x1="\${barX}" y1="\${barY-2}" x2="\${barX}" y2="\${barY+2}" stroke="#111827" stroke-width=".7"/><line x1="\${barX+scaleBarMm}" y1="\${barY-2}" x2="\${barX+scaleBarMm}" y2="\${barY+2}" stroke="#111827" stroke-width=".7"/><text x="\${barX}" y="\${barY+5}" font-size="2.8">0</text><text x="\${barX+scaleBarMm}" y="\${barY+5}" text-anchor="end" font-size="2.8">\${scaleBarMeters} m</text><text x="\${barX+scaleBarMm/2}" y="\${barY-3}" text-anchor="middle" font-size="3.2" font-weight="700">1:\${scale}</text></g><rect x="\${satX}" y="\${satY}" width="\${satW}" height="\${satH}" fill="#e2e8f0" stroke="#0f172a" stroke-width=".4"/>\${satImages}<text x="\${satX+2}" y="\${satY+satH-2}" font-size="2.7" font-weight="700" fill="white">SITUATION SATELLITAIRE</text><rect x="\${cartX}" y="\${cartY}" width="\${cartW}" height="\${cartH}" fill="white" stroke="#0f172a" stroke-width=".5"/><text x="\${cartX+3}" y="\${cartY+6}" font-size="3.2" font-weight="700">URATEC — EXTRAIT DE PLAN</text><text x="\${cartX+3}" y="\${cartY+12}" font-size="2.8">Plan N° : \${esc(planNo)}</text><text x="\${cartX+3}" y="\${cartY+18}" font-size="2.8">Commune : \${esc(commune||'—')}</text><text x="\${cartX+3}" y="\${cartY+24}" font-size="2.8">Section : \${esc(sec||'—')} • Ilot : \${esc(ilo||'—')} • Parcelle : \${esc(pno)}</text><text x="\${cartX+3}" y="\${cartY+30}" font-size="2.8">Surface : \${esc(areaOf(parcel.properties||{})||'—')} m²</text><text x="\${cartX+cartW-3}" y="\${cartY+6}" text-anchor="end" font-size="2.8">Échelle d'origine : \${esc(prop(parcel.properties||{},['scale','echelle','Echelle','SCALE'])||'—')}</text><text x="\${cartX+cartW-3}" y="\${cartY+12}" text-anchor="end" font-size="2.8" font-weight="700">Échelle d'édition : 1:\${scale}</text><text x="\${cartX+cartW-3}" y="\${cartY+18}" text-anchor="end" font-size="2.8">Format : \${paper.name} \${orientation==='landscape'?'Paysage':'Portrait'}</text><text x="\${cartX+cartW-3}" y="\${cartY+24}" text-anchor="end" font-size="2.8">Date : \${new Date().toLocaleDateString('fr-FR')}</text><text x="\${cartX+cartW-3}" y="\${cartY+30}" text-anchor="end" font-size="2.8">Source : \${esc(source)}</text></svg>\`;
 const w=window.open('','_blank');if(!w)return;w.document.write(\`<!doctype html><html><head><title>Extrait de plan - \${sec}-\${ilo}-\${pno}</title><style>@page{size:\${pw}mm \${ph}mm;margin:0}html,body{margin:0;padding:0;width:\${pw}mm;height:\${ph}mm;background:#fff;overflow:hidden}.sheet{width:\${pw}mm;height:\${ph}mm;overflow:hidden}svg{display:block;width:\${pw}mm;height:\${ph}mm}</style></head><body><div class="sheet">\${svg}</div><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),700))</script></body></html>\`);w.document.close();
}
`;

s = s.slice(0, start) + replacement + s.slice(end);
fs.writeFileSync(file, s, 'utf8');
console.log('Topographie true-scale cadastral print layout applied.');