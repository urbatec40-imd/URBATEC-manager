import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Calculator, FileText, ShieldCheck, X } from 'lucide-react';
import { Field, inputCls } from '@/components/Field';
import { buildActivityIndex, suggestActivities, type ActivityCandidate } from '@/services/activiteMatcher';
import { extractRequirementHints, getClassificationProfile, type ClassificationField, type ClassificationResult } from '@/services/environnementClassification';

interface ProfileField { key: string; label: string; type: string; unit: string; required?: boolean; options?: string[] }
interface Condition { condition?: string; texte?: string; regime: string; meta?: string }
interface Row { rubrique: string; famille: string; familleLabel: string; designation: string; conditions?: Condition[]; inputProfile?: ProfileField[]; source: string; sourceUrl: string }
interface Dataset { version: string; date: string; sourceUrl: string; rubriques: Row[]; generated?: boolean }
interface AcceptedRubrique extends ActivityCandidate { id: string; row: Row }

const EMPTY: Dataset = { version: '07-144', date: '19 mai 2007', sourceUrl: 'https://www.joradp.dz/FTP/jo-francais/2007/F2007034.PDF', rubriques: [] };

function clean(v: string) {
  return v.replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è').replace(/Ãª/g, 'ê').replace(/Ã®/g, 'î').replace(/Ã´/g, 'ô').replace(/Ã¹/g, 'ù').replace(/Ã§/g, 'ç').replace(/Ã /g, 'à').replace(/â€™/g, '’').replace(/dâ€™/g, 'd’').replace(/lâ€™/g, 'l’').replace(/\s+/g, ' ').trim();
}

function conditionText(row: Row) {
  return (row.conditions ?? []).map(c => `${c.condition ?? ''} ${c.texte ?? ''} ${c.meta ?? ''}`).join(' ');
}

function fieldsFor(row: Row): ClassificationField[] {
  if (row.inputProfile?.length) return row.inputProfile.map(f => ({ key: f.key, label: f.label, unit: f.unit, type: f.type === 'number' ? 'number' : 'text', required: f.required }));
  return getClassificationProfile(row.rubrique, conditionText(row), row.conditions)?.fields ?? [];
}

function classificationFor(row: Row, values: Record<string, string>): ClassificationResult | null {
  const profile = getClassificationProfile(row.rubrique, conditionText(row), row.conditions);
  return profile?.classify(values) ?? null;
}

function docsFor(row: Row, result: ClassificationResult | null) {
  const condition = result ? row.conditions?.find(c => c.regime === result.regime) : undefined;
  const text = `${condition?.condition ?? ''} ${condition?.texte ?? ''} ${condition?.meta ?? ''} ${row.designation}`;
  const hints = extractRequirementHints(text);
  const docs = [
    ...(hints.docs.impact ? ['Étude d’impact'] : []),
    ...(hints.docs.danger ? ['Étude de dangers'] : []),
    ...(hints.docs.notice ? ['Notice d’impact'] : []),
    ...(hints.docs.rapportDangereux ? ['Rapport sur les produits dangereux'] : []),
  ];
  return { docs, rayon: result?.rayon ?? hints.rayon, sourceCondition: condition };
}

