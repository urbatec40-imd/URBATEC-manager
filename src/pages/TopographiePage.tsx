import { useMemo, useState } from 'react';
import { Plus, Trash2, Search, FolderOpen, Layers3 } from 'lucide-react';
import { MapContainer, TileLayer, LayersControl, GeoJSON, useMap } from 'react-leaflet';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import shp from 'shpjs';
import 'leaflet/dist/leaflet.css';

type Parcel = { id: string; commune: string; section: string; ilot: string; surface: number | null; feature: Feature<Geometry> };
type CadastreCollection = FeatureCollection<Geometry, Record<string, unknown>>;

const COMMUNES = ['Ain Touila','Babar','Baghai','Bouhmama','Chelia','Djellal','El Hamma','El Mahmal','Ensigha','Khenchela','Kais','Khirane',"M'Toussa",'Ouled Rechache','Remila','Tamza','Taouzianat','Yabous','Ain Silan','El Ouldja',"R'Mila"];
const normalize = (v: unknown) => String(v ?? '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const prop = (p: Record<string, unknown>, names: string[]) => { const wanted = names.map(normalize); const key = Object.keys(p).find(k => wanted.includes(normalize(k))); return key ? p[key] : undefined; };
const numeric = (v: unknown) => { const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

function FitToFeature({ feature }: { feature?: Feature<Geometry> }) {
  const map = useMap();
  if (feature) {
    const L = (window as any).L;
    if (L) {
      const layer = L.geoJSON(feature);
      if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 18 });
    }
  }
  return null;
}

