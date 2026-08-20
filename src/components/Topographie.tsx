import { useEffect, useMemo, useState } from "react";
import { Map, Layers3, Plus, Trash2, LocateFixed, RefreshCw, FolderOpen, Ruler } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { COMMUNES_KHENCHELA, getCommuneFolder, getCommuneSource } from "@/data/topographieSources";
import { findField, matches, parseShapefile, uniqueValues, type ShapefileLayer, type ShapeRecord } from "@/lib/shapefile";

interface BundleResult {
  shp: string;
  shx: string;
  dbf: string;
  prj: string;
  sourcePath: string;
}

interface DisplaySelection {
  id: string;
  commune: string;
  section: string;
  ilot: string;
  records: ShapeRecord[];
  areaM2: number;
}

const SECTION_CANDIDATES = ["SECTION", "SECT", "SEC", "SECTION_CAD"];
const ILOT_CANDIDATES = ["ILOT", "ÎLOT", "ILOT_NO", "ILOT_NUM", "NUMILOT"];

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function formatArea(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
}

function bboxOf(records: ShapeRecord[]): [number, number, number, number] | null {
  if (!records.length) return null;
  return records.reduce<[number, number, number, number]>((box, record) => [
    Math.min(box[0], record.bbox[0]),
    Math.min(box[1], record.bbox[1]),
    Math.max(box[2], record.bbox[2]),
    Math.max(box[3], record.bbox[3]),
  ], [Infinity, Infinity, -Infinity, -Infinity]);
}

function pointsToPath(parts: [number, number][][], box: [number, number, number, number], width = 1000, height = 680): string {
  const [minX, minY, maxX, maxY] = box;
  const dx = Math.max(maxX - minX, 1e-9);
  const dy = Math.max(maxY - minY, 1e-9);
  const scale = Math.min((width - 60) / dx, (height - 60) / dy);
  const ox = (width - dx * scale) / 2;
  const oy = (height - dy * scale) / 2;
  return parts.map((part) => part.map(([x, y], index) => {
    const px = ox + (x - minX) * scale;
    const py = height - (oy + (y - minY) * scale);
    return `${index === 0 ? "M" : "L"}${px.toFixed(2)} ${py.toFixed(2)}`;
  }).join(" ") + " Z").join(" ");
}

function selectionKey(commune: string, section: string, ilot: string): string {
  return `${commune}|${section.trim().toUpperCase()}|${ilot.trim().toUpperCase()}`;
}

