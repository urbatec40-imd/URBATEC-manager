import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calculator, Database, ExternalLink, FileText, SearchCheck } from 'lucide-react';
import { Field, inputCls, selectCls } from '@/components/Field';
import { classerVolaille, DOCUMENT_LEGEND } from '@/services/environnementReglementation';

interface EnvironnementPageProps { clientName: string; dossierNumero?: string; initialPrestation?: string; onBack: () => void; }
interface ProfileField { key: string; label: string; type: string; unit: string; }
interface NomenclatureCondition { condition?: string; texte?: string; regime: string; meta?: string; }
interface NomenclatureRow { rubrique: string; code?: string; famille: string; familleLabel: string; designation: string; conditions?: NomenclatureCondition[]; inputProfile?: ProfileField[]; source: string; sourceUrl: string; }
interface NomenclatureDataset { version: string; date: string; sourceUrl: string; familles: { code: string; label: string }[]; rubriques: NomenclatureRow[]; generated?: boolean; }
const EMPTY_DATASET: NomenclatureDataset = { version: '07-144', date: '19 mai 2007', sourceUrl: 'https://creg.gov.dz/T%C3%A9l%C3%A9charger/487/autorisation-dexploitation-de-letablissement-classe/13053/decret-executif-n07-144-du-19-mai-2007.pdf', familles: [], rubriques: [] };

