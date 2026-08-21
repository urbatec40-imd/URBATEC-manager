import { useMemo, useState } from 'react';
import { Download, FileDown, Map, Maximize2, RotateCcw, X } from 'lucide-react';
import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';

type Props = Record<string, unknown>;
type Parcel = Feature<Geometry, Props>;

type PlanPreviewProps = {
  open: boolean;
  onClose: () => void;
  commune: string;
  section: string;
  ilot: string;
  surface: string;
  selected: Parcel | null;
  neighbours: Parcel[];
};

type PointXY = { name: string; x: number; y: number };

type Paper = 'A4' | 'A3' | 'A2' | 'A1' | 'A0';
type Orientation = 'portrait' | 'landscape';

const PAPER_MM: Record<Paper, [number, number]> = {
  A4: [210, 297], A3: [297, 420], A2: [420, 594], A1: [594, 841], A0: [841, 1189],
};

const prop = (p: Props | undefined, keys: string[]) => {
  for (const k of keys) {
    const v = p?.[k];
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  return '';
};
const num = (v: string) => Number(v.replace(/[^0-9+-.]/g, ''));

function ringOf(f: Parcel | null): Position[] {
  if (!f) return [];
  if (f.geometry.type === 'Polygon') return f.geometry.coordinates[0] ?? [];
  if (f.geometry.type === 'MultiPolygon') return f.geometry.coordinates[0]?.[0] ?? [];
  if (f.geometry.type === 'LineString') return f.geometry.coordinates;
  return [];
}

function angle(a: Position, b: Position, c: Position) {
  const abx = Number(a[0]) - Number(b[0]);
  const aby = Number(a[1]) - Number(b[1]);
  const cbx = Number(c[0]) - Number(b[0]);
  const cby = Number(c[1]) - Number(b[1]);
  const den = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (!den) return 0;
  return Math.acos(Math.max(-1, Math.min(1, (abx * cbx + aby * cby) / den))) * 180 / Math.PI;
}

/**
 * Conservative cadastral labelling: keep only genuine direction changes.
 * Small KMZ digitising noise is ignored instead of becoming a coordinate point.
 */
function characteristicPoints(ring: Position[]): Position[] {
  if (ring.length < 4) return ring;
  const closed = ring.slice(0, -1);
  const result: Position[] = [];
  const threshold = 25; // deliberately clear/large: user asked for visible direction changes only
  for (let i = 0; i < closed.length; i++) {
    const a = closed[(i - 1 + closed.length) % closed.length];
    const b = closed[i];
    const c = closed[(i + 1) % closed.length];
    if (angle(a, b, c) >= threshold) result.push(b);
  }
  if (!result.length) {
    // Fallback for a simple rectangular/clean polygon: retain the extreme corners.
    const extremes = [
      closed.reduce((a, b) => Number(b[0]) < Number(a[0]) ? b : a, closed[0]),
      closed.reduce((a, b) => Number(b[1]) < Number(a[1]) ? b : a, closed[0]),
      closed.reduce((a, b) => Number(b[0]) > Number(a[0]) ? b : a, closed[0]),
      closed.reduce((a, b) => Number(b[1]) > Number(a[1]) ? b : a, closed[0]),
    ];
    for (const p of extremes) if (!result.some(q => q[0] === p[0] && q[1] === p[1])) result.push(p);
  }
  return result;
}

function utmFromLonLat(lon: number, lat: number) {
  // WGS84 UTM, suitable for the Khenchela area (zone 32N). Kept local and deterministic for export.
  const zone = 32;
  const a = 6378137;
  const eccSquared = 0.00669438;
  const k0 = 0.9996;
  const eccPrimeSquared = eccSquared / (1 - eccSquared);
  const latRad = lat * Math.PI / 180;
  const lonRad = lon * Math.PI / 180;
  const lonOrigin = (zone - 1) * 6 - 180 + 3;
  const lonOriginRad = lonOrigin * Math.PI / 180;
  const N = a / Math.sqrt(1 - eccSquared * Math.sin(latRad) ** 2);
  const T = Math.tan(latRad) ** 2;
  const C = eccPrimeSquared * Math.cos(latRad) ** 2;
  const A = Math.cos(latRad) * (lonRad - lonOriginRad);
  const M = a * ((1 - eccSquared / 4 - 3 * eccSquared ** 2 / 64 - 5 * eccSquared ** 3 / 256) * latRad
    - (3 * eccSquared / 8 + 3 * eccSquared ** 2 / 32 + 45 * eccSquared ** 3 / 1024) * Math.sin(2 * latRad)
    + (15 * eccSquared ** 2 / 256 + 45 * eccSquared ** 3 / 1024) * Math.sin(4 * latRad)
    - (35 * eccSquared ** 3 / 3072) * Math.sin(6 * latRad));
  return {
    x: k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T ** 2 + 72 * C - 58 * eccPrimeSquared) * A ** 5 / 120) + 500000,
    y: k0 * (M + N * Math.tan(latRad) * (A ** 2 / 2 + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24 + (61 - 58 * T + T ** 2 + 600 * C - 330 * eccPrimeSquared) * A ** 6 / 720)),
  };
}

