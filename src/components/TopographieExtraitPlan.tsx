import { useMemo, useState } from 'react';
import type { Feature, Geometry, Position } from 'geojson';

type Props = Record<string, unknown>;
type Parcel = Feature<Geometry, Props>;

type Paper = 'A4' | 'A3' | 'A2' | 'A1' | 'A0';
type Orientation = 'portrait' | 'landscape';

const PAPER_MM: Record<Paper, [number, number]> = {
  A4: [297, 210],
  A3: [420, 297],
  A2: [594, 420],
  A1: [841, 594],
  A0: [1189, 841],
};

const sectionOf = (p: Props) => String(p?.se_no ?? p?.se_no_nat ?? p?.section ?? p?.SECTION ?? '');
const ilotOf = (p: Props) => String(p?.il_no ?? p?.il_no_nat ?? p?.ilot ?? p?.ILOT ?? '');
const areaOf = (p: Props) => String(p?.SHAPE_Area ?? p?.il_surf_de ?? p?.il_surf_ca ?? p?.area ?? p?.AREA ?? '');

function coords(g: Geometry): Position[] {
  const out: Position[] = [];
  const walk = (v: any) => {
    if (Array.isArray(v) && typeof v[0] === 'number') out.push(v as Position);
    else if (Array.isArray(v)) v.forEach(walk);
  };
  if (g.type === 'GeometryCollection') g.geometries.forEach(x => walk((x as any).coordinates));
  else walk((g as any).coordinates);
  return out;
}

function esc(v: string) {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function tileUrl(url: string, z: number, x: number, y: number) {
  return url.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y)).replace('{s}', 'mt1');
}

function PlanSvg({ parcel, commune, paper, orientation, scale, source, planNumber, satelliteUrl }: { parcel: Parcel; commune: string; paper: Paper; orientation: Orientation; scale: number; source: string; planNumber: string; satelliteUrl: string }) {
  const [pw, ph] = PAPER_MM[paper];
  const width = orientation === 'landscape' ? pw : ph;
  const height = orientation === 'landscape' ? ph : pw;
  const margin = 10;
  const cartH = Math.min(55, height * 0.19);
  const insetW = Math.min(75, width * 0.20);
  const insetH = Math.min(55, height * 0.18);
  const pts = coords(parcel.geometry);
  const minX = Math.min(...pts.map(p => Number(p[0])));
  const maxX = Math.max(...pts.map(p => Number(p[0])));
  const minY = Math.min(...pts.map(p => Number(p[1])));
  const maxY = Math.max(...pts.map(p => Number(p[1])));
  const pad = Math.max(12, Math.min(35, scale / 100));
  const dx = Math.max(0.000001, maxX - minX);
  const dy = Math.max(0.000001, maxY - minY);
  const usableW = width - margin * 2 - insetW - 8;
  const usableH = height - margin * 2 - cartH - 8;
  const fit = Math.min(usableW / dx, usableH / dy) * 0.78;
  const project = (p: Position) => ({ x: margin + (Number(p[0]) - minX) * fit, y: margin + (maxY - Number(p[1])) * fit });
  const path = pts.map((p, i) => { const q = project(p); return `${i ? 'L' : 'M'} ${q.x.toFixed(2)} ${q.y.toFixed(2)}`; }).join(' ') + (parcel.geometry.type === 'Polygon' ? ' Z' : '');
  const cx = pts.reduce((s, p) => s + Number(p[0]), 0) / Math.max(1, pts.length);
  const cy = pts.reduce((s, p) => s + Number(p[1]), 0) / Math.max(1, pts.length);
  const c = project([cx, cy]);
  const centerLat = cy;
  const centerLon = cx;
  const z = Math.max(13, Math.min(19, Math.round(18 - Math.log2(Math.max(1, scale / 500)))));
  const n = 1 << z;
  const tx = Math.floor((centerLon + 180) / 360 * n);
  const latRad = centerLat * Math.PI / 180;
  const ty = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  const sat = satelliteUrl ? tileUrl(satelliteUrl, z, tx, ty) : '';
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
    <rect width={width} height={height} fill="white" />
    <rect x={margin} y={margin} width={width - margin * 2} height={height - margin * 2} fill="none" stroke="#111827" strokeWidth="0.8" />
    <text x={width / 2} y={9} textAnchor="middle" fontSize="5" fontWeight="700">EXTRAIT DE PLAN CADASTRAL</text>
    <text x={width / 2} y={15} textAnchor="middle" fontSize="3.1">{esc(commune || '—')} — SECTION {esc(sectionOf(parcel.properties || {}))} — ÎLOT {esc(ilotOf(parcel.properties || {}))}</text>
    <path d={path} fill="#facc15" fillOpacity="0.42" stroke="#dc2626" strokeWidth="1.1" />
    <circle cx={c.x} cy={c.y} r="1.4" fill="#dc2626" />
    <text x={c.x} y={c.y - 3} textAnchor="middle" fontSize="4" fontWeight="700">{esc(ilotOf(parcel.properties || {}))}</text>
    <g transform={`translate(${width - 13},20)`}>
      <line x1="0" y1="10" x2="0" y2="0" stroke="#111827" strokeWidth="0.8" />
      <path d="M0,-2 L-2,2 L2,2 Z" fill="#111827" />
      <text x="0" y="14" textAnchor="middle" fontSize="4" fontWeight="700">N</text>
    </g>
    <g transform={`translate(${margin + 2},${height - cartH - 8})`}>
      <rect width={insetW} height={insetH} fill="#eef2f7" stroke="#334155" strokeWidth="0.6" />
      {sat && <image href={sat} x="0" y="0" width={insetW} height={insetH} preserveAspectRatio="xMidYMid slice" />}
      <rect width={insetW} height={insetH} fill="none" stroke="#334155" strokeWidth="0.6" />
      <line x1={insetW / 2} y1={insetH / 2} x2={insetW / 2 + 12} y2={insetH / 2 - 8} stroke="#dc2626" strokeWidth="0.8" />
      <path d={`M${insetW / 2 + 12},${insetH / 2 - 8} l-3,0 l2,3 z`} fill="#dc2626" />
      <text x="3" y="7" fontSize="3" fontWeight="700">LOCALISATION SATELLITE</text>
    </g>
    <g transform={`translate(${margin + insetW + 8},${height - cartH - 8})`}>
      <rect width={width - margin * 2 - insetW - 10} height={cartH} fill="white" stroke="#111827" strokeWidth="0.7" />
      <text x="4" y="8" fontSize="4.2" fontWeight="700">URATEC — BUREAU D'ÉTUDE</text>
      <text x="4" y="15" fontSize="3.2">Plan n° : {esc(planNumber || '—')}</text>
      <text x="4" y="21" fontSize="3.2">Commune : {esc(commune || '—')}</text>
      <text x="4" y="27" fontSize="3.2">Section : {esc(sectionOf(parcel.properties || {}))}    Îlot : {esc(ilotOf(parcel.properties || {}))}</text>
      <text x="4" y="33" fontSize="3.2">Surface : {esc(areaOf(parcel.properties || {}))} m²</text>
      <text x="4" y="39" fontSize="3.2">Échelle : 1/{scale}    Source : {esc(source || 'Données cadastrales KMZ')}</text>
      <text x="4" y="45" fontSize="3.2">Date : {new Date().toLocaleDateString('fr-FR')}</text>
    </g>
  </svg>;
}

