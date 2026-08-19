import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calculator, FileText, SearchCheck, X } from 'lucide-react';
import { Field, inputCls } from '@/components/Field';
import { buildActivityIndex, suggestActivities, type ActivityCandidate } from '@/services/activiteMatcher';

interface ProfileField { key: string; label: string; type: string; unit: string; required?: boolean; options?: string[] }
interface Row { rubrique: string; famille: string; familleLabel: string; designation: string; conditions?: { condition?: string; texte?: string; regime: string; meta?: string }[]; inputProfile?: ProfileField[]; source: string; sourceUrl: string }
interface Dataset { version: string; date: string; sourceUrl: string; rubriques: Row[]; generated?: boolean }
interface ComponentMatch extends ActivityCandidate { id: string; row: Row }

const EMPTY: Dataset = { version: '07-144', date: '19 mai 2007', sourceUrl: 'https://www.joradp.dz/FTP/jo-francais/2007/F2007034.PDF', rubriques: [] };

function cleanText(v: string) {
  return v.replace(/Ã©/g,'é').replace(/Ã¨/g,'è').replace(/Ãª/g,'ê').replace(/Ã®/g,'î').replace(/Ã´/g,'ô').replace(/Ã¹/g,'ù').replace(/Ã§/g,'ç').replace(/Ã /g,'à').replace(/â€™/g,'’').replace(/dâ€™/g,'d’').replace(/lâ€™/g,'l’').replace(/\s+/g,' ').trim();
}

