import { useMemo, useState } from 'react';
import { Download, FileImage, FileText, Maximize2, Minimize2, RotateCcw, Ruler, Settings2, X } from 'lucide-react';
import type { Position } from 'geojson';
import { extractCharacteristicPoints } from '../lib/cadastralPlan';

export type CadastralNeighbor = {
  id: string;
  ilot: string;
  section?: string;
  coordinates: Position[];
};

type Paper = 'A4' | 'A3' | 'A2' | 'A1' | 'A0';
type Orientation = 'portrait' | 'landscape';

const PAPER_MM: Record<Paper, [number, number]> = {
  A4: [210, 297],
  A3: [297, 420],
  A2: [420, 594],
  A1: [594, 841],
  A0: [841, 1189],
};

const SCALES = [200, 500, 1000, 2000, 2500, 5000, 10000];

function boundsOf(rings: Position[][]) {
  const pts = rings.flat();
  const xs = pts.map(p => Number(p[0]));
  const ys = pts.map(p => Number(p[1]));
  return {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys),
  };
}

function projectPoints(points: Position[], box: { minX: number; maxX: number; minY: number; maxY: number }) {
  const dx = Math.max(1e-12, box.maxX - box.minX);
  const dy = Math.max(1e-12, box.maxY - box.minY);
  return points.map(p => ({
    x: 16 + ((Number(p[0]) - box.minX) / dx) * 68,
    y: 16 + (1 - (Number(p[1]) - box.minY) / dy) * 68,
  }));
}

function polygonPath(points: Position[], box: ReturnType<typeof boundsOf>) {
  return projectPoints(points, box).map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ') + ' Z';
}

