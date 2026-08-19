import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, FileText, X } from 'lucide-react';
import { Field, inputCls } from '@/components/Field';
import { buildActivityIndex, suggestActivities, type ActivityCandidate } from '@/services/activiteMatcher';

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
  decisionRows?: DecisionRow[];
  source: string;
  sourceUrl: string;
}
interface Dataset { version: string; date: string; sourceUrl: string; rubriques: Row[] }

const EMPTY: Dataset = { version: '07-144', date: '19 mai 2007', sourceUrl: 'https://www.joradp.dz/FTP/jo-francais/2007/F2007034.PDF', rubriques: [] };

function clean(v: string) {
  return v.replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è').replace(/Ãª/g, 'ê').replace(/Ã®/g, 'î').replace(/Ã´/g, 'ô').replace(/Ã¹/g, 'ù').replace(/Ã§/g, 'ç').replace(/Ã /g, 'à').replace(/â€™/g, '’').replace(/dâ€™/g, 'd’').replace(/lâ€™/g, 'l’').replace(/\s+/g, ' ').trim();
}
function norm(v: string) {
  return v.toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’'`´]/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}
function shortDesignation(value: string) {
  const s = clean(value);
  const cut = s.search(/\s+(?:La|Le|Les)\s+(?:quantité|capacité|puissance|volume|surface|nombre)\b/i);
  const cut2 = s.search(/\s+\d+\s*\.\s+/);
  const cutAt = [cut, cut2].filter(n => n >= 0).sort((a, b) => a - b)[0];
  if (cutAt != null) return s.slice(0, cutAt).replace(/[,:;\-\s]+$/, '').trim();
  return s;
}
function rangeLabel(r: DecisionRow) {
  if (r.rawCondition?.trim()) return clean(r.rawCondition);
  const u = r.unit ? ` ${r.unit}` : '';
  if (r.min != null && r.max != null) return `${r.minInclusive === false ? '>' : '≥'} ${r.min}${u} et ${r.maxInclusive === false ? '<' : '≤'} ${r.max}${u}`;
  if (r.min != null) return `${r.minInclusive === false ? '>' : '≥'} ${r.min}${u}`;
  if (r.max != null) return `${r.maxInclusive === false ? '<' : '≤'} ${r.max}${u}`;
  return 'Situation définie par la rubrique';
}
function regimeLabel(v: string) {
  return ({ AM: 'Autorisation ministérielle', AW: 'Autorisation du Wali', APAPC: 'Autorisation du président de l’APC', D: 'Déclaration auprès du président de l’APC' } as Record<string,string>)[v] ?? v;
}
function category(v: string) {
  return ({ AM: '1re catégorie', AW: '2e catégorie', APAPC: '3e catégorie', D: '4e catégorie' } as Record<string,string>)[v] ?? '';
}
function documentsFor(row: DecisionRow) {
  return [
    ['Étude d’impact', !!row.documents?.impact],
    ['Étude de dangers', !!row.documents?.danger],
    ['Notice d’impact', !!row.documents?.notice],
    ['Rapport sur les produits dangereux', !!row.documents?.rapportDangereux],
  ].filter(([, required]) => required) as const;
}
function directRubrique(query: string, rows: Row[]) {
  const code = norm(query);
  if (!/^[12]\d{3}$/.test(code) || code.endsWith('00')) return null;
  return rows.find(r => r.rubrique === code) ?? null;
}

export function EnvironnementPageV10({ clientName, dossierNumero, onBack }: { clientName: string; dossierNumero?: string; onBack: () => void }) {
  const [dataset, setDataset] = useState<Dataset>(EMPTY);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const [selectedCase, setSelectedCase] = useState<DecisionRow | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/data/nomenclature-07-144.json')
      .then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json() as Dataset; })
      .then(d => setDataset({ ...d, rubriques: (d.rubriques ?? []).map(r => ({ ...r, designation: clean(r.designation), familleLabel: clean(r.familleLabel), decisionRows: r.decisionRows ?? [] })) }))
      .catch(e => setError((e as Error).message));
  }, []);

  const index = useMemo(() => buildActivityIndex(dataset.rubriques), [dataset.rubriques]);
  const direct = useMemo(() => directRubrique(query, dataset.rubriques), [query, dataset.rubriques]);
  const numericPrefix = useMemo(() => {
    const q = norm(query);
    if (!/^\d{2,4}$/.test(q) || q.endsWith('00') || direct) return [] as Row[];
    return dataset.rubriques.filter(r => !r.rubrique.endsWith('00') && r.rubrique.startsWith(q)).slice(0, 6);
  }, [query, dataset.rubriques, direct]);
  const suggestions = useMemo(() => {
    if (selected || direct || numericPrefix.length || query.trim().length < 2) return [];
    return suggestActivities(index, query, 6);
  }, [selected, direct, numericPrefix.length, index, query]);

  const cases = useMemo(() => {
    if (!selected) return [];
    return (selected.decisionRows ?? []).filter(r => r.rawCondition?.trim()).map((r, i) => ({ ...r, __index: i }));
  }, [selected]);
  const hasCases = cases.length > 0;
  const firstCriterion = cases[0]?.criterion ?? '';
  const firstUnit = cases[0]?.unit ?? '';

  function reset() { setQuery(''); setSelected(null); setSelectedCase(null); setError(''); }
  function accept(r: Row) { setSelected(r); setSelectedCase(null); setError(''); }

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3"><button type="button" onClick={onBack} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"><ArrowLeft size={18}/></button><div><h1 className="text-2xl font-bold text-gray-800">Module Environnement</h1><p className="text-sm text-gray-500">{dossierNumero ?? 'Nouveau projet'}{clientName ? ` — ${clientName}` : ''}</p></div></div>
      <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Nomenclature 07-144</span>
    </div>

    <div className="grid grid-cols-3 gap-2 text-xs"><Step n="1" title="Activité / Rubrique" active={!selected}/><Step n="2" title="Classement" active={!!selected && !selectedCase}/><Step n="3" title="Rapports nécessaires" active={!!selectedCase}/></div>

    {!selected && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <Field label="Type / désignation de l’activité" required><div className="relative"><input className={`${inputCls} pr-10`} value={query} onChange={e => { setQuery(e.target.value); setError(''); }} placeholder="Désignation, mot-clé, abréviation ou N° de rubrique" />{query && <button type="button" onClick={reset} className="absolute top-2.5 right-2.5 p-1.5 text-gray-400 hover:text-red-600"><X size={16}/></button>}</div></Field>
      {direct && <ResultCard row={direct} onAccept={() => accept(direct)} />}
      {!direct && numericPrefix.length > 0 && <div className="mt-4"><div className="text-xs font-semibold text-gray-500 mb-2">Rubriques / activités</div><div className="border rounded-lg divide-y">{numericPrefix.map(r => <ResultCard key={r.rubrique} row={r} onAccept={() => accept(r)} compact />)}</div></div>}
      {!direct && numericPrefix.length === 0 && query.trim().length >= 2 && <div className="mt-4"><div className="text-xs font-semibold text-gray-500 mb-2">Rubriques / activités suggérées</div>{suggestions.length ? <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">{suggestions.map((c: ActivityCandidate) => { const r = dataset.rubriques.find(x => x.rubrique === c.rubrique); return <div key={`${c.rubrique}-${c.designation}`} className="p-3 flex items-center gap-3"><div className="flex-1"><div className="font-medium text-sm">{c.rubrique} — {shortDesignation(c.designation)}</div></div><button type="button" disabled={!r} onClick={() => r && accept(r)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold disabled:opacity-40"><Check size={14}/> Accepter</button></div>; })}</div> : <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">Aucune proposition suffisamment fiable.</div>}</div>}
    </div>}

    {selected && <>
      <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-5"><div className="text-sm font-semibold text-emerald-800">Rubrique acceptée</div><div className="text-xl font-bold mt-1">{selected.rubrique}</div><div className="text-sm text-gray-700 mt-1">{shortDesignation(selected.designation)}</div><button type="button" onClick={reset} className="mt-3 text-xs text-sky-700 hover:underline">Changer</button></div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4"><h2 className="font-semibold">Données nécessaires au classement</h2></div>
        {hasCases ? <>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 mb-4"><div className="text-sm font-semibold">{firstCriterion || 'Situation de classement'}</div>{firstUnit && <div className="text-xs text-gray-500 mt-1">Unité : {firstUnit}</div>}</div>
          <Field label="Choisir la situation / l’intervalle" required><select className={inputCls} value={selectedCase ? String(cases.indexOf(selectedCase)) : ''} onChange={e => { const item = cases[Number(e.target.value)]; setSelectedCase(item ?? null); setError(''); }}><option value="">Sélectionnez la situation prévue par la Nomenclature</option>{cases.map((c, i) => <option key={`${c.rubrique}-${i}`} value={String(i)}>{rangeLabel(c)}</option>)}</select></Field>
        </> : <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">Aucune situation structurée n’est disponible dans les données de cette Rubrique.</div>}
      </div>

      {selectedCase && <>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5"><div className="text-sm font-semibold text-emerald-800">Classement selon la Nomenclature 07-144</div><div className="text-2xl font-bold text-emerald-950 mt-1">{category(selectedCase.regime)} — {regimeLabel(selectedCase.regime)}</div><div className="grid md:grid-cols-4 gap-3 mt-4"><Result label="Rubrique" value={selectedCase.rubrique}/><Result label="Situation" value={rangeLabel(selectedCase)}/><Result label="Rayon d’affichage" value={selectedCase.rayon || '—'}/><Result label="Régime" value={selectedCase.regime}/></div></div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><div className="flex items-center gap-2 mb-4"><FileText size={18} className="text-emerald-600"/><h2 className="font-semibold">Rapports nécessaires</h2></div>{documentsFor(selectedCase).length ? <div className="grid md:grid-cols-2 gap-3">{documentsFor(selectedCase).map(([name]) => <div key={name} className="rounded-lg border p-4 bg-emerald-50 border-emerald-200"><div className="text-xs font-semibold">Requis</div><div className="font-medium mt-1">{name}</div></div>)}</div> : <div className="text-sm text-gray-600">Aucun rapport marqué X pour cette situation.</div>}</div>
      </>}
    </>}
    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
  </div>;
}
function ResultCard({ row, onAccept, compact = false }: { row: Row; onAccept: () => void; compact?: boolean }) { return <div className={`${compact ? '' : 'mt-4 '}border border-emerald-200 bg-emerald-50 rounded-lg p-3 flex items-center gap-3`}><div className="flex-1"><div className="text-sm font-semibold">{row.rubrique} — {shortDesignation(row.designation)}</div></div><button type="button" onClick={onAccept} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"><Check size={14}/> Accepter</button></div>; }
function Step({ n, title, active }: { n: string; title: string; active: boolean }) { return <div className={`rounded-lg border p-2 text-center ${active ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>{n}. {title}</div>; }
function Result({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-emerald-100 bg-white/70 p-3"><div className="text-xs text-emerald-700">{label}</div><div className="font-semibold mt-1">{value}</div></div>; }
