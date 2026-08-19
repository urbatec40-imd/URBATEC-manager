import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calculator, Database, ExternalLink, FileText, SearchCheck } from 'lucide-react';
import { Field, inputCls } from '@/components/Field';
import { classerVolaille, DOCUMENT_LEGEND } from '@/services/environnementReglementation';

interface ProfileField { key: string; label: string; type: string; unit: string; required?: boolean; options?: string[]; }
interface Condition { condition?: string; texte?: string; regime: string; meta?: string; }
interface Row { rubrique: string; code?: string; famille: string; familleLabel: string; designation: string; conditions?: Condition[]; inputProfile?: ProfileField[]; source: string; sourceUrl: string; }
interface Dataset { version: string; date: string; sourceUrl: string; familles: { code: string; label: string }[]; rubriques: Row[]; generated?: boolean; }

const EMPTY: Dataset = { version: '07-144', date: '19 mai 2007', sourceUrl: 'https://www.me.gov.dz/wp-content/uploads/2022/05/Decret-executif-07-144.pdf', familles: [], rubriques: [] };

export function EnvironnementPageV2({ clientName, dossierNumero, initialPrestation, onBack }: { clientName: string; dossierNumero?: string; initialPrestation?: string; onBack: () => void; }) {
  const [dataset, setDataset] = useState<Dataset>(EMPTY);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState(initialPrestation ?? '');
  const [commune, setCommune] = useState('');
  const [selected, setSelected] = useState<Row | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [analyse, setAnalyse] = useState(false);
  const [tab, setTab] = useState<'analyse' | 'nomenclature'>('analyse');

  useEffect(() => {
    fetch('/data/nomenclature-07-144.json')
      .then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return (await r.json()) as Dataset; })
      .then(setDataset)
      .catch(e => setLoadError((e as Error).message));
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('fr-FR');
    const normalized = q.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return dataset.rubriques.filter(r => {
      const hay = `${r.rubrique} ${r.designation} ${r.familleLabel}`.toLocaleLowerCase('fr-FR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return !normalized || hay.includes(normalized);
    }).slice(0, 80);
  }, [query, dataset.rubriques]);

  const fields = selected?.inputProfile ?? [];
  const autoUnits = Array.from(new Set(fields.map(f => f.unit).filter(Boolean)));

  const classification = useMemo(() => {
    if (!selected) return null;
    if (selected.rubrique === '2121') {
      const type = values.typeElevage || selected.designation;
      const n = Number(values.nombreAnimaux || 0);
      return classerVolaille(type, n);
    }
    if (selected.rubrique === '2119') {
      const n = Number(values.nombreAnimaux || 0);
      if (!Number.isFinite(n) || n <= 0) return null;
      if (n < 250) return { code: '2119-3', regime: 'D', categorie: '4e catégorie', seuil: 'Moins de 250 animaux' };
      if (n <= 1000) return { code: '2119-2', regime: 'APAPC', categorie: '3e catégorie', seuil: 'De 250 à 1000 animaux' };
      return { code: '2119-1', regime: 'AW', categorie: '2e catégorie', seuil: 'Plus de 1000 animaux' };
    }
    if (selected.rubrique === '2724') {
      const n = Number(values.capaciteTraitement || 0);
      if (!Number.isFinite(n) || n <= 0) return null;
      if (n >= 100000) return { code: '2724-1', regime: 'AM', categorie: '1re catégorie', seuil: '≥ 100 000 m³/j' };
      if (n > 50000) return { code: '2724-2', regime: 'AW', categorie: '2e catégorie', seuil: '> 50 000 et < 100 000 m³/j' };
      return { code: '2724-3', regime: 'APAPC', categorie: '3e catégorie', seuil: '< 50 000 m³/j' };
    }
    return null;
  }, [selected, values]);

  function selectRow(row: Row) {
    setSelected(row);
    setQuery(row.designation);
    setAnalyse(false);
    const initial: Record<string, string> = {};
    for (const f of row.inputProfile ?? []) initial[f.key] = '';
    setValues(initial);
  }

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"><ArrowLeft size={18} /></button>
        <div><h1 className="text-2xl font-bold text-gray-800">Module Environnement</h1><p className="text-sm text-gray-500">{dossierNumero ?? 'Nouveau projet'}{clientName ? ` — ${clientName}` : ''}</p></div>
      </div>
      {initialPrestation && <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{initialPrestation}</span>}
    </div>

    <div className="flex gap-2 border-b border-gray-200">
      <button onClick={() => setTab('analyse')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'analyse' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}>Analyse</button>
      <button onClick={() => setTab('nomenclature')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'nomenclature' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}><Database size={14} className="inline mr-1" />Nomenclature 07-144</button>
    </div>

    {tab === 'analyse' && <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4"><SearchCheck size={18} className="text-emerald-600" /><h2 className="font-semibold text-gray-800">Recherche de l'activité</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Activité / recherche" required><input className={inputCls} autoFocus value={query} onChange={e => { setQuery(e.target.value); setSelected(null); setAnalyse(false); }} placeholder="Ex. STATI... / Ovins / Poulets / Station..." /></Field>
          <Field label="Commune"><input className={inputCls} value={commune} onChange={e => setCommune(e.target.value)} placeholder="Commune du projet" /></Field>
        </div>

        {query.trim() && results.length > 0 && <div className="mt-4 border border-gray-200 rounded-lg divide-y max-h-80 overflow-y-auto">
          {results.map(row => <button key={`${row.rubrique}-${row.designation}`} onClick={() => selectRow(row)} className={`w-full text-left p-3 hover:bg-emerald-50 ${selected?.rubrique === row.rubrique ? 'bg-emerald-50' : ''}`}>
            <div className="text-sm font-semibold text-gray-800">{row.rubrique} — {row.designation}</div>
            <div className="text-xs text-gray-500 mt-1">{row.familleLabel}</div>
          </button>)}
        </div>}

        {query.trim() && results.length === 0 && <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">Aucune rubrique correspondante dans le catalogue local.</div>}

        {selected && <div className="mt-5 border-t pt-5">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 mb-4">
            <div className="text-xs font-semibold text-slate-500 uppercase">Activité sélectionnée</div>
            <div className="font-semibold text-slate-900 mt-1">{selected.rubrique} — {selected.designation}</div>
            <div className="text-xs text-slate-500 mt-1">Famille : {selected.familleLabel}</div>
            {autoUnits.length > 0 && <div className="mt-3 inline-flex items-center rounded-full bg-white border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">Unité déterminée automatiquement : {autoUnits.join(' / ')}</div>}
          </div>

          {fields.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fields.map(field => <Field key={field.key} label={`${field.label}${field.unit ? ` (${field.unit})` : ''}`} required={field.required}>
              {field.options ? <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white" value={values[field.key] ?? ''} onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}><option value="">— Sélectionner —</option>{field.options.map(o => <option key={o} value={o}>{o}</option>)}</select> : <input className={inputCls} type={field.type === 'number' ? 'number' : 'text'} min={field.type === 'number' ? '0' : undefined} value={values[field.key] ?? ''} onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))} />}
            </Field>)}
          </div>}

          <button onClick={() => setAnalyse(true)} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium"><Calculator size={16} /> Analyser le classement</button>
        </div>}
      </div>

      {analyse && selected && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Résultat réglementaire</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3"><Result label="Rubrique" value={selected.rubrique} /><Result label="Famille" value={selected.familleLabel} />{classification && <Result label="Sous-rubrique" value={classification.code} />}{classification && <Result label="Régime" value={classification.regime} />}{classification && <Result label="Catégorie" value={classification.categorie} />}</div>
        {classification && <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm"><p className="font-semibold text-emerald-900">Classement déterminé automatiquement</p><p className="mt-1 text-emerald-800">{classification.seuil}</p></div>}
        {selected.conditions?.length ? <div className="mt-4 border-t pt-4"><p className="text-xs font-semibold text-gray-500 mb-2">Conditions de la nomenclature</p>{selected.conditions.map((c, i) => <div key={i} className="flex justify-between gap-3 text-sm py-1"><span>{c.condition || c.texte}</span><strong>{c.regime}</strong></div>)}</div> : null}
        <div className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">Source : {selected.source}. La validation finale doit tenir compte des textes modificatifs applicables à la date du dépôt.</div>
      </div>}
    </>}

    {tab === 'nomenclature' && <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-gray-800">Nomenclature 07-144</h2><p className="text-xs text-gray-500 mt-1">بحث بالرقم أو الاسم أو العائلة.</p></div><a href={dataset.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline"><ExternalLink size={13} /> Source officielle</a></div></div>
      {loadError && <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">Impossible de charger le catalogue local : {loadError}</div>}
      {!dataset.generated && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm">Le catalogue local est encore un socle hors connexion. Il sera enrichi avec la nomenclature complète.</div>}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="px-3 py-3 text-left">Rubrique</th><th className="px-3 py-3 text-left">Famille</th><th className="px-3 py-3 text-left">Désignation</th></tr></thead><tbody className="divide-y">{(query ? results : dataset.rubriques).map(row => <tr key={`${row.rubrique}-${row.designation}`}><td className="px-3 py-3 font-semibold">{row.rubrique}</td><td className="px-3 py-3 text-gray-500">{row.familleLabel}</td><td className="px-3 py-3 text-gray-700">{row.designation}</td></tr>)}</tbody></table></div></div>
    </div>}

    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5"><div className="flex items-center gap-2 mb-2"><FileText size={17} className="text-slate-600" /><h2 className="font-semibold text-gray-800">Documents environnementaux</h2></div><p className="text-xs text-gray-500">Les documents sont déterminés après classement réglementaire.</p></div>
  </div>;
}

function Result({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-gray-200 bg-gray-50 p-3"><div className="text-[11px] font-semibold text-gray-500 uppercase">{label}</div><div className="mt-1 font-semibold text-gray-800">{value}</div></div>; }
