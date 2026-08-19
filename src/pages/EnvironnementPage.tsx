import { useMemo, useState } from 'react';
import { ArrowLeft, Calculator, FileText, SearchCheck } from 'lucide-react';
import { Field, inputCls, selectCls } from '@/components/Field';

interface EnvironnementPageProps {
  clientName: string;
  dossierNumero?: string;
  initialPrestation?: string;
  onBack: () => void;
}

const DOCUMENTS = [
  "Déclaration d'exploitation – PAPC",
  "Notice d'impact sur l'environnement",
  "Étude d'impact sur l'environnement",
  "Étude de danger",
  "Rapport sur les produits dangereux",
  "Dossier d'autorisation d'exploitation",
  'Audit environnemental',
  'Mise en conformité environnementale',
] as const;

export function EnvironnementPage({
  clientName,
  dossierNumero,
  initialPrestation,
  onBack,
}: EnvironnementPageProps) {
  const [activite, setActivite] = useState('');
  const [capacite, setCapacite] = useState('');
  const [unite, setUnite] = useState('sujets');
  const [commune, setCommune] = useState('');
  const [surface, setSurface] = useState('');
  const [eau, setEau] = useState('');
  const [energie, setEnergie] = useState('');
  const [travailleurs, setTravailleurs] = useState('');
  const [analyse, setAnalyse] = useState(false);

  const poultryClassification = useMemo(() => {
    const n = Number(capacite);
    if (!activite.toLowerCase().includes('poulet') && !activite.toLowerCase().includes('volaille')) return null;
    if (!Number.isFinite(n) || n <= 0) return null;
    if (n < 5000) return { rubrique: '2121-3', regime: 'D – Déclaration', document: "Déclaration d'exploitation – PAPC" };
    if (n <= 20000) return { rubrique: '2121-2', regime: 'APAPC', document: "Notice / procédure applicable à confirmer selon le régime réglementaire en vigueur" };
    return { rubrique: '2121-1', regime: 'AW', document: 'Document réglementaire requis selon la procédure applicable' };
  }, [activite, capacite]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Module Environnement</h1>
            <p className="text-sm text-gray-500">{dossierNumero ?? 'Nouveau projet'}{clientName ? ` — ${clientName}` : ''}</p>
          </div>
        </div>
        {initialPrestation && (
          <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{initialPrestation}</span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <SearchCheck size={18} className="text-emerald-600" />
          <h2 className="font-semibold text-gray-800">Analyse réglementaire</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Activité" required>
            <input className={inputCls} value={activite} onChange={e => setActivite(e.target.value)} placeholder="Ex. Élevage de poulets de chair" />
          </Field>
          <Field label="Capacité">
            <input className={inputCls} type="number" min="0" value={capacite} onChange={e => setCapacite(e.target.value)} />
          </Field>
          <Field label="Unité">
            <select className={selectCls} value={unite} onChange={e => setUnite(e.target.value)}>
              <option value="sujets">sujets / animaux-équivalents</option>
              <option value="m3/an">m³/an</option>
              <option value="t/an">t/an</option>
              <option value="kW">kW</option>
              <option value="autre">Autre</option>
            </select>
          </Field>
          <Field label="Commune">
            <input className={inputCls} value={commune} onChange={e => setCommune(e.target.value)} placeholder="Commune" />
          </Field>
          <Field label="Surface (m²)">
            <input className={inputCls} type="number" min="0" value={surface} onChange={e => setSurface(e.target.value)} />
          </Field>
          <Field label="Consommation d'eau">
            <input className={inputCls} value={eau} onChange={e => setEau(e.target.value)} placeholder="Valeur réelle ou estimation" />
          </Field>
          <Field label="Consommation énergétique">
            <input className={inputCls} value={energie} onChange={e => setEnergie(e.target.value)} placeholder="kWh/an ou autre" />
          </Field>
          <Field label="Personnel">
            <input className={inputCls} type="number" min="0" value={travailleurs} onChange={e => setTravailleurs(e.target.value)} />
          </Field>
        </div>
        <button onClick={() => setAnalyse(true)} className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium">
          <Calculator size={16} /> Analyser le classement
        </button>
      </div>

      {analyse && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Résultat</h2>
          {poultryClassification ? (
            <div className="space-y-3 text-sm">
              <div><span className="font-medium">Rubrique :</span> {poultryClassification.rubrique}</div>
              <div><span className="font-medium">Régime :</span> {poultryClassification.regime}</div>
              <div><span className="font-medium">Document proposé :</span> {poultryClassification.document}</div>
              <div className="text-xs text-gray-500 border-t pt-3">Référence de base : Décret exécutif n° 07-144 du 19 mai 2007 — nomenclature des installations classées. Le classement affiché doit être vérifié contre la version réglementaire applicable avant validation du dossier.</div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Activité non encore prise en charge automatiquement. Le système demandera une vérification réglementaire avant de proposer un classement.</p>
          )}
        </div>
      )}

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={17} className="text-slate-600" />
          <h2 className="font-semibold text-gray-800">Documents environnementaux</h2>
        </div>
        <p className="text-xs text-gray-500">Les documents définitifs seront générés uniquement après détermination et validation du classement réglementaire.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DOCUMENTS.map(doc => <span key={doc} className="text-xs px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600">{doc}</span>)}
        </div>
      </div>
    </div>
  );
}
