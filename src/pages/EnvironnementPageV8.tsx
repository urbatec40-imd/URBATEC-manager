import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calculator, Check, FileText, X } from 'lucide-react';
import { Field, inputCls } from '@/components/Field';
import { buildActivityIndex, suggestActivities, type ActivityCandidate } from '@/services/activiteMatcher';
import { getClassificationProfile, type ClassificationField, type ClassificationResult } from '@/services/environnementClassification';

interface DecisionRow {
  rubrique: string;
  criterion: string;
  rawCondition: string;
  min?: number | null;
  minInclusive?: boolean;
  max?: number | null;
  maxInclusive?: boolean;
  unit?: string;
  regime: string;
  rayon?: string;
  documents?: { impact?: boolean; danger?: boolean; notice?: boolean; rapportDangereux?: boolean };
  sourcePage?: number;
}
interface Row {
  rubrique: string;
  famille: string;
  familleLabel: string;
  designation: string;
  conditions?: Array<{ condition?: string; texte?: string; regime: string; meta?: string }>;
  inputProfile?: ClassificationField[];
  decisionRows?: DecisionRow[];
  source: string;
  sourceUrl: string;
}
interface Dataset { version: string; date: string; sourceUrl: string; rubriques: Row[] }
interface AcceptedRubrique extends ActivityCandidate { id: string; row: Row }

const EMPTY: Dataset = { version: '07-144', date: '19 mai 2007', sourceUrl: 'https://www.joradp.dz/FTP/jo-francais/2007/F2007034.PDF', rubriques: [] };

function clean(v: string) {
  return v.replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è').replace(/Ãª/g, 'ê').replace(/Ã®/g, 'î').replace(/Ã´/g, 'ô').replace(/Ã¹/g, 'ù').replace(/Ã§/g, 'ç').replace(/Ã /g, 'à').replace(/â€™/g, '’').replace(/dâ€™/g, 'd’').replace(/lâ€™/g, 'l’').replace(/\s+/g, ' ').trim();
}