export function Topographie() {
  const [commune, setCommune] = useState(COMMUNES_KHENCHELA[0]?.name ?? "KHENCHELA");
  const [section, setSection] = useState("");
  const [ilot, setIlot] = useState("");
  const [layer, setLayer] = useState<ShapefileLayer | null>(null);
  const [selections, setSelections] = useState<DisplaySelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Choisissez une commune puis saisissez Section et Îlot.");
  const [zoomBox, setZoomBox] = useState<[number, number, number, number] | null>(null);

  const source = getCommuneSource(commune);
  const sectionField = useMemo(() => findField(layer?.fields ?? [], SECTION_CANDIDATES), [layer]);
  const ilotField = useMemo(() => findField(layer?.fields ?? [], ILOT_CANDIDATES), [layer]);

  const sectionValues = useMemo(() => uniqueValues(layer?.records ?? [], sectionField), [layer, sectionField]);
  const ilotValues = useMemo(() => {
    if (!layer || !sectionField || !ilotField || !section.trim()) return [];
    return uniqueValues(layer.records.filter((record) => matches(record, sectionField, section)), ilotField);
  }, [layer, section, sectionField, ilotField]);

  const currentMatches = useMemo(() => {
    if (!layer || !sectionField || !ilotField || !section.trim() || !ilot.trim()) return [];
    return layer.records.filter((record) => matches(record, sectionField, section) && matches(record, ilotField, ilot));
  }, [layer, section, ilot, sectionField, ilotField]);

  const currentArea = currentMatches.reduce((sum, record) => sum + record.areaM2, 0);
  const visibleRecords = useMemo(() => layer?.records ?? [], [layer]);
  const displayBox = zoomBox ?? bboxOf(visibleRecords);

  async function loadCommune(nextCommune: string) {
    const nextSource = getCommuneSource(nextCommune);
    if (!nextSource) return;
    setLoading(true);
    setLayer(null);
    setSelections([]);
    setSection("");
    setIlot("");
    setZoomBox(null);
    setStatus("Chargement des données cadastrales…");
    try {
      const bundle = await invoke<BundleResult>("read_topographie_bundle", {
        shpPath: `${getCommuneFolder(nextCommune)}\\${nextSource.fileName}`,
      });
      const parsed = parseShapefile(decodeBase64(bundle.shp), decodeBase64(bundle.dbf), bundle.prj);
      setLayer(parsed);
      setStatus(`${parsed.records.length.toLocaleString("fr-FR")} objets chargés • source: ${bundle.sourcePath}`);
    } catch (error) {
      setStatus(`Source non chargée: ${String(error)}. Vérifiez le dossier de la commune et les fichiers .shp/.shx/.dbf/.prj.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCommune(commune);
  }, [commune]);

  useEffect(() => {
    if (!currentMatches.length) return;
    setZoomBox(bboxOf(currentMatches));
  }, [section, ilot, currentMatches.length]);

  function addSelection() {
    if (!currentMatches.length) return;
    const id = selectionKey(commune, section, ilot);
    const next: DisplaySelection = {
      id,
      commune,
      section: section.trim(),
      ilot: ilot.trim(),
      records: currentMatches,
      areaM2: currentArea,
    };
    setSelections((previous) => previous.some((item) => item.id === id) ? previous : [...previous, next]);
    setZoomBox(bboxOf(currentMatches));
    setStatus(`Îlot ${ilot.trim()} ajouté à la carte.`);
  }

  function removeSelection(id: string) {
    setSelections((previous) => previous.filter((item) => item.id !== id));
  }

  const selectedRecords = selections.flatMap((selection) => selection.records);
  const selectedIds = new Set(selectedRecords.map((record) => layer?.records.indexOf(record) ?? -1));

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2 text-white"><Map className="h-5 w-5" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">TOPOGRAPHIE</h1>
              <p className="text-sm text-slate-500">Recherche cadastrale et affichage cartographique pour les 21 communes de Khenchela</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
          Mode local • sans Client / sans Dossier
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 font-semibold text-slate-900"><Layers3 className="h-4 w-4" /> Recherche</div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Commune</label>
            <select value={commune} onChange={(event) => setCommune(event.target.value)} className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900">
              {COMMUNES_KHENCHELA.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}
            </select>

            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Section</label>
            <input value={section} onChange={(event) => setSection(event.target.value)} list="topo-sections" placeholder="Écrire la section" className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm uppercase outline-none focus:border-slate-900" />
            <datalist id="topo-sections">{sectionValues.map((value) => <option key={value} value={value} />)}</datalist>

            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Îlot</label>
            <input value={ilot} onChange={(event) => setIlot(event.target.value)} list="topo-ilots" placeholder="Écrire l'îlot" className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm uppercase outline-none focus:border-slate-900" />
            <datalist id="topo-ilots">{ilotValues.map((value) => <option key={value} value={value} />)}</datalist>

            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Surface de l'îlot</div>
              <div className="mt-1 text-xl font-bold text-slate-900">{currentMatches.length ? `${formatArea(currentArea)} m²` : "—"}</div>
              <div className="mt-1 text-xs text-slate-500">{currentMatches.length ? `${currentMatches.length} objet(s) correspondant(s)` : "Complétez Section + Îlot"}</div>
            </div>

            <button type="button" onClick={addSelection} disabled={!currentMatches.length} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" /> Ajouter à la carte</button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between"><span className="font-semibold text-slate-900">Éléments affichés</span><button type="button" onClick={() => setSelections([])} className="text-xs font-medium text-slate-500 hover:text-red-600">Tout effacer</button></div>
            <div className="space-y-2">
              {selections.length === 0 && <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">Ajoutez plusieurs îlots. Ils resteront visibles ensemble.</div>}
              {selections.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div><div className="text-sm font-semibold text-slate-800">Section {item.section} • Îlot {item.ilot}</div><div className="text-xs text-slate-500">{formatArea(item.areaM2)} m²</div></div>
                  <button type="button" onClick={() => removeSelection(item.id)} aria-label={`Supprimer ${item.id}`} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-xs text-slate-500">
            <div className="mb-2 flex items-center gap-2 font-semibold text-slate-700"><FolderOpen className="h-4 w-4" /> Source de la commune</div>
            <div className="break-all font-mono">{source ? `${getCommuneFolder(commune)}\\${source.fileName}` : "—"}</div>
            <div className="mt-2">Structure attendue : SHP + SHX + DBF + PRJ portant le même nom.</div>
          </div>
        </section>

        <section className="min-h-[680px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div><div className="font-semibold text-slate-900">Carte</div><div className="text-xs text-slate-500">{loading ? "Chargement…" : status}</div></div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setZoomBox(bboxOf(currentMatches.length ? currentMatches : visibleRecords))} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Zoom sur la sélection"><LocateFixed className="h-4 w-4" /></button>
              <button type="button" onClick={() => void loadCommune(commune)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Recharger"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
            </div>
          </div>
          <div className="relative h-[680px] overflow-hidden bg-slate-100">
            {displayBox ? (
              <svg viewBox="0 0 1000 680" className="h-full w-full" role="img" aria-label="Carte topographique">
                <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeOpacity="0.08" /></pattern></defs>
                <rect width="1000" height="680" fill="url(#grid)" />
                {visibleRecords.map((record, index) => {
                  const isSelected = selectedIds.has(index);
                  const path = pointsToPath(record.points, displayBox);
                  return <path key={index} d={path} fill={isSelected ? "rgba(15,23,42,0.18)" : "rgba(148,163,184,0.05)"} stroke={isSelected ? "#0f172a" : "#64748b"} strokeWidth={isSelected ? 2.2 : 0.8} vectorEffect="non-scaling-stroke" />;
                })}
              </svg>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500"><div><Map className="mx-auto mb-3 h-10 w-10 text-slate-300" /><div className="font-semibold text-slate-700">Aucune géométrie chargée</div><div className="mt-1 max-w-md">Sélectionnez une commune. Le logiciel utilise ensuite uniquement le fichier SHP associé à cette commune.</div></div></div>
            )}
            <div className="absolute bottom-4 left-4 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">{layer ? `${layer.records.length.toLocaleString("fr-FR")} objets` : "—"} • {layer?.prj ? "CRS lu depuis PRJ" : "PRJ non lu"}</div>
          </div>
        </section>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Ruler className="h-4 w-4" /> La surface est calculée à partir de la géométrie projetée du SHP. Pour un résultat cadastral fiable, le PRJ doit correspondre au système de coordonnées du levé.</div>
    </div>
  );
}