function project(points: Position[], width: number, height: number, pad = 70) {
  const xy = points.map(p => utmFromLonLat(Number(p[0]), Number(p[1])));
  const minX = Math.min(...xy.map(p => p.x)), maxX = Math.max(...xy.map(p => p.x));
  const minY = Math.min(...xy.map(p => p.y)), maxY = Math.max(...xy.map(p => p.y));
  const sx = (width - pad * 2) / Math.max(1, maxX - minX);
  const sy = (height - pad * 2) / Math.max(1, maxY - minY);
  const scale = Math.min(sx, sy);
  return { xy, minX, minY, scale, map: (p: Position) => { const u = utmFromLonLat(Number(p[0]), Number(p[1])); return [pad + (u.x - minX) * scale, height - pad - (u.y - minY) * scale] as const; } };
}

function dxfText(lines: string[]) {
  return lines.join('\n') + '\n';
}

function buildDxf(selected: Parcel, neighbours: Parcel[], meta: { commune: string; section: string; ilot: string; surface: string }) {
  const out: string[] = ['0','SECTION','2','ENTITIES'];
  const addPolyline = (ring: Position[], layer: string) => {
    const xy = ring.map(p => utmFromLonLat(Number(p[0]), Number(p[1])));
    out.push('0','LWPOLYLINE','8',layer,'90',String(xy.length),'70','1');
    for (const p of xy) out.push('10',p.x.toFixed(3),'20',p.y.toFixed(3));
  };
  for (const n of neighbours) addPolyline(ringOf(n), 'ILOTS_VOISINS');
  addPolyline(ringOf(selected), 'ILOT_SELECTION');
  const pts = characteristicPoints(ringOf(selected));
  pts.forEach((p, i) => { const u = utmFromLonLat(Number(p[0]), Number(p[1])); out.push('0','POINT','8','POINTS_XY','10',u.x.toFixed(3),'20',u.y.toFixed(3)); out.push('0','TEXT','8','TEXTES','10',u.x.toFixed(3),'20',u.y.toFixed(3),'40','1.8','1',`P${i + 1}`); });
  const info = `${meta.commune} | SECTION ${meta.section} | ILOT ${meta.ilot} | ${meta.surface} m2`;
  out.push('0','TEXT','8','CARTOUCHE','10','0','20','0','40','2.5','1',info);
  out.push('0','ENDSEC','0','EOF');
  return dxfText(out);
}

