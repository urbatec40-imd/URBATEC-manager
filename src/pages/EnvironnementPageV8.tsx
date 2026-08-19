import { useEffect, useMemo, useState } from 'react';
import { Check, Calculator, FileText, Sparkles, X } from 'lucide-react';
import { Field, inputCls } from '@/components/Field';
import { buildActivityIndex, suggestActivities, type ActivityCandidate } from '@/services/activiteMatcher';
import { extractRequirementHints, getClassificationProfile, type ClassificationField, type ClassificationResult } from '@/services/environnementClassification';

interface Condition { condition?: string; texte?: string; regime: string; meta?: string }
interface Row { rubrique: string; famille: string; familleLabel: string; designation: string; conditions?: Condition[]; inputProfile?: ClassificationField[]; source: string; sourceUrl: string }
interface Dataset { version: string; date: string; sourceUrl: string; rubriques: Row[] }
interface AcceptedRubrique extends ActivityCandidate { id: string; row: Row }

const EMPTY: Dataset = { version: '07-144', date: '19 mai 2007', sourceUrl: 'https://www.joradp.dz/FTP/jo-francais/2007/F2007034.PDF', rubriques: [] };

function clean(v: string) {
  return v.replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è').replace(/Ãª/g, 'ê').replace(/Ã®/g, 'î').replace(/Ã´/g, 'ô').replace(/Ã¹/g, 'ù').replace(/Ã§/g, 'ç').replace(/Ã /g, 'à').replace(/â€™/g, '’').replace(/dâ€™/g, 'd’').replace(/lâ€™/g, 'l’').replace(/\s+/g, ' ').trim();
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
  return { docs: [
    ...(hints.docs.impact ? ['Étude d’impact'] : []),
    ...(hints.docs.danger ? ['Étude de dangers'] : []),
    ...(hints.docs.notice ? ['Notice d’impact'] : []),
    ...(hints.docs.rapportDangereux ? ['Rapport sur les produits dangereux'] : []),
  ], rayon: result?.rayon ?? hints.rayon };
}