export function EnvironnementPageV6({ clientName, dossierNumero, onBack }: { clientName: string; dossierNumero?: string; initialPrestation?: string; onBack: () => void }) {
  const [dataset, setDataset] = useState<Dataset>(EMPTY);
  const [query, setQuery] = useState('');
  const [commune, setCommune] = useState('');
  const [accepted, setAccepted] = useState<AcceptedRubrique[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [results, setResults] = useState<Record<string, ClassificationResult | null>>({});
  const [acceptedClass, setAcceptedClass] = useState<Record<string, boolean>>({});
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetch('/data/nomenclature-07-144.json')
      .then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return (await r.json()) as Dataset; })
      .then(d => setDataset({ ...d, rubriques: (d.rubriques ?? []).map(r => ({ ...r, designation: clean(r.designation), familleLabel: clean(r.familleLabel) })) }))
      .catch(e => setLoadError((e as Error).message));
  }, []);

  const index = useMemo(() => buildActivityIndex(dataset.rubriques), [dataset.rubriques]);
  const suggestions = useMemo(() => query.trim().length >= 2 ? suggestActivities(index, query, 12) : [], [index, query]);

  function acceptRubrique(candidate: ActivityCandidate) {
    const row = dataset.rubriques.find(r => r.rubrique === candidate.rubrique && clean(r.designation) === candidate.designation) ?? dataset.rubriques.find(r => r.rubrique === candidate.rubrique);
    if (!row) return;
    const id = `${row.rubrique}|${row.designation}`;
    if (!accepted.some(a => a.id === id)) setAccepted(prev => [...prev, { ...candidate, id, row }]);
    setSelectedId(id);
    setValues(prev => prev[id] ? prev : { ...prev, [id]: {} });
    setResults(prev => ({ ...prev, [id]: null }));
    setAcceptedClass(prev => ({ ...prev, [id]: false }));
  }

  function removeAccepted(id: string) {
    setAccepted(prev => prev.filter(a => a.id !== id));
    setSelectedId(prev => prev === id ? null : prev);
    setValues(prev => { const n = { ...prev }; delete n[id]; return n; });
    setResults(prev => { const n = { ...prev }; delete n[id]; return n; });
    setAcceptedClass(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  const selected = accepted.find(a => a.id === selectedId) ?? null;
  const selectedFields = selected ? fieldsFor(selected.row) : [];
  const selectedResult = selected ? results[selected.id] ?? null : null;
  const selectedRequirements = selected ? docsFor(selected.row, selectedResult) : null;
  const hasEnoughForCalculation = selected ? selectedFields.every(f => !f.required || String(values[selected.id]?.[f.key] ?? '').trim() !== '') : false;

  function calculateSelected() {
    if (!selected) return;
    const result = classificationFor(selected.row, values[selected.id] ?? {});
    setResults(prev => ({ ...prev, [selected.id]: result }));
    setAcceptedClass(prev => ({ ...prev, [selected.id]: false }));
  }

  function acceptClassification() {
    if (!selected || !selectedResult) return;
    setAcceptedClass(prev => ({ ...prev, [selected.id]: true }));
  }

  function clearQuery() {
    setQuery('');
    setAccepted([]);
    setSelectedId(null);
    setValues({});
    setResults({});
    setAcceptedClass({});
  }

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3"><button onClick={onBack} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"><ArrowLeft size={18}/></button><div><h1 className="text-2xl font-bold text-gray-800">Module Environnement</h1><p className="text-sm text-gray-500">{dossierNumero ?? 'Nouveau projet'}{clientName ? ` — ${clientName}` : ''}</p></div></div>
      <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Rubrique → Classement → Dossier</span>
    </div>

    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <Field label="Description du projet / activité" required>
        <div className="relative"><textarea className={`${inputCls} min-h-[110px] pr-12`} value={query} onChange={e => { const v=e.target.value; setQuery(v); setResults({}); setAcceptedClass({}); if(!v.trim()){setAccepted([]);setSelectedId(null);setValues({});} }} placeholder="Ex. Minoterie-semoulerie de blé, 100 t/j, puissance 180 kW, 3 silos total 14 000 m³..." />{query && <button type="button" onClick={clearQuery} className="absolute top-3 right-3 p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"><X size={16}/></button>}</div>
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"><Field label="Commune"><input className={inputCls} value={commune} onChange={e => setCommune(e.target.value)} /></Field></div>

      {query.trim().length >= 2 && suggestions.length > 0 && <div className="mt-4"><div className="text-xs font-semibold text-gray-500 mb-2">Rubriques / activités suggérées</div><div className="border rounded-lg divide-y max-h-96 overflow-y-auto">{suggestions.map(c => <div key={`${c.rubrique}-${c.designation}`} className="px-4 py-3 flex items-center gap-3"><div className="flex-1"><div className="text-sm font-medium text-gray-800">{c.designation}</div><div className="text-xs text-gray-500 mt-1">{c.familleLabel} · Rubrique {c.rubrique}</div></div><button onClick={() => acceptRubrique(c)} className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"><Check size={14}/> Accepter</button></div>)}</div></div>}
      {query.trim().length >= 2 && suggestions.length === 0 && <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">Aucune proposition suffisamment fiable. Ajoutez un terme décrivant l’activité, le produit, le procédé ou l’installation.</div>}
    </div>

    {accepted.length > 0 && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-gray-800">Rubriques acceptées</h2><span className="text-xs text-gray-500">{accepted.length} rubrique(s)</span></div><div className="space-y-2">{accepted.map(a => <div key={a.id} className={`border rounded-lg p-3 ${selectedId === a.id ? 'border-emerald-400 bg-emerald-50/40' : 'border-gray-200'}`}><div className="flex items-center gap-3"><button onClick={() => setSelectedId(a.id)} className="flex-1 text-left"><div className="font-semibold text-gray-800">Rubrique {a.rubrique}</div><div className="text-sm text-gray-700 mt-1">{a.designation}</div><div className="text-xs text-gray-500 mt-1">{a.familleLabel}</div></button><button onClick={() => removeAccepted(a.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><X size={16}/></button></div></div>)}</div></div>}

    {selected && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><div className="flex items-center gap-2 mb-4"><Calculator size={18} className="text-emerald-600"/><h2 className="font-semibold text-gray-800">Données nécessaires au classement — Rubrique {selected.rubrique}</h2></div><div className="rounded-lg bg-slate-50 border border-slate-200 p-4 mb-4"><div className="font-semibold">{selected.designation}</div><div className="text-xs text-gray-500 mt-1">{selected.familleLabel}</div></div>
      {selectedFields.length === 0 ? <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">La rubrique est acceptée. Les seuils détaillés de cette rubrique doivent encore être structurés dans le catalogue local avant calcul automatique.</div> : <><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{selectedFields.map(f => <div key={f.key}><Field label={`${f.label}${f.unit ? ` (${f.unit})` : ''}`} required={f.required}><input className={inputCls} type={f.type === 'number' ? 'number' : 'text'} min={f.type === 'number' ? '0' : undefined} value={values[selected.id]?.[f.key] ?? ''} onChange={e => { setValues(v => ({ ...v, [selected.id]: { ...(v[selected.id] ?? {}), [f.key]: e.target.value } })); setResults(v => ({ ...v, [selected.id]: null })); setAcceptedClass(v => ({ ...v, [selected.id]: false })); }} /></Field>{f.helper && <div className="mt-1 text-xs text-slate-500">Seuils : {f.helper}</div>}</div>)}</div><button disabled={!hasEnoughForCalculation} onClick={calculateSelected} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold disabled:opacity-40"><Calculator size={16}/> Calculer le classement</button></>}

      {selectedResult && <div className="mt-5 border-t pt-5"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"><Result label="Sous-rubrique" value={selectedResult.code}/><Result label="Régime" value={selectedResult.regime}/><Result label="Catégorie" value={selectedResult.categorie ?? '—'}/><Result label="Rayon" value={selectedResult.rayon ?? '—'}/></div><div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-4"><p className="font-semibold text-emerald-900">{selectedResult.seuil}</p><p className="text-xs text-emerald-700 mt-1">La valeur saisie a été comparée aux seuils structurés de la rubrique.</p></div><button onClick={acceptClassification} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold"><Check size={16}/> Accepter le classement</button></div>}
    </div>}

    {selected && acceptedClass[selected.id] && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><div className="flex items-center gap-2 mb-4"><ShieldCheck size={18} className="text-emerald-600"/><h2 className="font-semibold text-gray-800">Exigences du dossier</h2></div>{selectedRequirements && <><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{['Étude d’impact','Étude de dangers','Notice d’impact','Rapport sur les produits dangereux'].map(name => { const yes = selectedRequirements.docs.includes(name); return <div key={name} className={`rounded-lg border p-3 ${yes ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}><div className="text-xs text-gray-500">{yes ? 'REQUIS' : 'Non identifié'}</div><div className="font-medium text-gray-800">{name}</div></div>})}</div><div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3"><Result label="Régime" value={selectedResult?.regime ?? '—'}/><Result label="Rayon d’affichage" value={selectedRequirements.rayon ?? '—'}/></div></>}</div>}

    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5"><div className="flex items-center gap-2"><FileText size={17}/><h2 className="font-semibold">Documents environnementaux</h2></div><p className="text-xs text-gray-500 mt-1">Ils seront déterminés après acceptation de la rubrique et du classement.</p></div>
  </div>;
}

function Result({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-gray-200 bg-gray-50 p-3"><div className="text-xs text-gray-500">{label}</div><div className="font-semibold text-gray-800 mt-1">{value}</div></div>;
}
