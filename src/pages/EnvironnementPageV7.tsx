import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Calculator, FileText, X } from 'lucide-react';
import { Field, inputCls } from '@/components/Field';
import { buildActivityIndex, suggestActivities, type ActivityCandidate } from '@/services/activiteMatcher';
import { extractRequirementHints, getClassificationProfile, type ClassificationField, type ClassificationResult } from '@/services/environnementClassification';

interface Condition { regime: string; condition?: string; texte?: string; meta?: string }
interface Row { rubrique: string; famille: string; familleLabel: string; designation: string; conditions?: Condition[]; inputProfile?: ClassificationField[]; source: string; sourceUrl: string }
interface Dataset { version: string; date: string; sourceUrl: string; rubriques: Row[] }

const EMPTY: Dataset = { version: '07-144', date: '19 mai 2007', sourceUrl: 'https://www.joradp.dz/FTP/jo-francais/2007/F2007034.PDF', rubriques: [] };

function clean(v: string) { return v.replace(/Ã©/g,'é').replace(/Ã¨/g,'è').replace(/Ãª/g,'ê').replace(/Ã®/g,'î').replace(/Ã´/g,'ô').replace(/Ã¹/g,'ù').replace(/Ã§/g,'ç').replace(/Ã /g,'à').replace(/â€™/g,'’').replace(/dâ€™/g,'d’').replace(/lâ€™/g,'l’').replace(/\s+/g,' ').trim(); }
function conditionText(row: Row) { return (row.conditions ?? []).map(c => `${c.condition ?? ''} ${c.texte ?? ''} ${c.meta ?? ''}`).join(' '); }
function fieldsFor(row: Row): ClassificationField[] { return row.inputProfile?.length ? row.inputProfile : getClassificationProfile(row.rubrique, conditionText(row), row.conditions)?.fields ?? []; }
function classify(row: Row, values: Record<string,string>): ClassificationResult | null { return getClassificationProfile(row.rubrique, conditionText(row), row.conditions)?.classify(values) ?? null; }
function dossierFor(row: Row, result: ClassificationResult | null) { if (!result) return { docs: [], rayon: undefined as string|undefined }; const c=row.conditions?.find(x=>x.regime===result.regime); const h=extractRequirementHints(`${c?.condition??''} ${c?.texte??''} ${c?.meta??''} ${row.designation}`); return { rayon: result.rayon ?? h.rayon, docs: [...(h.docs.impact?['Étude d’impact']:[]), ...(h.docs.danger?['Étude de dangers']:[]), ...(h.docs.notice?['Notice d’impact']:[]), ...(h.docs.rapportDangereux?['Rapport sur les produits dangereux']:[])] }; }