export function TopographiePage() {
  const [commune, setCommune] = useState('');
  const [section, setSection] = useState('');
  const [ilot, setIlot] = useState('');
  const [cadastre, setCadastre] = useState<CadastreCollection | null>(null);
  const [selected, setSelected] = useState<Parcel[]>([]);
  const [focus, setFocus] = useState<Feature<Geometry>>();
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const matching = useMemo(() => {
    if (!cadastre || !section.trim() || !ilot.trim()) return [];
    const sec = normalize(section);
    const ilo = normalize(ilot);
    return cadastre.features.filter(feature => {
      const p = (feature.properties ?? {}) as Record<string, unknown>;
      return normalize(prop(p, ['SECTION', 'SECTION_CAD', 'SEC', 'SECT'])) === sec &&
        normalize(prop(p, ['ILOT', 'ILOTS', 'ILOT_CAD', 'NUMILOT', 'NUM_ILOT', 'PARCELLE', 'PARCEL'])) === ilo;
    });
  }, [cadastre, section, ilot]);

  const surface = matching.length
    ? numeric(prop((matching[0].properties ?? {}) as Record<string, unknown>, ['SURFACE', 'SUPERFICIE', 'AREA', 'AIRE', 'CONTENANCE']))
    : null;

  const loadShpFolder = async (files: FileList | null) => {
    if (!files?.length) return;
    setLoading(true);
    setStatus('Lecture du dossier cadastral...');
    try {
      const all = Array.from(files);
      const shpFile = all.find(f => f.name.toLowerCase().endsWith('.shp'));
      const dbfFile = all.find(f => f.name.toLowerCase().endsWith('.dbf'));
      const prjFile = all.find(f => f.name.toLowerCase().endsWith('.prj'));
      if (!shpFile || !dbfFile) throw new Error('Le dossier doit contenir au minimum .SHP et .DBF.');
      const [shpBuffer, dbfBuffer, prjText] = await Promise.all([
        shpFile.arrayBuffer(), dbfFile.arrayBuffer(), prjFile?.text() ?? Promise.resolve(undefined)
      ]);
      const parser = shp as any;
      const geometry = await parser.parseShp(shpBuffer, prjText);
      const attributes = await parser.parseDbf(dbfBuffer);
      const combined = parser.combine([geometry, attributes]) as CadastreCollection;
      setCadastre(combined);
      setSelected([]);
      setFocus(undefined);
      setStatus(`${combined.features.length.toLocaleString('fr-FR')} entités cadastrales chargées.`);
    } catch (e) {
      setCadastre(null);
      setStatus(`Erreur SHP : ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const searchParcel = () => {
    if (!matching.length) {
      setStatus('Aucune parcelle trouvée pour cette Section / Îlot.');
      return;
    }
    setFocus(matching[0]);
    setStatus(`${matching.length} parcelle(s) trouvée(s). Zoom automatique.`);
  };

  const addParcel = () => {
    const added: Parcel[] = matching.map((feature, index) => {
      const p = (feature.properties ?? {}) as Record<string, unknown>;
      const s = String(prop(p, ['SECTION', 'SECTION_CAD', 'SEC', 'SECT']) ?? section).trim();
      const i = String(prop(p, ['ILOT', 'ILOTS', 'ILOT_CAD', 'NUMILOT', 'NUM_ILOT', 'PARCELLE', 'PARCEL']) ?? ilot).trim();
      return {
        id: `${commune}-${s}-${i}-${index}`,
        commune, section: s, ilot: i,
        surface: numeric(prop(p, ['SURFACE', 'SUPERFICIE', 'AREA', 'AIRE', 'CONTENANCE'])),
        feature
      };
    });
    setSelected(old => {
      const ids = new Set(old.map(x => x.id));
      return [...old, ...added.filter(x => !ids.has(x.id))];
    });
    if (matching.length) setFocus(matching[0]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-slate-800">Topographie / Cadastre</h1><p className="text-sm text-slate-500 mt-1">Recherche parcellaire, SHP et cartes en ligne</p></div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          <FolderOpen size={17}/> Charger dossier SHP
          <input type="file" className="hidden" multiple {...({ webkitdirectory: 'true' } as any)} onChange={e => loadShpFolder(e.target.files)} />
        </label>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="text-sm font-medium text-slate-700">Commune<select value={commune} onChange={e => setCommune(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white"><option value="">Sélectionner la commune</option>{COMMUNES.map(c => <option key={c}>{c}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-700">Section<input value={section} onChange={e => setSection(e.target.value)} placeholder="Ex. A" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label>
          <label className="text-sm font-medium text-slate-700">Îlot<input value={ilot} onChange={e => setIlot(e.target.value)} placeholder="Ex. 125" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" /></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button disabled={!cadastre || loading} onClick={searchParcel} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><Search size={16}/> Rechercher / Zoom</button>
          <button disabled={!matching.length} onClick={addParcel} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><Plus size={16}/> Ajouter à la carte</button>
          <div className="inline-flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-sm"><Layers3 size={16}/> OSM • Satellite • Topographique</div>
          <div className="ml-auto rounded-lg bg-slate-50 border px-4 py-2.5 text-sm"><span className="text-slate-500">Surface :</span> <strong>{surface !== null ? `${surface.toLocaleString('fr-FR')} m²` : '—'}</strong></div>
        </div>
        {status && <div className="mt-3 text-sm text-slate-600">{status}</div>}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="h-[600px]">
          <MapContainer center={[35.435, 7.143]} zoom={11} className="h-full w-full">
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="OpenStreetMap"><TileLayer attribution="© OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /></LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satellite"><TileLayer attribution="Tiles © Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" /></LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Topographique"><TileLayer attribution="© OpenTopoMap contributors" url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" /></LayersControl.BaseLayer>
              {cadastre && <LayersControl.Overlay checked name="Cadastre SHP"><GeoJSON data={cadastre as any} style={() => ({ color: '#2563eb', weight: 1, fillOpacity: 0.08 })} /></LayersControl.Overlay>}
              {selected.length > 0 && <LayersControl.Overlay checked name="Parcelles sélectionnées"><div>{selected.map(p => <GeoJSON key={p.id} data={p.feature as any} style={() => ({ color: '#dc2626', weight: 3, fillOpacity: 0.18 })} />)}</div></LayersControl.Overlay>}
            </LayersControl>
            {focus && <FitToFeature feature={focus} />}
          </MapContainer>
        </div>
      </div>

      {selected.length > 0 && <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"><div className="px-4 py-3 border-b font-semibold text-slate-800">Parcelles affichées ({selected.length})</div><div className="divide-y">{selected.map(p => <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm"><span><strong>{p.commune}</strong> — Section {p.section} — Îlot {p.ilot} — {p.surface !== null ? `${p.surface.toLocaleString('fr-FR')} m²` : 'surface non renseignée'}</span><button onClick={() => setSelected(v => v.filter(x => x.id !== p.id))} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button></div>)}</div></div>}
      {!cadastre && <div className="text-xs text-slate-500 bg-slate-50 border rounded-lg p-3">Importez le dossier contenant .SHP, .SHX, .DBF et .PRJ. Les données cadastrales restent locales; Internet sert uniquement aux fonds cartographiques.</div>}
    </div>
  );
}