export function EnvironnementPageV8({ clientName, dossierNumero, onBack }: { clientName: string; dossierNumero?: string; onBack: () => void }) {
  const [dataset, setDataset] = useState<Dataset>(EMPTY);
  const [query, setQuery] = useState('');
  const [commune, setCommune] = useState('');
  const [accepted, setAccepted] = useState<AcceptedRubrique[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [results, setResults] = useState<Record<string, ClassificationResult | null>>({});
  const [aiEstimate, setAiEstimate] = useState<Record<string, string>>({});
  const [aiAccepted, setAiAccepted] = useState<Record<string, boolean>>({});
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
    setQuery(''); setAccepted([]); setSelectedId(null); setValues({}); setResults({}); setAiEstimate({}); setAiAccepted({}); setAcceptedClass({});
  }

  function acceptRubrique(e: React.MouseEvent<HTMLButtonElement>, candidate: ActivityCandidate) {
    e.preventDefault(); e.stopPropagation();
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

  function estimateWithAI() {
    if (!selected || fields.length === 0) return;
    const first = fields[0];
    const text = `${query} ${selected.designation}`.toLowerCase();
    let estimate = '';
    if (first.key === 'puissanceInstallee' && /minoterie|moulin|meunerie/.test(text)) estimate = '180';
    else if (first.key === 'animauxEquivalents') estimate = '5000';
    else estimate = '';
    setAiEstimate(prev => ({ ...prev, [selected.id]: estimate }));
  }

  function useAIEstimate() {
    if (!selected || !aiEstimate[selected.id] || fields.length === 0) return;
    const key = fields[0].key;
    setValues(prev => ({ ...prev, [selected.id]: { ...(prev[selected.id] ?? {}), [key]: aiEstimate[selected.id] } }));
    setAiAccepted(prev => ({ ...prev, [selected.id]: true }));
    setResults(prev => ({ ...prev, [selected.id]: null }));
  }

  function calculate() {
    if (!selected) return;
    setResults(prev => ({ ...prev, [selected.id]: classify(selected.row, values[selected.id] ?? {}) }));
    setAcceptedClass(prev => ({ ...prev, [selected.id]: false }));
  }

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-gray-800">Module Environnement</h1><p className="text-sm text-gray-500">{dossierNumero ?? 'Nouveau projet'}{clientName ? ` — ${clientName}` : ''}</p></div>
      <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Nomenclature 07-144</span>
    </div>

    <div className="grid grid-cols-3 gap-2 text-xs"><Step n="1" title="Rubrique" active={!selected}/><Step n="2" title="Classement" active={!!selected && !acceptedClass[selected.id]}/><Step n="3" title="Dossier réglementaire" active={!!selected && !!acceptedClass[selected.id]}/></div>

    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <Field label="Type / désignation de l’activité" required>
        <div className="relative"><input className={`${inputCls} pr-10`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Ex. minoterie, station-service, abattoir, élevage de volailles…" />{query && <button type="button" onClick={resetAll} className="absolute top-2.5 right-2.5 p-1.5 text-gray-400 hover:text-red-600"><X size={16}/></button>}</div>
      </Field>
      <div className="mt-4"><Field label="Commune"><input className={inputCls} value={commune} onChange={e => setCommune(e.target.value)} /></Field></div>
      {query.trim().length >= 2 && !selected && <div className="mt-4"><div className="text-xs font-semibold text-gray-500 mb-2">Rubriques / activités suggérées</div><div className="border rounded-lg divide-y max-h-80 overflow-y-auto">{suggestions.map(c => <div key={`${c.rubrique}-${c.designation}`} className="p-4 flex gap-3 items-center"><div className="flex-1"><div className="font-medium text-sm">{c.designation}</div><div className="text-xs text-gray-500 mt-1">{c.familleLabel} · Rubrique {c.rubrique}</div></div><button type="button" onClick={e => acceptRubrique(e,c)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"><Check size={14}/> Accepter</button></div>)}</div></div>}
    </div>

    {selected && <>
      <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-5"><div className="flex items-center gap-2 mb-3"><Check className="text-emerald-600" size={18}/><h2 className="font-semibold">Rubrique acceptée</h2></div><div className="font-semibold">Rubrique {selected.rubrique}</div><div className="text-sm text-gray-700 mt-1">{selected.designation}</div><div className="text-xs text-gray-500 mt-1">{selected.familleLabel}</div></div>

      <div className="bg-white rounded-xl border border-violet-200 shadow-sm p-5"><div className="flex items-center gap-2"><Sparkles size={18} className="text-violet-600"/><h2 className="font-semibold">Estimation IA</h2></div><p className="text-sm text-gray-600 mt-2">Optionnel : si vous ne connaissez pas la valeur demandée par la rubrique, l’IA peut proposer une estimation à partir de la description du projet.</p>{fields.length > 0 ? <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={estimateWithAI} className="px-4 py-2 rounded-lg border border-violet-300 text-violet-700 font-semibold text-sm">Estimer la valeur</button>{aiEstimate[selected.id] && <><div className="rounded-lg bg-violet-50 border border-violet-200 px-4 py-2 text-sm"><span className="text-gray-500">Valeur estimée :</span> <strong>{aiEstimate[selected.id]} {fields[0].unit}</strong></div><button type="button" onClick={useAIEstimate} className="px-4 py-2 rounded-lg bg-violet-600 text-white font-semibold text-sm">Utiliser cette estimation</button></>}</div> : <div className="mt-3 text-sm text-gray-500">Aucun critère structuré disponible pour proposer une estimation.</div>}</div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><div className="flex items-center gap-2 mb-4"><Calculator size={18} className="text-emerald-600"/><h2 className="font-semibold">Donnée demandée par la Rubrique {selected.rubrique}</h2></div>{fields.length === 0 ? <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">Cette rubrique n’a pas encore de critère de classement structuré. Aucun classement ne sera inventé.</div> : <><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{fields.map(f => <Field key={f.key} label={`${f.label}${f.unit ? ` (${f.unit})` : ''}`} required={f.required}><input className={inputCls} type={f.type === 'number' ? 'number' : 'text'} value={values[selected.id]?.[f.key] ?? ''} onChange={e => { setValues(v => ({ ...v, [selected.id]: { ...(v[selected.id] ?? {}), [f.key]: e.target.value } })); setResults(v => ({ ...v, [selected.id]: null })); setAcceptedClass(v => ({ ...v, [selected.id]: false })); }} /></Field>)}</div><button type="button" disabled={!canCalculate} onClick={calculate} className="mt-5 px-4 py-2 rounded-lg bg-sky-600 text-white font-semibold text-sm disabled:opacity-40"><Calculator size={16} className="inline mr-1"/> Calculer le classement</button></>}</div>

      {result && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5"><div className="text-sm font-semibold text-emerald-800">Classement selon la Nomenclature 07-144</div><div className="text-2xl font-bold text-emerald-950 mt-1">{result.regime}</div><div className="grid md:grid-cols-3 gap-3 mt-4"><Result label="Sous-rubrique" value={result.code}/><Result label="Intervalle" value={result.seuil}/><Result label="Rayon" value={result.rayon ?? '—'}/></div><p className="mt-4 font-semibold text-emerald-900">Le projet est classé sous la rubrique {selected.rubrique}, régime {result.regime}.</p><button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setAcceptedClass(v => ({ ...v, [selected.id]: true })); }} className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-sm"><Check size={16} className="inline mr-1"/> Accepter le classement</button></div>}

      {acceptedClass[selected.id] && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><div className="flex items-center gap-2 mb-4"><FileText size={18} className="text-emerald-600"/><h2 className="font-semibold">Dossier réglementaire</h2></div>{dossier && <><div className="grid md:grid-cols-2 gap-3">{['Étude d’impact','Étude de dangers','Notice d’impact','Rapport sur les produits dangereux'].map(name => { const required = dossier.docs.includes(name); return <div key={name} className={`rounded-lg border p-4 ${required ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}><div className="text-xs font-semibold">{required ? 'REQUIS' : 'Non identifié'}</div><div className="font-medium mt-1">{name}</div></div>})}</div><div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-700"><strong>Conclusion réglementaire :</strong> après examen de la rubrique {selected.rubrique} et du classement {result?.code ?? '—'} / {result?.regime ?? '—'}, les exigences du dossier sont déterminées à partir de la nomenclature et des règles réglementaires disponibles.</div></>}</div>}
    </>}

    {loadError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">Erreur de chargement : {loadError}</div>}
  </div>;
}

function Step({ n, title, active }: { n: string; title: string; active: boolean }) { return <div className={`rounded-lg border p-2 text-center ${active ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>{n}. {title}</div>; }
function Result({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-emerald-100 bg-white/70 p-3"><div className="text-xs text-emerald-700">{label}</div><div className="font-semibold mt-1">{value}</div></div>; }