export function EnvironnementPage({ clientName, dossierNumero, initialPrestation, onBack }: EnvironnementPageProps) {
  const [dataset, setDataset] = useState<NomenclatureDataset>(EMPTY_DATASET);
  const [loadError, setLoadError] = useState('');
  const [activite, setActivite] = useState('');
  const [capacite, setCapacite] = useState('');
  const [unite, setUnite] = useState('');
  const [commune, setCommune] = useState('');
  const [surface, setSurface] = useState('');
  const [eau, setEau] = useState('');
  const [energie, setEnergie] = useState('');
  const [travailleurs, setTravailleurs] = useState('');
  const [activeTab, setActiveTab] = useState<'analyse' | 'nomenclature'>('analyse');
  const [selectedRubrique, setSelectedRubrique] = useState<NomenclatureRow | null>(null);
  const [analyse, setAnalyse] = useState(false);
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/data/nomenclature-07-144.json')
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return (await r.json()) as NomenclatureDataset; })
      .then(setDataset)
      .catch((e) => setLoadError((e as Error).message));
  }, []);

  const searchResults = useMemo(() => {
    const q = activite.trim().toLowerCase();
    const rows = !q ? dataset.rubriques : dataset.rubriques.filter((r) => `${r.rubrique} ${r.designation} ${r.familleLabel}`.toLowerCase().includes(q));
    return rows.slice(0, 100);
  }, [activite, dataset.rubriques]);
  const dynamicFields = selectedRubrique?.inputProfile ?? [];
  const classement = useMemo(() => {
    if (!selectedRubrique || selectedRubrique.rubrique !== '2121' || unite !== 'sujets') return null;
    return classerVolaille(String(dynamicValues.typeElevage || activite), Number(dynamicValues.nombreAnimaux || capacite));
  }, [selectedRubrique, dynamicValues, activite, capacite, unite]);

  function chooseRubrique(row: NomenclatureRow) {
    setSelectedRubrique(row); setActivite(row.designation); setAnalyse(false);
    const next: Record<string, string> = {}; for (const f of row.inputProfile ?? []) next[f.key] = ''; setDynamicValues(next);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><button onClick={onBack} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"><ArrowLeft size={18} /></button><div><h1 className="text-2xl font-bold text-gray-800">Module Environnement</h1><p className="text-sm text-gray-500">{dossierNumero ?? 'Nouveau projet'}{clientName ? ` — ${clientName}` : ''}</p></div></div>{initialPrestation && <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{initialPrestation}</span>}</div>
      <div className="flex gap-2 border-b border-gray-200"><button onClick={() => setActiveTab('analyse')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'analyse' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}>Analyse</button><button onClick={() => setActiveTab('nomenclature')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'nomenclature' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'}`}><Database size={14} className="inline mr-1" />Nomenclature 07-144</button></div>

      {activeTab === 'analyse' && <div className="space-y-6"><div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><div className="flex items-center gap-2 mb-4"><SearchCheck size={18} className="text-emerald-600" /><h2 className="font-semibold text-gray-800">Analyse réglementaire</h2></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"><Field label="Activité" required><input className={inputCls} value={activite} onChange={(e) => { setActivite(e.target.value); setSelectedRubrique(null); }} placeholder="Ex. Élevage de poulets de chair" /></Field><Field label="Commune"><input className={inputCls} value={commune} onChange={(e) => setCommune(e.target.value)} /></Field><Field label="Surface (m²)"><input className={inputCls} type="number" min="0" value={surface} onChange={(e) => setSurface(e.target.value)} /></Field><Field label="Personnel"><input className={inputCls} type="number" min="0" value={travailleurs} onChange={(e) => setTravailleurs(e.target.value)} /></Field><Field label="Capacité"><input className={inputCls} type="number" min="0" value={capacite} onChange={(e) => setCapacite(e.target.value)} /></Field><Field label="Unité"><select className={selectCls} value={unite} onChange={(e) => setUnite(e.target.value)}><option value="">— Unité —</option><option value="sujets">sujets</option><option value="animaux-equivalents">animaux-équivalents</option><option value="kg/j">kg/j</option><option value="t/an">t/an</option><option value="m³/an">m³/an</option><option value="m²">m²</option><option value="kW">kW</option><option value="m³">m³</option><option value="autre">Autre</option></select></Field><Field label="Consommation d'eau"><input className={inputCls} value={eau} onChange={(e) => setEau(e.target.value)} placeholder="Valeur réelle ou estimation" /></Field><Field label="Consommation énergétique"><input className={inputCls} value={energie} onChange={(e) => setEnergie(e.target.value)} placeholder="kWh/an ou autre" /></Field></div>{searchResults.length > 0 && <div className="mt-4 border border-gray-200 rounded-lg divide-y max-h-72 overflow-y-auto">{searchResults.map((row) => <button key={`${row.rubrique}-${row.designation}`} onClick={() => chooseRubrique(row)} className="w-full text-left p-3 hover:bg-emerald-50 transition-colors"><div className="text-sm font-semibold text-gray-800">{row.rubrique} — {row.designation}</div><div className="text-xs text-gray-500 mt-0.5">{row.familleLabel}</div></button>)}</div>}{selectedRubrique && dynamicFields.length > 0 && <div className="mt-5 pt-5 border-t border-gray-100"><h3 className="font-semibold text-gray-800 mb-3">Paramètres spécifiques à la rubrique {selectedRubrique.rubrique}</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{dynamicFields.map((field) => <Field key={field.key} label={`${field.label}${field.unit ? ` (${field.unit})` : ''}`}><input className={inputCls} type={field.type === 'number' ? 'number' : 'text'} value={dynamicValues[field.key] ?? ''} onChange={(e) => setDynamicValues((v) => ({ ...v, [field.key]: e.target.value }))} /></Field>)}</div></div>}<button onClick={() => setAnalyse(true)} disabled={!selectedRubrique} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium disabled:opacity-50"><Calculator size={16} /> Analyser le classement</button></div>{analyse && selectedRubrique && <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><h2 className="font-semibold text-gray-800 mb-4">Résultat réglementaire</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm"><Result label="Rubrique" value={selectedRubrique.rubrique} /><Result label="Famille" value={selectedRubrique.familleLabel} />{classement && <><Result label="Sous-rubrique" value={classement.code} /><Result label="Régime" value={classement.regime} /></>}</div>{classement && <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm"><p className="font-semibold text-emerald-900">Classement déterminé</p><p className="mt-1 text-emerald-800">{classement.animauxEquivalents.toLocaleString('fr-FR')} animaux-équivalents — {classement.seuil}</p>{classement.documentsIndiques.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{classement.documentsIndiques.map((code) => <span key={code} className="text-xs px-2.5 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-800">{code} — {DOCUMENT_LEGEND[code as keyof typeof DOCUMENT_LEGEND]}</span>)}</div>}</div>}{selectedRubrique.conditions?.length ? <div className="mt-4 border-t pt-4"><p className="text-xs font-semibold text-gray-500 mb-2">Conditions extraites de la nomenclature</p>{selectedRubrique.conditions.map((c, i) => <div key={i} className="flex justify-between gap-3 text-sm"><span>{c.condition || c.texte}</span><strong>{c.regime}</strong></div>)}</div> : null}<div className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">{selectedRubrique.source}. Vérification du texte officiel et des textes modificatifs obligatoires avant dépôt.</div></div>}</div>}

      {activeTab === 'nomenclature' && <div className="space-y-4"><div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-gray-800">Nomenclature 07-144</h2><p className="text-xs text-gray-500 mt-1">Recherche par rubrique, activité ou famille.</p></div><a href={dataset.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline"><ExternalLink size={13} /> Source officielle</a></div><div className="mt-4"><input className={inputCls} value={activite} onChange={(e) => setActivite(e.target.value)} placeholder="Rechercher une activité ou une rubrique..." /></div></div>{loadError && <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">Impossible de charger le catalogue local : {loadError}</div>}{!dataset.generated && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm">Le catalogue complet est généré automatiquement depuis le PDF officiel 07-144. Le socle local reste disponible hors connexion.</div>}<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr><th className="px-3 py-3 text-left">Rubrique</th><th className="px-3 py-3 text-left">Famille</th><th className="px-3 py-3 text-left">Désignation</th></tr></thead><tbody className="divide-y">{searchResults.map((row) => <tr key={`${row.rubrique}-${row.designation}`} className="hover:bg-gray-50"><td className="px-3 py-3 font-semibold">{row.rubrique}</td><td className="px-3 py-3 text-gray-500">{row.familleLabel}</td><td className="px-3 py-3 text-gray-700">{row.designation}</td></tr>)}</tbody></table></div></div></div>}

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5"><div className="flex items-center gap-2 mb-2"><FileText size={17} className="text-slate-600" /><h2 className="font-semibold text-gray-800">Documents environnementaux</h2></div><p className="text-xs text-gray-500">Les documents définitifs seront générés après détermination et validation du classement réglementaire.</p></div>
    </div>
  );
}
function Result({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-gray-200 bg-gray-50 p-3"><div className="text-[11px] font-semibold text-gray-500 uppercase">{label}</div><div className="mt-1 font-semibold text-gray-800">{value}</div></div>; }
