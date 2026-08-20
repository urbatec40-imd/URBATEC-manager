import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calculator, Database, ExternalLink, FileText, SearchCheck } from 'lucide-react';
import { Field, inputCls } from '@/components/Field';
import { buildActivityIndex, suggestActivities, type ActivityRowLike } from '@/services/activiteMatcher';

interface DecisionRow { regime: string; rayon?: string; condition?: string; documents?: { impact?: boolean; danger?: boolean; notice?: boolean; rapportDangereux?: boolean } }
interface Row extends ActivityRowLike { decisionRows?: DecisionRow[]; isSelectable?: boolean }
interface Dataset { version: string; rubriques: Row[]; sourceUrl?: string }
const SOURCE = 'https://www.joradp.dz/FTP/jo-francais/2007/F2007034.PDF';
const EMPTY: Dataset = { version: '07-144-semantic-v3', rubriques: [], sourceUrl: SOURCE };
function clean(v: string) { return (v || '').replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è').replace(/Ãª/g, 'ê').replace(/Ã®/g, 'î').replace(/Ã´/g, 'ô').replace(/Ã¹/g, 'ù').replace(/Ã§/g, 'ç').replace(/Ã /g, 'à').replace(/â€™/g, '’').replace(/\s+/g, ' ').trim(); }

export function EnvironnementPageV4({ clientName, dossierNumero, onBack }: { clientName: string; dossierNumero?: string; initialPrestation?: string; onBack: () => void }) {
  const [dataset, setDataset] = useState<Dataset>(EMPTY); const [query, setQuery] = useState(''); const [selected, setSelected] = useState<Row | null>(null); const [values, setValues] = useState<Record<string, string>>({}); const [analyse, setAnalyse] = useState(false); const [loadError, setLoadError] = useState('');
  useEffect(() => { fetch('/data/nomenclature-07-144-semantic-v3.json').then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json() as Dataset }).then(data => setDataset({ ...data, rubriques: (data.rubriques ?? []).map(r => ({ ...r, designation: clean(r.designation), familleLabel: clean(r.familleLabel) })) })).catch(e => setLoadError((e as Error).message)); }, []);
  const index = useMemo(() => buildActivityIndex(dataset.rubriques), [dataset.rubriques]);
  const suggestions = useMemo(() => suggestActivities(index, query, 15), [index, query]);
  const rows = selected?.decisionRows ?? [];
  const numericFields = useMemo(() => rows.flatMap((r, i) => r.condition ? [{ key: `q${i}`, label: `Valeur / quantité pour la condition ${i + 1}`, unit: '' }] : []).slice(0, 6), [rows]);

  function choose(candidate: ActivityRowLike) { const row = dataset.rubriques.find(r => r.rubrique === candidate.rubrique); if (!row) return; setSelected(row); setQuery(row.rubrique + ' — ' + row.designation); setAnalyse(false); setValues({}); }
  function documents(r: DecisionRow) { const d = r.documents ?? {}; return [d.impact && 'Étude d’impact', d.danger && 'Étude de danger', d.notice && 'Notice d’impact', d.rapportDangereux && 'Rapport sur les produits dangereux'].filter(Boolean) as string[]; }

  return <div className="space-y-6">
    <div className="flex items-center gap-3"><button onClick={onBack} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"><ArrowLeft size={18} /></button><div><h1 className="text-2xl font-bold text-gray-800">Module Environnement</h1><p className="text-sm text-gray-500">{dossierNumero ?? 'Nouveau projet'}{clientName ? ` — ${clientName}` : ''}</p></div></div>
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4"><SearchCheck size={18} className="text-emerald-600" /><h2 className="font-semibold text-gray-800">Identification de l’activité</h2></div>
      <Field label="Recherche activité / rubrique" required><input className={inputCls} autoFocus value={query} onChange={e => { setQuery(e.target.value); setSelected(null); setAnalyse(false); }} placeholder="Ex. 211 / 2110 / élevage de volailles / tannerie cuir..." /></Field>
      <p className="text-xs text-gray-500 mt-2">Recherche numérique : seuls les numéros de rubriques sont interrogés. Recherche texte : activité, produit, procédé ou installation.</p>
      {query.trim() && suggestions.length > 0 && <div className="mt-4 border border-gray-200 rounded-lg divide-y bg-white max-h-96 overflow-y-auto">{suggestions.map((s, i) => <button key={`${s.rubrique}-${i}`} onClick={() => choose(s)} className="w-full text-left px-4 py-3 hover:bg-emerald-50"><div className="text-sm font-medium text-gray-800"><span className="font-bold text-emerald-700">{s.rubrique}</span> — {s.designation}</div><div className="text-xs text-gray-500 mt-1">{s.familleLabel}</div></button>)}</div>}
      {query.trim() && suggestions.length === 0 && <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">Aucune rubrique trouvée. Pour un numéro, saisissez 1, 21, 211, 2110…</div>}
    </div>

    {selected && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-4"><div className="text-xs font-semibold text-slate-500 uppercase">Activité sélectionnée</div><div className="font-semibold text-slate-900 mt-1"><span className="text-emerald-700">{selected.rubrique}</span> — {selected.designation}</div><div className="text-sm text-slate-600 mt-1">Famille : <strong>{selected.familleLabel}</strong></div></div>
      <h3 className="font-semibold text-gray-800 mt-5 mb-3">Domaines de quantités / seuils de classement</h3>
      {rows.length === 0 ? <p className="text-sm text-gray-500">Aucune ligne de classement exploitable n’a été extraite pour cette rubrique.</p> : <div className="space-y-3">{rows.map((r, i) => <div key={i} className="rounded-lg border border-gray-200 p-4"><div className="flex flex-wrap gap-2 items-center"><span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">{r.regime}</span>{r.rayon && <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs">Rayon : {r.rayon} km</span>}</div><div className="mt-2 text-sm text-gray-700"><strong>Condition / domaine :</strong> {r.condition || '—'}</div><div className="mt-3 flex flex-wrap gap-2">{documents(r).length ? documents(r).map(d => <span key={d} className="text-xs rounded-md bg-blue-50 border border-blue-200 px-2 py-1 text-blue-800">{d}</span>) : <span className="text-xs text-gray-400">Aucun document signalé</span>}</div></div>)}</div>}
      {numericFields.length > 0 && <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">{numericFields.map(f => <Field key={f.key} label={f.label}><input className={inputCls} type="number" min="0" value={values[f.key] ?? ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} /></Field>)}</div>}
      <button onClick={() => setAnalyse(true)} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium"><Calculator size={16} /> Afficher le classement</button>
      {analyse && <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-4"><div className="font-semibold text-emerald-900">Données réglementaires disponibles</div><div className="text-sm text-emerald-800 mt-1">Les seuils, régimes et documents associés à cette rubrique sont affichés ci-dessus pour vérification.</div></div>}
    </div>}

    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5"><div className="flex items-center gap-2"><Database size={17} className="text-slate-600" /><h2 className="font-semibold text-gray-800">Nomenclature 07-144</h2><a className="ml-auto text-xs text-sky-700 hover:underline" href={SOURCE} target="_blank" rel="noreferrer"><ExternalLink size={13} className="inline mr-1" />Source officielle</a></div><p className="text-xs text-gray-500 mt-2">Catalogue local : {dataset.rubriques.length} rubriques. {loadError ? `Erreur : ${loadError}` : ''}</p></div>
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5"><div className="flex items-center gap-2 mb-2"><FileText size={17} className="text-slate-600" /><h2 className="font-semibold text-gray-800">Documents environnementaux</h2></div><p className="text-xs text-gray-500">Ils sont affichés directement par ligne de classement après sélection de la rubrique.</p></div>
  </div>;
}