function regimeLabel(regime: string) {
  return ({ AM: 'AM — Autorisation ministérielle', AW: 'AW — Autorisation du Wali', APAPC: 'APAPC — Autorisation du président de l’APC', D: 'D — Déclaration auprès du président de l’APC' } as Record<string, string>)[regime] ?? regime;
}
function categoryLabel(regime: string) { return ({ AM: '1re catégorie', AW: '2e catégorie', APAPC: '3e catégorie', D: '4e catégorie' } as Record<string, string>)[regime] ?? ''; }
function normalizeValue(raw: string) { const n = Number(String(raw).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; }
function matches(row: DecisionRow, value: number) {
  const minOk = row.min == null ? true : row.minInclusive === false ? value > row.min : value >= row.min;
  const maxOk = row.max == null ? true : row.maxInclusive === false ? value < row.max : value <= row.max;
  return minOk && maxOk;
}
function rangeLabel(row: DecisionRow) {
  const u = row.unit ? ` ${row.unit}` : '';
  if (row.min != null && row.max != null) return `${row.minInclusive === false ? '>' : '≥'} ${row.min}${u} et ${row.maxInclusive === false ? '<' : '≤'} ${row.max}${u}`;
  if (row.min != null) return `${row.minInclusive === false ? '>' : '≥'} ${row.min}${u}`;
  if (row.max != null) return `${row.maxInclusive === false ? '<' : '≤'} ${row.max}${u}`;
  return row.rawCondition;
}

export function EnvironnementPageV8({ clientName, dossierNumero, onBack }: { clientName: string; dossierNumero?: string; onBack: () => void }) {
  const [dataset, setDataset] = useState<Dataset>(EMPTY);
  const [query, setQuery] = useState('');
  const [accepted, setAccepted] = useState<AcceptedRubrique[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [criterion, setCriterion] = useState('');
  const [value, setValue] = useState('');
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [acceptedClass, setAcceptedClass] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/data/nomenclature-07-144.json')
      .then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return (await r.json()) as Dataset; })
      .then(d => setDataset({ ...d, rubriques: (d.rubriques ?? []).map(r => ({ ...r, designation: clean(r.designation), familleLabel: clean(r.familleLabel) })) }))
      .catch(e => setError((e as Error).message));
  }, []);

  const index = useMemo(() => buildActivityIndex(dataset.rubriques), [dataset.rubriques]);
  const suggestions = useMemo(() => query.trim().length >= 2 && !selectedId ? suggestActivities(index, query, 12) : [], [index, query, selectedId]);
  const selected = accepted.find(a => a.id === selectedId) ?? null;
  const decisionRows = selected?.row.decisionRows ?? [];
  const criteria = useMemo(() => Array.from(new Set(decisionRows.map(r => `${r.criterion}|||${r.unit ?? ''}`))).map(x => { const [label, unit] = x.split('|||'); return { key: x, label, unit }; }), [decisionRows]);
  const selectedCriteriaRows = criterion ? decisionRows.filter(r => `${r.criterion}|||${r.unit ?? ''}` === criterion) : decisionRows;
  const fallbackFields = selected && decisionRows.length === 0 ? getClassificationProfile(selected.row.rubrique, (selected.row.conditions ?? []).map(c => `${c.condition ?? ''} ${c.texte ?? ''} ${c.meta ?? ''}`).join(' '), selected.row.conditions)?.fields ?? [] : [];

  function reset() {
    setQuery(''); setAccepted([]); setSelectedId(null); setCriterion(''); setValue(''); setResult(null); setAcceptedClass(false); setError('');
  }
  function acceptRubrique(candidate: ActivityCandidate) {
    const row = dataset.rubriques.find(r => r.rubrique === candidate.rubrique && clean(r.designation) === candidate.designation) ?? dataset.rubriques.find(r => r.rubrique === candidate.rubrique);
    if (!row) return;
    const id = `${row.rubrique}|${row.designation}`;
    setAccepted([{ ...candidate, id, row }]); setSelectedId(id); setCriterion(''); setValue(''); setResult(null); setAcceptedClass(false);
  }
  function calculate() {
    if (!selected) return;
    if (decisionRows.length > 0) {
      const n = normalizeValue(value);
      if (n == null) { setResult(null); return; }
      const matched = selectedCriteriaRows.find(r => matches(r, n));
      if (!matched) { setResult(null); return; }
      setResult({ code: `${selected.rubrique}-${matched.regime}-${matched.sourcePage ?? ''}`.replace(/-$/, ''), regime: matched.regime, categorie: categoryLabel(matched.regime), seuil: rangeLabel(matched), rayon: matched.rayon, documents: matched.documents } as ClassificationResult & { documents?: DecisionRow['documents'] });
      setAcceptedClass(false);
      return;
    }
    if (fallbackFields.length > 0) {
      const profile = getClassificationProfile(selected.row.rubrique, (selected.row.conditions ?? []).map(c => `${c.condition ?? ''} ${c.texte ?? ''} ${c.meta ?? ''}`).join(' '), selected.row.conditions);
      setResult(profile?.classify({ [fallbackFields[0].key]: value }) ?? null);
      setAcceptedClass(false);
    }
  }

  const docs = (result as (ClassificationResult & { documents?: DecisionRow['documents'] }) | null)?.documents;
  const canCalculate = !!selected && !!value.trim();

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3"><button type="button" onClick={onBack} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"><ArrowLeft size={18}/></button><div><h1 className="text-2xl font-bold text-gray-800">Module Environnement</h1><p className="text-sm text-gray-500">{dossierNumero ?? 'Nouveau projet'}{clientName ? ` — ${clientName}` : ''}</p></div></div>
      <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Nomenclature 07-144</span>
    </div>

    <div className="grid grid-cols-3 gap-2 text-xs"><Step n="1" title="Rubrique" active={!selected}/><Step n="2" title="Classement" active={!!selected && !acceptedClass}/><Step n="3" title="Dossier réglementaire" active={!!selected && acceptedClass}/></div>

    {!selected && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><Field label="Type / désignation de l’activité" required><div className="relative"><input className={`${inputCls} pr-10`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Ex. minoterie, station-service, abattoir, élevage de volailles…" />{query && <button type="button" onClick={reset} className="absolute top-2.5 right-2.5 p-1.5 text-gray-400 hover:text-red-600"><X size={16}/></button>}</div></Field>{query.trim().length >= 2 && <div className="mt-4"><div className="text-xs font-semibold text-gray-500 mb-2">Rubriques / activités suggérées</div>{suggestions.length > 0 ? <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">{suggestions.map(c => <div key={`${c.rubrique}-${c.designation}`} className="p-4 flex items-center gap-3"><div className="flex-1"><div className="font-medium text-sm">{c.designation}</div><div className="text-xs text-gray-500 mt-1">{c.familleLabel} · Rubrique {c.rubrique}</div></div><button type="button" onClick={() => acceptRubrique(c)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"><Check size={14}/> Accepter</button></div>)}</div> : <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">Aucune proposition suffisamment fiable.</div>}</div>}</div>}

    {selected && <>
      <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-5"><div className="text-sm font-semibold text-emerald-800">Rubrique acceptée</div><div className="text-xl font-bold mt-1">{selected.rubrique}</div><div className="text-sm text-gray-700 mt-1">{selected.designation}</div><div className="text-xs text-gray-500 mt-1">{selected.familleLabel}</div></div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><div className="flex items-center gap-2 mb-4"><Calculator size={18} className="text-emerald-600"/><h2 className="font-semibold">Données de classement</h2></div>{decisionRows.length > 0 ? <><div className="text-sm text-gray-600 mb-3">La donnée demandée est déterminée uniquement à partir de la Rubrique sélectionnée.</div>{criteria.length > 1 && <Field label="Critère"><select className={inputCls} value={criterion} onChange={e => { setCriterion(e.target.value); setValue(''); setResult(null); }}><option value="">Choisir le critère</option>{criteria.map(c => <option key={c.key} value={c.key}>{c.label}{c.unit ? ` (${c.unit})` : ''}</option>)}</select></Field>}<div className="mt-4">{criteria.length <= 1 || criterion ? <Field label={`${(criteria.find(c => c.key === criterion)?.label ?? criteria[0]?.label ?? 'Valeur de classement')}${(criteria.find(c => c.key === criterion)?.unit ?? criteria[0]?.unit) ? ` (${criteria.find(c => c.key === criterion)?.unit ?? criteria[0]?.unit})` : ''}`} required><input className={inputCls} type="number" min="0" value={value} onChange={e => { setValue(e.target.value); setResult(null); setAcceptedClass(false); }} /></Field> : null}</div></> : fallbackFields.length > 0 ? <Field label={`${fallbackFields[0].label}${fallbackFields[0].unit ? ` (${fallbackFields[0].unit})` : ''}`} required><input className={inputCls} type="number" min="0" value={value} onChange={e => { setValue(e.target.value); setResult(null); setAcceptedClass(false); }} /></Field> : <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">Aucune donnée de classement structurée n’est disponible pour cette Rubrique.</div>}<button type="button" disabled={!canCalculate} onClick={calculate} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold disabled:opacity-40"><Calculator size={16}/> Suivant / Calculer le classement</button></div>

      {result && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5"><div className="text-sm font-semibold text-emerald-800">Classement selon la Nomenclature 07-144</div><div className="text-2xl font-bold text-emerald-950 mt-1">{categoryLabel(result.regime)} — {regimeLabel(result.regime)}</div><div className="grid md:grid-cols-4 gap-3 mt-4"><Result label="Rubrique" value={selected.rubrique}/><Result label="Condition retenue" value={result.seuil}/><Result label="Rayon d’affichage" value={result.rayon ?? '—'}/><Result label="Régime" value={result.regime}/></div><button type="button" onClick={() => setAcceptedClass(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold"><Check size={16}/> Accepter le classement</button></div>}

      {acceptedClass && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><div className="flex items-center gap-2 mb-4"><FileText size={18} className="text-emerald-600"/><h2 className="font-semibold">Dossier réglementaire</h2></div><div className="grid md:grid-cols-2 gap-3">{[['Étude d’impact', !!docs?.impact], ['Étude de dangers', !!docs?.danger], ['Notice d’impact', !!docs?.notice], ['Rapport sur les produits dangereux', !!docs?.rapportDangereux]].map(([name, required]) => <div key={String(name)} className={`rounded-lg border p-4 ${required ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}><div className="text-xs font-semibold">{required ? 'REQUIS — X' : 'Non requis'}</div><div className="font-medium mt-1">{String(name)}</div></div>)}</div><div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-700"><strong>Conclusion :</strong> après saisie de la valeur et comparaison avec les intervalles de la rubrique {selected.rubrique}, le régime et les documents sont repris du même ligne de la matrice 07-144.</div></div>}
    </>}

    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">Erreur de chargement : {error}</div>}
  </div>;
}

function Step({ n, title, active }: { n: string; title: string; active: boolean }) { return <div className={`rounded-lg border p-2 text-center ${active ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>{n}. {title}</div>; }
function Result({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-emerald-100 bg-white/70 p-3"><div className="text-xs text-emerald-700">{label}</div><div className="font-semibold mt-1">{value}</div></div>; }