export function CadastralPlanPreview({ open, onClose, commune, section, ilot, surface, selected, neighbours }: PlanPreviewProps) {
  const [paper, setPaper] = useState<Paper>('A3');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [scale, setScale] = useState('AUTO');
  const [showNeighbours, setShowNeighbours] = useState(true);
  const [zoom, setZoom] = useState(1);
  const ring = useMemo(() => ringOf(selected), [selected]);
  const points = useMemo(() => characteristicPoints(ring), [ring]);
  const page = PAPER_MM[paper];
  const width = orientation === 'landscape' ? page[1] : page[0];
  const height = orientation === 'landscape' ? page[0] : page[1];
  const projection = useMemo(() => project(ring, 1000, 620, 100), [ring]);
  const path = ring.length ? ring.map((p, i) => { const [x,y] = projection.map(p); return `${i ? 'L' : 'M'} ${x} ${y}`; }).join(' ') + ' Z' : '';
  const download = (kind: 'dxf' | 'dwg') => {
    if (!selected) return;
    if (kind === 'dwg') {
      window.alert('DWG direct sera activé avec le moteur DWG natif. Le bouton ne génère pas un faux DWG en renommant un DXF.');
      return;
    }
    const blob = new Blob([buildDxf(selected, neighbours, { commune, section, ilot, surface })], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `${commune}_Section_${section}_Ilot_${ilot}.dxf`; a.click(); URL.revokeObjectURL(url);
  };
  if (!open) return null;
  return <div className="fixed inset-0 z-[5000] bg-slate-950/70 p-4 lg:p-6">
    <div className="mx-auto flex h-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl">
      <header className="flex items-center justify-between border-b bg-white px-5 py-3">
        <div><div className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">Présentation cadastrale</div><h2 className="text-lg font-bold text-slate-900">Extrait du Plan — Section {section} / Ilot {ilot}</h2></div>
        <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 overflow-auto border-b bg-white p-4 lg:w-72 lg:border-b-0 lg:border-r">
          <div className="mb-4 rounded-xl border bg-slate-50 p-3"><div className="text-xs font-semibold text-slate-500">ILOT SÉLECTIONNÉ</div><div className="mt-1 text-2xl font-black text-slate-900">{ilot}</div><div className="text-sm font-semibold text-sky-700">SECTION {section}</div><div className="mt-2 text-sm">{commune}</div><div className="text-xs text-slate-500">Surface : {surface} m²</div></div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Format</label><select value={paper} onChange={e=>setPaper(e.target.value as Paper)} className="mb-3 w-full rounded-lg border px-3 py-2 text-sm">{Object.keys(PAPER_MM).map(p=><option key={p}>{p}</option>)}</select>
          <label className="mb-1 block text-xs font-bold text-slate-600">Orientation</label><div className="mb-3 grid grid-cols-2 gap-2">{(['portrait','landscape'] as Orientation[]).map(o=><button key={o} onClick={()=>setOrientation(o)} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${orientation===o?'bg-slate-900 text-white':'bg-white'}`}>{o==='portrait'?'Portrait':'Paysage'}</button>)}</div>
          <label className="mb-1 block text-xs font-bold text-slate-600">Échelle</label><select value={scale} onChange={e=>setScale(e.target.value)} className="mb-3 w-full rounded-lg border px-3 py-2 text-sm"><option>AUTO</option>{[200,500,1000,2000,2500,5000].map(s=><option key={s}>1:{s}</option>)}</select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showNeighbours} onChange={e=>setShowNeighbours(e.target.checked)}/> Ilots voisins</label>
          <div className="mt-5 grid grid-cols-2 gap-2"><button onClick={()=>download('dxf')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-sky-700"><FileDown size={16}/> DXF</button><button onClick={()=>download('dwg')} className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm font-bold text-slate-700"><Download size={16}/> DWG</button></div>
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">DWG direct reste volontairement séparé : on ne fabrique jamais un faux DWG en changeant l'extension d'un DXF.</div>
        </aside>
        <main className="min-w-0 flex-1 overflow-auto p-4 lg:p-6">
          <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold text-slate-600"><Map size={16}/> Aperçu avant export</div><div className="flex items-center gap-1"><button onClick={()=>setZoom(z=>Math.max(.7,z-.1))} className="rounded-lg border bg-white px-3 py-1">−</button><span className="w-12 text-center text-xs">{Math.round(zoom*100)}%</span><button onClick={()=>setZoom(z=>Math.min(1.6,z+.1))} className="rounded-lg border bg-white px-3 py-1">+</button><button onClick={()=>setZoom(1)} className="rounded-lg border bg-white p-1.5"><RotateCcw size={14}/></button></div></div>
          <div className="flex min-h-[650px] items-start justify-center overflow-auto rounded-2xl border bg-slate-200 p-6">
            <div style={{ width: `${width*zoom*2.2}px`, minWidth: `${width*zoom*2.2}px` }} className="relative bg-white shadow-2xl">
              <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Aperçu du plan cadastral">
                <rect x="4" y="4" width={width-8} height={height-8} fill="white" stroke="#0f172a" strokeWidth="1.2"/>
                <rect x="12" y="12" width={width-24} height={height-24} fill="none" stroke="#64748b" strokeWidth="0.5"/>
                <g transform={`translate(${width/2-500},${height/2-310})`}>
                  {showNeighbours && neighbours.map((n,i)=>{const r=ringOf(n);if(!r.length)return null;const pp=r.map((p,j)=>{const [x,y]=projection.map(p);return `${j?'L':'M'} ${x} ${y}`}).join(' ')+' Z';return <path key={i} d={pp} fill="#e2e8f0" stroke="#64748b" strokeWidth="1.2"/>})}
                  {path && <path d={path} fill="#fef3c7" stroke="#0f172a" strokeWidth="3"/>}
                  {path && <text x="500" y="300" textAnchor="middle" fontSize="30" fontWeight="700" fill="#0f172a">SECTION {section}</text>}
                  {path && <text x="500" y="340" textAnchor="middle" fontSize="42" fontWeight="900" fill="#2563eb">{ilot}</text>}
                  {points.map((p,i)=>{const [x,y]=projection.map(p);return <g key={i}><circle cx={x} cy={y} r="3" fill="#0f172a"/><text x={x+7} y={y-7} fontSize="10" fontWeight="700">P{i+1}</text></g>})}
                  {showNeighbours && neighbours.map((n,i)=>{const r=ringOf(n);if(!r.length)return null;const c=r.reduce((a,p)=>[a[0]+Number(p[0]),a[1]+Number(p[1])] as Position,[0,0]).map(v=>v/r.length) as Position;const [x,y]=projection.map(c);const s=prop(n.properties,['il_no','il_no_nat','ilot','ILOT'])||String(i+1);return <text key={`n-${i}`} x={x} y={y} textAnchor="middle" fontSize="18" fill="#475569" fontWeight="600">{s}</text>})}
                </g>
                <g transform={`translate(${width-115},35)`}><path d="M0 45 L0 5 L-7 17 L0 5 L7 17" fill="none" stroke="#0f172a" strokeWidth="2"/><text x="0" y="62" textAnchor="middle" fontSize="10" fontWeight="700">N</text></g>
                <g transform={`translate(25,${height-45})`}><line x1="0" y1="0" x2="80" y2="0" stroke="#0f172a" strokeWidth="2"/><line x1="0" y1="-5" x2="0" y2="5" stroke="#0f172a"/><line x1="40" y1="-5" x2="40" y2="5" stroke="#0f172a"/><line x1="80" y1="-5" x2="80" y2="5" stroke="#0f172a"/><text x="40" y="18" textAnchor="middle" fontSize="9">Échelle graphique</text></g>
                <g transform={`translate(25,${height-115})`}><text fontSize="9" fill="#475569">Système : UTM — WGS84 / Zone 32N</text><text y="15" fontSize="9" fill="#475569">Échelle : {scale === 'AUTO' ? 'Automatique' : scale}</text></g>
                <g transform={`translate(${width-285},${height-110})`}><rect width="260" height="80" fill="white" stroke="#334155"/><text x="10" y="20" fontSize="9" fontWeight="700">EXTRAIT DU PLAN CADASTRAL</text><text x="10" y="38" fontSize="8">COMMUNE : {commune}</text><text x="10" y="51" fontSize="8">SECTION : {section}   ILOT : {ilot}</text><text x="10" y="64" fontSize="8">SURFACE : {surface} m²</text></g>
              </svg>
            </div>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_360px]"><div className="rounded-xl border bg-white p-3"><div className="text-xs font-bold uppercase tracking-wide text-slate-500">Points caractéristiques</div><div className="mt-2 overflow-auto"><table className="w-full text-xs"><thead><tr className="border-b text-left text-slate-500"><th className="py-2">Point</th><th>X (m)</th><th>Y (m)</th></tr></thead><tbody>{points.map((p,i)=>{const u=utmFromLonLat(Number(p[0]),Number(p[1]));return <tr key={i} className="border-b last:border-0"><td className="py-2 font-semibold">P{i+1}</td><td>{u.x.toFixed(3)}</td><td>{u.y.toFixed(3)}</td></tr>})}</tbody></table></div></div><div className="rounded-xl border bg-white p-3 text-xs text-slate-600"><div className="font-bold text-slate-800">Règle de sélection</div><p className="mt-1 leading-5">Seuls les changements de direction clairement visibles sont retenus. Les vertices intermédiaires sur un même alignement ne sont pas exportés comme points caractéristiques.</p></div></div>
        </main>
      </div>
    </div>
  </div>;
}

export default CadastralPlanPreview;
