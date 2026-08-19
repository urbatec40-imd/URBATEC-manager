import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Calculator, FileText, Sparkles, X } from 'lucide-react';
import { Field, inputCls } from '@/components/Field';
import { buildActivityIndex, suggestActivities, type ActivityCandidate } from '@/services/activiteMatcher';
import { extractRequirementHints, getClassificationProfile, type ClassificationField, type ClassificationResult } from '@/services/environnementClassification';

interface Condition { condition?: string; texte?: string; regime: string; meta?: string }
interface Row { rubrique: string; famille: string; familleLabel: string; designation: string; conditions?: Condition[]; inputProfile?: ClassificationField[]; source: string; sourceUrl: string }
interface Dataset { version: string; date: string; sourceUrl: string; rubriques: Row[] }
interface AcceptedRubrique extends ActivityCandidate { id: string; row: Row }

const EMPTY: Dataset = { version: '07-144', date: '19 mai 2007', sourceUrl: 'https://www.joradp.dz/FTP/jo-francais/2007/F2007034.PDF', rubriques: [] };

function clean(v: string) {
  return v
    .replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è').replace(/Ãª/g, 'ê').replace(/Ã®/g, 'î')
    .replace(/Ã´/g, 'ô').replace(/Ã¹/g, 'ù').replace(/Ã§/g, 'ç').replace(/Ã /g, 'à')
    .replace(/â€™/g, '’').replace(/dâ€™/g, 'd’').replace(/lâ€™/g, 'l’')
    .replace(/\s+/g, ' ').trim();
}

function conditionText(row: Row) {
  return (row.conditions ?? []).map(c => `${c.condition ?? ''} ${c.texte ?? ''} ${c.meta ?? ''}`).join(' ');
}

function fieldsFor(row: Row): ClassificationField[] {
  if (row.inputProfile?.length) return row.inputProfile;
  return getClassificationProfile(row.rubrique, conditionText(row), row.conditions)?.fields ?? [];
}

function classify(row: Row, values: Record<string, string>): ClassificationResult | null {
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
  return { docs, rayon: result?.rayon ?? hints.rayon };
}

