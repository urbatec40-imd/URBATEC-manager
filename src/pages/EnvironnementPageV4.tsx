import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calculator, Database, ExternalLink, FileText, SearchCheck } from 'lucide-react';
import { Field, inputCls } from '@/components/Field';
import { classerVolaille } from '@/services/environnementReglementation';
import { buildActivityIndex, suggestActivities, type ActivityRowLike } from '@/services/activiteMatcher';

interface ProfileField { key: string; label: string; type: string; unit: string; required?: boolean; options?: string[] }
interface Condition { condition?: string; texte?: string; regime: string; meta?: string }
interface Row extends ActivityRowLike { conditions?: Condition[]; inputProfile?: ProfileField[]; sourceUrl: string }
interface Dataset { version: string; date: string; sourceUrl: string; familles?: { code: string; label: string }[]; rubriques: Row[]; generated?: boolean }

const EMPTY: Dataset = { version: '07-144', date: '19 mai 2007', sourceUrl: 'https://www.joradp.dz/FTP/jo-francais/2007/F2007034.PDF', familles: [], rubriques: [] }

function clean(value: string) {
  return value
    .replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è').replace(/Ãª/g, 'ê').replace(/Ã®/g, 'î')
    .replace(/Ã´/g, 'ô').replace(/Ã¹/g, 'ù').replace(/Ã§/g, 'ç').replace(/Ã /g, 'à')
    .replace(/â€™/g, '’').replace(/â€œ/g, '“').replace(/â€/g, '”')
    .replace(/dâ€™/g, 'd’').replace(/lâ€™/g, 'l’').replace(/\s+/g, ' ').trim()
}

