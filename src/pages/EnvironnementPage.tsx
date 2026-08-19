import { useMemo, useState } from 'react';
import { ArrowLeft, Calculator, FileText, SearchCheck, ExternalLink } from 'lucide-react';
import { Field, inputCls, selectCls } from '@/components/Field';
import {
  classerVolaille,
  DOCUMENT_LEGEND,
} from '@/services/environnementReglementation';

interface EnvironnementPageProps {
  clientName: string;
  dossierNumero?: string;
  initialPrestation?: string;
  onBack: () => void;
}

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

  const classement = useMemo(() => {
    if (unite !== 'sujets') return null;
    return classerVolaille(activite, Number(capacite));
  }, [activite, capacite, unite]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Module Environnement</h1>
            <p className="text-sm text-gray-500">
              {dossierNumero ?? 'Nouveau projet'}{clientName ? ` — ${clientName}` : ''}
            </p>
          </div>
        </div>
        {initialPrestation && (
          <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {initialPrestation}
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <SearchCheck size={18} className="text-emerald-600" />
          <h2 className="font-semibold text-gray-800">Analyse réglementaire</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Activité" required>
            <input
              className={inputCls}
              value={activite}
              onChange={(e) => setActivite(e.target.value)}
              placeholder="Ex. Élevage de poulets de chair"
            />
          </Field>

          <Field label="Capacité">
            <input
              className={inputCls}
              type="number"
              min="0"
              value={capacite}
              onChange={(e) => setCapacite(e.target.value)}
            />
          </Field>

          <Field label="Unité">
            <select
              className={selectCls}
              value={unite}
              onChange={(e) => setUnite(e.target.value)}
            >
              <option value="sujets">sujets / animaux-équivalents</option>
              <option value="m3/an">m³/an</option>
              <option value="t/an">t/an</option>
              <option value="kW">kW</option>
              <option value="autre">Autre</option>
            </select>
          </Field>

          <Field label="Commune">
            <input
              className={inputCls}
              value={commune}
              onChange={(e) => setCommune(e.target.value)}
              placeholder="Commune"
            />
          </Field>

          <Field label="Surface (m²)">
            <input
              className={inputCls}
              type="number"
              min="0"
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
            />
          </Field>

          <Field label="Consommation d'eau">
            <input
              className={inputCls}
              value={eau}
              onChange={(e) => setEau(e.target.value)}
              placeholder="Valeur réelle ou estimation"
            />
          </Field>

          <Field label="Consommation énergétique">
            <input
              className={inputCls}
              value={energie}
              onChange={(e) => setEnergie(e.target.value)}
              placeholder="kWh/an ou autre"
            />
          </Field>

          <Field label="Personnel">
            <input
              className={inputCls}
              type="number"
              min="0"
              value={travailleurs}
              onChange={(e) => setTravailleurs(e.target.value)}
            />
          </Field>
        </div>

        <button
          onClick={() => setAnalyse(true)}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-medium"
        >
          <Calculator size={16} /> Analyser le classement
        </button>
      </div>

      {analyse && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Résultat réglementaire</h2>

          {classement ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <Result label="Rubrique" value={classement.rubrique} />
                <Result label="Sous-rubrique" value={classement.code} />
                <Result label="Régime" value={classement.regime} />
                <Result label="Catégorie" value={classement.categorie} />
              </div>

              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                <p className="font-semibold text-emerald-900">Classement déterminé</p>
                <p className="mt-1 text-emerald-800">
                  {classement.animauxEquivalents.toLocaleString('fr-FR')} animaux-équivalents — {classement.seuil}
                </p>
              </div>

              <div>
                <p className="font-medium text-gray-700">Référentiel utilisé</p>
                <p className="mt-1 text-gray-600">{classement.reference}</p>
                <a
                  href={classement.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-sky-700 hover:underline"
                >
                  Source officielle — Ministère de l'Environnement <ExternalLink size={13} />
                </a>
              </div>

              <div>
                <p className="font-medium text-gray-700">Documents signalés par la nomenclature</p>
                {classement.documentsIndiques.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {classement.documentsIndiques.map((code) => (
                      <span
                        key={code}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700"
                        title={DOCUMENT_LEGEND[code as keyof typeof DOCUMENT_LEGEND]}
                      >
                        {code} — {DOCUMENT_LEGEND[code as keyof typeof DOCUMENT_LEGEND]}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">
                    Aucun marquage EIE/ED/NI/RPD n'est repris dans la ligne 2121-3 de la nomenclature; le projet est soumis au régime D (Déclaration).
                  </p>
                )}
              </div>

              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                {classement.verification}. Le moteur ne remplace pas la validation juridique du dossier ni la vérification des textes modificatifs applicables à la date du dépôt.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Cette activité / unité n'est pas encore couverte par le moteur réglementaire. Aucune classification ne sera inventée.
            </p>
          )}
        </div>
      )}

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={17} className="text-slate-600" />
          <h2 className="font-semibold text-gray-800">Documents environnementaux</h2>
        </div>
        <p className="text-xs text-gray-500">
          Les documents définitifs seront générés après détermination et validation du classement réglementaire.
        </p>
      </div>
    </div>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="text-[11px] font-semibold text-gray-500 uppercase">{label}</div>
      <div className="mt-1 font-semibold text-gray-800">{value}</div>
    </div>
  );
}