export function EnvironnementPageV7({ clientName, dossierNumero, onBack }: { clientName:string; dossierNumero?:string; onBack:()=>void }) {
  const [dataset,setDataset]=useState<Dataset>(EMPTY);
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState<{candidate:ActivityCandidate;row:Row}|null>(null);
  const [values,setValues]=useState<Record<string,string>>({});
  const [result,setResult]=useState<ClassificationResult|null>(null);
  const [acceptedClass,setAcceptedClass]=useState(false);
  const [loadError,setLoadError]=useState('');
  useEffect(()=>{ fetch('/data/nomenclature-07-144.json').then(async r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json() as Dataset}).then(d=>setDataset({...d,rubriques:(d.rubriques??[]).map(r=>({...r,designation:clean(r.designation),familleLabel:clean(r.familleLabel)}))})).catch(e=>setLoadError((e as Error).message)); },[]);
  const index=useMemo(()=>buildActivityIndex(dataset.rubriques),[dataset.rubriques]);
  const suggestions=useMemo(()=>!selected&&query.trim().length>=2?suggestActivities(index,query,12):[],[index,query,selected]);
  const fields=selected?fieldsFor(selected.row):[];
  const dossier=selected?dossierFor(selected.row,result):{docs:[],rayon:undefined as string|undefined};
  const ready=fields.length>0&&fields.every(f=>!f.required||String(values[f.key]??'').trim()!=='');
  function reset(){setQuery('');setSelected(null);setValues({});setResult(null);setAcceptedClass(false);}
  function acceptRubrique(candidate:ActivityCandidate){ const row=dataset.rubriques.find(r=>r.rubrique===candidate.rubrique&&clean(r.designation)===candidate.designation)??dataset.rubriques.find(r=>r.rubrique===candidate.rubrique); if(!row)return; setSelected({candidate,row}); setValues({}); setResult(null); setAcceptedClass(false); }
  function calculate(){if(!selected)return;setResult(classify(selected.row,values));setAcceptedClass(false);}

  return <div className="space-y-6">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><button type="button" onClick={onBack} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"><ArrowLeft size={18}/></button><div><h1 className="text-2xl font-bold text-gray-800">Module Environnement</h1><p className="text-sm text-gray-500">{dossierNumero??'Nouveau projet'}{clientName?` — ${clientName}`:''}</p></div></div><span className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Nomenclature 07-144</span></div>
    <div className="grid grid-cols-3 gap-2 text-xs"><Step title="1. Rubrique" active={!selected}/><Step title="2. Classement" active={!!selected&&!acceptedClass}/><Step title="3. Dossier réglementaire" active={!!selected&&acceptedClass}/></div>

    {!selected&&<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><Field label="Type / désignation de l’activité" required><div className="relative"><input className={`${inputCls} pr-10`} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex. minoterie, station-service, abattoir, élevage de volailles…" />{query&&<button type="button" onClick={reset} className="absolute top-2.5 right-2.5 p-1.5 text-gray-400 hover:text-red-600"><X size={16}/></button>}</div></Field>{query.trim().length>=2&&<div className="mt-4"><div className="text-xs font-semibold text-gray-500 mb-2">Rubriques / activités suggérées</div>{suggestions.length?<div className="border rounded-lg divide-y max-h-80 overflow-y-auto">{suggestions.map(c=><div key={`${c.rubrique}-${c.designation}`} className="p-4 flex items-center gap-3"><div className="flex-1"><div className="text-sm font-medium text-gray-800">{c.designation}</div><div className="text-xs text-gray-500 mt-1">{c.familleLabel} · Rubrique {c.rubrique}</div></div><button type="button" onClick={()=>acceptRubrique(c)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"><Check size={14}/> Accepter</button></div>)}</div>:<div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">Aucune rubrique suffisamment fiable. Ajoutez un terme décrivant l’activité.</div>}</div>}</div>}

    {selected&&<>
      <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-5"><div className="flex items-start justify-between gap-4"><div><div className="text-xs text-emerald-700">Rubrique acceptée</div><div className="text-xl font-bold text-gray-900 mt-1">Rubrique {selected.row.rubrique}</div><div className="text-sm text-gray-700 mt-1">{selected.candidate.designation}</div><div className="text-xs text-gray-500 mt-1">{selected.row.familleLabel}</div></div><button type="button" onClick={reset} className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs">Changer</button></div></div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><div className="flex items-center gap-2 mb-4"><Calculator size={18} className="text-emerald-600"/><h2 className="font-semibold">Données nécessaires au classement</h2></div><div className="rounded-lg bg-slate-50 border border-slate-200 p-4 mb-4"><div className="text-sm font-semibold">Rubrique {selected.row.rubrique}</div><div className="text-xs text-gray-500 mt-1">Renseignez uniquement la donnée demandée par cette rubrique.</div></div>{fields.length?<><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{fields.map(f=><div key={f.key}><Field label={`${f.label}${f.unit?` (${f.unit})`:''}`} required={f.required}><input className={inputCls} type={f.type==='number'?'number':'text'} min={f.type==='number'?'0':undefined} value={values[f.key]??''} onChange={e=>{setValues(v=>({...v,[f.key]:e.target.value}));setResult(null);setAcceptedClass(false);}} /></Field>{f.helper&&<div className="mt-1 text-xs text-slate-500">Domaines : {f.helper}</div>}</div>)}</div><button type="button" disabled={!ready} onClick={calculate} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold disabled:opacity-40"><Calculator size={16}/> Calculer le classement</button></>:<div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">La rubrique est acceptée, mais aucun critère de classement structuré n’est disponible pour elle dans le catalogue local.</div>}</div>

      {result&&<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5"><div className="text-sm font-semibold text-emerald-800">Classement selon la Nomenclature 07-144</div><div className="text-2xl font-bold text-emerald-950 mt-1">{result.regime}</div><div className="grid md:grid-cols-3 gap-3 mt-4"><Box label="Sous-rubrique" value={result.code}/><Box label="Intervalle" value={result.seuil}/><Box label="Rayon" value={result.rayon??'—'}/></div><div className="mt-4 font-semibold text-emerald-900">Le projet est classé sous la rubrique {selected.row.rubrique}, régime {result.regime}.</div><button type="button" onClick={()=>setAcceptedClass(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold"><Check size={16}/> Accepter le classement</button></div>}

      {acceptedClass&&<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><div className="flex items-center gap-2 mb-4"><FileText size={18} className="text-emerald-600"/><h2 className="font-semibold">Dossier réglementaire</h2></div><div className="grid md:grid-cols-2 gap-3">{['Étude d’impact','Étude de dangers','Notice d’impact','Rapport sur les produits dangereux'].map(name=>{const required=dossier.docs.includes(name);return <div key={name} className={`rounded-lg border p-4 ${required?'bg-emerald-50 border-emerald-200':'bg-gray-50 border-gray-200'}`}><div className="text-xs font-semibold">{required?'REQUIS':'Non identifié'}</div><div className="font-medium mt-1">{name}</div></div>})}</div></div>}
    </>}
    {loadError&&<div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">Erreur de chargement : {loadError}</div>}
  </div>;
}
function Step({title,active}:{title:string;active:boolean}){return <div className={`rounded-lg border p-2 text-center ${active?'border-emerald-300 bg-emerald-50 text-emerald-800':'border-gray-200 bg-gray-50 text-gray-500'}`}>{title}</div>}
function Box({label,value}:{label:string;value:string}){return <div className="rounded-lg border border-emerald-200 bg-white p-3"><div className="text-xs text-gray-500">{label}</div><div className="font-semibold text-gray-800 mt-1">{value}</div></div>}