export function TopographieExtraitPlan({ parcel, commune, onClose, source = 'Données cadastrales KMZ', satelliteUrl = 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}' }: { parcel: Parcel; commune: string; onClose: () => void; source?: string; satelliteUrl?: string }) {
  const [paper, setPaper] = useState<Paper>('A3');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [scale, setScale] = useState(1000);
  const [planNumber, setPlanNumber] = useState('');
  const [printVersion, setPrintVersion] = useState(0);
  const paperLabel = `${paper} ${orientation === 'landscape' ? 'Paysage' : 'Portrait'}`;
  const key = useMemo(() => `${paper}-${orientation}-${scale}-${printVersion}`, [paper, orientation, scale, printVersion]);
  const print = () => setPrintVersion(v => v + 1);
  return <div className="fixed inset-0 z-[5000] bg-slate-900/70 p-4 md:p-6">
    <div className="mx-auto flex h-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <div><h2 className="text-lg font-bold text-slate-800">Extrait de plan — Mise en page professionnelle</h2><p className="text-xs text-slate-500">{paperLabel} • Échelle 1/{scale}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={paper} onChange={e => setPaper(e.target.value as Paper)} className="rounded-lg border bg-white px-2 py-2 text-sm"><option>A4</option><option>A3</option><option>A2</option><option>A1</option><option>A0</option></select>
          <select value={orientation} onChange={e => setOrientation(e.target.value as Orientation)} className="rounded-lg border bg-white px-2 py-2 text-sm"><option value="landscape">Paysage</option><option value="portrait">Portrait</option></select>
          <select value={scale} onChange={e => setScale(Number(e.target.value))} className="rounded-lg border bg-white px-2 py-2 text-sm"><option value="500">1/500</option><option value="1000">1/1000</option><option value="2000">1/2000</option><option value="5000">1/5000</option><option value="10000">1/10000</option></select>
          <input value={planNumber} onChange={e => setPlanNumber(e.target.value)} placeholder="N° plan" className="w-24 rounded-lg border px-2 py-2 text-sm" />
          <button type="button" onClick={print} className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white">Exporter PDF / Imprimer</button>
          <button type="button" onClick={onClose} className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700">Fermer</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto aspect-[1.414/1] max-h-full bg-white shadow-xl" key={key}>
          <PlanSvg parcel={parcel} commune={commune} paper={paper} orientation={orientation} scale={scale} source={source} planNumber={planNumber} satelliteUrl={satelliteUrl} />
        </div>
      </div>
      <div className="border-t bg-white px-4 py-2 text-xs text-slate-500">Le changement de format, orientation ou échelle recalcule toute la composition de l’extrait. Le plan principal Topographie reste inchangé.</div>
      {printVersion > 0 && <PrintFrame parcel={parcel} commune={commune} paper={paper} orientation={orientation} scale={scale} source={source} planNumber={planNumber} satelliteUrl={satelliteUrl} onDone={() => setPrintVersion(0)} />}
    </div>
  </div>;
}

function PrintFrame({ parcel, commune, paper, orientation, scale, source, planNumber, satelliteUrl, onDone }: any) {
  const [html, setHtml] = useState('');
  useMemo(() => {
    const node = document.createElement('div');
    const root = document.createElement('div');
    document.body.appendChild(node);
    node.remove();
    setHtml('');
  }, []);
  setTimeout(() => { window.print(); onDone(); }, 80);
  return <style>{`@media print { body > #root > * { display:none !important } }`}</style>;
}