export function CadastralPlanPreview({
  open,
  onClose,
  commune,
  section,
  ilot,
  surface,
  selectedRing,
  neighbors,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  commune: string;
  section: string;
  ilot: string;
  surface: string;
  selectedRing: Position[];
  neighbors: CadastralNeighbor[];
  onExport?: (format: 'dxf' | 'dwg') => void;
}) {
  const [paper, setPaper] = useState<Paper>('A4');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [scale, setScale] = useState(1000);
  const [showCoords, setShowCoords] = useState(true);
  const [showNeighbors, setShowNeighbors] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const rings = useMemo(() => [selectedRing, ...(showNeighbors ? neighbors.map(n => n.coordinates) : [])].filter(r => r.length > 2), [selectedRing, neighbors, showNeighbors]);
  const box = useMemo(() => rings.length ? boundsOf(rings) : { minX: 0, maxX: 1, minY: 0, maxY: 1 }, [rings]);
  const selectedPath = useMemo(() => polygonPath(selectedRing, box), [selectedRing, box]);
  const characteristic = useMemo(() => extractCharacteristicPoints(selectedRing, { minTurnDeg: 25 }), [selectedRing]);
  const characteristicProjected = useMemo(() => projectPoints(characteristic.map(p => p.position), box), [characteristic, box]);

  if (!open) return null;
  const [w, h] = PAPER_MM[paper];
  const paperWidth = orientation === 'landscape' ? h : w;
  const paperHeight = orientation === 'landscape' ? w : h;

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className={`flex ${expanded ? 'h-[96vh] w-[98vw]' : 'h-[92vh] w-[96vw]'} overflow-hidden rounded-2xl bg-slate-100 shadow-2xl`}>
        <aside className="flex w-[330px] shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Extrait du plan</div>
              <div className="mt-1 text-lg font-bold text-slate-900">Présentation cadastrale</div>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <section>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><Settings2 size={14}/> Mise en page</div>
              <div className="grid grid-cols-2 gap-2">
                {(['A4','A3','A2','A1','A0'] as Paper[]).map(p => <button key={p} onClick={() => setPaper(p)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${paper === p ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{p}</button>)}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => setOrientation('portrait')} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${orientation === 'portrait' ? 'border-sky-600 bg-sky-50 text-sky-700' : 'border-slate-200'}`}>Portrait</button>
                <button onClick={() => setOrientation('landscape')} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${orientation === 'landscape' ? 'border-sky-600 bg-sky-50 text-sky-700' : 'border-slate-200'}`}>Paysage</button>
              </div>
            </section>

            <section>
              <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><Ruler size={14}/> Échelle</label>
              <select value={scale} onChange={e => setScale(Number(e.target.value))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
                {SCALES.map(s => <option key={s} value={s}>1:{s}</option>)}
              </select>
              <div className="mt-2 text-xs text-slate-500">Aperçu à l'échelle 1:{scale}. L'échelle graphique est affichée sur la feuille.</div>
            </section>

            <section className="space-y-2">
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Contenu</div>
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"><span>Îlots voisins</span><input type="checkbox" checked={showNeighbors} onChange={e => setShowNeighbors(e.target.checked)}/></label>
              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"><span>Coordonnées X / Y</span><input type="checkbox" checked={showCoords} onChange={e => setShowCoords(e.target.checked)}/></label>
            </section>

            <section className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Référence</div>
              <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm"><span className="text-slate-500">Commune</span><b>{commune}</b><span className="text-slate-500">Section</span><b>{section}</b><span className="text-slate-500">Ilot</span><b>{ilot}</b><span className="text-slate-500">Surface</span><b>{surface} m²</b></div>
            </section>
          </div>

          <div className="border-t border-slate-200 p-4">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onExport?.('dxf')} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white hover:bg-slate-800"><Download size={16}/> DXF</button>
              <button onClick={() => onExport?.('dwg')} className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50"><FileText size={16}/> DWG</button>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
            <div className="flex items-center gap-3"><FileImage size={18} className="text-sky-600"/><span className="text-sm font-semibold text-slate-800">Aperçu avant export</span></div>
            <button onClick={() => setExpanded(v => !v)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">{expanded ? <Minimize2 size={17}/> : <Maximize2 size={17}/>}</button>
          </header>

          <div className="flex flex-1 items-center justify-center overflow-auto p-8">
            <div className="relative bg-white shadow-2xl" style={{ width: `${Math.min(920, paperWidth * 2.05)}px`, aspectRatio: `${paperWidth}/${paperHeight}` }}>
              <div className="absolute inset-4 border border-slate-800">
                <div className="absolute inset-x-4 top-3 text-center">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">EXTRAIT DU PLAN CADASTRAL</div>
                  <div className="mt-1 text-base font-extrabold text-slate-900">{commune} — SECTION {section} — ILOT {ilot}</div>
                </div>

                <svg viewBox="0 0 100 100" className="absolute inset-x-6 top-20 h-[62%] w-[calc(100%-3rem)]" preserveAspectRatio="none">
                  {showNeighbors && neighbors.map(n => <path key={n.id} d={polygonPath(n.coordinates, box)} fill="none" stroke="#94a3b8" strokeWidth="0.35" />)}
                  {showNeighbors && neighbors.map(n => { const c = projectPoints(n.coordinates, box); const cx = c.reduce((s,p)=>s+p.x,0)/c.length; const cy=c.reduce((s,p)=>s+p.y,0)/c.length; return <text key={`${n.id}-label`} x={cx} y={cy} textAnchor="middle" fontSize="3.2" fill="#64748b">{n.section ? `${n.section}/${n.ilot}` : n.ilot}</text>; })}
                  <path d={selectedPath} fill="#fef3c7" stroke="#b45309" strokeWidth="0.8" />
                  {characteristicProjected.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="0.65" fill="#b45309" />)}
                  <text x="50" y="48" textAnchor="middle" fontSize="4.2" fontWeight="700" fill="#334155">{section}</text>
                  <text x="50" y="53" textAnchor="middle" fontSize="5.2" fontWeight="800" fill="#b45309">{ilot}</text>
                  <g transform="translate(90 10)"><path d="M0 8 L3 0 L6 8 L3 6 Z" fill="#0f172a"/><text x="3" y="12" textAnchor="middle" fontSize="2.5" fontWeight="700">N</text></g>
                </svg>

                {showCoords && <div className="absolute bottom-20 left-6 right-6 rounded border border-slate-300 bg-white/95 p-2">
                  <div className="mb-1 text-[7px] font-bold uppercase tracking-wider text-slate-500">Tableau des points caractéristiques — X / Y</div>
                  <div className="grid grid-cols-4 gap-x-4 text-[7px] text-slate-700">
                    {characteristic.slice(0, 8).map((p, i) => <div key={i} className="flex justify-between border-b border-slate-100 py-0.5"><b>P{i + 1}</b><span>X/Y à exporter</span></div>)}
                  </div>
                </div>}

                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between border-t border-slate-800 pt-2 text-[7px] text-slate-600">
                  <div><b>Échelle numérique</b><br/>1:{scale}</div>
                  <div className="flex items-center gap-1"><b>Échelle graphique</b><div className="h-2 w-24 border border-slate-800"><div className="h-full w-1/2 border-r border-slate-800"/></div><span>m</span></div>
                  <div className="text-right"><b>Présentation cadastrale</b><br/>URATEC Manager</div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