export function EnvironnementPageV5({ clientName, dossierNumero, initialPrestation, onBack }: { clientName: string; dossierNumero?: string; initialPrestation?: string; onBack: () => void }) {
  const [dataset, setDataset] = useState<Dataset>(EMPTY);
  const [query, setQuery] = useState(initialPrestation ?? '');
  const [commune, setCommune] = useState('');
  const [components, setComponents] = useState<ComponentMatch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, Record<string,string>>>({});
  const [analysed, setAnalysed] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetch('/data/nomenclature-07-144.json')
      .then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return (await r.json()) as Dataset; })
      .then(d => setDataset({ ...d, rubriques: (d.rubriques ?? []).map(r => ({ ...r, designation: cleanText(r.designation), familleLabel: cleanText(r.familleLabel) })) }))
      .catch(e => setLoadError((e as Error).message));
  }, []);

  const index = useMemo(() => buildActivityIndex(dataset.rubriques), [dataset.rubriques]);
  const suggestions = useMemo(() => query.trim() ? suggestActivities(index, query, 12) : [], [index, query]);

  function addSuggestion(candidate: ActivityCandidate) {
    const row = dataset.rubriques.find(r => r.rubrique === candidate.rubrique && cleanText(r.designation) === candidate.designation) ?? dataset.rubriques.find(r => r.rubrique === candidate.rubrique);
    if (!row) return;
    const id = `${row.rubrique}|${row.designation}`;
    setComponents(prev => prev.some(x => x.id === id) ? prev : [...prev, { ...candidate, id, row }]);
    setSelectedId(id);
    setValues(prev => prev[id] ? prev : { ...prev, [id]: Object.fromEntries((row.inputProfile ?? []).map(f => [f.key, ''])) });
    setAnalysed(false);
  }

  function removeComponent(id: string) {
    setComponents(prev => prev.filter(c => c.id !== id));
    setSelectedId(prev => prev === id ? null : prev);
    setValues(prev => { const next = { ...prev }; delete next[id]; return next; });
    setAnalysed(false);
  }

  const selected = components.find(c => c.id === selectedId) ?? null;

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"><ArrowLeft size={18} /></button>
        <div><h1 className="text-2xl font-bold text-gray-800">Module Environnement</h1><p className="text-sm text-gray-500">{dossierNumero ?? 'Nouveau projet'}{clientName ? ` — ${clientName}` : ''}</p></div>
      </div>
      <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Analyse multi-rubriques</span>
    </div>

    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <Field label="Description du projet / activité" required>
        <textarea className={`${inputCls} min-h-[110px]`} value={query} onChange={e => { setQuery(e.target.value); setAnalysed(false); }} placeholder="Ex. Minoterie-semoulerie de blé, 100 t/j, puissance 180 kW, 3 silos total 14 000 m³..." />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"><Field label="Commune"><input className={inputCls} value={commune} onChange={e => setCommune(e.target.value)} /></Field></div>

      {suggestions.length > 0 && <div className="mt-4"><div className="text-xs font-semibold text-gray-500 mb-2">Rubriques / activités suggérées</div><div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
        {suggestions.map(c => <button key={`${c.rubrique}-${c.designation}`} className="w-full text-left px-3 py-3 hover:bg-emerald-50" onClick={() => addSuggestion(c)}><div className="text-sm font-medium">{c.designation}</div><div className="text-xs text-gray-500 mt-1">{c.familleLabel} · Rubrique {c.rubrique}</div></button>)}
      </div></div>}
      {query.trim() && !suggestions.length && <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">Aucune proposition suffisamment fiable. Ajoutez un mot-clé plus descriptif.</div>}
    </div>

    {components.length > 0 && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-gray-800">Composants réglementaires retenus</h2><span className="text-xs text-gray-500">{components.length} rubrique(s)</span></div>
      <div className="space-y-3">{components.map(c => <div key={c.id} className={`border rounded-lg p-4 ${selectedId === c.id ? 'border-emerald-400 bg-emerald-50/40' : 'border-gray-200'}`}><div className="flex items-start justify-between gap-3"><button className="text-left flex-1" onClick={() => setSelectedId(c.id)}><div className="font-semibold text-gray-800">{c.designation}</div><div className="text-xs text-gray-500 mt-1">{c.familleLabel} · Rubrique {c.rubrique}</div></button><button onClick={() => removeComponent(c.id)} className="p-1.5 rounded text-gray-400 hover:bg-red-50 hover:text-red-600"><X size={16}/></button></div></div>)}</div>
    </div>}

    {selected && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><h2 className="font-semibold text-gray-800 mb-4">Données requises — Rubrique {selected.rubrique}</h2><div className="rounded-lg bg-slate-50 border border-slate-200 p-4 mb-4"><div className="font-semibold">{selected.designation}</div><div className="text-xs text-gray-500 mt-1">Famille : {selected.familleLabel}</div></div>
      {(selected.row.inputProfile ?? []).length ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{(selected.row.inputProfile ?? []).map(f => <Field key={f.key} label={`${f.label}${f.unit ? ` (${f.unit})` : ''}`} required={f.required}><input className={inputCls} type={f.type === 'number' ? 'number' : 'text'} value={values[selected.id]?.[f.key] ?? ''} onChange={e => setValues(v => ({ ...v, [selected.id]: { ...(v[selected.id] ?? {}), [f.key]: e.target.value } }))} /></Field>)}</div> : <p className="text-sm text-gray-500">Aucun champ automatique disponible pour cette rubrique ; les conditions officielles seront affichées après classement.</p>}
    </div>}

    {components.length > 0 && <button onClick={() => setAnalysed(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"><Calculator size={16}/> Analyser le projet</button>}

    {analysed && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><h2 className="font-semibold text-gray-800 mb-4">Synthèse réglementaire</h2><div className="space-y-3">{components.map(c => <div key={c.id} className="border rounded-lg p-3"><div className="font-semibold">Rubrique {c.rubrique}</div><div className="text-sm mt-1">{c.designation}</div><div className="text-xs text-gray-500 mt-1">{c.familleLabel}</div><div className="mt-3 text-xs bg-amber-50 border border-amber-200 rounded p-3">Le classement définitif doit être calculé à partir des seuils/conditions de cette rubrique et des textes réglementaires applicables.</div></div>)}</div></div>}

    {loadError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">Impossible de charger la nomenclature locale : {loadError}</div>}

    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5"><div className="flex items-center gap-2 mb-2"><FileText size={17}/><h2 className="font-semibold">Documents environnementaux</h2></div><p className="text-xs text-gray-500">Ils seront déterminés à partir de l’ensemble des rubriques et classements du projet.</p></div>
  </div>;
}