export function EnvironnementPageV7({ clientName, dossierNumero, onBack }: { clientName: string; dossierNumero?: string; onBack: () => void }) {
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
  const selected = accepted.find(a => a.id === selectedId) ?? null;
  const fields = selected ? fieldsFor(selected.row) : [];
  const result = selected ? results[selected.id] ?? null : null;
  const dossier = selected ? docsFor(selected.row, result) : null;
  const canCalculate = !!selected && fields.length > 0 && fields.every(f => !f.required || String(values[selected.id]?.[f.key] ?? '').trim() !== '');

  function resetAll() {
    setQuery(''); setAccepted([]); setSelectedId(null); setValues({}); setResults({}); setAcceptedClass({});
  }

  function acceptRubrique(candidate: ActivityCandidate) {
    const row = dataset.rubriques.find(r => r.rubrique === candidate.rubrique && clean(r.designation) === candidate.designation)
      ?? dataset.rubriques.find(r => r.rubrique === candidate.rubrique);
    if (!row) return;
    const id = `${row.rubrique}|${row.designation}`;
    const acceptedCandidate = { ...candidate, id, row };
    setAccepted(prev => prev.some(a => a.id === id) ? prev : [...prev, acceptedCandidate]);
    setSelectedId(id);
    setValues(prev => ({ ...prev, [id]: prev[id] ?? {} }));
    setResults(prev => ({ ...prev, [id]: null }));
    setAcceptedClass(prev => ({ ...prev, [id]: false }));
  }

  function calculate() {
    if (!selected) return;
    setResults(prev => ({ ...prev, [selected.id]: classify(selected.row, values[selected.id] ?? {}) }));
    setAcceptedClass(prev => ({ ...prev, [selected.id]: false }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"><ArrowLeft size={18}/></button>
          <div><h1 className="text-2xl font-bold text-gray-800">Module Environnement</h1><p className="text-sm text-gray-500">{dossierNumero ?? 'Nouveau projet'}{clientName ? ` — ${clientName}` : ''}</p></div>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Nomenclature 07-144</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        {['1. Rubrique','2. Classement','3. Dossier réglementaire'].map((step, i) => {
          const active = i === 0 ? accepted.length === 0 : i === 1 ? (accepted.length > 0 && !acceptedClass[selectedId ?? '']) : !!selected && !!acceptedClass[selected.id];
          return <div key={step} className={`rounded-lg border p-2 text-center ${active ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>{step}</div>;
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <Field label="Description du projet / activité" required>
          <div className="relative">
            <textarea className={`${inputCls} min-h-[110px] pr-12`} value={query} onChange={e => { const v=e.target.value; setQuery(v); if (!v.trim()) resetAll(); }} placeholder="Ex. Minoterie-semoulerie de blé, station-service, abattoir, élevage de volailles…" />
            {query && <button type="button" onClick={resetAll} className="absolute top-3 right-3 p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"><X size={16}/></button>}
          </div>
        </Field>
        <div className="mt-4"><Field label="Commune"><input className={inputCls} value={commune} onChange={e => setCommune(e.target.value)} /></Field></div>

        {query.trim().length >= 2 && suggestions.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-500 mb-2">Rubriques / activités suggérées</div>
            <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
              {suggestions.map(c => <div key={`${c.rubrique}-${c.designation}`} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1"><div className="text-sm font-medium text-gray-800">{c.designation}</div><div className="text-xs text-gray-500 mt-1">{c.familleLabel} · Rubrique {c.rubrique}</div></div>
                <button type="button" onClick={() => acceptRubrique(c)} className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"><Check size={14}/> Accepter</button>
              </div>)}
            </div>
          </div>
        )}
        {query.trim().length >= 2 && suggestions.length === 0 && <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">Aucune proposition suffisamment fiable. Essayez une désignation plus descriptive.</div>}
      </div>

      {accepted.length > 0 && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-gray-800">Rubriques acceptées</h2><span className="text-xs text-gray-500">{accepted.length} rubrique(s)</span></div>
        <div className="space-y-2">{accepted.map(a => <div key={a.id} className={`border rounded-lg p-3 ${selectedId === a.id ? 'border-emerald-400 bg-emerald-50/40' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3"><button type="button" onClick={() => setSelectedId(a.id)} className="flex-1 text-left"><div className="font-semibold text-gray-800">Rubrique {a.rubrique}</div><div className="text-sm text-gray-700 mt-1">{a.designation}</div><div className="text-xs text-gray-500 mt-1">{a.familleLabel}</div></button><button type="button" onClick={() => setAccepted(prev => prev.filter(x => x.id !== a.id))} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><X size={16}/></button></div>
        </div>)}</div>
      </div>}

      {selected && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4"><Calculator size={18} className="text-emerald-600"/><h2 className="font-semibold text-gray-800">Données exigées par la Rubrique {selected.rubrique}</h2></div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 mb-4"><div className="font-semibold">{selected.designation}</div><div className="text-xs text-gray-500 mt-1">Seules les données prévues par cette rubrique doivent être renseignées.</div></div>
        {fields.length === 0 ? <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">Aucun critère de classement structuré n’est encore disponible pour cette rubrique. Le classement ne sera pas inventé.</div> : <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{fields.map(f => <div key={f.key}><Field label={`${f.label}${f.unit ? ` (${f.unit})` : ''}`} required={f.required}><input className={inputCls} type={f.type === 'number' ? 'number' : 'text'} min={f.type === 'number' ? '0' : undefined} value={values[selected.id]?.[f.key] ?? ''} onChange={e => { setValues(v => ({ ...v, [selected.id]: { ...(v[selected.id] ?? {}), [f.key]: e.target.value } })); setResults(v => ({ ...v, [selected.id]: null })); setAcceptedClass(v => ({ ...v, [selected.id]: false })); }} /></Field>{f.helper && <div className="mt-1 text-xs text-slate-500">Domaines : {f.helper}</div>}</div>)}</div>
          <button type="button" disabled={!canCalculate} onClick={calculate} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold disabled:opacity-40"><Calculator size={16}/> Calculer le classement</button>
        </>}

        {result && <div className="mt-5 border-t pt-5">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="text-sm font-semibold text-emerald-800">Résultat du classement</div>
            <div className="text-2xl font-bold text-emerald-950 mt-1">{result.regime}</div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3"><div><div className="text-xs text-emerald-700">Sous-rubrique</div><div className="font-semibold">{result.code}</div></div><div><div className="text-xs text-emerald-700">Intervalle</div><div className="font-semibold">{result.seuil}</div></div><div><div className="text-xs text-emerald-700">Rayon</div><div className="font-semibold">{result.rayon ?? '—'}</div></div></div>
            <div className="mt-4 font-semibold text-emerald-900">Le projet est classé sous la rubrique {selected.rubrique}, régime {result.regime}.</div>
          </div>
          <button type="button" onClick={() => setAcceptedClass(v => ({ ...v, [selected.id]: true }))} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold"><Check size={16}/> Accepter le classement</button>
        </div>}
      </div>}

      {selected && acceptedClass[selected.id] && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4"><FileText size={18} className="text-emerald-600"/><h2 className="font-semibold text-gray-800">Dossier réglementaire</h2></div>
        {dossier && <div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{['Étude d’impact','Étude de dangers','Notice d’impact','Rapport sur les produits dangereux'].map(name => { const required = dossier.docs.includes(name); return <div key={name} className={`rounded-lg border p-4 ${required ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}><div className="text-xs font-semibold">{required ? 'REQUIS' : 'Non identifié'}</div><div className="font-medium mt-1">{name}</div></div>})}</div><div className="text-sm text-slate-600">Les pièces sont déterminées à partir du classement retenu et des conditions disponibles dans la nomenclature locale.</div></div>}
      </div>}

      {loadError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">Erreur de chargement : {loadError}</div>}
    </div>
  );
}
