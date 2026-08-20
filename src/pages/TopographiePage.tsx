import { useMemo, useState } from 'react';
import { MapPinned, Plus, Trash2, Search } from 'lucide-react';

type Parcel = { id: string; commune: string; section: string; ilot: string; surface: number };

const COMMUNES = ['Ain Touila','Babar','Baghai','Bouhmama','Chelia','Djellal','El Hamma','El Mahmal','Ensigha','Khenchela','Kais','Khirane','M'Toussa','Ouled Rechache','Remila','Tamza','Taouzianat','Yabous','Ain Silan','El Ouldja','R'mila'];

export function TopographiePage() {
  const [commune, setCommune] = useState('');
  const [section, setSection] = useState('');
  const [ilot, setIlot] = useState('');
  const [selected, setSelected] = useState<Parcel[]>([]);
  const [searched, setSearched] = useState(false);

  const surface = useMemo(() => {
    if (!commune || !section.trim() || !ilot.trim()) return null;
    const seed = [...section.trim(), ...ilot.trim()].reduce((a, c) => a + c.charCodeAt(0), 0);
    return 500 + (seed * 137) % 9500;
  }, [commune, section, ilot]);

  const searchParcel = () => {
    if (!surface) return;
    setSearched(true);
  };

  const addParcel = () => {
    if (!surface) return;
    const id = `${commune}-${section.trim().toUpperCase()}-${ilot.trim().toUpperCase()}`;
    if (selected.some(p => p.id === id)) return;
    setSelected(v => [...v, { id, commune, section: section.trim().toUpperCase(), ilot: ilot.trim().toUpperCase(), surface }]);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Topographie / Cadastre</h1>
        <p className="text-sm text-slate-500 mt-1">Recherche parcellaire et localisation des îlots</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="text-sm font-medium text-slate-700">Commune
            <select value={commune} onChange={e => { setCommune(e.target.value); setSearched(false); }} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white">
              <option value="">Sélectionner la commune</option>
              {COMMUNES.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Section
            <input value={section} onChange={e => { setSection(e.target.value); setSearched(false); }} placeholder="Ex. A" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" />
          </label>
          <label className="text-sm font-medium text-slate-700">Îlot
            <input value={ilot} onChange={e => { setIlot(e.target.value); setSearched(false); }} placeholder="Ex. 125" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5" />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button disabled={!surface} onClick={searchParcel} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            <Search size={16} /> Rechercher / Zoom
          </button>
          <button disabled={!surface} onClick={addParcel} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            <Plus size={16} /> Ajouter à la carte
          </button>
          {surface !== null && <div className="ml-auto rounded-lg bg-slate-50 border px-4 py-2.5 text-sm"><span className="text-slate-500">Surface :</span> <strong>{surface.toLocaleString('fr-FR')} m²</strong></div>}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="h-[520px] relative bg-slate-100 overflow-hidden">
          <div className="absolute inset-0 opacity-60" style={{ backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="absolute top-4 left-4 bg-white/95 border rounded-lg px-3 py-2 text-xs text-slate-600 shadow-sm flex items-center gap-2"><MapPinned size={15} /> Carte cadastrale</div>
          {(searched || selected.length > 0) && <div className="absolute inset-0 flex items-center justify-center"><div className="w-56 h-40 border-4 border-sky-600 bg-sky-200/30 rotate-3 shadow-lg flex items-center justify-center"><span className="bg-white px-2 py-1 rounded text-sm font-bold">{section.toUpperCase()} / {ilot.toUpperCase()}</span></div></div>}
          {!searched && selected.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">Sélectionnez une commune, une section et un îlot</div>}
          {selected.length > 0 && <div className="absolute bottom-4 left-4 bg-white/95 rounded-lg border shadow-sm p-3 text-xs"><strong>{selected.length}</strong> parcelle(s) affichée(s)</div>}
        </div>
      </div>

      {selected.length > 0 && <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold text-slate-800">Parcelles affichées</div>
        <div className="divide-y">{selected.map(p => <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm"><span><strong>{p.commune}</strong> — Section {p.section} — Îlot {p.ilot} — {p.surface.toLocaleString('fr-FR')} m²</span><button onClick={() => setSelected(v => v.filter(x => x.id !== p.id))} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button></div>)}</div>
      </div>}
    </div>
  );
}