export function EnvironnementPageV4({ clientName, dossierNumero, initialPrestation, onBack }: { clientName: string; dossierNumero?: string; initialPrestation?: string; onBack: () => void }) {
  const [dataset, setDataset] = useState<Dataset>(EMPTY)
  const [query, setQuery] = useState('')
  const [commune, setCommune] = useState('')
  const [selected, setSelected] = useState<Row | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [analyse, setAnalyse] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    fetch('/data/nomenclature-07-144.json')
      .then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return (await r.json()) as Dataset })
      .then(data => setDataset({ ...data, rubriques: (data.rubriques ?? []).map(r => ({ ...r, designation: clean(r.designation), familleLabel: clean(r.familleLabel) })) }))
      .catch(e => setLoadError((e as Error).message))
  }, [])

  const index = useMemo(() => buildActivityIndex(dataset.rubriques), [dataset.rubriques])
  const suggestions = useMemo(() => suggestActivities(index, query, 10), [index, query])
  const selectedRow = useMemo(() => selected, [selected])
  const fields = selectedRow?.inputProfile ?? []
  const units = Array.from(new Set(fields.map(f => f.unit).filter(Boolean)))

  const classification = useMemo(() => {
    if (!selectedRow) return null
    if (selectedRow.rubrique === '2121') return classerVolaille(values.typeElevage || selectedRow.designation, Number(values.nombreAnimaux || 0))
    if (selectedRow.rubrique === '2119') {
      const n = Number(values.nombreAnimaux || 0); if (!Number.isFinite(n) || n <= 0) return null
      if (n < 250) return { code: '2119-3', regime: 'D', categorie: '4e catégorie', seuil: 'Moins de 250 animaux' }
      if (n <= 1000) return { code: '2119-2', regime: 'APAPC', categorie: '3e catégorie', seuil: 'De 250 à 1000 animaux' }
      return { code: '2119-1', regime: 'AW', categorie: '2e catégorie', seuil: 'Plus de 1000 animaux' }
    }
    if (selectedRow.rubrique === '2724') {
      const n = Number(values.capaciteTraitement || 0); if (!Number.isFinite(n) || n <= 0) return null
      if (n >= 100000) return { code: '2724-1', regime: 'AM', categorie: '1re catégorie', seuil: '≥ 100 000 m³/j' }
      if (n > 50000) return { code: '2724-2', regime: 'AW', categorie: '2e catégorie', seuil: '> 50 000 et < 100 000 m³/j' }
      return { code: '2724-3', regime: 'APAPC', categorie: '3e catégorie', seuil: '< 50 000 m³/j' }
    }
    return null
  }, [selectedRow, values])

  function choose(candidate: { rubrique: string; famille: string; familleLabel: string; designation: string }) {
    const row = dataset.rubriques.find(r => r.rubrique === candidate.rubrique && r.designation === candidate.designation) ?? dataset.rubriques.find(r => r.rubrique === candidate.rubrique)
    if (!row) return
    setSelected(row); setQuery(row.designation); setAnalyse(false)
    const next: Record<string, string> = {}; for (const f of row.inputProfile ?? []) next[f.key] = ''
    setValues(next)
  }

  return <div className="space-y-6">
    <div className="flex items-center gap-3"><button onClick={onBack} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"><ArrowLeft size={18} /></button><div><h1 className="text-2xl font-bold text-gray-800">Module Environnement</h1><p className="text-sm text-gray-500">{dossierNumero ?? 'Nouveau projet'}{clientName ? ` — ${clientName}` : ''}</p></div></div>

    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4"><SearchCheck size={18} className="text-emerald-600" /><h2 className="font-semibold text-gray-800">Identification de l’activité</h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Description libre de l'activité" required><input className={inputCls} autoFocus value={query} onChange={e => { setQuery(e.target.value); setSelected(null); setAnalyse(false) }} placeholder="Ex. station-service essence gasoil GPL / élevage poulet / tannerie cuir..." /></Field>
        <Field label="Commune"><input className={inputCls} value={commune} onChange={e => setCommune(e.target.value)} placeholder="Commune du projet" /></Field>
      </div>

      {query.trim() && suggestions.length > 0 && <div className="mt-4"><div className="text-xs font-semibold text-gray-500 mb-2">Activités suggérées par la Nomenclature 07-144</div><div className="border border-gray-200 rounded-lg divide-y bg-white max-h-96 overflow-y-auto">{suggestions.map((s, i) => <button key={`${s.rubrique}-${s.designation}-${i}`} onClick={() => choose(s)} className="w-full text-left px-4 py-3 hover:bg-emerald-50"><div className="text-sm font-medium text-gray-800">{s.designation}</div><div className="text-xs text-gray-500 mt-1">Famille : {s.familleLabel} · Rubrique : {s.rubrique} · Pertinence : {Math.round(Math.min(99, s.score * 10))}%</div></button>)}</div></div>}
      {query.trim() && suggestions.length === 0 && <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">Aucune proposition suffisamment pertinente. Ajoutez un mot décrivant l’activité, le produit, le procédé ou l’installation.</div>}

      {selectedRow && <div className="mt-5 border-t pt-5">
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4"><div className="text-xs font-semibold text-slate-500 uppercase">Classification issue du catalogue</div><div className="font-semibold text-slate-900 mt-1">{selectedRow.designation}</div><div className="text-sm text-slate-600 mt-1">Famille : <strong>{selectedRow.familleLabel}</strong> · Rubrique : <strong>{selectedRow.rubrique}</strong></div>{units.length > 0 && <div className="mt-3 inline-flex rounded-full bg-white border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">Unités/champs automatiques : {units.join(' / ')}</div>}</div>
        {fields.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">{fields.map(f => <Field key={f.key} label={`${f.label}${f.unit ? ` (${f.unit})` : ''}`} required={f.required}>{f.options ? <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white" value={values[f.key] ?? ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}><option value="">— Sélectionner —</option>{f.options.map(o => <option key={o} value={o}>{o}</option>)}</select> : <input className={inputCls} type={f.type === 'number' ? 'number' : 'text'} min={f.type === 'number' ? '0' : undefined} value={values[f.key] ?? ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} />}</Field>)}</div>}
        <button onClick={() => setAnalyse(true)} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium"><Calculator size={16} /> Analyser le classement</button>
      </div>}
    </div>

    {analyse && selectedRow && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><h2 className="font-semibold text-gray-800 mb-4">Résultat réglementaire</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"><Result label="Rubrique" value={selectedRow.rubrique} /><Result label="Famille" value={selectedRow.familleLabel} />{classification && <Result label="Sous-rubrique" value={classification.code} />} {classification && <Result label="Régime" value={classification.regime} />} {classification && <Result label="Catégorie" value={classification.categorie} />}</div>{classification && <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm"><p className="font-semibold text-emerald-900">Classement calculé</p><p className="mt-1 text-emerald-800">{classification.seuil}</p></div>}<div className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">La proposition et le classement doivent être vérifiés dans la Nomenclature et les textes modificatifs applicables avant dépôt.</div></div>}

    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5"><div className="flex items-center gap-2"><Database size={17} className="text-slate-600" /><h2 className="font-semibold text-gray-800">Nomenclature 07-144</h2><a className="ml-auto text-xs text-sky-700 hover:underline" href={dataset.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} className="inline mr-1" />Source officielle</a></div><p className="text-xs text-gray-500 mt-2">Catalogue local : {dataset.rubriques.length} rubriques. {loadError ? `Erreur de chargement : ${loadError}` : ''}</p></div>
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5"><div className="flex items-center gap-2 mb-2"><FileText size={17} className="text-slate-600" /><h2 className="font-semibold text-gray-800">Documents environnementaux</h2></div><p className="text-xs text-gray-500">Les documents sont déterminés après classement réglementaire.</p></div>
  </div>
}

function Result({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-gray-200 bg-gray-50 p-3"><div className="text-[11px] font-semibold text-gray-500 uppercase">{label}</div><div className="mt-1 font-semibold text-gray-800">{value}</div></div> }
